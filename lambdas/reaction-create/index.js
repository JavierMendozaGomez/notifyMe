'use strict'

'use strict'
let doc = require('aws-sdk'),
    async = require('async'),
    config = require('./configs/config.js'),
    dbGetter = require('./helpers/dbGetter'),
    authCheck = require('./helpers/auth'),
    misc = require('./helpers/misc'),
    AWS = require("aws-sdk");
    AWS.config.update({
        accessKeyId: config.CLIENT_CONSTANTS.AWS_API_KEY,
        secretAccessKey: config.CLIENT_CONSTANTS.AWS_SECRET,
        region: config.CLIENT_CONSTANTS.AWS_REGION
    });

/*Creates a reaction in a post */
let reactionCreate = function(executor, postItem, type, callback){
    let reactionItem = {
        id: postItem.id + '_' + executor.id,
        idPost: postItem.id,
        type,
        typeOfReaction: postItem.id + '_'+ type,
        createdBy: executor.id,
    }

    let paramsReaction = {
        TableName: config.TABLE.REACTIONS,
        Item: reactionItem
    }
    console.log('Reaction item', paramsReaction)
    
    dynamo.put(paramsReaction, (err, queryResult) => {
        if (err) {
            console.log(err)
            return callback('Bad Request: Unable to create reaction')
        }
        return callback(null, reactionItem)
    })
}

/* Creates a notification to the user creator of the post*/
let createNotifReaction = function (executor, postItem, reactionItem, type, callback) {
    let notifItem = {
        id: misc.md5(reactionItem.id + Date.now()),
        type,
        idPost:postItem.id,
        idPostCreator: postItem.createdBy,
        read: postItem.createdBy + '_unreaded',
        post:{
            id: postItem.id,
            title: postItem.title
        },
        user:{
            id:executor.id,
            name: executor.name
        },
        createdAt: Math.ceil(Date.now() / 1000),
    }

    let paramsNotif = {
        TableName: config.TABLE.NOTIFICATIONS,
        Item: notifItem
    }
    console.log('Notification item', paramsNotif)

    async.parallel([
        (cb) => {
            dynamo.put(paramsNotif, (err, queryResult) => {
                if (err) {
                    console.log(err)
                    return cb('Bad Request: Unable to create notification')
                }
                console.log('Notification created')
                return cb(null, reactionItem)
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

/* Updates the reaction for add a reference to the notification*/
let updateReaction = function(reactionItem, notifItem, callback){
    let params = {
        TableName: config.TABLE.REACTIONS,
        Key: { id : reactionItem.id },
        ConditionExpression: 'id = :id',
        UpdateExpression: 'set idNotif = :idNotif',
        ExpressionAttributeValues: {
          ':idNotif' : notifItem.id,
          ':id': reactionItem.id
        }
      };
      dynamo.update(params, function(err, data) {
        if (err) 
            return callback(err);
        return callback(null, reactionItem)
     });
}

let dynamo = new AWS.DynamoDB.DocumentClient()

exports.handler = (event, context, result) => {
    console.log('Event', event)
    let access_token = event.access_token,
        idPost = event.idPost,
        type = event.type

    if (!access_token || !idPost || !type) {
        return result('Bad Request: Some of mandatory fields are missing')
    }
    async.waterfall([
        (callback) => {
            authCheck(access_token).then((response) => {
                 return callback(null, response.user)
            }).catch((error) => {
                if(error){
                    console.log('Error', error)
                  return callback(error)
                }
            })
        },
        (executor, callback) => {
            dbGetter.getPost(idPost,(err, postItem)=> {
                if(err)
                    return callback(err)
                return callback(null, executor, postItem)
            })
        },
        (executor, postItem, callback) => {
            reactionCreate(executor, postItem, type, (err, reactionItem)=>{
                if(err)
                    return callback(err)
                return callback(null, executor, postItem, reactionItem)
            })
        },
        (executor, postItem, reactionItem, callback) => {
            createNotifReaction(executor, postItem, reactionItem, type, (err, notifItem) =>{
                if(err)
                    return callback(err)
                return callback(null, notifItem, reactionItem)
            })
        },
        (notifItem, reactionItem, callback) =>{
            updateReaction(reactionItem, notifItem, (err, response)=>{
                if(err)
                    return callback(err)
                return callback(null, reactionItem)
            })
        }
    ], (error, responseObj) => {
        if (error) {
            return result(error)
        }
        return result(null, responseObj)
    })
}
