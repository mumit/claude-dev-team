#!/usr/bin/env node
/**
 * gate-validator.js
 *
 * Runs after every subagent stop. Reads the most recently modified gate file
 * in pipeline/gates/ and validates its structure. Prints a summary to stdout
 * so the orchestrator sees it in the transcript. Exits non-zero on ESCALATE
 * so the orchestrator halts.
 */

const fs = require("fs");
const path = require("path");

const GATES_DIR = path.join(process.cwd(), "pipeline", "gates");

if (!fs.existsSync(GATES_DIR)) {
  // No gates written yet — first run, not an error
  process.exit(0);
}

// Find the most recently modified gate file
const gateFiles = fs.readdirSync(GATES_DIR)
  .filter(f => f.endsWith(".json"))
  .map(f => ({
    name: f,
    mtime: fs.statSync(path.join(GATES_DIR, f)).mtimeMs,
    full: path.join(GATES_DIR, f)
  }))
  .sort((a, b) => b.mtime - a.mtime);

if (gateFiles.length === 0) {
  process.exit(0);
}

const latest = gateFiles[0];
let gate;

try {
  gate = JSON.parse(fs.readFileSync(latest.full, "utf8"));
} catch (e) {
  console.error(`[gate-validator] ERROR: Could not parse ${latest.name}: ${e.message}`);
  console.error(`[gate-validator] Gate files must be valid JSON. See .claude/rules/gates.md`);
  process.exit(1);
}

// Validate required fields
const required = ["stage", "status", "agent", "timestamp", "blockers", "warnings"];
const missing = required.filter(k => !(k in gate));
if (missing.length > 0) {
  console.error(`[gate-validator] INVALID GATE ${latest.name}: missing fields: ${missing.join(", ")}`);
  process.exit(1);
}

// Report status
const status = gate.status;
const stage = gate.stage;
const agent = gate.agent;

if (status === "PASS") {
  console.log(`[gate-validator] ✅ GATE PASS — ${stage} (${agent})`);
  if (gate.warnings && gate.warnings.length > 0) {
    console.log(`[gate-validator] ⚠️  Warnings: ${gate.warnings.join("; ")}`);
  }
  process.exit(0);
}

if (status === "FAIL") {
  console.log(`[gate-validator] ❌ GATE FAIL — ${stage} (${agent})`);
  if (gate.blockers && gate.blockers.length > 0) {
    console.log(`[gate-validator] Blockers:`);
    gate.blockers.forEach(b => console.log(`  - ${b}`));
  }
  // Non-zero exit so orchestrator knows to check the gate
  process.exit(2);
}

if (status === "ESCALATE") {
  console.log(`[gate-validator] 🚨 ESCALATION REQUIRED — ${stage}`);
  console.log(`[gate-validator] Reason: ${gate.escalation_reason || "not specified"}`);
  console.log(`[gate-validator] Decision needed: ${gate.decision_needed || "see gate file"}`);
  if (gate.options) {
    console.log(`[gate-validator] Options: ${gate.options.join(" | ")}`);
  }
  // Exit 3 signals escalation — orchestrator halts and surfaces to user
  process.exit(3);
}

console.error(`[gate-validator] UNKNOWN status "${status}" in ${latest.name}`);
process.exit(1);
