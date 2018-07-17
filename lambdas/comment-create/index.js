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
                if(error){
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
                return callback(null, executor, postItem, commentItem)
            })
        },
        (executor, postItem, commentItem, callback) => {
            let notifItem = {
                id: misc.md5(commentItem.id + Date.now()),
                type:'Comment',
                idPost:postItem.id,
                idPostCreator: postItem.createdBy,
                post:{
                    id: postItem.id,
                    title: postItem.title
                },
                comment:{
                    id: commentItem.id,
                    commentText: commentItem.commentText
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
