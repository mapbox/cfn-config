#!/usr/bin/env node

var _ = require('underscore');
var config = require('..');

var argv = require('optimist')
    .options('region', {
        describe: 'AWS region deployed the stack',
        alias: 'r'
    })
    .options('name', {
        describe: 'Name of the AWS CloudFormation to deploy',
        demand: true,
        alias: 'n'
    })
    .argv;

config.deleteStack(argv, function (err) {
    console.log(err ? err : 'Deleted stack: ' + argv.name);
});
