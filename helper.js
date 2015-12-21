var constant = require('./constant');

var CHANNEL_URL = /^\/tv\/[^?\/]+$/;
var VIDEO_URL = /^\/videos\/[^?\/]+$/;
var CELEBRITY_URL = /^\/celebrities\/[^?\/]+$/;


function getUrlType(url) {
    if (url.match(CHANNEL_URL)) return constant.TYPE_CHANNEL;
    if (url.match(VIDEO_URL)) return constant.TYPE_VIDEO;
    if (url.match(CELEBRITY_URL)) return constant.TYPE_CELEBRITY;
    return constant.TYPE_OTHER;
}

module.exports = {
    getUrlType: getUrlType
};
