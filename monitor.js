/*
 * Web-based visual monitor for job progressing.
 */

const koa = require('koa');
const http = require('http');
const serve = require('koa-static');
const ws = require("nodejs-websocket");

const logger = require('./logger');

const LOG_TAGS = ['SCHEDULER'];

var app = koa();
app.use(serve('static'));

//app.ws.use(route.all('/ws/', function* (next) {
//    const control = require('./control');
//    this.websocket.on('message', function(message) {
//        var m = JSON.parse(message);
//        if (m['event'] == 'action') {
//            if (m['action'] == 'init') control.init();
//            if (m['action'] == 'start') control.start();
//        }
//    });
//    yield next;
//}));

function startMonitor(callback) {
    logger.log(LOG_TAGS, "Starting monitor.");

    const communication = require('./communication');
    ws.createServer(communication.ws).listen(3001);
    app.listen(3000);

    if (callback) {
        callback();
    }
}

module.exports = {
    startMonitor: startMonitor
};
