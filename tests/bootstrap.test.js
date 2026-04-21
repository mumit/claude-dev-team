const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const REPO_ROOT = path.resolve(__dirname, '..');
const BOOTSTRAP = path.join(REPO_ROOT, 'bootstrap.sh');

try {
  execFileSync('rsync', ['--version'], { stdio: 'ignore' });
} catch {
  console.error('rsync not found on PATH — bootstrap tests require rsync. Install it and retry.');
  process.exit(1);
}

function run(target, env = {}) {
  return execFileSync('bash', [BOOTSTRAP, target], {
    cwd: REPO_ROOT,
    env: { ...process.env, ...env },
    encoding: 'utf8',
    timeout: 30000,
  });
}

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'bootstrap-test-'));
}

function cleanupDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

describe('bootstrap.sh', () => {
  let target;

  beforeEach(() => {
    target = makeTempDir();
  });

  afterEach(() => {
    if (target) cleanupDir(target);
  });

  it('creates .claude/ directory with expected subdirectories', () => {
    run(target);
    assert.ok(fs.existsSync(path.join(target, '.claude')));
    assert.ok(fs.existsSync(path.join(target, '.claude', 'agents')));
    assert.ok(fs.existsSync(path.join(target, '.claude', 'commands')));
    assert.ok(fs.existsSync(path.join(target, '.claude', 'hooks')));
    assert.ok(fs.existsSync(path.join(target, '.claude', 'rules')));
    assert.ok(fs.existsSync(path.join(target, '.claude', 'skills')));
  });

  it('copies orchestrator.md into .claude/rules/', () => {
    run(target);
    const orchPath = path.join(target, '.claude', 'rules', 'orchestrator.md');
    assert.ok(fs.existsSync(orchPath));
    const content = fs.readFileSync(orchPath, 'utf8');
    assert.ok(content.includes('Dev Team Orchestrator'));
  });

  it('copies coding-principles.md and retrospective.md into .claude/rules/', () => {
    run(target);
    const principlesPath = path.join(target, '.claude', 'rules', 'coding-principles.md');
    assert.ok(fs.existsSync(principlesPath), 'coding-principles.md must be installed');
    const principles = fs.readFileSync(principlesPath, 'utf8');
    assert.ok(principles.includes('Think Before Coding'), 'coding-principles.md must include the four principles');
    assert.ok(principles.includes('Simplicity First'));
    assert.ok(principles.includes('Surgical Changes'));
    assert.ok(principles.includes('Goal-Driven Execution'));

    const retroPath = path.join(target, '.claude', 'rules', 'retrospective.md');
    assert.ok(fs.existsSync(retroPath), 'retrospective.md must be installed');
    const retro = fs.readFileSync(retroPath, 'utf8');
    assert.ok(retro.includes('Stage 9'), 'retrospective.md must describe Stage 9');
    assert.ok(retro.includes('lessons-learned.md'), 'retrospective.md must reference lessons-learned.md');
  });

  it('copies /retrospective command into .claude/commands/', () => {
    run(target);
    const cmdPath = path.join(target, '.claude', 'commands', 'retrospective.md');
    assert.ok(fs.existsSync(cmdPath), '/retrospective command must be installed');
    const cmd = fs.readFileSync(cmdPath, 'utf8');
    assert.ok(cmd.includes('Stage 9'), '/retrospective must reference Stage 9');
  });

  it('/reset command preserves pipeline/lessons-learned.md', () => {
    run(target);
    const resetPath = path.join(target, '.claude', 'commands', 'reset.md');
    assert.ok(fs.existsSync(resetPath));
    const reset = fs.readFileSync(resetPath, 'utf8');
    assert.ok(reset.includes('lessons-learned.md'), '/reset must explicitly preserve lessons-learned.md');
  });

  it('Stage 5 defines a READ-ONLY reviewer rule and each dev agent cites it', () => {
    run(target);
    const pipelinePath = path.join(target, '.claude', 'rules', 'pipeline.md');
    const pipeline = fs.readFileSync(pipelinePath, 'utf8');
    assert.ok(pipeline.includes('READ-ONLY Reviewer Rule'), 'pipeline.md must define the READ-ONLY Reviewer Rule');
    assert.ok(pipeline.includes('No fix-forward'), 'pipeline.md must forbid fix-forward patches');

    const gatesPath = path.join(target, '.claude', 'rules', 'gates.md');
    const gates = fs.readFileSync(gatesPath, 'utf8');
    assert.ok(gates.includes('READ-ONLY Reviewer Rule'), 'gates.md must reference the reviewer rule in Stage 05 schema');

    for (const agent of ['dev-backend', 'dev-frontend', 'dev-platform']) {
      const agentPath = path.join(target, '.claude', 'agents', `${agent}.md`);
      const body = fs.readFileSync(agentPath, 'utf8');
      assert.ok(
        body.includes('READ-ONLY') && body.includes('CHANGES REQUESTED'),
        `${agent}.md must carry the READ-ONLY reviewer callout`,
      );
    }
  });

  it('creates pipeline/ structure with gates, adr, code-review', () => {
    run(target);
    assert.ok(fs.existsSync(path.join(target, 'pipeline')));
    assert.ok(fs.existsSync(path.join(target, 'pipeline', 'gates')));
    assert.ok(fs.existsSync(path.join(target, 'pipeline', 'adr')));
    assert.ok(fs.existsSync(path.join(target, 'pipeline', 'code-review')));
  });

  it('creates pipeline/context.md from template', () => {
    run(target);
    const contextPath = path.join(target, 'pipeline', 'context.md');
    assert.ok(fs.existsSync(contextPath));
    const content = fs.readFileSync(contextPath, 'utf8');
    assert.ok(content.includes('# Project Context'));
  });

  it('creates CLAUDE.md and AGENTS.md on fresh install', () => {
    run(target);
    assert.ok(fs.existsSync(path.join(target, 'CLAUDE.md')));
    assert.ok(fs.existsSync(path.join(target, 'AGENTS.md')));
  });

  it('does not copy EXAMPLE.md or README.md', () => {
    run(target);
    assert.ok(!fs.existsSync(path.join(target, 'EXAMPLE.md')));
    assert.ok(!fs.existsSync(path.join(target, 'README.md')));
  });

  it('does not touch existing CLAUDE.md', () => {
    const original = '# My Project Instructions\n';
    fs.writeFileSync(path.join(target, 'CLAUDE.md'), original);
    run(target);
    // CLAUDE.md preserved exactly
    assert.equal(fs.readFileSync(path.join(target, 'CLAUDE.md'), 'utf8'), original);
    // No backup file created
    assert.ok(!fs.existsSync(path.join(target, 'CLAUDE.md.bak')));
  });

  it('overwrites .claude/ framework files on re-run', () => {
    // First run
    run(target);
    // Simulate a stale agent file
    const agentPath = path.join(target, '.claude', 'agents', 'dev-backend.md');
    fs.writeFileSync(agentPath, '# Stale version\n');
    // Second run should overwrite
    run(target);
    const content = fs.readFileSync(agentPath, 'utf8');
    assert.notEqual(content, '# Stale version\n', 'framework file should be overwritten on update');
  });

  it('preserves .local. files in .claude/ during overwrite', () => {
    fs.mkdirSync(path.join(target, '.claude', 'agents'), { recursive: true });
    const localPath = path.join(target, '.claude', 'agents', 'dev-backend.local.md');
    fs.writeFileSync(localPath, '# My local overrides\n');
    run(target);
    assert.ok(fs.existsSync(localPath), '.local. file should survive');
    assert.equal(fs.readFileSync(localPath, 'utf8'), '# My local overrides\n');
  });

  it('preserves settings.local.json during overwrite', () => {
    fs.mkdirSync(path.join(target, '.claude'), { recursive: true });
    const localSettings = path.join(target, '.claude', 'settings.local.json');
    fs.writeFileSync(localSettings, '{"custom": true}\n');
    run(target);
    assert.ok(fs.existsSync(localSettings), 'settings.local.json should survive');
    assert.equal(fs.readFileSync(localSettings, 'utf8'), '{"custom": true}\n');
  });

  it('makes gate-validator.js executable', () => {
    run(target);
    const hookPath = path.join(target, '.claude', 'hooks', 'gate-validator.js');
    assert.ok(fs.existsSync(hookPath));
    const stat = fs.statSync(hookPath);
    // Check owner-execute bit
    assert.ok(stat.mode & 0o100, 'gate-validator.js should be executable');
  });

  it('creates src/ structure when src/ does not exist', () => {
    run(target);
    assert.ok(fs.existsSync(path.join(target, 'src', 'backend')));
    assert.ok(fs.existsSync(path.join(target, 'src', 'frontend')));
    assert.ok(fs.existsSync(path.join(target, 'src', 'infra')));
  });

  it('preserves existing src/ directory', () => {
    fs.mkdirSync(path.join(target, 'src'));
    fs.writeFileSync(path.join(target, 'src', 'app.js'), 'console.log("hello");\n');
    run(target);
    // Original file preserved
    assert.ok(fs.existsSync(path.join(target, 'src', 'app.js')));
    // Subdirs not forced
    assert.ok(!fs.existsSync(path.join(target, 'src', 'backend')));
  });

  it('appends pipeline and local-override entries to existing .gitignore', () => {
    fs.writeFileSync(path.join(target, '.gitignore'), 'node_modules/\n');
    run(target);
    const content = fs.readFileSync(path.join(target, '.gitignore'), 'utf8');
    assert.ok(content.includes('node_modules/'), 'original entries preserved');
    assert.ok(content.includes('pipeline/gates/'), 'pipeline entries appended');
    assert.ok(content.includes('.claude/**/*.local.*'), 'local override pattern appended');
    assert.ok(content.includes('CLAUDE.local.md'), 'CLAUDE.local.md appended');
  });

  it('does not duplicate .gitignore entries on second run', () => {
    fs.writeFileSync(path.join(target, '.gitignore'), 'node_modules/\n');
    run(target);
    run(target); // second run
    const content = fs.readFileSync(path.join(target, '.gitignore'), 'utf8');
    const matches = content.match(/pipeline\/gates\//g);
    assert.equal(matches.length, 1, 'pipeline/gates/ should appear exactly once');
  });

  it('does not create pipeline/context.md if it already exists', () => {
    fs.mkdirSync(path.join(target, 'pipeline'), { recursive: true });
    const custom = '# My existing context\n';
    fs.writeFileSync(path.join(target, 'pipeline', 'context.md'), custom);
    run(target);
    assert.equal(fs.readFileSync(path.join(target, 'pipeline', 'context.md'), 'utf8'), custom);
  });

  it('fails if target directory does not exist', () => {
    const badTarget = path.join(os.tmpdir(), 'nonexistent-' + Date.now());
    assert.throws(
      () => run(badTarget),
      (err) => err.status !== 0
    );
  });

  it('is idempotent — running twice produces a working result', () => {
    run(target);
    run(target); // second run should not fail
    // Spot-check key files still exist
    assert.ok(fs.existsSync(path.join(target, '.claude', 'agents', 'dev-backend.md')));
    assert.ok(fs.existsSync(path.join(target, 'pipeline', 'gates')));
    assert.ok(fs.existsSync(path.join(target, 'CLAUDE.md')));
  });
});
