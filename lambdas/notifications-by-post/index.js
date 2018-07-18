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

let getRangeOfNotifications = function (idPost, lastNotification, callback) {
    let query = {
        TableName: config.TABLE.NOTIFICATIONS,
        IndexName: 'idPost-index',
        KeyConditionExpression: 'idPost = :idPost',
        ExpressionAttributeValues: {
            ':idPost': idPost
        },
        ProjectionExpression: '#type, post, #comment, #user',
        ExpressionAttributeNames: { '#type': 'type', '#comment': 'comment', '#user': 'user' },
    }
    if (lastNotification)
        query.ExclusiveStartKey = lastNotification

    dynamo.query(query, (err, result) => {
        if (err) {
            return callback(err)
        }
        return callback(null, { LastEvaluatedKey: result.LastEvaluatedKey, items: result.Items })
    })
}

let getNotifications = function (idPost, callback) {
    let items = []
    let lastNotification, moreNotifications = true

    async.whilst(
        function () { return moreNotifications; }, // Do the queries until get all the notifications
        function (callbackRange) {
            getRangeOfNotifications(idPost, lastNotification, (err, response) => {
                if (err)
                    return callbackRange(err)
                if (response.LastEvaluatedKey)
                    lastNotification = response.LastEvaluatedKey
                else
                    moreNotifications = false
                items = items.concat(response.items)
                callbackRange(null, items)
            })
        },
        function (err, listItems) {
            if (err)
                return callback(err)
            return callback(null, listItems)
        })
}

exports.handler = (event, context, result) => {
    console.log("Event", event)

    if (!event.pathParameters || !event.pathParameters.id) {
        return result('Bad Request: Needs to send the id of the post')
    }
    let idPost = event.pathParameters.id
    async.waterfall([
        (callback) => {
            getNotifications(idPost, (err, items) => {
                if (err)
                    return callback(err)
                return callback(null, items)
            })
        },
        (items, callback) => {
                let Key = idPost + '.json'
                fs.writeFile('/tmp/' + Key, JSON.stringify(items), function (err) {
                    if (err)
                        return callback(err);
                    fs.readFile('/tmp/' + Key, (err, data) => {
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
                                        return callback(error)
                                    }
                                    else {
                                        console.log('tmp files removed');
                                        var params = { Bucket: config.CLIENT_CONSTANTS.BUCKET_NAME, Key, Expires: 180 };
                                        var url = s3.getSignedUrl('getObject', params);
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
                    console.log("Response error", error)
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
                    console.log("ResponseObj", responseObj)
                    response = {
                        "statusCode": 200,
                        "body": JSON.stringify(responseObj, null, "\t"),
                        "isBase64Encoded": false,
                        "headers": {
                            "Content-Type": "application/json", "Access-Control-Allow-Origin": "*"
                        }
                    };
                }
                console.log("Final response", response)
        return result(null, response)
    });
}
