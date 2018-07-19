"use strict";
(function () {
    app.controller('AuthenticationCtrl', function ($scope, AuthenticationService, $rootScope, $mdToast, $location, $timeout) {

        $scope.login = function (user) {
            AuthenticationService.Login(user)
                .then(function (response) {
                    console.log('Response', response)
                    if (response.error) {
                        $mdToast.show(
                            $mdToast.simple()
                                .textContent(response.error)
                                .position('top right')
                                .hideDelay(5000)
                        );
                    }
                    else {
                        var loggedUser = response;
                        AuthenticationService.SetCredentials(loggedUser, loggedUser.access_token);
                        $rootScope.user = AuthenticationService.GetCredentials();
                        $location.url('/posts/')
                    }
                })
        }

        $scope.register = function (user) {
            AuthenticationService.Register(user)
                .then(function (response) {
                    console.log('Response', response)
                    if (response.error) {
                        $mdToast.show(
                            $mdToast.simple()
                                .textContent(response.error)
                                .position('top right')
                                .hideDelay(5000)
                        );
                    }
                    else {
                        $mdToast.show(
                            $mdToast.simple()
                                .textContent("The user was successfully created!")
                                .position('top right')
                                .hideDelay(2000)
                        );
                        $timeout(()=>{ $location.url('/auth')}, 2000)
                    }
                })
        }
    })
})()