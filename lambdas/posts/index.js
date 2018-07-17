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
                TableName: config.TABLE.POSTS,
                IndexName: 'env-index',
                KeyConditionExpression: 'env = :env',
                ScanIndexForward: false,
                ExpressionAttributeValues: {
                    ':env': 'PUBLIC'
                }
                }, (err, result) => {  
                if (err) {
                    console.log("Error",err);
                    return callback(err)
                }
                return callback(null, result.Items)
            })
        } 
    ], (error, responseObj) => {
        if (error) {
            return result(error)
        }
        return result(null, responseObj)
    })
}
