"use strict";

var control = require('./control');
var logger = require('./logger');

control.prepare();

var onExitHandler = function() {
    logger.log(["CORE"], "Bye.");
};

var onSigintHandler = function() {
    logger.log(["CORE"], "Stopping program...");
    control.exit();
};

process.on('exit', onExitHandler);
process.on('SIGINT', onSigintHandler);
