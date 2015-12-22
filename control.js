"use strict";

var logger = require('./logger');
var remote = require('./remote');
var config = require('./config');
var parser = require('./parser');
var scheduler = require('./scheduler');
var database = require('./database');
var monitor = require('./monitor');
var helper = require('./helper');
var constant = require('./constant');

var LOG_TAGS = ['CONTROL'];
var PROCESS_LOG_TAGS = LOG_TAGS.concat(['PROCESS']);


class Task {
    constructor(url) {
        this.url = url;
        this.taskId = scheduler.addTask(this.start.bind(this));
    }
    start(workerId) {
        this.workerId = workerId;
        logger.workerLog(this.workerId, "Running task " + this.taskId + " with URL " + this.url);
        var constructedUrl = constant.TARGET_BASE_URL + this.url;
        remote.fetchRemoteContent(constructedUrl, this.successCallback.bind(this), this.errorCallback.bind(this));
    }
    successCallback(statusCode, content) {
        logger.workerLog(this.workerId, "Received content with status code: " + statusCode);
        var self = this;
        processHtml(this.url, content, function() {
            database.changeUrlStatus(self.url, constant.STATUS_SUCCEED, self.completeTask.bind(self));
        });
    }
    errorCallback() {
        database.changeUrlStatus(this.url, constant.STATUS_FAILED, this.completeTask.bind(this));
    }
    completeTask() {
        logger.workerLog(this.workerId, "Completed task " + this.taskId + " for URL " + this.url);
        scheduler.completeTask(this.taskId);
    }
}


function processHtml(url, html, callback) {
    var pageType = helper.getUrlType(url);
    var parsedHtml = parser.parse(html);
    var foundUrls = parsedHtml.findAllUrls();
    logger.log(PROCESS_LOG_TAGS, "Found " + foundUrls.size + " new URLs.");
    database.addUrls(foundUrls, callback);
    if (pageType != constant.TYPE_OTHER) {
        var contentTitle = parsedHtml.getOpenGraphTitle();
        if (!contentTitle || !contentTitle.length) {
            contentTitle = "(empty)";
        }
        if (pageType == constant.TYPE_CHANNEL) contentTitle = "CH:" + contentTitle;
        if (pageType == constant.TYPE_VIDEO) contentTitle = "V:" + contentTitle;
        if (pageType == constant.TYPE_CELEBRITY) contentTitle = "C:" + contentTitle;
        logger.log(LOG_TAGS, "Content title: " + contentTitle);
        database.createContent(url, contentTitle);
    }
}


// Load classes from database to scheduler.
var loadingTask = false;

function loadTasks(callback) {
    if (loadingTask) {
        logger.log(LOG_TAGS, "Currently loading task.");
        if (callback) callback();
        return;
    }
    logger.log(LOG_TAGS, "Trying to load tasks.");
    loadingTask = true;
    var maxNumFetched = config.MAX_CONCURRENT_HTTP_CONNECTION * 3;
    database.fetchNewUrls(maxNumFetched, function(urls) {
        logger.log(LOG_TAGS, "Load " + urls.length + " URLs from database.");

        var numFinished = 0, numExpected = urls.length;

        var finishing = function() {
            numExpected = -1;  // prevent being called for multiple times.
            logger.log(LOG_TAGS, "Finished loading tasks, with " + numFinished + " tasks loaded.");
            if (callback) callback();
            loadingTask = false;
        };

        for (let i = 0; i < urls.length; i++) {
            let url = urls[i];
            logger.log(LOG_TAGS, "Load URL " + url + " from database.");
            try {
                new Task(url);
                database.changeUrlStatus(url, constant.STATUS_PROCESSING, function() {
                    numFinished ++;
                    if (numFinished == numExpected) finishing();
                });
            } catch (ignored) {
                numExpected = i;
                if (numFinished == numExpected) finishing();
                break;
            }
        }

    });
}

const STARTING_URL = "/";

function addInitialUrl(callback) {
    var startUrlSet = new Set();
    startUrlSet.add(STARTING_URL);
    database.addUrls(startUrlSet, callback);
}


var preparingJobs = [
    logger.initialize,
    monitor.startMonitor
];

var prepare = helper.bulkTaskRunner(preparingJobs);

var initJobs = [
    database.initialize,
    addInitialUrl
];

function init() {
    helper.bulkTaskRunner(initJobs)();
}

var startingJobs = [
    loadTasks,
    scheduler.start
];

function start() {
    helper.bulkTaskRunner(startingJobs)();
}

function stop() {
    scheduler.stop();
}

function exitProcess() {
    logger.log(LOG_TAGS, "Exiting process.");
    process.exit(0);
}

var exitingJobs = [
    scheduler.stop,
    database.tearDown,
    logger.close,
    exitProcess
];

function exit() {
    helper.bulkTaskRunner(exitingJobs)();
}

module.exports = {
    prepare: prepare,
    init: init,
    start: start,
    loadTasks: loadTasks,
    stop: stop,
    exit: exit
};
