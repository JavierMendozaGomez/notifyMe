var app;
(function () {
    'use strict';
    app = angular.module('app', [
        'ngMaterial',
        'ngAnimate',
        'ngMessages',
        'ngRoute',
        'ngCookies',
    ]).value().config(function ($routeProvider) {
 
        $routeProvider
            .when('/init',{
                templateUrl: 'views/home.view.html',
                controller: 'AuthenticationCtrl'
            })
            .when('/auth', {
                templateUrl: 'views/auth.view.html',
                controller: 'AuthenticationCtrl'
            })
            .when('/register', {
                templateUrl: 'views/register.view.html',
                controller: 'AuthenticationCtrl'
            })
            .when('/posts', {
                templateUrl: 'views/post/posts.view.html',
                controller: 'PostCtrl'
            })
            .when('/posts/create', {
                templateUrl: 'views/post/post.edit.html',
                controller: 'PostCtrl'
            })
            .when('/posts/view/:id', {
                templateUrl: 'views/post/post.view.html',
                controller: 'PostCtrl'
            })
            .when('/notifications', {
                templateUrl: 'views/notification/notifications.view.html',
                controller: 'NotificationCtrl'
            })
           /* .when('/home', {
                templateUrl: 'views/home.view.html',
                controller: 'HomeCtrl'
            })
            .when('/users/view/:id', {
                templateUrl: 'views/users/userView.view.html',
                controller: 'UsersCtrl'
            })
            .when('/users/update/:id', {
                templateUrl: 'views/users/userEdit.view.html',
                controller: 'UsersCtrl'
            })*/
            .otherwise({
                redirectTo: '/init'
            });


    }).run(function ($rootScope, $location, $http, $window, $mdToast, AuthenticationService) {
      $rootScope.userData = $window.localStorage.getItem('userData');
        if ($rootScope.userData) {
            $rootScope.user = AuthenticationService.GetCredentials();
        }
       /* $rootScope.$on('$locationChangeStart', function () {
            var loggedIn = $rootScope.user;
            if (loggedIn && AuthenticationService.GetCredentials()) {
                $http.post(config.GET_CONSTANTS_URL, {
                    access_token: $rootScope.user.token
                }).then(function (success) {
                    $rootScope.constants = success.data;
                }, function (error) {
                    AuthenticationService.ClearCredentials();
                    $mdToast.show(
                        $mdToast.simple()
                            .textContent("Your session has expired. Please log into your account.")
                            .position('top right')
                            .hideDelay(5000)
                    );
                    $window.location.reload();
                });
            } else {
                $location.url('/');
            }
        });*/
    });
})();
