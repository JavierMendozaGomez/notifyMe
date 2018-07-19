"use strict";
(function () {
    app.controller('NotificationCtrl', function ($scope, $rootScope, $location, NotificationService) {
        $rootScope.processDate = function(item){
            let event = new Date(item.createdAt * 1000);
            let options = {  year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute : 'numeric' };
            let date = event.toLocaleDateString(navigator.language, options);
            item.createdAt = date
        }

        $rootScope.processDates = function(items){
          angular.forEach(items, function (item, key) {
                $rootScope.processDate(item)
            });
        }

        $scope.loadNotifications = function(){
            NotificationService.getNotificationsByUser($scope.lastNotification).then((response)=>{
                if(response.error){
                    console.log(response.error)
                }
                else{
                    $rootScope.processDates(response.items)
                    if(!$scope.notifications)
                        $scope.notifications = []
                    $scope.notifications = $scope.notifications.concat(response.items);
                    $scope.lastNotification = response.LastEvaluatedKey
                }
            })
        }

        //if we want to show the latest notification of an user
        if($location.url().indexOf('notifications') != -1){
            $scope.loadNotifications()
        }


        $scope.go = function (url) {
            $location.url(url);
        }
        
    })
})()