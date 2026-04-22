#!/usr/bin/env node
/**
 * approval-derivation.js
 *
 * PostToolUse hook. Triggers after a Write or Edit to
 * pipeline/code-review/by-<reviewer>.md. Parses the review file for
 * per-area section headers and REVIEW: markers, then updates the
 * corresponding stage-05-<area>.json gate files.
 *
 * Format expected in the review file:
 *
 *   ## Review of backend
 *   <comments>
 *   REVIEW: APPROVED
 *
 *   ## Review of platform
 *   <comments>
 *   REVIEW: CHANGES REQUESTED
 *   BLOCKER: <text>
 *
 * From v2.3.1 onward, the agent no longer writes the "approvals" or
 * "changes_requested" arrays on stage-05 gates directly. The hook
 * derives them from the review file. This closes the "anyone can
 * approve anyone" hole from v1/v2 where an agent could self-append
 * to a gate without writing a matching review section.
 *
 * The hook is conservative:
 *   - Only looks at sections with a REVIEW: marker on their own line
 *   - Only accepts "APPROVED" or "CHANGES REQUESTED" (case-insensitive)
 *   - Deduplicates approvals by reviewer name
 *   - Preserves any existing entries (append-only within a run)
 *   - Updates status to "PASS" when approvals >= required_approvals
 *     AND changes_requested is empty
 *   - Exits 0 on any parse error or file-not-found (surfaces a WARN
 *     but never halts the pipeline on a hook bug)
 */

const fs = require("fs");
const path = require("path");

const REVIEW_DIR = path.join(process.cwd(), "pipeline", "code-review");
const GATES_DIR = path.join(process.cwd(), "pipeline", "gates");

// Map reviewer file suffix to reviewer agent name.
// e.g. by-backend.md -> dev-backend, by-security.md -> security-engineer.
const REVIEWER_MAP = {
  "backend": "dev-backend",
  "frontend": "dev-frontend",
  "platform": "dev-platform",
  "qa": "dev-qa",
  "security": "security-engineer",
  "principal": "principal",
};

// Areas a review file can cover. Keep in sync with known area names.
const KNOWN_AREAS = new Set([
  "backend",
  "frontend",
  "platform",
  "qa",
  "deps",
]);

// Matches:  "## Review of backend"  (any case on "review of")
const SECTION_HEADER_RE = /^##\s+Review\s+of\s+(\w[\w-]*)\s*$/i;
// Matches:  "REVIEW: APPROVED"  or  "REVIEW: CHANGES REQUESTED"
const REVIEW_MARKER_RE =
  /^\s*REVIEW:\s*(APPROVED|CHANGES\s+REQUESTED)\s*$/i;

/**
 * Read a review file and extract per-area verdicts.
 *
 * Returns: Array<{ area: string, verdict: "APPROVED" | "CHANGES_REQUESTED" }>
 */
function parseReviewFile(filePath) {
  let content;
  try {
    content = fs.readFileSync(filePath, "utf8");
  } catch {
    return [];
  }

  const lines = content.split(/\r?\n/);
  const verdicts = [];
  let currentArea = null;

  for (const line of lines) {
    const headerMatch = line.match(SECTION_HEADER_RE);
    if (headerMatch) {
      currentArea = headerMatch[1].toLowerCase();
      continue;
    }
    const markerMatch = line.match(REVIEW_MARKER_RE);
    if (markerMatch && currentArea && KNOWN_AREAS.has(currentArea)) {
      const verdict = markerMatch[1].toUpperCase().replace(/\s+/g, "_");
      verdicts.push({ area: currentArea, verdict });
      // A section may carry at most one verdict; reset to require a new header
      currentArea = null;
    }
  }

  // Backward-compat: if the file has a single trailing REVIEW: line and
  // no "## Review of X" sections, fall through without deriving — the
  // legacy agent-authored approval path stays valid until fully migrated.
  return verdicts;
}

