const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const SCRIPT = path.resolve(__dirname, '..', 'docs', 'build-presentation.js');

describe('build-presentation.js', () => {
  it('passes syntax check (node --check)', () => {
    const result = spawnSync(process.execPath, ['--check', SCRIPT], {
      encoding: 'utf8',
    });
    assert.equal(
      result.status,
      0,
      `Syntax check failed:\n${result.stderr}`
    );
  });
});
