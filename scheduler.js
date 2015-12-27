/*
 * Schedules concurrent jobs.
 */
"use strict";

var logger = require('./logger');
var config = require('./config');

var LOG_TAGS = ['SCHEDULER'];

var MAX_TASK_ID = 50;


const AVAILABLE = 0;
const QUEUEING = 1;
const RUNNING = 2;

var nextTaskId = 0;
var nextRunId = 0;

var taskList = [];
var taskStatus = [];
var taskWorker = [];
var availableWorkers = [];

var numQueueingTask = 0;
var numRunningTask = 0;

var isRunning = false;

// Initialize task status.
for (let i = 0; i <= MAX_TASK_ID; i++) {
    taskStatus[i] = AVAILABLE;
    taskWorker[i] = -1;
}
// Initialize available workers.
for (let i = config.MAX_CONCURRENT_HTTP_CONNECTION - 1; i >= 0; i--) {
    availableWorkers.push(i);
}

function addTask(task) {
    let currentTaskId = nextTaskId;
    if (taskStatus[currentTaskId] != AVAILABLE) {
        logger.log(LOG_TAGS, "Next task id " + currentTaskId + " is being used by one of the " +
            numRunningTask + " running tasks. Wait.");
        throw Error("Next task id is being used.");
    }
    nextTaskId ++;
    if (nextTaskId > MAX_TASK_ID) {
        nextTaskId = 0;
    }
    taskList[currentTaskId] = task;
    taskStatus[currentTaskId] = QUEUEING;
    logger.log(LOG_TAGS, "Enqueue task id " + currentTaskId);
    numQueueingTask ++;
    runTask();
    return currentTaskId;

}

function completeTask(taskId) {
    if (taskStatus[taskId] != RUNNING) {
        throw Error("Cannot complete a task which is not running.")
    }
    taskStatus[taskId] = AVAILABLE;
    var workerId = taskWorker[taskId];
    availableWorkers.push(workerId);
    logger.log(LOG_TAGS, "Complete task id " + taskId);
    numRunningTask --;

    runTask();
}

// Internal function that runs a task.
function runTask() {
    logger.log(LOG_TAGS, "Trying to run new task. Current available workers: " + availableWorkers.length +
                         " Current queuing tasks: " + numQueueingTask);
    if (!isRunning) return;

    // Scheduler is becoming empty. Ask for more task from control.
    if (numQueueingTask < 2 * config.MAX_CONCURRENT_HTTP_CONNECTION) {
        require('./control').loadTasks(selectTaskAndRun);
    } else {
        selectTaskAndRun();
    }
}

function selectTaskAndRun() {

    // Select a task to run.
    if (availableWorkers.length > 0 && numQueueingTask > 0) {
        if (taskStatus[nextRunId] == QUEUEING) {
            var workerId = availableWorkers.pop();
            taskStatus[nextRunId] = RUNNING;
            taskWorker[nextRunId] = workerId;
            numRunningTask ++;
            numQueueingTask --;
            var task = taskList[nextRunId];
            nextRunId ++;
            if (nextRunId > MAX_TASK_ID) {
                nextRunId = 0;
            }
            task(workerId);
            selectTaskAndRun();
        }
    } else if (numQueueingTask == 0) {
        isRunning = false;
        logger.log(LOG_TAGS, "Scheduler finished all tasks and stopped.");
    }

}

function start() {
    logger.log(LOG_TAGS, "starting scheduler");
    isRunning = true;
    runTask();
}

function stop(callback) {
    logger.log(LOG_TAGS, "Stopping scheduler");
    isRunning = false;
    if (callback) callback();
}

function checkIsRunning() {
    return isRunning;
}

module.exports = {
    start: start,
    stop: stop,
    addTask: addTask,
    completeTask: completeTask,
    checkIsRunning: checkIsRunning
};
