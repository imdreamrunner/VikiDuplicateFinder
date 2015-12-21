"use strict";

var logger = require('./logger');
var remote = require('./remote');
var config = require('./config');
var parser = require('./parser');
var scheduler = require('./scheduler');
var database = require('./database');
var helper = require('./helper');
var constant = require('./constant');

var LOG_TAGS = ['CONTROL'];
var TASK_LOG_TAGS = LOG_TAGS.concat(['TASK']);
var PROCESS_LOG_TAGS = LOG_TAGS.concat(['PROCESS']);


class Task {
    constructor(url) {
        this.url = url;
        this.taskId = scheduler.addTask(this.start.bind(this));
    }
    start() {
        logger.log(TASK_LOG_TAGS, "Start task " + this.url);
        var constructedUrl = 'https://www.viki.com' + this.url;
        remote.fetchRemoteContent(constructedUrl, this.successCallback.bind(this), this.errorCallback.bind(this));
    }
    successCallback(statusCode, content) {
        logger.log(TASK_LOG_TAGS, "Received content with status code: " + statusCode);
        processHtml(this.url, content, this.completeTask.bind(this));
    }
    errorCallback() {
        this.completeTask();
    }
    completeTask() {
        logger.log(TASK_LOG_TAGS, "Complete task for URL " + this.url);
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
        if (callback) callback();
        return;
    }
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
                database.markUrlProcessed(url, function() {
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

module.exports = {
    loadTasks: loadTasks
};
