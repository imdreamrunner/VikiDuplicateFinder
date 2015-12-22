/*
 * Front-end JavaScript Application.
 */
"use strict";

const NUM_WORKER = 10;

var app = angular.module('VdfApp', ['ngWebSocket', 'luegg.directives']);


app.factory('Server', function($websocket) {
    var ws = $websocket('ws://127.0.0.1:3001/');
    var service = {};
    var logs = [];
    var workerStatus = {};
    for (let workerId = 0; workerId < NUM_WORKER; workerId++) {
        workerStatus[workerId] = "Ready.";
    }
    ws.onMessage(function(message) {
        var m = JSON.parse(message.data);
        console.log(m);
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
        sendAction('stop');
    };
    service.logs = logs;
    service.workerStatus = workerStatus;
    return service;
});

app.controller('ControlController', function($scope, Server) {
    $scope.initialize = function() {
        Server.init();
    };
    $scope.start = function() {
        Server.start();
    };
    $scope.pause = function() {
        Server.stop();
    };
});

app.controller('WorkerController', function($scope, Server) {
    $scope.workerStatus = Server.workerStatus;
});


app.controller('LogController', function($scope, Server) {
    $scope.logs = Server.logs;
});


