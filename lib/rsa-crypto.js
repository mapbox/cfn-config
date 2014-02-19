var ursa = require('ursa');
var fs = require('fs');

module.exports = function(keyfile, passphrase) {
    return {
        encrypt: function(value, callback) {
            encrypt(keyfile, passphrase, value, callback);
        },
        decrypt: function(value, callback) {
            decrypt(keyfile, passphrase, value, callback);
        },
        prefix: 'secure::'
    }
}

function loadKey(keyfile, passphrase, callback) {
    fs.readFile(keyfile, function(err, data) {
        if (err) return callback(err);
        try { callback(null, ursa.createPrivateKey(data, passphrase)); }
        catch (err) { callback(err); }
    });
}

function encrypt(keyfile, passphrase, value, callback) {
    if (!keyfile) return callback(value.toString());
    loadKey(keyfile, passphrase, function(err, key) {
        if (err) return callback(err);
        callback(null, ['secure', key.encrypt(value, 'utf8', 'base64')].join('::'));
    });
}

function decrypt(keyfile, passphrase, value, callback) {
    if (!keyfile) return callback(value.toString());
    loadKey(keyfile, passphrase, function(err, key) {
        if (err) return callback(err);
        callback(null, key.decrypt(value.split('::')[1], 'base64', 'utf8'));
    });
}