#!/usr/bin/env node
/**
 * approval-derivation.js
 *
 * PostToolUse hook. Triggers after a Write or Edit. When the written file is
 * inside pipeline/code-review/, parses it for per-area section headers and
 * REVIEW: markers, then updates the corresponding stage-05-<area>.json gate
 * files.
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
 *
 * Concurrency (v2.5.1+):
 *   - Uses a per-gate file lock (.stage-05-<area>.lock) to serialise
 *     concurrent hook invocations that would otherwise race on the
 *     read-modify-write of the gate file.
 *   - Writes the updated gate atomically via a temp-file rename so a
 *     crash mid-write never leaves a partial JSON file.
 *   - Stale locks (> LOCK_STALE_MS) are cleared automatically to
 *     recover from a process that died while holding the lock.
 *
 * Early exit (v2.5.1+):
 *   - Reads the PostToolUse context from stdin. If the written file is
 *     not inside pipeline/code-review/, the hook exits 0 immediately
 *     without scanning the directory — avoiding a filesystem round-trip
 *     on every src/ write during the build stage.
 *   - Falls back to the full directory scan if stdin is empty or
 *     unparseable (e.g. when invoked manually for testing).
 */

const fs = require("fs");
const path = require("path");

// Resolve the working directory through symlinks so that path comparisons are
// stable on macOS where os.tmpdir() returns /tmp (a symlink to /private/tmp)
// but process.cwd() returns the resolved /private/tmp/... form.
const CWD = (() => {
  try { return fs.realpathSync(process.cwd()); } catch { return process.cwd(); }
})();

const REVIEW_DIR = path.join(CWD, "pipeline", "code-review");
const GATES_DIR = path.join(CWD, "pipeline", "gates");

// Lock tuning
//
// Two reviewers writing concurrently is the contended path; a typical
// gate write completes in well under 30 ms, so a single retry is usually
// enough. The budget below gives 20 × 30 ms = 600 ms of total wait
// before bail — long enough that a contending hook almost always wins
// eventually (hook cold-start alone is ~50 ms, and the gate write is
// fast), but short enough that an actually-stuck hook surfaces quickly
// rather than blocking the user's session for several seconds.
//
// LOCK_STALE_MS is intentionally longer than the busy-wait window so a
// normally-contending writer doesn't trigger stale-lock recovery on a
// peer that is simply mid-write.
const LOCK_RETRIES = 20;
const LOCK_DELAY_MS = 30;
const LOCK_STALE_MS = 5000; // clear locks held for > 5 s (crashed process)

// 1 MB cap on review-file and gate-file reads. Both are typically <10 KB;
// an oversized file (corruption, a prank, or an attacker with write access
// to pipeline/) would otherwise OOM the hook on every save.
const MAX_FILE_BYTES = 1_000_000;

// Structured-log mode (audit B-23). When LOG_FORMAT=json, emit a single JSON
// event line per gate update so external orchestrators can consume hook
// results without parsing prose. Default off — humans see prose only.
const LOG_JSON = process.env.LOG_FORMAT === "json";

function logEvent(event, data) {
  if (!LOG_JSON) return;
  console.log(JSON.stringify({
    ts: new Date().toISOString(),
    hook: "approval-derivation",
    event,
    ...data,
  }));
}

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

// ---------------------------------------------------------------------------
// Stdin parsing — read the PostToolUse context to get the written file path.
// Returns the file_path string from tool_input, or null if unavailable.
// ---------------------------------------------------------------------------

function getToolFilePath() {
  try {
    if (process.stdin.isTTY) return null;

    const chunks = [];
    const buf = Buffer.alloc(65536);
    let n;
    // Read all available stdin. readSync returns 0 on EOF, which exits the loop.
    while ((n = fs.readSync(0, buf, 0, buf.length)) > 0) {
      chunks.push(Buffer.from(buf.slice(0, n)));
      // 4 MB safety cap — Write hooks include the full file content in stdin
      if (chunks.reduce((sum, c) => sum + c.length, 0) > 4 * 1024 * 1024) break;
    }
    if (chunks.length === 0) return null;

    const data = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    return data &&
      data.tool_input &&
      typeof data.tool_input.file_path === "string"
      ? data.tool_input.file_path
      : null;
  } catch {
    return null;
  }
}

/** Returns true when filePath is inside pipeline/code-review/. */
function isReviewFile(filePath) {
  if (!filePath) return false;
  // Resolve symlinks on the incoming path so /tmp/... and /private/tmp/...
  // compare equal on macOS (REVIEW_DIR is already resolved via CWD above).
  let normalized;
  try {
    normalized = fs.realpathSync(
      path.isAbsolute(filePath) ? filePath : path.resolve(filePath),
    );
  } catch {
    normalized = path.isAbsolute(filePath) ? filePath : path.resolve(filePath);
  }
  return normalized.startsWith(REVIEW_DIR + path.sep);
}

