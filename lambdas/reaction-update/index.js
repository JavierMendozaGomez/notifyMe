'use strict'
const fs = require('fs');
let async = require('async'),
    config = require('./configs/config.js'),
    authCheck = require('./helpers/auth'),
    dbGetter = require('./helpers/dbGetter'),
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

    if (!access_token || !idPost || !type ) {
        return result('Bad Request: Some of mandatory fields are missing')
    }
    async.waterfall([
        (callback) => {
            authCheck(access_token).then((response) => {
                 return callback(null, response.user)
            }).catch((error) => {
                if(error){
                  return callback(error)
                }
            })
        },
        (executor, callback) => {
            let id = idPost + '_' + executor.id
            dbGetter.getReaction(id,(err, reactionItem)=> {
                if(err)
                    return callback(err)
                return callback(null, reactionItem)
            })
        },
        (reactionItem, callback)=>{
            let params = {
                TableName: config.TABLE.REACTIONS,
                Key: { id : reactionItem.id },
                ConditionExpression: 'id = :id',
                UpdateExpression: 'set #type = :type, typeOfReaction = :typeOfReaction',
                ExpressionAttributeNames:{'#type':'type'},                
                ExpressionAttributeValues: {
                  ':type' : type,
                  ':typeOfReaction': reactionItem.idPost + '_' + type,
                  ':id': reactionItem.id
                }
              };
              dynamo.update(params, function(err, data) {
                if (err) 
                    return callback(err);
                reactionItem.type = type
                reactionItem.typeOfReaction = reactionItem.idPost + '_' + type
                return callback(null, reactionItem)
             });
        },
        (reactionItem, callback) =>{
            dbGetter.getPost(reactionItem.idPost, (err, postItem) =>{
                if(err)
                    return callback(err)
                return callback(null, reactionItem, postItem)
            })
        },
        (reactionItem, postItem, callback) =>{
            let params = {
                TableName: config.TABLE.NOTIFICATIONS,
                Key: { id : reactionItem.idNotif },
                ConditionExpression: 'id = :id',
                UpdateExpression: 'set #read = :read,  #type = :type',
                ExpressionAttributeNames:{'#type':'type','#read':'read'},                
                ExpressionAttributeValues: {
                  ':read' : postItem.createdBy + '_unreaded',
                  ':type' :type,
                  ':id': reactionItem.idNotif
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
