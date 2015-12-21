var http = require('http');
var https = require('https');
var logger = require('./logger');

var LOG_TAGS = ["REMOTE"];

var REQUEST_TIMEOUT = 2000;

function fetchRemoteContent(url, successCallback, errorCallback) {

    logger.log(LOG_TAGS, "Start downloading from " + url);

    var callbackCalled = false;

    var httpSuccessCallback = function(res)  {
        if (callbackCalled) {
            throw Error("Callback is called more than once.");
        }
        callbackCalled = true;
        logger.log(LOG_TAGS, "Downloaded from " + url);
        var contentBuffer = "";
        res.on('data', function(chunk) {
            contentBuffer += chunk;
        });
        res.on('end', function(chunk) {
            successCallback(res.statusCode, contentBuffer);
        });
    };

    var httpErrorCallback = function(err) {
        if (callbackCalled) {
            throw Error("Callback is called more than once.");
        }
        callbackCalled = true;
        logger.log(LOG_TAGS, "Fail to download from " + url);
        logger.log(LOG_TAGS, "Reason: " + err.message);
        errorCallback();
    };

    var protocol = url.split('://')[0];
    var request;
    if (protocol == 'http') {
        request = http.get(url, httpSuccessCallback);
    } else {
        request = https.get(url, httpSuccessCallback);
    }

    request.on('error', httpErrorCallback);

    request.setTimeout(REQUEST_TIMEOUT, function() {
        logger.log(LOG_TAGS, "Timeout to download from " + url);
        request.abort();
    });
}

module.exports = {
    fetchRemoteContent: fetchRemoteContent
};
