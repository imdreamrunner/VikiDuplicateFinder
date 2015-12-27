/*
 * Parses HTML and provides query interface.
 */
"use strict";

var cheerio = require('cheerio');
var logger = require('./logger');
var helper = require('./helper');
var constant = require('./constant');

function trimString(str) {
    return str.replace(/^\s+|\s+$/g, '');
}

var LINK_WITH_PROTOCOL = /^https?:\/\//;
var VIKI_INTERNAL_LINK = /^https?:\/\/www.viki.com/;
var JAVASCRIPT_CALL = /^javascript:.*/;
var CHANGE_LOCALE = /locale=/;
var HASHTAGS = /#.*/;

function parse(html) {
    var $ = cheerio.load(html);
    var findText = function(queryString) {
        return trimString($(queryString).text());
    };
    var getOpenGraphTitle = function() {
        var title = $('meta[property="og:title"]').attr('content');
        if (title) return trimString(title);
    };
    var findAllUrls = function() {
        var urls = new Set();
        $('a').each(function(i, element) {
            var link = $(element).attr('href');
            if (typeof link === "undefined") return;
            /*
            // for the old crawler.
            link = link.replace(HASHTAGS, '');
            if (link.match(JAVASCRIPT_CALL)) return;
            if (link.match(LINK_WITH_PROTOCOL)) {
                if (link.match(VIKI_INTERNAL_LINK)) {
                    link = link.replace(VIKI_INTERNAL_LINK, '');
                } else {
                    return;
                }
            }
            if (link.match(CHANGE_LOCALE)) return;
            if (link.length == 0) return;
            */
            if (helper.getUrlType(link) == constant.TYPE_OTHER) return;
            urls.add(link);
            if (link.indexOf('?') > -1) {
                urls.add(link.substr(0, link.indexOf('?')));
            }
        });
        return urls;
    };
    return {
        findText: findText,
        getOpenGraphTitle: getOpenGraphTitle,
        findAllUrls: findAllUrls
    }
}

module.exports = {
    parse: parse
};

