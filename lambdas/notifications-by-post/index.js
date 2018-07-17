'use strict'
const fs = require('fs');
const exec = require('child_process').exec;
let async = require('async'),
    config = require('./configs/config.js'),
    AWS = require("aws-sdk");
    AWS.config.update({
        accessKeyId: config.CLIENT_CONSTANTS.AWS_API_KEY,
        secretAccessKey: config.CLIENT_CONSTANTS.AWS_SECRET,
        region: config.CLIENT_CONSTANTS.AWS_REGION
    });

let dynamo = new AWS.DynamoDB.DocumentClient(),
    s3 = new AWS.S3();

exports.handler = (event, context, result) => {
    console.log("Event",event)

    if (!event.pathParameters || !event.pathParameters.id) { 
        return result('Bad Request: Needs to send the id of the post') 
    }    
    let idPost = event.pathParameters.id
    async.waterfall([
        (callback) => {
            dynamo.query({
                TableName: config.TABLE.NOTIFICATIONS,
                IndexName: 'idPost-index',
                KeyConditionExpression: 'idPost = :idPost',
                ExpressionAttributeValues: {
                    ':idPost': idPost
                },
                ProjectionExpression:'#type, post, #comment, #user',
                ExpressionAttributeNames:{'#type':'type', '#comment':'comment', '#user':'user'}
            }, (err, result) => {  
                if (err) {
                    console.log("Error",err);
                    return callback(err)
                }
                return callback(null, result.Items)
        })
        },
        (items, callback)  => {
            let Key = idPost+'.json'
            fs.writeFile ('/tmp/'+ Key, JSON.stringify(items), function(err) {
                if (err) 
                    return callback(err);
                    fs.readFile('/tmp/'+ Key, (err, data) => {
                        if (err) throw err;
                        s3.putObject({
                            Bucket: config.CLIENT_CONSTANTS.BUCKET_NAME,
                            Key,
                            Body: data,
                            ContentType: 'application/json',
                            CacheControl: 'no-cache',
                            Expires: 0
                        }, function (err, data) {
                            if (err) {
                                return callback(err)
                            } else {
                                exec('rm -r  /tmp/' + Key, (error, stdout, stderr) => {
                                    if (error) {
                                        console.log(`exec error: ${error}`)
                                       return  callback(error)
                                    }
                                    else {
                                        console.log('tmp files removed');
                                        var params = {Bucket: config.CLIENT_CONSTANTS.BUCKET_NAME, Key, Expires: 180};
                                        var url = s3.getSignedUrl('getObject', params);
                                        console.log('LA url es ', url)
                                        return callback(null, url)
                                    }
                                })
                            }
                        })
                });
        })
      }
    ], (error, responseObj) => {
        let response = null;

        if (error) {
            console.log("Response error",error)
            let status = 400;
            if (error.startsWith("Access Forbidden")) {
                status = 401
            }
            response = {
                "statusCode": status,
                "body": JSON.stringify(error),
                "isBase64Encoded": false,
                "headers": {
                    "Content-Type": "application/json", "Access-Control-Allow-Origin": "*"
                }
            };
        } 
        else {
            console.log("ResponseObj",responseObj)
            response = {
                "statusCode": 200,
                "body": JSON.stringify(responseObj),
                "isBase64Encoded": false,
                "headers": {
                    "Content-Type": "application/json", "Access-Control-Allow-Origin": "*"
                }
            };
        }
        console.log("Final response",response)

        return result(null, response)
    });
}