// ---------------------------------------------------------------------------
// File-based locking — spin-lock via O_EXCL for the gate read-modify-write.
// ---------------------------------------------------------------------------

/** Acquire an exclusive lock. Returns true on success, false on timeout. */
function acquireLock(lockPath) {
  // Remove a stale lock left by a crashed process.
  if (fs.existsSync(lockPath)) {
    try {
      const age = Date.now() - fs.statSync(lockPath).mtimeMs;
      if (age > LOCK_STALE_MS) fs.unlinkSync(lockPath);
    } catch {
      // Another concurrent process may have already removed it.
    }
  }

  for (let i = 0; i < LOCK_RETRIES; i++) {
    try {
      // O_EXCL: create fails if the file exists — atomic test-and-set.
      fs.writeFileSync(lockPath, String(process.pid), { flag: "wx" });
      return true;
    } catch (err) {
      if (err.code !== "EEXIST") throw err;
      // Park the thread for LOCK_DELAY_MS without burning CPU. Atomics.wait
      // on a throwaway SharedArrayBuffer is the canonical synchronous sleep
      // in Node — keeps acquireLock() synchronous so callers don't have to
      // change shape, and yields cleanly to any concurrent hook that holds
      // the lock right now.
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, LOCK_DELAY_MS);
    }
  }
  return false;
}

/** Release the lock. Silently ignores missing-file errors. */
function releaseLock(lockPath) {
  try { fs.unlinkSync(lockPath); } catch { /* ignore */ }
}

// ---------------------------------------------------------------------------
// Review file parsing
// ---------------------------------------------------------------------------

/**
 * Read a review file and extract per-area verdicts.
 *
 * Returns: Array<{ area: string, verdict: "APPROVED" | "CHANGES_REQUESTED" }>
 */
function parseReviewFile(filePath) {
  let content;
  try {
    const stat = fs.statSync(filePath);
    if (stat.size > MAX_FILE_BYTES) {
      console.log(
        `[approval-derivation] ⚠️  ${filePath} exceeds ${MAX_FILE_BYTES} bytes (size: ${stat.size}); skipping`,
      );
      return [];
    }
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

// ---------------------------------------------------------------------------
// Gate upsert — locked read-modify-write with atomic rename write.
// ---------------------------------------------------------------------------

/** Upsert a stage-05 gate, applying the given verdict from the given reviewer. */
function applyVerdict({ area, verdict, reviewer }) {
  if (!fs.existsSync(GATES_DIR)) {
    fs.mkdirSync(GATES_DIR, { recursive: true });
  }

  const gatePath = path.join(GATES_DIR, `stage-05-${area}.json`);
  const lockPath = path.join(GATES_DIR, `.stage-05-${area}.lock`);

  if (!acquireLock(lockPath)) {
    console.log(
      `[approval-derivation] ⚠️  Could not acquire lock for ${area} gate after ${LOCK_RETRIES} retries; skipping`,
    );
    return;
  }

  try {
    let gate;

    if (fs.existsSync(gatePath)) {
      try {
        const stat = fs.statSync(gatePath);
        if (stat.size > MAX_FILE_BYTES) {
          console.log(
            `[approval-derivation] ⚠️  ${gatePath} exceeds ${MAX_FILE_BYTES} bytes (size: ${stat.size}); refusing to clobber`,
          );
          return;
        }
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

    // Atomic write: write to a temp file then rename into place.
    // fs.renameSync is atomic on POSIX; on Windows it is not, but the
    // worst case is a visible temp file for a brief moment.
    const tmpPath = `${gatePath}.tmp.${process.pid}`;
    fs.writeFileSync(tmpPath, JSON.stringify(gate, null, 2) + "\n");
    fs.renameSync(tmpPath, gatePath);

    console.log(
      `[approval-derivation] ${reviewer} → ${verdict} on ${area} (approvals: ${gate.approvals.length}/${required}, status: ${gate.status})`,
    );
    logEvent("gate_updated", {
      area,
      reviewer,
      verdict,
      status: gate.status,
      approvals: gate.approvals.slice(),
      approvals_count: gate.approvals.length,
      required_approvals: required,
      changes_requested_count: gate.changes_requested.length,
    });
  } finally {
    releaseLock(lockPath);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  // Early exit: if the hook context tells us which file was just written and
  // it is NOT inside pipeline/code-review/, there is nothing to derive.
  // Falls back to the full scan when stdin is empty (e.g. manual invocation).
  const writtenPath = getToolFilePath();
  if (writtenPath !== null && !isReviewFile(writtenPath)) {
    process.exit(0);
  }

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
