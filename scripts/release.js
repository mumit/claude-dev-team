#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const ROOT = process.cwd();

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), "utf8"));
}

function exists(relativePath) {
  return fs.existsSync(path.join(ROOT, relativePath));
}

// Extract framework.version from .claude/config.yml without taking a YAML
// dependency. Matches a `version: "X.Y.Z"` line that appears under the
// top-level `framework:` block. Returns null if the file or key is missing.
function readConfigYmlVersion() {
  const configPath = path.join(ROOT, ".claude", "config.yml");
  if (!fs.existsSync(configPath)) return null;
  const yml = fs.readFileSync(configPath, "utf8");
  const m = yml.match(
    /^framework:\s*\n(?:[^\n]*\n)*?\s*version:\s*"([^"]+)"/m,
  );
  return m ? m[1] : null;
}

function releaseChecks() {
  const version = fs.readFileSync(path.join(ROOT, "VERSION"), "utf8").trim();
  const pkg = readJson("package.json");
  const lock = readJson("package-lock.json");
  const errors = [];

  if (pkg.version !== version) errors.push(`package.json version ${pkg.version} does not match VERSION ${version}`);
  if (lock.version !== version) errors.push(`package-lock.json version ${lock.version} does not match VERSION ${version}`);
  if (lock.packages?.[""]?.version !== version) {
    errors.push(`package-lock root package version ${lock.packages?.[""]?.version} does not match VERSION ${version}`);
  }

  const configVersion = readConfigYmlVersion();
  if (configVersion === null) {
    errors.push(`.claude/config.yml is missing framework.version`);
  } else if (configVersion !== version) {
    errors.push(
      `.claude/config.yml framework.version ${configVersion} does not match VERSION ${version}`,
    );
  }

  for (const script of [
    "test",
    "help",
    "lint",
    "validate",
    "doctor",
    "status",
    "next",
    "roadmap",
    "quick",
    "nano",
    "config-only",
    "dep-update",
    "hotfix",
    "pipeline:scaffold",
    "ask-pm",
    "principal-ruling",
    "adr",
    "resume",
    "gate:check:all",
    "summary",
    "pr:pack",
    "autofold",
    "parity:check",
  ]) {
    if (!pkg.scripts?.[script]) errors.push(`missing npm script: ${script}`);
  }

  for (const file of [
    "README.md",
    "CLAUDE.md",
    ".claude/config.yml",
    ".github/workflows/test.yml",
    "scripts/claude-team.js",
    "scripts/gate-validator.js",
    "scripts/parity-check.js",
    "examples/tiny-app/package.json",
  ]) {
    if (!exists(file)) errors.push(`missing release file: ${file}`);
  }

  if (exists("scripts/parity-check.js")) {
    const parity = spawnSync(process.execPath, ["scripts/parity-check.js"], {
      cwd: ROOT,
      encoding: "utf8",
    });
    if (parity.status !== 0) {
      const output = [parity.stderr, parity.stdout].filter(Boolean).join("\n").trim();
      errors.push(`parity check failed${output ? `: ${output}` : ""}`);
    }
  }

  if (errors.length > 0) {
    for (const error of errors) console.error(`FAIL ${error}`);
    return 1;
  }

  console.log(`Release check OK for v${version}.`);
  return 0;
}

function gitLog(fromRef) {
  const args = ["log", "--oneline", "--decorate=short"];
  if (fromRef) args.push(`${fromRef}..HEAD`);
  const result = spawnSync("git", args, {
    cwd: ROOT,
    encoding: "utf8",
  });
  if (result.status !== 0) return ["No git history available."];
  return result.stdout.trim().split(/\r?\n/).filter(Boolean);
}

function writeNotes(fromRef) {
  const version = fs.readFileSync(path.join(ROOT, "VERSION"), "utf8").trim();
  const notesDir = path.join(ROOT, "docs", "release-notes");
  const notesPath = path.join(notesDir, `v${version}.md`);
  const commits = gitLog(fromRef);
  fs.mkdirSync(notesDir, { recursive: true });
  fs.writeFileSync(notesPath, [
    `# Release v${version}`,
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Verification",
    "",
    "- npm run lint",
    "- npm test",
    "- npm run test:coverage",
    "- npm run validate",
    "- npm run doctor",
    "- npm run parity:check",
    "- npm run release:check",
    "",
    "## Commits",
    "",
    ...commits.map((commit) => `- ${commit}`),
    "",
  ].join("\n"));
  console.log(`wrote docs/release-notes/v${version}.md`);
  return 0;
}

function usage() {
  console.log("Usage: release <check|notes> [from-ref]");
  return 1;
}

function main() {
  const command = process.argv[2] || "check";
  if (command === "check") return releaseChecks();
  if (command === "notes") return writeNotes(process.argv[3]);
  return usage();
}

if (require.main === module) {
  process.exit(main());
}

module.exports = { releaseChecks, writeNotes };
