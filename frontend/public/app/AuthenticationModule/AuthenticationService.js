(function () {
    'use strict';
    app.factory('AuthenticationService', ['$http', '$rootScope', '$window',
        function ( $http, $rootScope, $window) {
            var service = {};
            service.Login = function (user, callback) {
                return $http.post(config.STATIC_URL + 'login', {
                    email: user.email,
                    password: user.password,
                }).then(handleSuccess, handleError);
            };

            service.Register = function (user, callback) {
                return $http.post(config.STATIC_URL + 'user-create', {
                    email: user.email,
                    password: user.password,
                    name: user.name
                }).then(handleSuccess, handleError);
            };

            service.SetCredentials = function (user, token) {
                user.token = token;
                var authdata = JSON.stringify(user);
                $window.localStorage.setItem('userData', authdata);
            };

            service.ClearCredentials = function () {
                $rootScope.userData = {};
                $window.localStorage.removeItem('userData');
                $http.defaults.headers.common.Authorization = undefined;
            };

            service.GetCredentials = function () {
                try {
                    return JSON.parse($window.localStorage.getItem('userData'))
                } catch (e) {
                    console.log('User data not loaded during parse error');
                    $rootScope.userData = {};
                    $window.localStorage.removeItem('userData');
                    $http.defaults.headers.common.Authorization = undefined;
                }
            };

            function handleSuccess(res) {
                return res.data;
            }

            function handleError(error) {
                return error;
            }

            return service;
        }])
})();
