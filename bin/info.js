#!/usr/bin/env node

var _ = require('underscore');
var config = require('..');

var argv = require('optimist')
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

config.stackInfo(argv, function(err, result) {
    console.log(err ? err : result);
});
