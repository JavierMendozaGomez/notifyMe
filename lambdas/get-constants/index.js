'use strict'
let authCheck = require('./helpers/auth')

exports.handler = (event, context, result) => {
    console.log('Event', event)
    let access_token = event.access_token

    if (!access_token) {
        return result('Bad Request: Some of mandatory fields are missing')
    }
    authCheck(access_token).then((response) => {
        delete response.user.password
        return result(null, response.user)
    }).catch((error) => {
        if (error) {
            return result(error)
        }
    })
}
