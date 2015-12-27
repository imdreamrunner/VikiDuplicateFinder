
"use strict";

var PAGE_SIZE = 10;

var app = angular.module('VdfBrowseApp', ['ngDialog']);

app.factory('Contents', function($http) {
    var service = {};
    service.config = {};
    service.config.type = -1;
    service.config.minimumCount = 1;
    service.data = {};
    service.data.count = 0;
    service.data.rows = [];
    service.data.page = 1;
    var update = function() {
        $http.get('/contents', {
            params: {
                type: service.config.type,
                minimumCount: service.config.minimumCount,
                page: service.data.page
            }
        })
        .then(function (response) {
            service.data.count = response.data.count;
            service.data.rows = response.data.rows;
        });
    };
    service.update = update;
    update();

    return service;
});

app.controller('FilterController', function($scope, Contents) {
    $scope.selectType = "-1";
    $scope.selectMinimumCount = "1";
    $scope.update = function() {
        Contents.config.type = parseInt($scope.selectType);
        Contents.config.minimumCount = parseInt($scope.selectMinimumCount);
        Contents.data.page = 1;
        Contents.update();
    }
});

app.controller('TableController', function($scope, Contents, ngDialog) {
    $scope.data = Contents.data;

    $scope.displayType = function (type) {
        switch (type) {
            case 0: return "Other";
            case 1: return "Channel";
            case 2: return "Video";
            case 3: return "Celebrity";
            case -1: return "All";
        }
    };

    $scope.openUrlList = function () {
        ngDialog.open({
            className: 'ngdialog-theme-plain',
            template: 'urlList'
        });
    };

    $scope.getPageNavList = function() {
        var maxPage = Math.max(Math.ceil(1.0 * Contents.data.count / PAGE_SIZE) - 1, 1);
        var currentPage = Contents.data.page;
        var pageList = [];
        pageList.push(1);
        if (maxPage == 1) return pageList;
        if (currentPage > 4) {
            pageList.push(-1);
        }
        for (let i = Math.max(currentPage - 2, 2); i <= Math.min(currentPage + 2, maxPage - 1); i++) {
            pageList.push(i);
        }
        if (maxPage - currentPage > 3) {
            pageList.push(-1);
        }
        pageList.push(maxPage);
        return pageList;
    };

    $scope.goPage = function (targetPage) {
        Contents.data.page = targetPage;
        Contents.update();
    }

});
