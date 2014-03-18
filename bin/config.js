#!/usr/bin/env node

var _ = require('underscore');
var config = require('..');
var env = require('superenv')('cfn');
var optimist = require('optimist');

config.setCredentials(env.accessKeyId, env.secretAccessKey);

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
        describe: 'Path to a configuration file to read. Can be a local path or an S3 URL',
        alias: 'c'
    })
    .options('filepath', {
        describe: 'Where to save the configuration file. Can be a local path or an S3 URL',
        alias: 'f'
    })
    .check(function(argv) {
        if (!argv.filepath) {
            argv.filepath = path.resolve(argv.name + '.cfn.json');
        }
    })
    .argv;

if (argv.help) return optimist.showHelp();

config.configStack(argv, function(err, stack) {
    if (err) throw err;
    config.writeConfiguration(stack.configuration, argv.filepath, function(err) {
        if (err) return console.error(err);
    });
});
