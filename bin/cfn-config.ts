#!/usr/bin/env node

import { main, parse } from '../lib/cli.js';

let parsed;
try {
    parsed = parse(process.argv.slice(2), process.env);
} catch (err) {
    finished(err);
}

main(parsed, finished);

function finished(err, data) {
    if (err) process.stderr.write(err.message + '\n');
    if (data && data !== true) process.stdout.write(JSON.stringify(data, null, 2) + '\n');
    process.exit(err ? 1 : 0);
}
