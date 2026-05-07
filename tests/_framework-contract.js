// Shared framework-contract lists used by multiple test files. Single
// source of truth for: slash commands, rule files, skills, stage numbers,
// stage schema filenames, and helper scripts. Update these when a part of
// the framework is added or removed; the tests that consume this module
// will then catch any other file that drifts out of sync.
//
// The filename does not end in `.test.js`, so `node --test tests/*.test.js`
// won't try to run it as a suite; the leading underscore flags it as a
// test-internal helper at a glance.

const COMMANDS = [
  "adr",
  "ask-pm",
  "audit-quick",
  "audit",
  "config-only",
  "dep-update",
  "design",
  "health-check",
  "hotfix",
  "nano",
  "pipeline-brief",
  "pipeline-context",
  "pipeline-review",
  "pipeline",
  "principal-ruling",
  "quick",
  "reset",
  "resume",
  "retrospective",
  "review",
  "roadmap",
  "stage",
  "status",
];

const RULES = [
  "coding-principles",
  "compaction",
  "escalation",
  "gates",
  "orchestrator",
  "pipeline",
  "retrospective",
];

const SKILLS = [
  "api-conventions",
  "code-conventions",
  "implement",
  "pre-pr-review",
  "review-rubric",
  "security-checklist",
];

const STAGE_NUMBERS = [
  "stage-01",
  "stage-02",
  "stage-03",
  "stage-04",
  "stage-05",
  "stage-06",
  "stage-07",
  "stage-08",
  "stage-09",
];

const STAGE_SCHEMAS = STAGE_NUMBERS.map((s) => `${s}.schema.json`);

const HELPER_SCRIPTS = [
  "claude-team.js",
  "gate-validator.js",
  "approval-derivation.js",
  "status.js",
  "summary.js",
  "roadmap.js",
  "parity-check.js",
  "release.js",
  "pr-pack.js",
  "lessons.js",
  "runbook-check.js",
  "security-heuristic.js",
  "stoplist.js",
  "budget.js",
  "consistency.js",
  "lint-syntax.js",
  "audit.js",
  "bootstrap.js",
];

module.exports = {
  COMMANDS,
  RULES,
  SKILLS,
  STAGE_NUMBERS,
  STAGE_SCHEMAS,
  HELPER_SCRIPTS,
};
