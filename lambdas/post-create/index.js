'use strict'

'use strict'
let doc = require('aws-sdk'),
    async = require('async'),
    config = require('./configs/config.js'),
    authCheck = require('./helpers/auth'),
    misc = require('./helpers/misc'),
    AWS = require("aws-sdk");
    AWS.config.update({
        accessKeyId: config.CLIENT_CONSTANTS.AWS_API_KEY,
        secretAccessKey: config.CLIENT_CONSTANTS.AWS_SECRET,
        region: config.CLIENT_CONSTANTS.AWS_REGION
    });

let dynamo = new AWS.DynamoDB.DocumentClient();

exports.handler = (event, context, result) => {
    console.log('Event', event)
    let access_token = event.access_token,
        title = event.title,
        text = event.text
    if (!access_token || !title || !text) {
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
        (executor,callback) => {
            let preparedItem = {
                id: misc.md5(executor.id + Date.now()),
                author: executor.name,
                createdAt: Math.ceil(Date.now() / 1000),
                updatedAt: Math.ceil(Date.now() / 1000),
                createdBy: executor.id,
                updatedBy: executor.id,
                env:'PUBLIC',
                title,
                text
            }

            let paramsObj = {
                TableName: config.TABLE.POSTS,
                Item: preparedItem
            }
            console.log('Post item', paramsObj)
            
            dynamo.put(paramsObj, (err, queryResult) => {
                if (err) {
                    console.log(err)
                    return callback('Bad Request: Unable to create post')
                }
                return callback(null, {success: true, id: preparedItem.id})
            })
        }
    ], (error, responseObj) => {
        if (error) {
            return result(error)
        }
        return result(null, responseObj)
    })
}
