
"use strict";

var fs = require('fs');
var dateformat = require('dateformat');

var LOG_FILE = 'log.txt';

var logStream = null;

function initialize(callback) {
    // clear file.
    fs.writeFile(LOG_FILE, '', function(){
        logStream = fs.createWriteStream(LOG_FILE, {'flags': 'a'});
        if (callback) {
            callback();
        }
    });

}

function close() {
    logStream.end();
}

function log(tags, message) {
    var currentTime = new Date();
    var currentTimeString = dateformat(currentTime, "yyyy-mm-dd h:MM:ss");
    var printOutMessage = currentTimeString + " [" + tags.join(", ") + "] " + message;
    console.log(printOutMessage);
    var fileLogMessage = currentTime.getTime() + "|" + tags.join(',') + "|" + message + '\n';
    logStream.write(fileLogMessage);
}

function workerLog(workerId, message) {
    var tags = ["WORKER", "WORKER-" + workerId];
    log(tags, message);
}

module.exports = {
    initialize: initialize,
    close: close,
    log: log,
    workerLog: workerLog
};
