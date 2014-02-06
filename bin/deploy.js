#!/usr/bin/env node

var _ = require('underscore');
var config = require('..');
// var env = require('superenv')('cfn');
// var AWS = require('aws-sdk');

var argv = require('optimist')
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
    .boolean('iam')
    .describe('iam', 'Set to allow stack to create IAM resources')
    .argv;

config.createStack(argv, function (err) {
    console.log(err ? err : 'Created stack: ' + argv.name);
});
