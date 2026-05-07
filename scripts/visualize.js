#!/usr/bin/env node
/**
 * Pipeline visualization — generates a Mermaid stateDiagram-v2 of the active run.
 *
 * Usage:
 *   node scripts/visualize.js
 *
 * Writes pipeline/diagram.md with:
 *   - One state per stage in the active track
 *   - Color/marker by gate status: PASS=green, FAIL=red, ESCALATE=orange, missing=gray
 *   - A small legend
 */

const fs = require("node:fs");
const path = require("node:path");

const ROOT = process.cwd();

// Import shared helpers from claude-team.js
const claudeTeamPath = path.join(__dirname, "claude-team.js");
let orderedStageNamesForTrack;
let activeTrack;
let STAGES;

try {
  const ct = require(claudeTeamPath);
  orderedStageNamesForTrack = ct.orderedStageNamesForTrack;
  activeTrack = ct.activeTrack;
  STAGES = ct.STAGES;
} catch {
  // Fallback if claude-team.js is not importable from this cwd. Names match
  // the canonical claude pipeline (10 stages including pre-review and sign-off).
  const DEFAULT_STAGES = [
    "requirements",
    "design",
    "clarification",
    "build",
    "pre-review",
    "peer-review",
    "qa",
    "sign-off",
    "deploy",
    "retrospective",
  ];
  orderedStageNamesForTrack = () => DEFAULT_STAGES;
  activeTrack = () => "full";
  STAGES = {};
}

const STATUS_COLORS = {
  PASS: ":::passState",
  FAIL: ":::failState",
  ESCALATE: ":::escalateState",
  INVALID: ":::failState",
};

function gatesDir() {
  return path.join(ROOT, "pipeline", "gates");
}

function readGate(stage) {
  const gatePath = path.join(gatesDir(), `${stage}.json`);
  if (!fs.existsSync(gatePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(gatePath, "utf8"));
  } catch {
    return { status: "INVALID" };
  }
}

function stageGateName(name) {
  // Map stage name to canonical gate file name. Prefer STAGES[name].stage
  // from claude-team.js; fall back to a hardcoded map only if STAGES is
  // unavailable (claude-team.js failed to import).
  if (!STAGES || !STAGES[name]) {
    const map = {
      requirements: "stage-01",
      design: "stage-02",
      clarification: "stage-03",
      build: "stage-04",
      "pre-review": "stage-04a",
      "peer-review": "stage-05-backend",
      qa: "stage-06",
      "sign-off": "stage-07",
      deploy: "stage-08",
      retrospective: "stage-09",
    };
    return map[name] || `stage-${name}`;
  }
  return STAGES[name].stage;
}

function labelForName(name) {
  const labels = {
    requirements: "1: Requirements",
    design: "2: Design",
    clarification: "3: Clarification",
    build: "4: Build",
    "pre-review": "4.5a: Pre-review",
    "peer-review": "5: Peer Review",
    qa: "6: QA",
    "sign-off": "7: Sign-off",
    deploy: "8: Deploy",
    retrospective: "9: Retrospective",
  };
  return labels[name] || name;
}

function statusMarker(status) {
  if (!status) return " [gray]";
  if (status === "PASS") return " [green]";
  if (status === "FAIL") return " [red]";
  if (status === "ESCALATE") return " [orange]";
  return " [gray]";
}

function stateId(name) {
  // Safe state ID for Mermaid (no hyphens or spaces)
  return name.replace(/[^a-zA-Z0-9]/g, "_");
}

function generateDiagram(track, stageNames) {
  const lines = ["stateDiagram-v2"];

  // Class definitions for colors
  lines.push("    classDef passState fill:#22c55e,stroke:#16a34a,color:#fff");
  lines.push("    classDef failState fill:#ef4444,stroke:#dc2626,color:#fff");
  lines.push("    classDef escalateState fill:#f97316,stroke:#ea580c,color:#fff");
  lines.push("    classDef grayState fill:#9ca3af,stroke:#6b7280,color:#fff");
  lines.push("");

  // States with transitions
  lines.push("    [*] --> start");
  lines.push(`    start: Track: ${track}`);
  lines.push("");

  let prev = "start";
  for (const name of stageNames) {
    const id = stateId(name);
    const gateName = stageGateName(name);
    const gate = readGate(gateName);
    const status = gate ? gate.status : null;
    const label = `${labelForName(name)}${statusMarker(status)}`;

    lines.push(`    ${prev} --> ${id}`);
    lines.push(`    ${id}: ${label}`);

    // Apply class
    if (status === "PASS") {
      lines.push(`    class ${id} passState`);
    } else if (status === "FAIL" || status === "INVALID") {
      lines.push(`    class ${id} failState`);
    } else if (status === "ESCALATE") {
      lines.push(`    class ${id} escalateState`);
    } else {
      lines.push(`    class ${id} grayState`);
    }

    prev = id;
  }

  lines.push(`    ${prev} --> [*]`);

  return lines.join("\n");
}

function countByStatus(stageNames) {
  let pass = 0;
  let fail = 0;
  let escalate = 0;
  let missing = 0;

  for (const name of stageNames) {
    const gate = readGate(stageGateName(name));
    if (!gate) { missing++; continue; }
    if (gate.status === "PASS") { pass++; continue; }
    if (gate.status === "FAIL" || gate.status === "INVALID") { fail++; continue; }
    if (gate.status === "ESCALATE") { escalate++; continue; }
    missing++;
  }

  return { pass, fail, escalate, missing };
}

function main() {
  let track;
  try {
    track = activeTrack();
  } catch {
    track = "full";
  }

  let stageNames;
  try {
    stageNames = orderedStageNamesForTrack(track);
  } catch {
    stageNames = ["requirements", "design", "clarification", "build", "pre-review", "peer-review", "qa", "sign-off", "deploy", "retrospective"];
  }

  const diagram = generateDiagram(track, stageNames);
  const counts = countByStatus(stageNames);
  const now = new Date().toISOString();

  const output = [
    "# Pipeline Diagram",
    "",
    `Generated: ${now}  `,
    `Track: ${track}  `,
    `Stages: ${stageNames.length} total | ${counts.pass} pass | ${counts.fail} fail | ${counts.escalate} escalate | ${counts.missing} not-run`,
    "",
    "```mermaid",
    diagram,
    "```",
    "",
    "## Legend",
    "",
    "| Color | Status |",
    "|-------|--------|",
    "| Green | PASS |",
    "| Red | FAIL |",
    "| Orange | ESCALATE |",
    "| Gray | Not yet run |",
    "",
  ].join("\n");

  fs.mkdirSync(path.join(ROOT, "pipeline"), { recursive: true });
  const outPath = path.join(ROOT, "pipeline", "diagram.md");
  fs.writeFileSync(outPath, output);
  console.log(`written pipeline/diagram.md (track: ${track}, ${stageNames.length} stages)`);
  return 0;
}

if (require.main === module) {
  process.exit(main());
}

module.exports = {
  generateDiagram,
  stageGateName,
  countByStatus,
  STATUS_COLORS,
};
