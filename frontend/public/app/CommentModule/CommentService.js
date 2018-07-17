(function () {
    'use strict';
    app.factory('CommentService', ['$http', '$rootScope',
        function ( $http, $rootScope) {
            var service = {};

            service.create = function (comment) {
                return $http.post(config.STATIC_URL + 'comment-create', {
                    access_token: $rootScope.user.token,
                    idPost:comment.idPost,
                    commentText: comment.commentText
                }).then(handleSuccess, handleError);
            };

            service.getAll = function(idPost){
                return $http.post(config.STATIC_URL + 'comments', {
                    access_token: $rootScope.user.token,
                    idPost
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
