/*
 * Front-end JavaScript Application.
 */
"use strict";

const NUM_WORKER = 10;

var app = angular.module('VdfApp', ['ngWebSocket', 'luegg.directives']);

app.factory('Server', function($websocket) {
    var ws = $websocket('ws://' + document.domain + ':3001/');
    var service = {};
    service.isRunning = false;
    service.isFinished = false;
    service.isInitialized = false;
    var logs = [];
    var workerStatus = {};
    for (let workerId = 0; workerId < NUM_WORKER; workerId++) {
        workerStatus[workerId] = "Ready.";
    }
    ws.onMessage(function(message) {
        var m = JSON.parse(message.data);
        console.log(m);
        service.isRunning = m.isRunning;
        service.isFinished = m.isFinished;
        service.isInitialized = m.isInitialized;
        for (let workerId in m['workerStatus']) {
            if (m['workerStatus'].hasOwnProperty(workerId)) {
                workerStatus[workerId] = m['workerStatus'][workerId];
            }
        }
        logs.push({
            tags: m['tags'],
            message: m['message']
        });
        if (logs.length > 100) {
            logs.splice(0, 10);
        }
    });
    function sendAction(action) {
        var wsPackage = {
            event: 'action',
            action: action
        };
        ws.send(JSON.stringify(wsPackage));
    }
    service.init = function() {
        sendAction('init');
    };
    service.start = function() {
        sendAction('start');
    };
    service.stop = function() {
        service.isRunning = false;
        sendAction('stop');
    };
    service.logs = logs;
    service.workerStatus = workerStatus;
    return service;
});

app.controller('ControlController', function($scope, Server) {
    $scope.isDisabled = function(button) {
        if (button === 'init') {
            return !(! Server.isRunning || ! Server.isInitialized);
        } else if (button == 'start') {
            return !(! Server.isRunning && Server.isInitialized && ! Server.isFinished);
        } else {
            return ! Server.isRunning;
        }
    };

    $scope.initialize = function() {
        Server.init();
    };
    $scope.start = function() {
        Server.start();
    };
    $scope.pause = function() {
        Server.stop();
    };
    $scope.stop = function() {
        Server.stop();
        window.location = '/browse.html';
    };
});

app.controller('WorkerController', function($scope, Server) {
    $scope.workerStatus = Server.workerStatus;
});


app.controller('LogController', function($scope, Server) {
    $scope.logs = Server.logs;
});


