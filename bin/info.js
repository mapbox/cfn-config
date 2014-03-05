#!/usr/bin/env node

var _ = require('underscore');
var config = require('..');
var env = require('superenv')('cfn');
var optimist = require('optimist');

config.setCredentials(env.accessKeyId, env.secretAccessKey);

var argv = optimist
    .options('region', {
        describe: 'AWS region deployed the stack',
        demand: true,
        alias: 'r'
    })
    .options('name', {
        describe: 'Name of the AWS CloudFormation stack to inspect',
        demand: true,
        alias: 'n'
    })
    .options('resources', {
        describe: 'Also fetch information about resources in the stack',
        boolean: true
    })
    .argv;

if (argv.help) return optimist.showHelp();

config.stackInfo(argv, function(err, result) {
    if (err) throw err;
    console.log(result);
});
