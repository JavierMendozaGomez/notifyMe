(function () {
    'use strict';
    app.factory('NotificationService', ['$http', '$rootScope',
        function ( $http, $rootScope) {
            var service = {};

            service.getNotificationsByUser = function(){
                return $http.post(config.STATIC_URL + 'notifications-by-user', {
                    access_token: $rootScope.user.token
                }).then(handleSuccess, handleError);
            }

            service.getNotificationReport = function(idPost){
                return $http.get(config.STATIC_URL + 'notifications/' + idPost).then(handleSuccess, handleError);;
               // return $http.get(config.STATIC_URL + 'notifications/' + idPost).then(handleSuccess, handleError);
            }

            function handleSuccess(res) {
                console.log('Res', res)
                return res.data;
            }

            function handleError(error) {
                return error;
            }

            return service;
        }])
})();
