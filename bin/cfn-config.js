#!/usr/bin/env node

var path = require('path');
var meow = require('meow');
var commands = require('../lib/commands');

var cli = meow(`
  USAGE: cfn-prompt <command> <environment> [templatePath] [options]

  command: one of the following
    - create                create a new stack
    - update                update an existing stack
    - delete                delete an existing stack
    - info                  fetch information about an existing stack
    - save                  save an existing stack's configuration

  environment:
    The stack's name is constructed as name-environment

  templatePath:
    Relative path to the CloudFormation template in JSON format, required for create and update

  options:
    -n, --name              the stack's base name (default: current directory name)
    -r, --region            the stack's region (default: us-east-1)
    -c, --config-bucket     an S3 bucket for storing stack configurations
    -t, --template-bucket   an S3 bucket in the same region as the stack for storing templates
    -k, --kms               a KMS key ARN for configuration encryption at rest
`, {
  alias: { c: 'config-bucket', t: 'template-bucket', n: 'name', r: 'region' },
  string: ['config-bucket', 'template-bucket', 'name', 'region'],
  default: {
    name: path.basename(process.cwd()),
    region: 'us-east-1'
  }
});

var command = cli.input[0];
var environment = cli.input[1];
var templatePath = path.resolve(cli.input[2]);
function callback(err, data) {
  if (err) return process.stderr.write(err.message + '\n');
  if (data) process.stdout.write(JSON.stringify(data, null, 2) + '\n');
}

var available = commands(cli.flags);
if (!available[command]) return cli.showHelp();

var args = [environment];
if (command === 'create' || command === 'update') args.push(templatePath);
if (command === 'save') args.push(cli.flags.kms);
args.push(callback);

available[command].apply(null, args);
