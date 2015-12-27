/*
 * Web-based visual monitor for job progressing.
 */

const koa = require('koa');
const http = require('http');
const koaStatic = require('koa-static');
const koaRouter = require('koa-router');
const koaJson = require('koa-json');
const ws = require("nodejs-websocket");
const Q = require('q');

const logger = require('./logger');
const constant = require('./constant');
const database = require('./database');

const LOG_TAGS = ['SCHEDULER'];

var app = koa();
var router = koaRouter();

router.get('/contents', function* (next) {
    var type = constant.TYPE_ALL;
    var minimumCount = 1;
    var page = 0;
    if (this.query.hasOwnProperty('type')) {
        type = this.query['type'];
    }
    if (this.query.hasOwnProperty('minimumCount')) {
        minimumCount = this.query['minimumCount'];
    }
    if (this.query.hasOwnProperty('page')) {
        page = this.query['page'];
    }
    this.body = yield Q.fcall(database.getContents, type, minimumCount, page)
    .catch(function (err) {
        return {
            error: err
        }
    });
});

app.use(koaJson());
app.use(router.routes());
app.use(router.allowedMethods());
app.use(koaStatic('static'));

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
