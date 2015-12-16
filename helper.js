var fnv = require('fnv-plus');
var constant = require('./constant');


function hashUrl(url) {
    return parseInt(fnv.hash(url).dec());
}

function hashTitle(url) {
    return parseInt(fnv.hash(url).dec());
}


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
    hashUrl: hashUrl,
    hashTitle: hashTitle,
    getUrlType: getUrlType
};
