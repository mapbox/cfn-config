var AWS = require('aws-sdk');
var error = require('fasterror');
var path = require('path');
var s3urls = require('s3urls');
var queue = require('d3-queue').queue;
var yaml = require('@aws-cdk/yaml-cfn');

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
    callback(null, info.Parameters);
  });
};

/**
 * Information about a CloudFormation stack
 *
 * @name StackInfo
 * TODO: more
 */

/**
 * Lookup an existing CloudFormation stack's info
 *
 * @param {string} name - the full name of the stack
 * @param {string} region - the region the stack is in
 * @param {boolean} [resources=false] - return information about each resource in the stack
 * @param {boolean} [decrypt=false] - return secure parameters decrypted
 * @param {function} callback - a function that will be provided a {@link StackInfo}
 * or an error if one was encountered
 */
lookup.info = function(name, region, resources, decrypt, callback) {
  if (typeof resources === 'function') {
    callback = resources;
    resources = false;
    decrypt = false;
  } else if (typeof decrypt === 'function') {
    callback = decrypt;
    decrypt = false;
  }

  var cfn = new AWS.CloudFormation({ region: region });

  cfn.describeStacks({ StackName: name }, function(err, data) {
    if (err && err.code === 'ValidationError' && /Stack with id/.test(err.message))
      return callback(new lookup.StackNotFoundError('Stack %s not found in %s', name, region));
    if (err) return callback(new lookup.CloudFormationError('%s: %s', err.code, err.message));
    if (!data.Stacks.length) return callback(new lookup.StackNotFoundError('Stack %s not found in %s', name, region));

    var stackInfo = data.Stacks[0];
    stackInfo.Region = region;

    stackInfo.Parameters = (stackInfo.Parameters || []).reduce(function(memo, param) {
      memo[param.ParameterKey] = param.ParameterValue;
      return memo;
    }, {});

    stackInfo.Outputs = (stackInfo.Outputs || []).reduce(function(memo, output) {
      memo[output.OutputKey] = output.OutputValue;
      return memo;
    }, {});

    stackInfo.Tags = (stackInfo.Tags || []).reduce(function(memo, output) {
      memo[output.Key] = output.Value;
      return memo;
    }, {});

    getResources(stackInfo);
  });

  function getResources(stackInfo) {
    if (!resources) return getDecrypted(stackInfo);

    var data = {
      StackResourceSummaries: []
    };
    cfn.listStackResources({ StackName: name }).eachPage(function(err, page, done) {
      if (err) return callback(new lookup.CloudFormationError('%s: %s', err.code, err.message));
      if (!page) {
        // all pages received, continue
        stackInfo.StackResources = data.StackResourceSummaries;
        return getDecrypted(stackInfo);
      }

      // collect data and wait for next page
      data.StackResourceSummaries = data.StackResourceSummaries.concat(page.StackResourceSummaries);
      done();
    });
  }

  function getDecrypted(stackInfo) {
    if (!decrypt) return callback(null, stackInfo);

    lookup.decryptParameters(stackInfo.Parameters, region, function(err, decryptedParameters) {
      if (err) return callback(err);
      stackInfo.Parameters = decryptedParameters;
      callback(null, stackInfo);
    });
  }
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
      return callback(new lookup.StackNotFoundError('Stack %s not found in %s', name, region));
    if (err) return callback(new lookup.CloudFormationError('%s: %s', err.code, err.message));
    // First, try to parse as JSON, then as YAML
    let templateBody;
    try {
      templateBody = JSON.parse(data.TemplateBody);
    } catch (jsonParseError) {
      err = jsonParseError;
      try {
        templateBody = yaml.deserialize(data.TemplateBody);
        err = null;
      } catch (yamlParseError) {
        err = yamlParseError;
      }
    }
    if (err) return callback(err);
    callback(null, templateBody);
  });
};

