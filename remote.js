var http = require('http');
var https = require('https');
var logger = require('./logger');

var LOG_TAGS = ["REMOTE"];


function fetchRemoteContent(url, successCallback, errorCallback) {

    logger.log(LOG_TAGS, "Start downloading from " + url);

    var httpSuccessCallback = function(res)  {
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
        logger.log(LOG_TAGS, "Fail to download from " + url);
        logger.log(LOG_TAGS, err.message);
        errorCallback(errorCallback);
    };

    var protocol = url.split('://')[0];
    if (protocol == 'http') {
        http.get(url, httpSuccessCallback).on('error', httpErrorCallback);
    } else {
        https.get(url, httpSuccessCallback).on('error', httpErrorCallback);
    }

}

module.exports = {
    fetchRemoteContent: fetchRemoteContent
};
