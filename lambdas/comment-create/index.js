'use strict'
const fs = require('fs');
let async = require('async'),
    config = require('./configs/config.js'),
    authCheck = require('./helpers/auth'),
    dbGetter = require('./helpers/dbGetter'),
    misc = require('./helpers/misc'),
    AWS = require("aws-sdk");
AWS.config.update({
    accessKeyId: config.CLIENT_CONSTANTS.AWS_API_KEY,
    secretAccessKey: config.CLIENT_CONSTANTS.AWS_SECRET,
    region: config.CLIENT_CONSTANTS.AWS_REGION
});

let dynamo = new AWS.DynamoDB.DocumentClient()

/*Creates a comment in a post*/
let createComment = function (executor, postItem, commentText, callback) {
    let commentItem = {
        id: misc.md5(executor.id + Date.now()),
        idPost: postItem.id,
        commentText,
        createdAt: Math.ceil(Date.now() / 1000),
        author: executor.name,
        createdBy: executor.id,
        updatedBy: executor.id,
    }

    let paramsComment = {
        TableName: config.TABLE.COMMENTS,
        Item: commentItem
    }
   console.log('Comment item', paramsComment)

    dynamo.put(paramsComment, (err, queryResult) => {
        if (err) {
            console.log(err)
            return callback('Bad Request: Unable to create case')
        }
        console.log('Comment created')
        return callback(null, commentItem)
    })
}

/* Creates a notification to the user creator of the post*/
let createNotificationComment = function (executor, postItem, commentItem, callback) {
    let notifItem = {
        id: misc.md5(commentItem.id + Date.now()),
        type: 'Comment',
        idPost: postItem.id,
        idPostCreator: postItem.createdBy,
        read: postItem.createdBy + '_unreaded',
        post: {
            id: postItem.id,
            title: postItem.title
        },
        comment: {
            id: commentItem.id,
            commentText: commentItem.commentText
        },
        user: {
            id: executor.id,
            name: executor.name
        },
        createdAt: Math.ceil(Date.now() / 1000),
    }

    let paramsNotif = {
        TableName: config.TABLE.NOTIFICATIONS,
        Item: notifItem
    }
 console.log('Notification item', notifItem)

    async.parallel([
        (cb) => {
            dynamo.put(paramsNotif, (err, queryResult) => {
                if (err) {
                    console.log(err)
                    return cb('Bad Request: Unable to create notification')
                }
                console.log('Notification created')
                return cb(null, commentItem)
            })
        },
        (cb) => {
            updateUserNotification(postItem.createdBy, (err, response) => {
                if (err)
                    return cb(err)
                return cb(null, response)
            })
        }],
        (err, results) => {
            if (err)
                return callback(err)
            return callback(null, notifItem)
        });
}

/* The creator of the post is added to the list of users with unread notifications*/
let updateUserNotification = function (idPostCreator, callback) {
    async.waterfall([
        (cb) => {
            dbGetter.getUser(idPostCreator, (err, user) => {
                if (err)
                    return cb(err)
                return cb(null, user)
            })
        },
        (user, cb) => {
            if (!user.read) {
                let params = {
                    TableName: config.TABLE.USERS,
                    Key: { id: user.id },
                    ConditionExpression: 'id = :id',
                    UpdateExpression: 'set #read = :read',
                    ExpressionAttributeNames: { '#read': 'read' },
                    ExpressionAttributeValues: {
                        ':read': 'true',
                        ':id': user.id
                    }
                };
                dynamo.update(params, function (err, data) {
                    console.log('ERROR ACTUALIZANDO PARAMS', err)
                    if (err)
                        return cb(err);
                    return cb(null, user)
                });
            }
            else
                return cb(null, user)

        }
    ], (error, responseObj) => {
        if (error) {
            return callback(error)
        }
        return callback(null, responseObj)
    })

}

exports.handler = (event, context, result) => {
    console.log('Event', event)
    let access_token = event.access_token,
        idPost = event.idPost,
        commentText = event.commentText

    if (!access_token || !idPost || !commentText) {
        return result('Bad Request: Some of mandatory fields are missing')
    }
    async.waterfall([
        (callback) => {
            authCheck(access_token).then((response) => {
                return callback(null, response.user)
            }).catch((error) => {
                if (error) {
                    return callback(error)
                }
            })
        },
        (executor, callback) => {
            dbGetter.getPost(idPost, (err, postItem) => {
                if (err)
                    return callback(err)
                return callback(null, executor, postItem)
            })
        },
        (executor, postItem, callback) => {
            createComment(executor, postItem, commentText, (err, commentItem) => {
                if (err)
                    return callback(err)
                return callback(null, executor, postItem, commentItem)
            })
        },
        (executor, postItem, commentItem, callback) => {
            createNotificationComment(executor, postItem, commentItem, (err, notifItem) => {
                if (err)
                    return callback(err)
                return callback(null, commentItem)
            })
        }
    ], (error, responseObj) => {
        if (error) {
            return result(error)
        }
        return result(null, responseObj)
    })
}