/** Derive the reviewer agent name from a review file path. */
function reviewerNameFromPath(filePath) {
  const base = path.basename(filePath);
  const m = base.match(/^by-([\w-]+)\.md$/);
  if (!m) return null;
  return REVIEWER_MAP[m[1]] || m[1];
}

/** Upsert a stage-05 gate, applying the given verdict from the given reviewer. */
function applyVerdict({ area, verdict, reviewer }) {
  if (!fs.existsSync(GATES_DIR)) {
    fs.mkdirSync(GATES_DIR, { recursive: true });
  }
  const gatePath = path.join(GATES_DIR, `stage-05-${area}.json`);
  let gate;

  if (fs.existsSync(gatePath)) {
    try {
      gate = JSON.parse(fs.readFileSync(gatePath, "utf8"));
    } catch {
      // Malformed existing gate — do not clobber; surface a WARN and exit.
      console.log(
        `[approval-derivation] ⚠️  ${gatePath} is malformed; skipping update`,
      );
      return;
    }
  } else {
    gate = {
      stage: `stage-05-${area}`,
      status: "FAIL",
      agent: "orchestrator",
      timestamp: new Date().toISOString(),
      blockers: [],
      warnings: [],
      area: area,
      approvals: [],
      changes_requested: [],
      escalated_to_principal: false,
      required_approvals: 2, // default matrix; scoped runs override this
      review_shape: "matrix",
    };
  }

  // Ensure arrays exist even on legacy gate files.
  gate.approvals = Array.isArray(gate.approvals) ? gate.approvals : [];
  gate.changes_requested = Array.isArray(gate.changes_requested)
    ? gate.changes_requested
    : [];

  if (verdict === "APPROVED") {
    if (!gate.approvals.includes(reviewer)) {
      gate.approvals.push(reviewer);
    }
    gate.changes_requested = gate.changes_requested.filter(
      (entry) => entry.reviewer !== reviewer,
    );
  } else if (verdict === "CHANGES_REQUESTED") {
    gate.approvals = gate.approvals.filter((name) => name !== reviewer);
    const already = gate.changes_requested.some(
      (entry) => entry.reviewer === reviewer,
    );
    if (!already) {
      gate.changes_requested.push({
        reviewer,
        timestamp: new Date().toISOString(),
      });
    }
  }

  const required =
    typeof gate.required_approvals === "number" ? gate.required_approvals : 2;
  const hasEnough = gate.approvals.length >= required;
  const hasBlockers = gate.changes_requested.length > 0;

  gate.status = hasEnough && !hasBlockers ? "PASS" : "FAIL";
  gate.timestamp = new Date().toISOString();

  fs.writeFileSync(gatePath, JSON.stringify(gate, null, 2) + "\n");
  console.log(
    `[approval-derivation] ${reviewer} → ${verdict} on ${area} (approvals: ${gate.approvals.length}/${required}, status: ${gate.status})`,
  );
}

function main() {
  if (!fs.existsSync(REVIEW_DIR)) {
    process.exit(0);
  }

  const reviewFiles = fs
    .readdirSync(REVIEW_DIR)
    .filter((f) => /^by-[\w-]+\.md$/.test(f));

  if (reviewFiles.length === 0) {
    process.exit(0);
  }

  for (const file of reviewFiles) {
    const fullPath = path.join(REVIEW_DIR, file);
    const reviewer = reviewerNameFromPath(fullPath);
    if (!reviewer) continue;

    const verdicts = parseReviewFile(fullPath);
    if (verdicts.length === 0) continue;

    for (const v of verdicts) {
      applyVerdict({
        area: v.area,
        verdict: v.verdict,
        reviewer: reviewer,
      });
    }
  }

  process.exit(0);
}

try {
  main();
} catch (err) {
  const msg = err && err.message ? err.message : String(err);
  console.log(`[approval-derivation] ⚠️  internal error: ${msg}; no gates updated`);
  process.exit(0);
}
