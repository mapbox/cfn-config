#!/usr/bin/env node

var _ = require('underscore');
var config = require('..');
var env = require('superenv')('cfn');
var optimist = require('optimist');

config.setCredentials(env.accessKeyId, env.secretAccessKey, env.bucket);

var argv = optimist
    .options('region', {
        describe: 'AWS region deployed the stack',
        demand: true,
        alias: 'r'
    })
    .options('name', {
        describe: 'Name of the AWS CloudFormation to deploy',
        demand: true,
        alias: 'n'
    })
    .argv;

if (argv.help) return optimist.showHelp();

config.deleteStack(argv, function(err, result) {
    if (err) throw err;
    console.log(result ? 'Deleted stack: ' + argv.name : '');
});
