#!/usr/bin/env node

const cli = require('../lib/cli');

let parsed;
try {
    parsed = cli.parse(process.argv.slice(2), process.env);
} catch (err) {
    return finished(err);
}

cli.main(parsed, finished);

function finished(err, data) {
    if (err) process.stderr.write(err.message + '\n');
    if (data && data !== true) process.stdout.write(JSON.stringify(data, null, 2) + '\n');
    process.exit(err ? 1 : 0);
}
