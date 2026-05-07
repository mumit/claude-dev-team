const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const SETTINGS_PATH = path.join(ROOT, ".claude", "settings.json");

function readSettings() {
  return JSON.parse(fs.readFileSync(SETTINGS_PATH, "utf8"));
}

function allHookCommands(settings) {
  const commands = [];
  for (const event of Object.keys(settings.hooks || {})) {
    for (const block of settings.hooks[event]) {
      const inner = Array.isArray(block.hooks) ? block.hooks : [block];
      for (const h of inner) {
        if (h && h.command) commands.push({ event, command: h.command });
      }
    }
  }
  return commands;
}

describe("settings.json hook commands", () => {
  it("settings.json is valid JSON", () => {
    assert.doesNotThrow(() => readSettings());
  });

  it("declares hooks for PostToolUse, SubagentStop, and Stop", () => {
    const settings = readSettings();
    assert.ok(settings.hooks, "settings.hooks should be defined");
    for (const event of ["PostToolUse", "SubagentStop", "Stop"]) {
      assert.ok(
        Array.isArray(settings.hooks[event]),
        `expected hooks.${event} to be an array`,
      );
    }
  });

  it("every hook command resolves the project root via the three-tier fallback chain", () => {
    // Audit B-20: $(git rev-parse --show-toplevel) by itself fails in a
    // .git-less checkout, silently breaking the hook. Each command must
    // chain CLAUDE_PROJECT_DIR -> git rev-parse -> pwd so the hook runs
    // cleanly in non-git checkouts too.
    const commands = allHookCommands(readSettings());
    assert.ok(commands.length > 0, "expected at least one hook command");

    for (const { event, command } of commands) {
      assert.match(
        command,
        /\$\{CLAUDE_PROJECT_DIR:-/,
        `${event} hook command must reference \${CLAUDE_PROJECT_DIR:-...}`,
      );
      assert.match(
        command,
        /git rev-parse --show-toplevel/,
        `${event} hook command must include git rev-parse fallback`,
      );
      assert.match(
        command,
        /\|\| pwd/,
        `${event} hook command must include pwd as last-resort fallback`,
      );
    }
  });

  it("every hook command points at .claude/hooks/<name>.js", () => {
    const commands = allHookCommands(readSettings());
    for (const { event, command } of commands) {
      assert.match(
        command,
        /\.claude\/hooks\/[a-z][a-z-]*\.js/,
        `${event} hook command should target a file under .claude/hooks/`,
      );
    }
  });
});
