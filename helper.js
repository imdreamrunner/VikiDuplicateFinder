var constant = require('./constant');
var logger = require('./logger');

var CHANNEL_URL = /^\/tv\/[^?\/]+$/;
var VIDEO_URL = /^\/videos\/[^?\/]+$/;
var CELEBRITY_URL = /^\/celebrities\/[^?\/]+$/;
var EXPLORE_URL = /^\/explore\?page=[^&]+$/;


function getUrlType(url) {
    if (url.match(CHANNEL_URL)) return constant.TYPE_CHANNEL;
    if (url.match(VIDEO_URL)) return constant.TYPE_VIDEO;
    if (url.match(CELEBRITY_URL)) return constant.TYPE_CELEBRITY;
    if (url.match(EXPLORE_URL)) return constant.TYPE_EXPLORE;
    return constant.TYPE_OTHER;
}


function bulkTaskRunner(taskList) {
    var taskExecuted = 0;
    var executeTask = function() {
        if (taskExecuted < taskList.length) {
            logger.log(['BULK'], "Executing bulk task " + taskExecuted);
            taskExecuted ++;
            taskList[taskExecuted - 1](executeTask);
        }
    };
    return executeTask;
}


module.exports = {
    getUrlType: getUrlType,
    bulkTaskRunner: bulkTaskRunner
};
