const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { COMMANDS } = require("../scripts/claude-team");

const ROOT = path.resolve(__dirname, "..");
const COMMANDS_DIR = path.join(ROOT, ".claude", "commands");

// Help aliases are CLI-only by construction — they're argv flags, not
// commands a user types in Claude Code.
const HELP_ALIASES = new Set(["help", "--help", "-h"]);

// CLI-only commands that intentionally have no slash equivalent. Keep this
// list explicit: a new CLI command without a slash sibling must either ship
// the slash file or be added here with a one-line reason in the inline
// comment, so a future contributor can tell whether the absence is on
// purpose.
const CLI_ONLY = new Set([
  // Diagnostic / state inspection — fast feedback during development
  "doctor",         // verifies framework files are in place
  "validate",       // validates gate JSON against schemas
  "next",           // prints what stage should run next and why
  "summary",        // human-readable run summary
  "autofold",       // folds Stage 7 when criteria are 1:1
  "lessons",        // summarises lessons-learned.md

  // Helper-script wrappers exposed for CI scripting; the underlying
  // behaviour is invoked by hooks or by other slash commands, so a
  // dedicated slash command would be redundant.
  "review",         // runs approval-derivation.js
  "security",       // runs security-heuristic.js
  "runbook",        // runs runbook-check.js
  "budget",         // runs budget.js (init/update/check)
  "visualize",      // runs visualize.js — writes pipeline/diagram.md (Mermaid)
  "checkpoint",     // applies checkpoint auto-pass per .claude/config.yml

  // Internal scaffolding consumed by /pipeline et al.; not user-facing.
  "pipeline:new",
  "pipeline:scaffold",
  "prompt",         // emits a ready-to-paste prompt for a given stage
  "role",           // prints the persona prompt for a given role
]);

function listSlashCommands() {
  return fs.readdirSync(COMMANDS_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.replace(/\.md$/, ""))
    .sort();
}

describe("slash <-> CLI parity", () => {
  it("every slash command has a matching CLI handler", () => {
    const slashCommands = listSlashCommands();
    const cliKeys = new Set(Object.keys(COMMANDS));
    const missing = slashCommands.filter((name) => !cliKeys.has(name));
    assert.deepEqual(
      missing,
      [],
      `slash commands without a CLI handler: ${missing.join(", ")}`,
    );
  });

  it("every CLI command is either a slash command, a help alias, or in CLI_ONLY", () => {
    const slashCommands = new Set(listSlashCommands());
    const orphans = Object.keys(COMMANDS).filter(
      (name) => !slashCommands.has(name) && !HELP_ALIASES.has(name) && !CLI_ONLY.has(name),
    );
    assert.deepEqual(
      orphans,
      [],
      `CLI commands not in slash, help-alias, or CLI_ONLY: ${orphans.join(", ")}\n` +
        `If intentional, add to CLI_ONLY in tests/slash-cli-parity.test.js with a comment.`,
    );
  });

  it("CLI_ONLY entries are all real CLI commands (no stale entries)", () => {
    const cliKeys = new Set(Object.keys(COMMANDS));
    const stale = [...CLI_ONLY].filter((name) => !cliKeys.has(name));
    assert.deepEqual(
      stale,
      [],
      `CLI_ONLY allow-list has stale entries (CLI command was removed): ${stale.join(", ")}`,
    );
  });

  it("HELP_ALIASES are all real CLI commands", () => {
    const cliKeys = new Set(Object.keys(COMMANDS));
    const stale = [...HELP_ALIASES].filter((name) => !cliKeys.has(name));
    assert.deepEqual(stale, [], `HELP_ALIASES has stale entries: ${stale.join(", ")}`);
  });
});
