'use strict'

module.exports = (grunt) => {
    let lambdaFunctions = [
        "comment-create",
        "comments",
        "email-notifier",
        "login",
        "logout",
        "get-constants",
        "notifications-by-post",
        "notifications-by-user",
        "post-create",
        "post-read",
        "posts",
        "reaction-create",
        "reaction-delete",
        "reaction-update",
        "user-create"
    ]
    let copyHelpers = []
    let copyAWSEnv = []
    let copyConfigFile = []


    for (let lambda of lambdaFunctions) {
        copyHelpers.push({
            expand: true,
            cwd: 'base',
            src: ['helpers/**'],
            dest: `${lambda}/`
        })
        copyConfigFile.push({
            expand: true,
            cwd: 'base/configs/',
            src: ['**'],
            dest: `${lambda}/configs/`
        })
        copyAWSEnv.push({
            expand: true,
            cwd: 'base/',
            src: ['.env'],
            dest: `${lambda}/`
        })
    }

    grunt.initConfig({
        copy: {
            helpers: {
                files: copyHelpers
            },
            awsEnv: {
                files: copyAWSEnv
            },
            config: {
                files: copyConfigFile
            }
        },

    })

    grunt.loadNpmTasks('grunt-contrib-copy')
    grunt.registerTask('init', ['copy:helpers', 'copy:config', 'copy:awsEnv'])
}
