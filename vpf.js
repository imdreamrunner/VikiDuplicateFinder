"use strict";

var control = require('./control');
var scheduler = require('./scheduler');
var database = require('./database');
var logger = require('./logger');

var STARTING_URLS = new Set(
    "/"
);

function addInitialUrl(callback) {
    database.addUrls(STARTING_URLS, callback);
}

// Job to be executed sequentially.
var startingJobs = [
    logger.initialize,
    database.initialize,
    addInitialUrl,
    control.loadTasks
];

var jobsExecuted = 0;

function executeStartingJobs() {
    if (jobsExecuted < startingJobs.length) {
        jobsExecuted ++;
        startingJobs[jobsExecuted - 1](executeStartingJobs);
    } else {
        scheduler.start();
    }
}

executeStartingJobs();

var onExitHandler = function() {
    logger.log(["CORE"], "Program existing...");
    scheduler.stop();
    database.tearDown();
    logger.close();
};

var onSigintHandler = function() {
    logger.log(["CORE"], "Stopping program...");
    scheduler.stop();
};

process.on('exit', onExitHandler);
process.on('SIGINT', onSigintHandler);
