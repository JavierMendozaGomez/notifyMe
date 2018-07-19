'use strict'
let doc = require('aws-sdk'),
    async = require('async'),
    authCheck = require('./helpers/auth'),
    config = require('./configs/config.js'),
    AWS = require("aws-sdk");
    AWS.config.update({
        accessKeyId: config.CLIENT_CONSTANTS.AWS_API_KEY,
        secretAccessKey: config.CLIENT_CONSTANTS.AWS_SECRET,
        region: config.CLIENT_CONSTANTS.AWS_REGION
    });

let dynamo = new AWS.DynamoDB.DocumentClient();

exports.handler = (event, context, result) => {
    console.log('Event', event)
    let access_token = event.access_token

    if (!access_token) {
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
            dynamo.query({
                TableName: config.TABLE.NOTIFICATIONS,
                IndexName: 'read-index',
                KeyConditionExpression: '#read = :read',
                ExpressionAttributeNames:{
                    '#read':'read'
                },
                ExpressionAttributeValues: {
                    ':read': executor.id + '_unreaded'
                },
                Limit: 5
            }, (err, result) => {  
                if (err) {
                    console.log("Error",err);
                    return callback(err)
                }
                return callback(null, {items: result.Items, LastEvaluatedKey: result.LastEvaluatedKey})
            })
        },
        (responseObj, callback) => {
            async.each(responseObj.items, function(item, cbUpdate) {
                let params = {
                    TableName: config.TABLE.NOTIFICATIONS,
                    Key: { id : item.id },
                    ConditionExpression: 'id = :id',
                    UpdateExpression: 'set #read = :read',
                    ExpressionAttributeNames:{'#read':'read'},                
                    ExpressionAttributeValues: {
                      ':read' : item.idPostCreator + '_readed',
                      ':id': item.id
                    }
                  };
                  dynamo.update(params, function(err, data) {
                    if (err) 
                        return callback(err);
                    cbUpdate(null, null)
                 });
            }, function(err) {
                if( err ) {
                    return callback(err)
                } else {
                    return callback(null, {success:true, LastEvaluatedKey: responseObj.LastEvaluatedKey})
                }
            });
        }
    ], (error, responseObj) => {
        if (error) {
            return result(error)
        }
        return result(null, responseObj)
    })
}
