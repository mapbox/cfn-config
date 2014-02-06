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

config.stackInfo(argv, function(err, result) {
    console.log(err ? err : result);
});
