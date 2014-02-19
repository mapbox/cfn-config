var spawn = require('child_process').spawn;
var exec = require('child_process').exec;

module.exports = function(keyring, passphrase) {
    return {
        encrypt: function(value, callback) {
            encrypt(keyring, value, callback);
        },
        decrypt: function(value, callback) {
            decrypt(passphrase, value, callback);
        },
        prefix: '-----BEGIN PGP MESSAGE-----'
    }
}

function encrypt(keyring, value, callback) {
    if (!keyring) return callback(null, value.toString());

    var listKeysParams = [
        '--no-default-keyring',
        '--keyring', keyring,
        '--list-public-keys',
        '--with-colons'
    ];

    var listKeysCommand = 'gpg ' + listKeysParams.join(' ');
    exec(listKeysCommand, function(err, keyList) {
        if (err) return callback(err);
        var encryptParams = [
            '--no-default-keyring',
            '--keyring', keyring,
            '--batch', '--armor',
            '--encrypt',
            '--trust-model', 'always'
        ];

        var re = /pub:.+?:[0-9A-Z]{8}([0-9A-Z]{8}):/g;
        var match;
        while (match = re.exec(keyList)) { 
            encryptParams.push('--recipient');
            encryptParams.push(match[1]); 
        }

        var result = "";
        var gpg = spawn('gpg', encryptParams);
        gpg.stdout.on('data', function(chunk) { result += chunk; });
        gpg.on('close', function(code) { callback(null, result); });
        gpg.on('error', function(err) { callback(err); });
        gpg.stdin.write(value);
        gpg.stdin.end();
    });
}

function decrypt(passphrase, value, callback) {
    var decryptParams = [
        '--batch', '--quiet',
        '--passphrase=' + passphrase
    ];

    var result = "";
    var gpg = spawn('gpg', decryptParams);
    gpg.stdout.on('data', function(chunk) { result += chunk; });
    gpg.on('close', function(code) { callback(null, result.replace('\n', '')); });
    gpg.on('error', function(err) { callback(err); });
    gpg.stdin.write(value);
    gpg.stdin.end();
}