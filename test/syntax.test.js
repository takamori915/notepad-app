const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const path = require('node:path');

const jsFiles = ['script.js', 'service-worker.js'];

for (const file of jsFiles) {
    test(`${file} has valid syntax`, () => {
        assert.doesNotThrow(() => {
            execFileSync(process.execPath, ['--check', path.join(__dirname, '..', file)]);
        });
    });
}
