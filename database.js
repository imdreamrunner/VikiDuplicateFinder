"use strict";

const sqlite3 = require('sqlite3').verbose();
const Q = require('q');

const logger = require('./logger');
const helper = require('./helper');
const constant = require('./constant');

//var DATABASE_FILE = ':memory:';
var DATABASE_FILE = 'test.db';

var db = new sqlite3.Database(DATABASE_FILE);

var LOG_TAGS = ['DATABASE'];

var SQL_DROP_TABLES = `
    DROP TABLE IF EXISTS urls;
    DROP TABLE IF EXISTS contents;
    DROP TABLE IF EXISTS content_url
`;

var SQL_CREATE_TABLE_URLS = `CREATE TABLE urls (
    url TEXT PRIMARY KEY,
    type INTEGER,
    status INTEGER
)`;

var SQL_CREATE_TABLE_CONTENT = `CREATE TABLE contents (
    type INTEGER,
    title TEXT,
    count INTEGER,
    PRIMARY KEY (type, title)
)`;

var SQL_CREATE_TABLE_CONTENT_URL = `CREATE TABLE content_url (
    type INTEGER,
    title TEXT,
    url TEXT,
    FOREIGN KEY(type, title) REFERENCES contents(type, title),
    FOREIGN KEY(URL) REFERENCES urls(url)
)`;

var SQL_SELECT_URL = `SELECT url FROM urls WHERE id = ?`;

var SQL_SELECT_CONTENT = `SELECT title FROM contents WHERE id = ?`;

var SQL_QUERY_TYPE = 'SELECT * FROM contents WHERE type = ? AND count >= ? ORDER BY count DESC, title LIMIT ? OFFSET ?';
var SQL_QUERY_TYPE_ALL = 'SELECT * FROM contents WHERE count >= ? ORDER BY count DESC, title LIMIT ? OFFSET ?';

var SQL_COUNT_QUERY_TYPE = 'SELECT count(*) AS count FROM contents WHERE type = ? AND count >= ?';
var SQL_COUNT_QUERY_TYPE_ALL = 'SELECT count(*) AS count FROM contents WHERE count >= ?';

var SQL_COUNT_URL_STATUS = 'SELECT count(*) AS count FROM urls WHERE status = ?';

var SQL_INSERT_URL = `INSERT INTO
urls   (url, type, status)
VALUES (?  , ?   , ?     )
`;

var SQL_INSERT_CONTENT = `INSERT INTO
contents (type, title, count)
VALUES   (?,    ?,     0)
`;

var SQL_INSERT_CONTENT_URL = `INSERT INTO
content_url (type, title, url)
VALUES      (?,    ?,     ?)
`;

var SQL_FETCH_URLS = `SELECT url FROM urls
WHERE status = ? LIMIT ?`;


var SQL_UPDATE_URL_STATUS = `UPDATE urls
SET status = ?
WHERE url = ?`;

var SQL_UPDATE_ALL_PENDING = `UPDATE urls SET status = 0 WHERE status = 1`;

var SQL_UPDATE_CONTENT_COUNT = `UPDATE contents
SET count = count + 1
WHERE type = ? and title = ?`;


var INITIALIZATION_SQLS = [
    SQL_DROP_TABLES,
    SQL_CREATE_TABLE_URLS,
    SQL_CREATE_TABLE_CONTENT,
    SQL_CREATE_TABLE_CONTENT_URL
];

var isClosed = false;

function initialize(callback) {
    if (isClosed) return;
    db.serialize(function() {
        INITIALIZATION_SQLS.forEach(function(sqls) {
            sqls.split(';').forEach(function(sql) {
                db.run(sql, function(err) {
                    if (err) {
                        throw Error(err);
                    }
                });
            });
        });
        if (callback) callback();
    });
}

function tearDown(callback) {
    if (isClosed) return;
    isClosed = true;
    logger.log(LOG_TAGS, "Tear down.");
    db.close(function() {
        if (callback) callback();
    });
}

