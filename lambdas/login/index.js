'use strict'
const SALT_ROUNDS = 10

let bcrypt = require('bcrypt'),
    async = require('async'),
    token = require('./helpers/tokens.js'),
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
    let email = event.email,
        password = event.password

    if (!email || !password) {
        return result('Bad Request: Some of mandatory fields are missing')
    }
    async.waterfall([
        (callback) => {
            dbGetter.getUserByEmail(email.toUpperCase(), (error, user) => {
                if (error) {
                    console.log(error)
                    return callback('Internal Server Error: Request to db failed')
                }
                if (!user) {
                    return callback('Bad Request: User with provided credentials not found')                }
                else {
                    return callback(null, user)
                }
            })
        },
        (user, callback) => {
            bcrypt.compare(password, user.password, (err, res) => {
                if (!res) {
                    return callback('Bad Request: wrong password')
                }
                token(user.id).then((access_token) => {
                    user.access_token = access_token
                    delete user.password
                    return callback(null, user)
                }).catch((err) => {
                    return callback(err)
                })
            })
        },
    ], (error, responseObj) => {
        if (error) {
            return result(null, {error})
        }
        return result(null, responseObj)
    })
}
