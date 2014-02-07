Quickly configure and start AWS CloudFormation stacks.

## Features

- CLI parameter prompting for easy configuration
- Persists parameters in local config files for easy reuse and version control
- Library functions to include functionality into other projects

# Install

Install globally with `npm` to use CLI commands or include in your project's
package.json to use as a library.

# CLI

cfn-config includes the follow CLI commands for working with CloudFormation
stacks.

- `cfn-config` - Configures a stack's parameters based on a CFN template file.
  Writes the configuration to disk, but does not start the stack.
- `cfn-create` - Configures a stack's parameters based on a CFN template file.
  Write the configuration to disk and starts the given stack.
- `cfn-delete` - Delete the given stack.
- `cfn-info` - Returns parameters and output for the given stack.
- `cfn-update` - Configures a stack's parameters based on a CFN template file.
  Writes the configuration to disk and updates the given stack to use the new
  parameters and template.

## Configuration

cfn-config commands need access to the CloudFormation API to read, create,
update, and delete stacks. Add `~/.cfnrc` with the following properties:

```
{
    "accessKeyId": "xxxx",
    "secretAccessKey": "xxxx"
}
```

# Library

Include cfn-config into your project to incorporate/extend its functionality.

## `config.configStack(options, callback)`

Reusable function for determining configuration.

`options` object should include:
- template: Required. Path to the Cloudformation template
- region: Defaults to 'us-east-1'. The AWS region to deploy into
- name: Required. Name of the Cloudformation stack
- config: Optional. Path to a configuration file to use
- update: Defaults to false. Reads existing stack parameters.
- defaults: Defaults to {}. Can be overriden to provide your own defaults.
  Keys should be the parameter's name, values either a string or function
  If finding the default value is asychronous, then the funciton has to
  declare itself as such. See https://github.com/SBoudrias/Inquirer.js#question

# Defaults

The configuration process prompts you for each parameter in the given template.
For each value, cfn-config will determine a default value using the following
priority:

1. Value from an existing stack if one with the given name already exists
1. Value provided by a requiring library
1. Value from a configuration file one exists for the stack with the given name
1. `Default` property set on the parameter in the template

