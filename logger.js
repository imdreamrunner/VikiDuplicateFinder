
"use strict";

var fs = require('fs');
var dateformat = require('dateformat');

var LOG_FILE = 'log.txt';

var logStream = null;
var workerStatus = {};

function initialize(callback) {
    // clear file.
    fs.writeFile(LOG_FILE, '', function(){
        logStream = fs.createWriteStream(LOG_FILE, {'flags': 'a'});
        if (callback) {
            callback();
        }
    });

}

function close(callback) {
    log(["LOGGER"], "Closing logger");
    logStream.end(function() {
        logStream = null;
        if (callback) callback();
    });
}

function log(tags, message) {
    const scheduler = require('./scheduler');
    var currentTime = new Date();
    var currentTimeString = dateformat(currentTime, "yyyy-mm-dd H:MM:ss");
    var printOutMessage = currentTimeString + " [" + tags.join(", ") + "] " + message;
    console.log(printOutMessage);
    var fileLogMessage = currentTime.getTime() + "|" + tags.join(',') + "|" + message + '\n';
    broadcast({
        isInitialized: true,
        isRunning: scheduler.isRunning,
        isFinished: false,
        workerStatus: workerStatus,
        tags: tags,
        message: message
    });
    if (logStream) {
        logStream.write(fileLogMessage);
    }
}

function workerLog(workerId, message) {
    var tags = ["WORKER", "WORKER-" + workerId];
    workerStatus[workerId] = message;
    log(tags, message);
}

function broadcast(message) {
    const communication = require('./communication');
    communication.informMonitors(message);
}

module.exports = {
    initialize: initialize,
    close: close,
    log: log,
    workerLog: workerLog
};
