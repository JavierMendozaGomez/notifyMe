'use strict'
let async = require('async'),
    config = require('./configs/config.js'),
    dbGetter = require('./helpers/dbGetter'),
    mailer = require('./mailer'),
    AWS = require("aws-sdk");
    AWS.config.update({
        accessKeyId: config.CLIENT_CONSTANTS.AWS_API_KEY,
        secretAccessKey: config.CLIENT_CONSTANTS.AWS_SECRET,
        region: config.CLIENT_CONSTANTS.AWS_REGION
    });

let dynamo = new AWS.DynamoDB.DocumentClient()

let sendNotifications = function(user, notifications, callback){
    let mailOptions = {
        to: user.email,
        subject: "NotifyMe-You have unread notifications!", 
        text: JSON.stringify(notifications), 
    }
    mailer.sendMail(mailOptions, (error) => {
        if (error) {
            console.log(error)
            return callback('Error sending email to ' + user.email)
        }
        return callback(null, 'Successfulluy sendeded to' + user.email)
    });
}

let getRangeOfUsers = function(lastUser, callback){
    let query = {
        TableName: config.TABLE.USERS,
        IndexName: 'read-index',
        KeyConditionExpression: '#read = :read',
        ExpressionAttributeNames: { '#read': 'read' },
        ExpressionAttributeValues: {
            ':read': 'true'
        }
    }
    if (lastUser)
        query.ExclusiveStartKey = lastUser

    dynamo.query(query, (err, result) => {
        if (err) {
            return callback(err)
        }
        return callback(null, { LastEvaluatedKey: result.LastEvaluatedKey, items: result.Items })
    })
}

let getUsersWithUnreadNotif = function(callback){
    let items = []
    let lastUser, moreUsers = true

    async.whilst(
        function () { return moreUsers; }, // Do the queries until get all the users
        function (callbackRange) {
            getRangeOfUsers(lastUser, (err, response) => {
                if (err)
                    return callbackRange(err)
                if (response.LastEvaluatedKey)
                    lastUser = response.LastEvaluatedKey
                else
                    moreUsers = false
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

let getLatestNotifOfUser = function (user, callback) {
    let query = {
        TableName: config.TABLE.NOTIFICATIONS,
        IndexName: 'read-index',
        KeyConditionExpression: '#read = :read',
        ExpressionAttributeNames: {
            '#read': 'read'
        },
        ExpressionAttributeValues: {
            ':read': user.id + '_unreaded'
        },
        Limit: 5
    }
    dynamo.query(query, (err, result) => {
        if (err) {
            console.log("Error", err);
            return callback(err)
        }
        return callback(null, { items: result.Items, LastEvaluatedKey: result.LastEvaluatedKey })
    })
}

exports.handler = (event, context, result) => {
    async.waterfall([
        (callback) => {
            getUsersWithUnreadNotif((err, users)=>{
                if(err)
                    return callback(err)
                return callback(null, users)
            })
        },
        (users, callback) =>{
            async.each(users, (user, cbUser) => {
                getLatestNotifOfUser(user, (err, notifications)=>{
                    if(err)
                        return cbUser(err)
                    console.log('Notifications of user', notifications)
                    sendNotifications(user, notifications, (err, responseObj)=>{
                        if(err)
                            console.log(err)
                        else
                            console.log(responseObj)
                        cbUser()
                    })
                })
            }, (err) => {
                if(err)
                   return callback(err)
                return callback(null, 'All notifications sended')
            })
        }
    ], (error, responseObj) => {
        if (error) {
            return result(error)
        }
        return result(null, responseObj)
    })
}
