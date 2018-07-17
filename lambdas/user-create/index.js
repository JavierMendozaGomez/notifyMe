'use strict'
const SALT_ROUNDS = 10

let bcrypt = require('bcrypt'),
    misc = require('./helpers/misc'),
    async = require('async'),
    dbGetter = require('./helpers/dbGetter.js'),
    config = require('./configs/config.js'),
    AWS = require("aws-sdk");
    AWS.config.update({
        accessKeyId: config.CLIENT_CONSTANTS.AWS_API_KEY,
        secretAccessKey: config.CLIENT_CONSTANTS.AWS_SECRET,
        region: config.CLIENT_CONSTANTS.AWS_REGION
    });
let dynamo = new AWS.DynamoDB.DocumentClient()

exports.handler = (event, context, result) => {
    console.log("Event", event);
    let email = event.email,
        password = event.password,
        name = event.name

    if (!email || !password || !name) {
        return result('Bad Request: Some of mandatory fields are missing')
    }
    async.waterfall([
        (callback) => {
            dbGetter.getUserByEmail(email.toUpperCase(), (error, item) => {
                if (error) {
                    console.log(error)
                    return callback('Internal Server Error: Request to db failed')
                }
                if (item) {
                    console.log(`Email is already in use ${email}`)
                    return callback('Bad Request: Email must be unique', { success: false })
                }
                else {
                    return callback(null, null)
                }
            })
        },
        (executor, callback) => {
            let hash = bcrypt.hashSync(password, SALT_ROUNDS)
            let id = misc.md5(email + Date.now())

            let preparedItem = {
                id,
                name,
                email:email.toUpperCase(),
                password: hash
            }
            let paramsUser = {
                TableName: config.TABLE.USERS,
                Item: preparedItem
            }
            console.log('User item', paramsUser)
            
            dynamo.put(paramsUser, (err, queryResult) => {
                if (err) {
                    console.log(err)
                    return callback('Bad Request: Unable to create notification')
                }
                return callback(null, {success:true})
            })
        },
    ], (error, responseObj) => {
        if (error) {
            return result(null, {error})
        }
        return result(null, responseObj)
    })
}
