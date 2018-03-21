# Change Log
All notable changes to this project will be documented in this file. For change log formatting, see http://keepachangelog.com/

## 2.13.1 - 2018-03-20

- Print notice when parameter changes are auto-confirmed

## 2.13.0 - 2018-03-16

- specifies region for GetBucketLocation call during `commands.create`

## 2.12.0 - 2018-02-20

- Automatically save stack configurations to S3 after create or update.

## 2.11.0 - 2018-02-20

- Adds support for `overrides.preapproved`. Providing this object allows a higher-level function to prevent cfn-config from prompting the user to confirm changes that have already been confirmed in another region.

## 2.10.1 - 2018-02-19

- Adds support for `DELETE_SKIPPED` status in CloudFormation events printed after an update or delete.

## 2.10.0 - 2018-01-29

- Adds `skipPromptParameters`, `skipConfirmParameters` and `skipConfirmTemplate` flags to skip individual prompt operations.

## 2.9.0 - 2018-01-23

- Adds `.preauth()` method, allowing you to provide a set of AWS credentials to be used in subsequent calls to cfn-config functions.

## 2.8.0 - 2017-11-23

- Fix fetching more than 100 stack resources in lookup.getResorces by using listStackResources instead of describeStackResources
- Internal: move test aws mocking to @mapbox/mock-aws-sdk-js

## 2.7.2 - 2017-11-17

- Assure stable template diffs

## 2.7.1 - 2017-06-13

- Avoids re-encryption of `secure:` variables that are specified in a master config file

## 2.7.0 - 2017-03-10

- Add `--parameters` flag to cfn-config command for providing stack parameters as JSON

## 2.6.2 - 2017-02-23

- Fixes a bug in displaying the differences in templates during an UpdateStack command

## 2.6.1 - 2017-01-17

- Bump to 2.0.0 version of Inquirer

## 2.6.0 - 2016-12-26

- Adds optional `overrides.metadata` option for setting arbitrary Metadata key/value pairs on a CloudFormation template.

## 2.5.0 - 2-16-12-23

- Package is on @mapbox namespace
- Includes new Cloudformation capabilities(https://github.com/mapbox/cfn-config/pull/126)
- V4 signatureVersion on aws-sdk requests
- Specifying a masterConfig will replace default (oldParameters) values

## 2.3.0 - 2016-10-20

- Add recognition + color-coding for previously unrecognized CloudFormation ROLLBACK states

## 2.2.1 - 2016-08-22

- Changes s3 templateUrl for `cn` region to use a `.` instead of a `-`

## 2.2.0 - 2016-08-19

- Commands that are aborted by the user (e.g. a rejected diff) will provide `false` as the second argument the callback function. If the command was entirely completed, `true` will be provided.

## 2.1.1 - 2016-08-19

- Update region handling of S3 URLs for dash syntax. Fixes deploys to `eu-central-1`

## 2.1.0 - 2016-08-17

- Adds `--decrypt` flag to `info` command and related APIs to decrypt secure stack parameters.

## 2.0.3 - 2016-08-15

- Fixes a bug in parameter prompting where a saved configuration that specifies a default value outside the parameter's allowed values caused a crash.

## 2.0.2 - 2016-08-14

- During update, ignore overridden parameters that aren't in either the old or new template

## 2.0.1 - 2016-08-12

- Fix a bug where region for KMS encryption was not passed properly

## 2.0.0 - 2016-08-12

- BREAKING Rewritten from the ground up.

## 1.1.1 - 2016-08-04

- Fix bug with template diff

## 1.1.0 - 2016-08-04

- Remove Config file prompt when updating a stack
- Update to `json-diff` for colored diff output

## 1.0.1 - 2016-06-20

- Support for AWS China
- `cfn-dump` outputs template to stdout.

## 1.0.0 - 2016-04-11

- BREAKING Change `readFile` method to accept a single options object and a callback.
- Support asynchronous javascript templates.

## 0.9.0 - 2016-04-5

- Added `readSavedConfig` method

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