function addUrls(urlSet, callback) {
    if (isClosed) return;
    var numAdded = 0, numSuccess = 0, numError = 0;
    if (urlSet.size == 0) {
        if (callback) callback();
    }
    urlSet.forEach(function(url) {
        db.run(SQL_INSERT_URL, url, helper.getUrlType(url), constant.STATUS_NEW, function (err) {
            numAdded ++;
            if (err) {
                //logger.log(LOG_TAGS, "Ignored URL " + url + " into database.");
                numError ++;
            } else {
                //logger.log(LOG_TAGS, "Inserted URL " + url + " into database.");
                numSuccess ++;
            }
            if (numAdded == urlSet.size) {
                logger.log(LOG_TAGS, "Inserted " + numSuccess + " URLs into database," +
                                     " Ignored " + numError + " URLs.");
                if (callback) callback();
            }
        });
    });
}

function fetchNewUrls(num, callback) {
    if (isClosed) return;
    db.all(SQL_FETCH_URLS, constant.STATUS_NEW, num, function(err, rows) {
        if (err) {
            throw err;
        }
        var urls = [];
        for (let i = 0; i < rows.length; i ++) {
            urls.push(rows[i]['url']);
        }
        callback(urls);
    });
}

function changeUrlStatus(url, status, callback) {
    if (isClosed) return;
    db.run(SQL_UPDATE_URL_STATUS, status, url, function(err) {
        if (err) {
            throw err;
        }
        logger.log(LOG_TAGS, "Changed URL " + url + " status to " + status);
        if (callback) callback();
    });
}

function changeAllProcessingUrlsToPending(callback) {
    if (isClosed) return;
    db.run(SQL_UPDATE_ALL_PENDING, function(err) {
        if (err) {
            throw err;
        }
        logger.log(LOG_TAGS, "Changed all processing URLs to pending.");
        if (callback) callback();
    });
}

function createContent(url, contentTitle) {
    db.serialize(function() {
        var urlType = helper.getUrlType(url);
        db.run(SQL_INSERT_CONTENT, urlType, contentTitle, function(err) {
            // Ignored
        });
        db.run(SQL_UPDATE_CONTENT_COUNT, urlType, contentTitle);
        db.run(SQL_INSERT_CONTENT_URL, urlType, contentTitle, url);
    });
}

const CONTENT_RESULT_PAGE_SIZE = 10;
function getContents(type, minimumCount, page) {

    page --;

    var getContentCount, getContentList;
    if (type != constant.TYPE_ALL) {
        getContentCount = Q.ninvoke(db, "get", SQL_COUNT_QUERY_TYPE, type, minimumCount)
            .then(function(row) {
                return row['count'];
            });
        getContentList = Q.ninvoke(db, "all", SQL_QUERY_TYPE, type, minimumCount,
            CONTENT_RESULT_PAGE_SIZE, CONTENT_RESULT_PAGE_SIZE * page);
    } else {
        getContentCount = Q.ninvoke(db, "get", SQL_COUNT_QUERY_TYPE_ALL, minimumCount)
            .then(function(row) {
                return row['count'];
            });
        getContentList = Q.ninvoke(db, "all", SQL_QUERY_TYPE_ALL, minimumCount,
            CONTENT_RESULT_PAGE_SIZE, CONTENT_RESULT_PAGE_SIZE * page);
    }

    return Q.all([getContentCount, getContentList])
        .spread(function (count, rows) {
            return {
                count: count,
                rows: rows
            };
        });
}

function urlStatusCountPromise(status) {
    return Q.ninvoke(db, "get", SQL_COUNT_URL_STATUS, status)
        .then(function(row) {
            return row['count'];
        });
}

function getUrlStatus() {
    var promises = [
        urlStatusCountPromise(constant.STATUS_NEW),
        urlStatusCountPromise(constant.STATUS_PROCESSING),
        urlStatusCountPromise(constant.STATUS_SUCCEED),
        urlStatusCountPromise(constant.STATUS_FAILED)
    ];
    return Q.all(promises)
        .spread(function (newCount, processingCount, succeedCount, failedCount) {
            return {
                pending: newCount,
                processing: processingCount,
                succeeded: succeedCount,
                failed: failedCount
            }
        });
}

module.exports = {
    initialize: initialize,
    tearDown: tearDown,
    addUrls: addUrls,
    fetchNewUrls: fetchNewUrls,
    createContent: createContent,
    changeUrlStatus: changeUrlStatus,
    changeAllProcessingUrlsToPending: changeAllProcessingUrlsToPending,
    getContents: getContents,
    getUrlStatus: getUrlStatus
};
