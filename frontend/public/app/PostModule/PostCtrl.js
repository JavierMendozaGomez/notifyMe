"use strict";
(function () {
    app.controller('PostCtrl', function ($scope, $rootScope, $location, $routeParams, PostService, CommentService, NotificationService, ReactionService, S3Service) {
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
        
        let id = $routeParams.id;
        if (!id) {//Creating or listing lastest post
            //Listing lastest post
            if ($location.url().indexOf('create') == -1) {
                PostService.getAll().then((response) => {
                    if (response.error) {
                        console.log(response.error)
                    }
                    else {
                        console.log('Response', response)
                        $scope.posts = response
                        $rootScope.processDates(response)
                    }
                })
            }
        }
        else{
            //Get post item
            PostService.getById(id).then((response) => {
                if (response.error) {
                    console.log(response.error)
                }
                else {
                    $scope.post = response
                    CommentService.getAll(id).then((response)=>{
                        if (response.error) {
                        }
                        else {
                            $scope.comments = response
                            $rootScope.processDates(response)
                        }
                    })

                    ReactionService.get(id).then((response)=>{
                        if(response.error)
                          console.log(response.error)
                        else{
                            console.log('Response', response)
                            $scope.reaction = response
                        }
                    })
                    
                }
            })
        }

        $scope.addComment = function(comment){
            comment.idPost = $scope.post.id
            CommentService.create(comment).then((response)=>{
                if(response.error){
                    console.log(error)
                }
                else{
                    console.log('Response add comment', response)
                    $rootScope.processDate(response)
                    $scope.comments.push(response)
                    delete $scope.comment
                }
            }
        )}

        $scope.viewPost = function(id){
            $location.url('/posts/view/'+id)
        }
        $scope.go = function (url) {
            $location.url(url);
        }
        
        $scope.createPost = function(post){
            PostService.create(post).then( (response) =>{
                if(response.error){
                    console.log(error)
                }
                else{
                    console.log('Response post creation', response)
                    $location.url('/posts/view/'+ response.id)
                }
            })
        }

        $scope.getNotificationReport = function(post){
            NotificationService.getNotificationReport(post.id).then((response)=>{
                if(response.error){
                    console.log('Error getting report')
                }
                else{
                    S3Service.downloadFile(response, post.id)
                }
            })
        }
    })
})()