(function () {
    'use strict';
    app.factory('ReactionService', ['$http', '$rootScope',
        function ( $http, $rootScope) {
            var service = {};

            service.create = function(reaction){
                return $http.post(config.STATIC_URL + 'reaction-create', {
                    access_token: $rootScope.user.token,
                    idPost: reaction.idPost,
                    type: reaction.type
                }).then(handleSuccess, handleError);
            }
            service.get = function(idPost){
                return $http.post(config.STATIC_URL + 'reaction-read', {
                    access_token: $rootScope.user.token,
                    idPost: idPost
                }).then(handleSuccess, handleError);
            }

            service.update = function(reaction){
                return $http.post(config.STATIC_URL + 'reaction-update', {
                    access_token: $rootScope.user.token,
                    idPost: reaction.idPost,
                    type: reaction.type
                }).then(handleSuccess, handleError);
            }

            service.delete = function(reaction){
                return $http.post(config.STATIC_URL + 'reaction-delete', {
                    access_token: $rootScope.user.token,
                    idPost: reaction.idPost
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
