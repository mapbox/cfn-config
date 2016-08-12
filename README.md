Quickly configure and start AWS CloudFormation stacks.

![](https://f.cloud.github.com/assets/83384/2457116/d9e31ce6-af2d-11e3-8150-97cf1e8a2385.gif)

## Features

- CLI tool provides prompting for easy stack configuration and verification of intended changes to your stack.
- Save parameter values in a specified S3 bucket for easy reuse and sharing privately.
- Deploy templates written as either JSON or JavaScript files. JavaScript files must either export JSON directly, or export a function that asynchronously provides JSON.
- JavaScript library functions provide access to high-level routines (e.g. create, update, delete) as well as low-level utilities you can use to build your own deployment workflows.
- Optional KMS encryption of sensitive parameter values.

## Prerequisites

To use cfn-config, you will need to have two (or more) S3 buckets ready:

- config bucket: this is a bucket where cfn-config will save stack configurations (parameter values) that can be reused.

- template buckets: cfn-config will upload your template file to a bucket each time you perform a `create` or `update` action. There must be a bucket in any region to which you intend to deploy CloudFormation stacks. The suggested default bucket names are:

  ```
  cfn-config-templates-{account id}-{region}
  ```

  If you create buckets matching this pattern in each region you wish to use, then you do not need to specify the `--template-bucket` option when using cfn-config's CLI tool.

## CLI Installation

cfn-config includes a CLI tool for working with CloudFormation stacks. Install globally with `npm` to use the CLI commands:

```
$ npm install -g cfn-config
```

## CLI Usage

```
$ cfn-config --help

Quickly configure and start AWS CloudFormation stacks

  USAGE: cfn-config <command> <environment> [templatePath] [options]

  command:
    - create                create a new stack
    - update                update an existing stack
    - delete                delete an existing stack
    - info                  fetch information about an existing stack
    - save                  save an existing stack's configuration

  environment:
    Any string. A stack's name is constructed as name-environment

  templatePath:
    The relative path to the CloudFormation template in JSON format, required
    for create and update commands.

  options:
    -n, --name              the stack's base name (default: current dir name)
    -r, --region            the stack's region (default: us-east-1)
    -c, --config-bucket     an S3 bucket for storing stack configurations.
                            Required for the create, update, and save commands.
    -t, --template-bucket   an S3 bucket for storing templates
                            (default: cfn-config-templates-$AWS_ACCOUNT_ID-region)
    -k, --kms               a KMS key ID for parameter encryption or
                            configuration encryption at rest on S3. If not
                            provided, no encryption will be performed. If
                            provided as a flag without a value, the default
                            key id alias/cloudformation will be used.
    -f, --force             perform a create/update/delete command without any
                            prompting, accepting all defaults
    -e, --extended          display resource details with the info command
```

## JavaScript Installation

Include cfn-config into your project to incorporate/extend its functionality. Add to your project's package.json by running the following from your project's directory:

```
$ npm install --save cfn-config
```

Then, in your scripts:

```js
var cfnConfig = require('cfn-config');
```

## JavaScript Usage

High-level prompting routines to create, update, and delete stacks are provided, as well as to fetch detailed information about a stack or to save an existing stack's configuration to S3.

First, create a commands object:

```js
var options = {
  name: 'my-stack', // the base name of the stack
  region: 'us-east-1', // the region where the stack resides
  templatePath: '~/my-stack/cfn.template.json', // the template file
  configBucket: 'my-cfn-configurations', // bucket for configuration files
  templateBucket: 'cfn-config-templates-123456789012-us-east-1' // bucket for templates
};

var commands = cfnConfig.commands(options);
```

Then, perform the desired operation:

```js
// Create a stack called `my-stack-testing`
commands.create('testing', '~/my-stack/cfn.template.json', function(err) {
  if (err) console.error(`Create failed: ${err.message}`);
  else console.log('Create succeeded');
});

// Update the stack with a different version of the template
commands.update('testing', '~/my-stack/cfn.template-v2.json', function(err) {
  if (err) console.error(`Update failed: ${err.message}`);
  else console.log('Update succeeded');
});

// Save the stack's configuration to S3
commands.save('testing', function(err) {
  if (err) console.error(`Failed to save configuration: ${err.message}`);
  else console.log('Saved configuration');
});

// Get information about the stack
commands.info('testing', function(err, info) {
  if (err) console.error(`Failed to read stack info: ${err.message}`);
  else console.log(JSON.stringify(info, null, 2));
});

// Delete the stack
commands.delete('testing', function(err) {
  if (err) console.error(`Delete failed: ${err.message}`);
  else console.log('Delete succeeded');
});
```

For low-level functions, see documentation in the code for now. More legible docs are to come.
