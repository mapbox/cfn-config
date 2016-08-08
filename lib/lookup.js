var AWS = require('aws-sdk');
var error = require('fasterror');
var path = require('path');

var lookup = module.exports = {};

/**
 * Lookup an existing CloudFormation stack's parameters
 *
 * @param {string} name - the full name of the stack
 * @param {string} region - the region the stack is in
 * @param {function} callback - a function that will be provided a {@link StackInfo}
 * or an error if one was encountered
 */
lookup.parameters = function(name, region, callback) {
  lookup.info(name, region, function(err, info) {
    if (err) return callback(err);
    callback(null, info.parameters);
  });
};

/**
 * Information about a CloudFormation stack
 *
 * @name StackInfo
 * @property {string} id - the stack's ID
 * @property {string} name - the stack's name
 * @property {string} description - the stack's description
 * @property {string} created - the stack's creation time
 * @property {string} updated - the time of the stack's most recent update
 * @property {string} status - the stack's status
 * @property {object} parameters - the names and values of parameters provided to the stack
 * @property {object} outputs - the names and values of the stack's outputs
 * @property {object} tags - the names and values of the stack's tags
 */

/**
 * Lookup an existing CloudFormation stack's info
 *
 * @param {string} name - the full name of the stack
 * @param {string} region - the region the stack is in
 * @param {function} callback - a function that will be provided a {@link StackInfo}
 * or an error if one was encountered
 */
lookup.info = function(name, region, callback) {
  var cfn = new AWS.CloudFormation({ region: region });
  cfn.describeStacks({ StackName: name }, function(err, data) {
    if (err && err.code === 'ValidationError' && /Stack with id/.test(err.message))
      return callback(new lookup.StackNotFoundError('Stack %s not found', name));
    if (err) return callback(new lookup.CloudFormationError('%s: %s', err.code, err.message));
    if (!data.Stacks.length) return callback(new lookup.StackNotFoundError('Stack %s not found', name));

    var stack = data.Stacks[0];
    var info = {
      id: stack.StackId,
      name: stack.StackName,
      description: stack.Description,
      created: stack.CreationTime.toISOString(),
      updated: stack.LastUpdatedTime ? stack.LastUpdatedTime.toISOString() : stack.CreationTime.toISOString(),
      status: stack.StackStatus
    };

    info.parameters = stack.Parameters.reduce(function(parameters, param) {
      parameters[param.ParameterKey] = param.ParameterValue;
      return parameters;
    }, {});

    info.outputs = stack.Outputs.reduce(function(outputs, output) {
      outputs[output.OutputKey] = output.OutputValue;
      return outputs;
    }, {});

    info.tags = stack.Tags.reduce(function(tags, tag) {
      tags[tag.Key] = tag.Value;
      return tags;
    }, {});

    callback(null, info);
  });
};

/**
 * Lookup an existing CloudFormation stack's template
 *
 * @param {string} name - the full name of the stack
 * @param {string} region - the region the stack is in
 * @param {function} callback - a function that will be provided the template body
 * as a parsed JS object, or an error if one was encountered
 */
lookup.template = function(name, region, callback) {
  var cfn = new AWS.CloudFormation({ region: region });
  cfn.getTemplate({ StackName: name }, function(err, data) {
    if (err && err.code === 'ValidationError' && /Stack with id/.test(err.message))
      return callback(new lookup.StackNotFoundError('Stack %s not found', name));
    if (err) return callback(new lookup.CloudFormationError('%s: %s', err.code, err.message));

    callback(null, JSON.parse(data.TemplateBody));
  });
};

/**
 * Lookup available saved configurations on S3
 *
 * @param {string} name - the base name of the stack (no suffix)
 * @param {string} bucket - the name of the S3 bucket containing saved configurations
 * @param {function} callback - a function that will be provided with a list of
 * saved configuration names
 * @returns
 */
lookup.configurations = function(name, bucket, callback) {
  lookup.bucketRegion(bucket, function(err, region) {
    if (err) return callback(err);

    var s3 = new AWS.S3({ region: region });

    s3.listObjects({
      Bucket: bucket,
      Prefix: name + '/'
    }, function(err, data) {
      if (err && err.code === 'NoSuchBucket')
        return callback(new lookup.BucketNotFoundError('S3 bucket %s not found in %s', bucket, region));
      if (err) return callback(new lookup.S3Error('%s: %s', err.code, err.message));

      var keys = data.Contents.filter(function(obj) {
        return obj.Key.split('.').slice(-2).join('.') === 'cfn.json' && obj.Size > 0;
      }).map(function(obj) {
        return path.basename(obj.Key, '.cfn.json');
      });

      callback(null, keys);
    });
  });
};

/**
 * Lookup a saved configuration object from S3
 *
 * @param {string} name - the base name of the stack (no suffix)
 * @param {string} bucket - the name of the S3 bucket containing saved configurations
 * @param {string} config - the name of the saved configuration
 * @param {function} callback - a function that will be provided with the saved
 * {@link StackInfo}
 */
lookup.configuration = function(name, bucket, config, callback) {
  lookup.bucketRegion(bucket, function(err, region) {
    if (err) return callback(err);

    var s3 = new AWS.S3({ region: region });

    s3.getObject({
      Bucket: bucket,
      Key: lookup.configKey(name, config)
    }, function(err, data) {
      if (err && err.code === 'NoSuchBucket')
        return callback(new lookup.BucketNotFoundError('S3 bucket %s not found in %s', bucket, region));
      if (err && err.code === 'NoSuchKey')
        return callback(new lookup.ConfigurationNotFoundError('Configuration %s not found in %s in %s', config, bucket, region));
      if (err)
        return callback(new lookup.S3Error('%s: %s', err.code, err.message));

      var info = data.Body.toString();
      try { info = JSON.parse(info); }
      catch (err) { return callback(new lookup.InvalidConfigurationError('Invalid configuration')); }

      callback(null, info);
    });
  });
};

/**
 * Given a stack name and configuration name, provides the key where the configuration
 * should be stored on S3
 *
 * @param {string} name - the stack's base name (no suffix)
 * @param {string} config - the configuration's name
 * @returns {string} an S3 key
 */
lookup.configKey = function(name, config) {
  return name + '/' + config + '.cfn.json';
};

/**
 * Find a bucket's region
 *
 * @param {string} bucket - the name of the bucket
 * @param {function} callback - a function provided with the bucket's region
 */
lookup.bucketRegion = function(bucket, callback) {
  var s3 = new AWS.S3();
  s3.getBucketLocation({ Bucket: bucket }, function(err, data) {
    if (err && err.code === 'NoSuchBucket')
      return callback(new lookup.BucketNotFoundError('S3 bucket %s not found', bucket));
    if (err)
      return callback(new lookup.S3Error('%s: %s', err.code, err.message));
    callback(null, data.LocationConstraint || undefined);
  });
};

/**
 * Error representing an unexpected failure in a CloudFormation request
 */
lookup.CloudFormationError = error('CloudFormationError');

/**
 * Error representing a template that does not exist
 */
lookup.StackNotFoundError = error('StackNotFoundError');

/**
 * Error representing an unexpected failure in an S3 request
 */
lookup.S3Error = error('S3Error');

/**
 * Error representing a bucket that does not exist
 */
lookup.BucketNotFoundError = error('BucketNotFoundError');

/**
 * Error representing a saved configuration that does not exist
 */
lookup.ConfigurationNotFoundError = error('ConfigurationNotFoundError');

/**
 * Error representing a saved configuration object that could not be parsed
 */
lookup.InvalidConfigurationError = error('InvalidConfigurationError');
