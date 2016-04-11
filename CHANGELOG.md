# Change Log
All notable changes to this project will be documented in this file. For change log formatting, see http://keepachangelog.com/

## Unreleased

Keep future unreleased changes here

- Support asynchronous javascript templates.
- Change `readFile` method to accept a single options object and a callback.

## 0.8.5 - 2016-03-01

- fix template path resolution bug in writeConfiguration

## 0.8.4 - 2016-02-26

- `config.resolveTemplatePath` Uses correct prefix to find the `.cfn.json` files

## 0.8.3 - 2016-02-19

- `cfn-update -f` checking improved, no longer overriddes other options in other `cfn-config` commands like `cfn-create -c -f` 
- `cfn-delete` outputs full progress

## 0.8.2 - 2016-01-27

- Fix `writeConfiguration` to use bucket region

## 0.8.1 - 2016-01-20

- Fix to find cfn templates on s3 if local template is either name.template.js or name.template

## 0.8.0 - 2016-01-07

- Pass `configDetails` to `beforeUpdate` functions so that they can use future config in their actions

## 0.7.2 - 2016-01-07

- Respect `options.force` in updateStack to allow for non-interactive stack updates (CI testing)
- Fix bad logic in parameter comparison between null and falsey values

## 0.7.1 - 2015-12-10

- Fix undefined variable from change in 0.7.0

## 0.7.0 - 2015-12-10

- Look for AWS_ACCOUNT_ID environment variable before calling IAM.GetUser

## 0.6.0 - 2015-12-07

- Support JS module templates using the `.js` extension

## 0.5.0 - 2015-12-05

### Changed
- config.config.updateStack optionally takes a beforeUpdate function

## 0.4.3 - 2015-04-28

### Changed
- config.stackInfo returns Region

## 0.4.2 - 2015-01-22

### Changed
- Bump aws-sdk to v2.1.7
