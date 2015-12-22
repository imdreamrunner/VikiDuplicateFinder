"use strict";

const control = require('./control');

const logger = require('./logger');

const LOG_TAGS = ['COMMUNICATION'];

var wsConnections = [];

function ws(connection) {
    wsConnections.push(connection);
    logger.log(LOG_TAGS, "New connection. There are total " + wsConnections.length + " connections.");
    connection.on('text', function(message) {
        logger.log(LOG_TAGS, "Received message: " + message);
        var m = JSON.parse(message);
        if (m['event'] == 'action') {
            if (m['action'] == 'init') control.init();
            if (m['action'] == 'start') control.start();
            if (m['action'] == 'stop') control.stop();
        }
    });
    connection.on('close', function(code, reason) {
        wsConnections.splice(wsConnections.indexOf(connection), 1);
        logger.log(LOG_TAGS, "Connection lost. There are total " + wsConnections.length + " connections.");
    });
    connection.on('error', function() {});
}

function informMonitors(message) {
    wsConnections.forEach(function(connection) {
        connection.sendText(JSON.stringify(message));
    });
}

module.exports = {
    ws: ws,
    informMonitors: informMonitors
};