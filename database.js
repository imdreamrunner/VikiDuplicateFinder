"use strict";

var logger = require('./logger');
var sqlite3 = require('sqlite3').verbose();
var helper = require('./helper');
var constant = require('./constant');

//var DATABASE_FILE = ':memory:';
var DATABASE_FILE = 'test.db';

var db = new sqlite3.Database(DATABASE_FILE);

var LOG_TAGS = ['DATABASE'];

var STATUS_NEW = 0;
var STATUS_PROCESSED = 1;

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
    title TEXT PRIMARY KEY,
    count INTEGER
)`;

var SQL_CREATE_TABLE_CONTENT_URL = `CREATE TABLE content_url (
    content TEXT,
    url TEXT,
    FOREIGN KEY(content) REFERENCES contents(title),
    FOREIGN KEY(URL) REFERENCES urls(url)
)`;

var SQL_SELECT_URL = `SELECT url FROM urls WHERE id = ?`;

var SQL_SELECT_CONTENT = `SELECT title FROM contents WHERE id = ?`;

var SQL_INSERT_URL = `INSERT INTO
urls   (url, type, status)
VALUES (?,   ?   , ?     )
`;

var SQL_INSERT_CONTENT = `INSERT INTO
contents (title, count)
VALUES   (?,     0)
`;

var SQL_INSERT_CONTENT_URL = `INSERT INTO
content_url (content, url)
VALUES      (?,       ?)
`;

var SQL_FETCH_URLS = `SELECT url FROM urls
WHERE status = ? LIMIT ?`;


var SQL_UPDATE_URL_STATUS = `UPDATE urls
SET status = ?
WHERE url = ?`;

var SQL_UPDATE_CONTENT_COUNT = `UPDATE contents
SET count = count + 1
WHERE title = ?`;

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

function tearDown() {
    if (isClosed) return;
    isClosed = true;
    logger.log(LOG_TAGS, "Tear down.");
    db.close();
}

function addUrls(urlSet, callback) {
    if (isClosed) return;
    var numAdded = 0, numSuccess = 0, numError = 0;
    if (urlSet.size == 0) {
        if (callback) callback();
    }
    urlSet.forEach(function(url) {
        db.run(SQL_INSERT_URL, url, helper.getUrlType(url), STATUS_NEW, function (err) {
            numAdded ++;
            if (err) {
                logger.log(LOG_TAGS, "Ignored URL " + url + " into database.");
                numError ++;
            } else {
                logger.log(LOG_TAGS, "Inserted URL " + url + " into database.");
                numSuccess ++;
            }
            if (numAdded == urlSet.size) {
                logger.log(LOG_TAGS, "Inserted " + numSuccess + " URLs into database.");
                logger.log(LOG_TAGS, "Ignored " + numError + " URLs.");
                if (callback) callback();
            }
        });
    });
}

function fetchNewUrls(num, callback) {
    if (isClosed) return;
    db.all(SQL_FETCH_URLS, STATUS_NEW, num, function(err, rows) {
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

function markUrlProcessed(url, callback) {
    if (isClosed) return;
    db.run(SQL_UPDATE_URL_STATUS, STATUS_PROCESSED, url, function(err) {
        if (err) {
            throw err;
        }
        logger.log(LOG_TAGS, "Marked URL " + url + " as processed.");
        if (callback) callback();
    });
}

function createContent(url, contentTitle) {
    db.serialize(function() {
        db.run(SQL_INSERT_CONTENT, contentTitle, function(err) {
            // Ignored
        });
        db.run(SQL_UPDATE_CONTENT_COUNT, contentTitle);
        db.run(SQL_INSERT_CONTENT_URL, contentTitle, url);
    });
}

module.exports = {
    initialize: initialize,
    tearDown: tearDown,
    addUrls: addUrls,
    fetchNewUrls: fetchNewUrls,
    createContent: createContent,
    markUrlProcessed: markUrlProcessed
};