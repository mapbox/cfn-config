#!/usr/bin/env node

var _ = require('underscore');
var config = require('..');

var argv = require('optimist')
    .options('template', {
        describe: 'AWS CloudFormation template to be deployed',
        demand: true,
        alias: 't'
    })
    .options('region', {
        describe: 'AWS region deployed the stack',
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
    .argv;

config.configStack(argv, function(err) {
    console.log(err ? err : 'Created config file!');
});