/**
 * Lookup available saved configurations on S3
 *
 * @param {string} name - the base name of the stack (no suffix)
 * @param {string} bucket - the name of the S3 bucket containing saved configurations
 * @param {string} [region] - the name of the region in which to make lookup requests
 * @param {function} callback - a function that will be provided with a list of
 * saved configuration names
 * @returns
 */
lookup.configurations = function(name, bucket, region, callback) {
  if (typeof region === 'function') {
    callback = region;
    region = undefined;
  }

  lookup.bucketRegion(bucket, region, function(err, region) {
    if (err) return callback(err);

    var s3 = new AWS.S3({ region: region, signatureVersion: 'v4' });

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
 * @param {function} callback - a function that will be provided with the saved configuration
 */
lookup.configuration = function(name, bucket, config, callback) {
  lookup.bucketRegion(bucket, function(err, region) {
    if (err) return callback(err);

    var s3 = new AWS.S3({ region: region, signatureVersion: 'v4' });

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
 * Lookup a default saved configuration by providing an S3 url. This function will
 * silently absorb any failures encountered while fetching or parsing the requested file.
 *
 * @param {string} s3url - a URL pointing to a configuration object on S3
 * @param {function} callback - a function which will be provided with the saved configuration
 *
 */
lookup.defaultConfiguration = function(s3url, callback) {
  var params = s3urls.fromUrl(s3url);
  lookup.bucketRegion(params.Bucket, function(err, region) {
    if (err) return callback(null, {});

    var s3 = new AWS.S3({ region: region, signatureVersion: 'v4' });

    s3.getObject(params, function(err, data) {
      if (err) return callback(null, {});

      var info = data.Body.toString();
      try { info = JSON.parse(info); }
      catch (err) { return callback(null, {}); }

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
lookup.configKey = function(name, stackName, region) {
  return region ?
    name + '/' + stackName + '-' + region + '.cfn.json' :
    name + '/' + stackName + '.cfn.json';
};

/**
 * Find a bucket's region
 *
 * @param {string} bucket - the name of the bucket
 * @param {string} [region] - the name of the region in which to make lookup requests
 * @param {function} callback - a function provided with the bucket's region
 */
lookup.bucketRegion = function(bucket, region, callback) {
  if (typeof region === 'function') {
    callback = region;
    region = undefined;
  }

  var s3 = new AWS.S3({ signatureVersion: 'v4', region: region });
  s3.getBucketLocation({ Bucket: bucket }, function(err, data) {
    if (err && err.code === 'NoSuchBucket')
      return callback(new lookup.BucketNotFoundError('S3 bucket %s not found', bucket));
    if (err)
      return callback(new lookup.S3Error('%s: %s', err.code, err.message));
    callback(null, data.LocationConstraint || undefined);
  });
};

/**
 * Decrypt any encrypted parameters.
 *
 * @param {object} parameters - stack parameters
 * @param {string} region - stack region
 * @param {function} callback - a function provided with the bucket's region
 */
lookup.decryptParameters = function(parameters, region, callback) {
  var kms = new AWS.KMS({ region: region, maxRetries: 10 });
  var q = queue();
  var decrypted = JSON.parse(JSON.stringify(parameters));

  Object.keys(parameters).forEach(function(key) {
    if (!(/^secure:/).test(parameters[key])) return;
    q.defer(function(key, val, done) {
      kms.decrypt({ CiphertextBlob: new Buffer(val, 'base64') }, function(err, data) {
        if (err) return done(err);
        done(null, { key: key, val: val, decrypted: (new Buffer(data.Plaintext, 'base64')).toString('utf8') });
      });
    }, key, parameters[key].replace(/^secure:/, ''));
  });

  q.awaitAll(function(err, results) {
    if (err) return callback(new lookup.DecryptParametersError('%s: %s', err.code, err.message));
    results.forEach(function(data) {
      decrypted[data.key] = data.decrypted;
    });
    callback(null, decrypted);
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

/**
 * Error representing a failure to decrypt secure parameters
 */
lookup.DecryptParametersError = error('DecryptParametersError');
