(function () {
    'use strict';
    app.factory('NotificationService', ['$http', '$rootScope',
        function ( $http, $rootScope) {
            var service = {};

            service.getNotificationsByUser = function(lastNotification){
                return $http.post(config.STATIC_URL + 'notifications-by-user', {
                    access_token: $rootScope.user.token,
                    lastNotification
                }).then(handleSuccess, handleError);
            }

            service.getNotificationReport = function(idPost){
                return $http.get(config.STATIC_URL + 'notifications/' + idPost).then(handleSuccess, handleError);
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
