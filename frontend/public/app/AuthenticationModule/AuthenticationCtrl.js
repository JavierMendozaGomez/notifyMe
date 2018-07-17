"use strict";
(function () {
    app.controller('AuthenticationCtrl', function ($scope, AuthenticationService, $rootScope) {
        $scope.login = function (user) {
            AuthenticationService.Login(user)
                .then(function (response) {
                    console.log('Response', response)
                    if (!response.access_token) {

                    }
                    else {
                        var loggedUser = response;
                        AuthenticationService.SetCredentials(loggedUser, loggedUser.access_token);
                        $rootScope.user = AuthenticationService.GetCredentials();
                    }
                })
        }
    })
})()