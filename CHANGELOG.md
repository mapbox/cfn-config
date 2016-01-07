# Change Log
All notable changes to this project will be documented in this file. For change log formatting, see http://keepachangelog.com/

## Unreleased

Keep future unreleased changes here

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
