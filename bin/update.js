#!/usr/bin/env node

var _ = require('underscore');
var config = require('..');
var env = require('superenv')('cfn');
var optimist = require('optimist');

config.setCredentials(env.accessKeyId, env.secretAccessKey, env.bucket);

var argv = optimist
    .options('template', {
        describe: 'AWS CloudFormation template to be deployed',
        demand: true,
        alias: 't'
    })
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
    .options('config', {
        describe: 'Path to a configuration file to read',
        alias: 'c'
    })
    .options('headless', {
        describe: 'Do not prompt for configuration choices',
        alias: 'h'
    })
    .options('force', {
        describe: 'Do not prompt for final confirmation',
        alias: 'f'
    })
    .argv;

if (argv.help) return optimist.showHelp();

config.updateStack(argv, function(err, result) {
    if (err) throw err;
    config.monitorStack(argv, function (err) {
        if (err) throw err;
        console.log(result ? 'Updated stack: ' + argv.name : '');
    });
});
