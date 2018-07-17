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
                return callback(null, executor, postItem, reactionItem)
            })
        },
        (executor, postItem, reactionItem, callback) => {
            let notifItem = {
                id: misc.md5(reactionItem.id + Date.now()),
                type,
                idPost:postItem.id,
                idPostCreator: postItem.createdBy,
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
            
            dynamo.put(paramsNotif, (err, queryResult) => {
                if (err) {
                    console.log(err)
                    return callback('Bad Request: Unable to create notification')
                }
                reactionItem.idNotif = notifItem.id
                return callback(null, notifItem, reactionItem)
            })
        },
        (notifItem, reactionItem, callback) =>{
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
    ], (error, responseObj) => {
        if (error) {
            return result(error)
        }
        return result(null, responseObj)
    })
}
