const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..');
const AGENTS_DIR = path.join(REPO_ROOT, '.claude', 'agents');
const SKILLS_DIR = path.join(REPO_ROOT, '.claude', 'skills');

/**
 * Parse YAML frontmatter from a markdown file.
 * Returns { frontmatter: object|null, body: string }.
 * Handles simple key: value and key: >\n  multiline patterns.
 */
function parseFrontmatter(content) {
  if (!content.startsWith('---\n')) {
    return { frontmatter: null, body: content };
  }
  const endIndex = content.indexOf('\n---', 4);
  if (endIndex === -1) {
    return { frontmatter: null, body: content };
  }
  const yamlBlock = content.slice(4, endIndex);
  const body = content.slice(endIndex + 4).trimStart();
  const result = {};
  let currentKey = null;
  let multilineValue = '';

  for (const line of yamlBlock.split('\n')) {
    // Continuation of a multiline value (indented)
    if (currentKey && /^\s{2,}/.test(line)) {
      multilineValue += ' ' + line.trim();
      continue;
    }
    // Flush previous multiline key
    if (currentKey) {
      result[currentKey] = multilineValue.trim();
      currentKey = null;
      multilineValue = '';
    }
    // key: > (block scalar)
    const blockMatch = line.match(/^(\w[\w-]*):\s*>\s*$/);
    if (blockMatch) {
      currentKey = blockMatch[1];
      multilineValue = '';
      continue;
    }
    // key: value (inline)
    const inlineMatch = line.match(/^(\w[\w-]*):\s*(.+)$/);
    if (inlineMatch) {
      const key = inlineMatch[1];
      let val = inlineMatch[2].trim();
      // Remove surrounding quotes
      if ((val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      result[key] = val;
      continue;
    }
    // key with list value handled as simple string for now
    const emptyMatch = line.match(/^(\w[\w-]*):\s*$/);
    if (emptyMatch) {
      result[emptyMatch[1]] = '';
    }
  }
  // Flush trailing multiline
  if (currentKey) {
    result[currentKey] = multilineValue.trim();
  }

  return { frontmatter: result, body };
}

describe('agent YAML frontmatter', () => {
  const agentFiles = fs.readdirSync(AGENTS_DIR)
    .filter(f => f.endsWith('.md'))
    .sort();

  it('has at least one agent file', () => {
    assert.ok(agentFiles.length > 0, 'Expected agent files in .claude/agents/');
  });

  for (const file of agentFiles) {
    describe(file, () => {
      const content = fs.readFileSync(path.join(AGENTS_DIR, file), 'utf8');
      const { frontmatter } = parseFrontmatter(content);

      it('has YAML frontmatter', () => {
        assert.ok(frontmatter, `${file} is missing YAML frontmatter`);
      });

      it('has required field: name', () => {
        assert.ok(frontmatter?.name, `${file} missing "name"`);
      });

      it('has required field: description', () => {
        assert.ok(frontmatter?.description, `${file} missing "description"`);
      });

      it('has required field: tools', () => {
        assert.ok(frontmatter?.tools, `${file} missing "tools"`);
      });

      it('has required field: model', () => {
        assert.ok(frontmatter?.model, `${file} missing "model"`);
      });

      it('has required field: permissionMode', () => {
        assert.ok(frontmatter?.permissionMode, `${file} missing "permissionMode"`);
      });

      it('has a valid model value', () => {
        const validModels = ['opus', 'sonnet', 'haiku'];
        assert.ok(
          validModels.includes(frontmatter?.model),
          `${file} model "${frontmatter?.model}" not in [${validModels}]`
        );
      });

      it('name matches filename (without .md)', () => {
        const expected = file.replace('.md', '');
        assert.equal(frontmatter?.name, expected,
          `${file} name "${frontmatter?.name}" doesn't match filename`);
      });
    });
  }
});

describe('skill SKILL.md files', () => {
  const skillDirs = fs.readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
    .sort();

  it('has at least one skill directory', () => {
    assert.ok(skillDirs.length > 0, 'Expected skill directories in .claude/skills/');
  });

  for (const dir of skillDirs) {
    describe(dir, () => {
      const skillPath = path.join(SKILLS_DIR, dir, 'SKILL.md');

      it('has a SKILL.md file', () => {
        assert.ok(fs.existsSync(skillPath), `${dir}/SKILL.md is missing`);
      });

      it('SKILL.md has content', () => {
        const content = fs.readFileSync(skillPath, 'utf8');
        assert.ok(content.trim().length > 0, `${dir}/SKILL.md is empty`);
      });

      it('SKILL.md starts with frontmatter or a heading', () => {
        const content = fs.readFileSync(skillPath, 'utf8');
        const startsWithFrontmatter = content.startsWith('---\n');
        const startsWithHeading = content.startsWith('#');
        assert.ok(
          startsWithFrontmatter || startsWithHeading,
          `${dir}/SKILL.md should start with YAML frontmatter or a markdown heading`
        );
      });

      // If frontmatter exists, validate it
      it('frontmatter (if present) has name and description', () => {
        const content = fs.readFileSync(skillPath, 'utf8');
        const { frontmatter } = parseFrontmatter(content);
        if (frontmatter) {
          assert.ok(frontmatter.name, `${dir}/SKILL.md frontmatter missing "name"`);
          assert.ok(frontmatter.description, `${dir}/SKILL.md frontmatter missing "description"`);
        }
      });
    });
  }
});
