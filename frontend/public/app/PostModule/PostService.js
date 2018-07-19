(function () {
    'use strict';
    app.factory('PostService', ['$http', '$rootScope',
        function ( $http, $rootScope) {
            var service = {};
            service.create = function (post) {
                return $http.post(config.STATIC_URL + 'post-create', {
                    access_token: $rootScope.user.token,
                    title: post.title,
                    text: post.text
                }).then(handleSuccess, handleError);
            };

            service.getById = function (id) {
                return $http.post(config.STATIC_URL + 'post-read', {
                    access_token: $rootScope.user.token,
                    id
                }).then(handleSuccess, handleError);
            };

            service.getAll = function(lastPost){
                return $http.post(config.STATIC_URL + 'posts', {
                    access_token: $rootScope.user.token,
                    lastPost
                }).then(handleSuccess, handleError);
            }

            function handleSuccess(res) {
                return res.data;
            }

            function handleError(error) {
                return error;
            }

            return service;
        }])
})();
