const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const SCRIPT = path.resolve(__dirname, '..', 'scripts', 'build-presentation.js');
const MODULES_PRESENT = fs.existsSync(
  path.resolve(__dirname, '..', 'node_modules', 'pptxgenjs')
);

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

  describe('runtime build', () => {
    let tmpDir;
    let outFile;

    before(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'presentation-smoke-'));
      outFile = path.join(tmpDir, 'smoke.pptx');
    });

    after(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('runs end-to-end and writes a non-empty .pptx', { skip: !MODULES_PRESENT && 'pptxgenjs not installed' }, () => {
      const result = spawnSync(process.execPath, [SCRIPT], {
        encoding: 'utf8',
        env: { ...process.env, BUILD_PRESENTATION_OUT: outFile },
        cwd: tmpDir,
        timeout: 60_000,
      });

      assert.equal(
        result.status,
        0,
        `Builder exited non-zero.\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`
      );
      assert.ok(fs.existsSync(outFile), `Expected output file at ${outFile}`);
      const size = fs.statSync(outFile).size;
      assert.ok(size > 0, `Output file is empty (0 bytes)`);
    });
  });
});
