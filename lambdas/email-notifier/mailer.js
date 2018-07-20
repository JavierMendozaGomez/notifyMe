"use strict"

let nodemailer = require('nodemailer')
let config = require('./configs/config.js')
let transporter = nodemailer.createTransport({
    host: 'email-smtp.eu-west-1.amazonaws.com',
    port: 587,
    secure: false,
    auth: {
        user: config.SES.SMTP_USER,
        pass: config.SES.SMTP_PASS
    }
})

module.exports = {

    sendMail: function (mailOptions, callback) {
        mailOptions.from = config.SES.FROM
        transporter.sendMail(mailOptions, (error) => {
            if (error) {
                console.log(error);
                return callback(error);
            }
            return callback(null)
        });
    }

}
