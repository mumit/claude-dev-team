const pptxgen = require("pptxgenjs");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const sharp = require("sharp");

const { FaRocket, FaSearch, FaTools, FaCodeBranch, FaChartLine, FaShieldAlt, FaUsers, FaCogs, FaCheckCircle, FaClipboardList, FaLayerGroup, FaSyncAlt, FaBrain, FaTerminal, FaCalendarCheck, FaLightbulb, FaLock, FaExclamationTriangle, FaPuzzlePiece, FaBan, FaExchangeAlt } = require("react-icons/fa");

// ── Palette: Deep purple + green ──
const C = {
  bg_dark: "2B1055",
  bg_mid: "3D1A78",
  accent: "4B8F29",
  accent2: "66BB6A",
  white: "FFFFFF",
  off_white: "F5F3FF",
  light_card: "EDE9FE",
  text_dark: "1E1042",
  text_mid: "5B4F8A",
  text_light: "BFAEE3",
  card_bg: "FFFFFF",
  border: "D4C8F0",
  red_soft: "DC2626",
  red_bg: "FEF2F2",
  green_bg: "F0FDF4",
};

const FONT_H = "Trebuchet MS";
const FONT_B = "Calibri";
const FONT_C = "Courier New";

// ── Layout helpers ──────────────────────────────────────────

/** Render a react-icon to a PNG data URI via sharp. */
function renderIconSvg(Icon, color, size) {
  return ReactDOMServer.renderToStaticMarkup(React.createElement(Icon, { color, size: String(size) }));
}

/** Convert a react-icon component to a base64 PNG data URI. */
async function icon(Icon, color, size = 256) {
  const svg = renderIconSvg(Icon, color, size);
  const buf = await sharp(Buffer.from(svg)).png().toBuffer();
  return "image/png;base64," + buf.toString("base64");
}

/** Add a card with optional icon, title, and body text. */
function addCard(slide, x, y, w, h, title, body, iconData) {
  slide.addShape("rect", { x, y, w, h, fill: { color: C.card_bg },
    shadow: { type: "outer", blur: 4, offset: 1, angle: 135, color: "000000", opacity: 0.08 } });
  slide.addShape("rect", { x, y, w: 0.06, h, fill: { color: C.accent } });
  const tX = iconData ? x + 0.62 : x + 0.2;
  const tW = iconData ? w - 0.82 : w - 0.4;
  if (iconData) slide.addImage({ data: iconData, x: x + 0.2, y: y + 0.15, w: 0.32, h: 0.32 });
  slide.addText(title, { x: tX, y: y + 0.1, w: tW, h: 0.35, fontSize: 13, fontFace: FONT_H, color: C.text_dark, bold: true, margin: 0 });
  slide.addText(body, { x: tX, y: y + 0.42, w: tW, h: h - 0.52, fontSize: 10.5, fontFace: FONT_B, color: C.text_mid, margin: 0, valign: "top" });
}

/** Add a dark section divider slide with icon, title, and subtitle. */
function sectionSlide(pres, title, subtitle, iconData) {
  const s = pres.addSlide();
  s.background = { color: C.bg_dark };
  s.addShape("ellipse", { x: 7.5, y: -1.5, w: 5, h: 5, fill: { color: C.bg_mid, transparency: 50 } });
  if (iconData) s.addImage({ data: iconData, x: 0.8, y: 1.6, w: 0.6, h: 0.6 });
  s.addText(title, { x: 1.6, y: 1.5, w: 7, h: 0.8, fontSize: 36, fontFace: FONT_H, color: C.white, bold: true, margin: 0 });
  s.addText(subtitle, { x: 1.6, y: 2.4, w: 7, h: 0.5, fontSize: 16, fontFace: FONT_B, color: C.text_light, margin: 0 });
  return s;
}

// ── Per-slide functions ─────────────────────────────────────

/** Slide 1: Title page. */
function slideTitlePage(pres, I) {
  const s = pres.addSlide();
  s.background = { color: C.bg_dark };
  s.addShape("ellipse", { x: 6.5, y: -2, w: 7, h: 7, fill: { color: C.bg_mid, transparency: 40 } });
  s.addShape("ellipse", { x: 7.5, y: -1, w: 5, h: 5, fill: { color: C.accent, transparency: 80 } });
  s.addImage({ data: I.rocketW, x: 0.8, y: 0.8, w: 0.7, h: 0.7 });
  s.addText("Claude Dev Team", { x: 0.8, y: 1.7, w: 7, h: 0.9, fontSize: 40, fontFace: FONT_H, color: C.white, bold: true, margin: 0 });
  s.addText("A Structured Dev Pipeline with Claude Code", { x: 0.8, y: 2.55, w: 8, h: 0.5, fontSize: 20, fontFace: FONT_B, color: C.accent2, margin: 0 });
  s.addText("From feature brief to production deploy — with gates, agents, and human checkpoints", { x: 0.8, y: 3.1, w: 8, h: 0.4, fontSize: 13, fontFace: FONT_B, color: C.text_light, margin: 0 });
  s.addText("github.com/mumit/claude-dev-team", { x: 0.8, y: 4.5, w: 7, h: 0.35, fontSize: 12, fontFace: FONT_C, color: C.text_light, margin: 0 });
}

/** Slide 2: The Problem — four pain-point cards. */
function slideProblem(pres) {
  const s = pres.addSlide();
  s.background = { color: C.off_white };
  s.addText("The Problem", { x: 0.7, y: 0.4, w: 9, h: 0.6, fontSize: 32, fontFace: FONT_H, color: C.text_dark, bold: true, margin: 0 });
  s.addText("AI coding tools are powerful. Without structure, they're unreliable.", {
    x: 0.7, y: 1.0, w: 8.5, h: 0.35, fontSize: 13, fontFace: FONT_B, color: C.text_mid, margin: 0 });

  const problems = [
    { title: "Context evaporates", body: "Every new session loses decisions, architecture choices, and in-flight state. You re-explain yourself constantly." },
    { title: "No roles, no boundaries", body: "A single Claude instance touches everything — backend, infra, tests, config — with no ownership or review separation." },
    { title: "No gates or guardrails", body: "AI writes code that ignores your conventions, security rules, and architecture decisions. There's no checkpoint before it lands." },
    { title: "No learning loop", body: "Each run starts from zero. Mistakes get repeated. Patterns that work disappear when the session ends." },
  ];
  for (let i = 0; i < 4; i++) {
    const col = i % 2, row = Math.floor(i / 2);
    addCard(s, 0.7 + col * 4.5, 1.65 + row * 1.55, 4.1, 1.3, problems[i].title, problems[i].body, null);
  }
}

/** Slide 3: Before & After comparison columns. */
function slideBeforeAfter(pres, I) {
  const s = pres.addSlide();
  s.background = { color: C.off_white };
  s.addText("Before & After", { x: 0.7, y: 0.4, w: 9, h: 0.6, fontSize: 32, fontFace: FONT_H, color: C.text_dark, bold: true, margin: 0 });

  // Before column
  s.addShape("rect", { x: 0.5, y: 1.15, w: 4.3, h: 4.15, fill: { color: C.red_bg } });
  s.addShape("rect", { x: 0.5, y: 1.15, w: 4.3, h: 0.06, fill: { color: C.red_soft } });
  s.addText("Without Structure", { x: 0.7, y: 1.3, w: 3.5, h: 0.4, fontSize: 16, fontFace: FONT_H, color: C.red_soft, bold: true, margin: 0 });

  const befores = [
    "One Claude handles everything, unsupervised",
    "No review — AI approves its own code",
    "Security decisions made silently, no veto",
    "Context lost at every session boundary",
    "Same mistakes repeated run after run",
    "Ship or halt — no intermediate checkpoints",
  ];
  for (let i = 0; i < befores.length; i++) {
    s.addImage({ data: I.ban, x: 0.8, y: 1.85 + i * 0.5, w: 0.22, h: 0.22 });
    s.addText(befores[i], { x: 1.1, y: 1.82 + i * 0.5, w: 3.5, h: 0.35, fontSize: 11, fontFace: FONT_B, color: C.text_dark, margin: 0 });
  }

  // After column
  s.addShape("rect", { x: 5.2, y: 1.15, w: 4.3, h: 4.15, fill: { color: C.green_bg } });
  s.addShape("rect", { x: 5.2, y: 1.15, w: 4.3, h: 0.06, fill: { color: C.accent } });
  s.addText("With Claude Dev Team", { x: 5.4, y: 1.3, w: 3.5, h: 0.4, fontSize: 16, fontFace: FONT_H, color: C.accent, bold: true, margin: 0 });

  const afters = [
    "7 scoped agents, each with file-area ownership",
    "Peer review by agents from different areas",
    "Security engineer with veto power at Stage 4.5b",
    "Gates write to pipeline/ — state survives sessions",
    "Lessons-learned carries durable rules forward",
    "3 human checkpoints before code ever deploys",
  ];
  for (let i = 0; i < afters.length; i++) {
    s.addImage({ data: I.check, x: 5.5, y: 1.85 + i * 0.5, w: 0.22, h: 0.22 });
    s.addText(afters[i], { x: 5.8, y: 1.82 + i * 0.5, w: 3.5, h: 0.35, fontSize: 11, fontFace: FONT_B, color: C.text_dark, margin: 0 });
  }
}

/** Slide 4: What You'll Actually See — terminal output + gate JSON + review blocker. */
function slideWhatYoullSee(pres) {
  const s = pres.addSlide();
  s.background = { color: C.off_white };
  s.addText("What You'll Actually See", { x: 0.7, y: 0.35, w: 9, h: 0.55, fontSize: 30, fontFace: FONT_H, color: C.text_dark, bold: true, margin: 0 });
  s.addText("Three concrete artefacts produced on every pipeline run — all written to pipeline/ on disk.", {
    x: 0.7, y: 0.88, w: 8.5, h: 0.3, fontSize: 12, fontFace: FONT_B, color: C.text_mid, margin: 0 });

  // Left column: Checkpoint A terminal prompt
  s.addShape("rect", { x: 0.5, y: 1.3, w: 4.4, h: 2.1, fill: { color: "1E1042" } });
  s.addShape("rect", { x: 0.5, y: 1.3, w: 4.4, h: 0.04, fill: { color: C.accent } });
  s.addText("Checkpoint A — terminal output", { x: 0.6, y: 1.36, w: 4.2, h: 0.24, fontSize: 9, fontFace: FONT_B, color: C.text_light, italic: true, margin: 0 });
  const cpA = `━━━━━━━━━━━━━━━━━━━━━━━━━━━
✋  Checkpoint A — Requirements

PM brief: 7 acceptance criteria
covering the full password reset
flow. Out of scope: SMS, social.

Review pipeline/brief.md to adjust
before design starts.

Type \`proceed\` to continue.
━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
  s.addText(cpA, { x: 0.6, y: 1.62, w: 4.2, h: 1.74, fontSize: 8, fontFace: FONT_C, color: C.accent2, valign: "top", margin: 0 });

  // Left column bottom: Stage 5 reviewer blocker
  s.addShape("rect", { x: 0.5, y: 3.5, w: 4.4, h: 1.6, fill: { color: "1E1042" } });
  s.addShape("rect", { x: 0.5, y: 3.5, w: 4.4, h: 0.04, fill: { color: C.red_soft } });
  s.addText("Stage 5 — reviewer blocker (pipeline/code-review/by-frontend.md)", { x: 0.6, y: 3.56, w: 4.2, h: 0.26, fontSize: 8, fontFace: FONT_B, color: C.text_light, italic: true, margin: 0 });
  const blocker = `## Review of backend

Token endpoint returns raw token in
response body. Spec §3.2: hashes only.

BLOCKER: Implementation contradicts
the approved design spec.

REVIEW: CHANGES REQUESTED`;
  s.addText(blocker, { x: 0.6, y: 3.85, w: 4.2, h: 1.2, fontSize: 8, fontFace: FONT_C, color: "#F87171", valign: "top", margin: 0 });

  // Right column: Gate JSON
  s.addShape("rect", { x: 5.1, y: 1.3, w: 4.4, h: 3.8, fill: { color: "1E1042" } });
  s.addShape("rect", { x: 5.1, y: 1.3, w: 4.4, h: 0.04, fill: { color: "5B21B6" } });
  s.addText("pipeline/gates/stage-05-backend.json", { x: 5.2, y: 1.36, w: 4.2, h: 0.24, fontSize: 8, fontFace: FONT_B, color: C.text_light, italic: true, margin: 0 });
  const gateJson = `{
  "stage": "stage-05-backend",
  "status": "PASS",
  "agent": "orchestrator",
  "timestamp": "2026-04-23T14:22Z",
  "track": "full",
  "review_shape": "matrix",
  "required_approvals": 2,
  "approvals": [
    "dev-frontend",
    "dev-platform"
  ],
  "changes_requested": [],
  "blockers": [],
  "warnings": []
}`;
  s.addText(gateJson, { x: 5.2, y: 1.62, w: 4.2, h: 3.44, fontSize: 8, fontFace: FONT_C, color: C.accent2, valign: "top", margin: 0 });

  // Footer
  s.addShape("rect", { x: 0.5, y: 5.22, w: 9.1, h: 0.42, fill: { color: C.light_card } });
  s.addText("Everything written to pipeline/ — full audit trail per run. Gate files are machine-readable; terminal output is for the human in the loop.", {
    x: 0.65, y: 5.24, w: 8.8, h: 0.38, fontSize: 9, fontFace: FONT_B, color: C.text_mid, valign: "middle", margin: 0 });
}

/** Slide 5: How It Fits Your Existing Workflow — horizontal flow + two-column table. */
function slideWorkflowFit(pres) {
  const s = pres.addSlide();
  s.background = { color: C.off_white };
  s.addText("How It Fits Your Existing Workflow", { x: 0.7, y: 0.35, w: 9, h: 0.55, fontSize: 28, fontFace: FONT_H, color: C.text_dark, bold: true, margin: 0 });
  s.addText("The pipeline is a pre-PR production layer. Your CI/CD, code review, and production deployment are unchanged.", {
    x: 0.7, y: 0.88, w: 8.5, h: 0.3, fontSize: 12, fontFace: FONT_B, color: C.text_mid, margin: 0 });

  // Horizontal workflow flow
  const flow = [
    { label: "Ticket", sub: "Jira / Linear", highlight: false },
    { label: "Pipeline", sub: "Stages 1–9", highlight: true },
    { label: "PR", sub: "to your repo", highlight: false },
    { label: "Human\nReview", sub: "domain + goals", highlight: false },
    { label: "CI", sub: "GitHub Actions etc.", highlight: false },
    { label: "Production", sub: "your process", highlight: false },
  ];
  for (let i = 0; i < flow.length; i++) {
    const x = 0.4 + i * 1.6;
    const bg = flow[i].highlight ? C.accent : C.card_bg;
    const txtCol = flow[i].highlight ? C.white : C.text_dark;
    const subCol = flow[i].highlight ? C.off_white : C.text_mid;
    s.addShape("rect", { x, y: 1.32, w: 1.4, h: 0.62, fill: { color: bg },
      shadow: flow[i].highlight ? undefined : { type: "outer", blur: 3, offset: 1, angle: 135, color: "000000", opacity: 0.07 } });
    s.addText(flow[i].label, { x, y: 1.35, w: 1.4, h: 0.35, fontSize: 10.5, fontFace: FONT_H, color: txtCol, bold: true, align: "center", valign: "bottom", margin: 0 });
    s.addText(flow[i].sub, { x, y: 1.67, w: 1.4, h: 0.24, fontSize: 8, fontFace: FONT_B, color: subCol, align: "center", margin: 0 });
    if (i < flow.length - 1) {
      s.addShape("rightArrow", { x: x + 1.4, y: 1.57, w: 0.2, h: 0.1, fill: { color: C.border } });
    }
  }

  // Two-column table
  s.addShape("rect", { x: 0.5, y: 2.15, w: 4.5, h: 0.38, fill: { color: C.accent } });
  s.addShape("rect", { x: 5.1, y: 2.15, w: 4.5, h: 0.38, fill: { color: C.red_soft } });
  s.addText("Pipeline does", { x: 0.6, y: 2.17, w: 4.3, h: 0.34, fontSize: 11, fontFace: FONT_H, color: C.white, bold: true, valign: "middle", margin: 0 });
  s.addText("Pipeline does NOT", { x: 5.2, y: 2.17, w: 4.3, h: 0.34, fontSize: 11, fontFace: FONT_H, color: C.white, bold: true, valign: "middle", margin: 0 });

  const rows = [
    ["Write code to worktrees, open PR to your repo", "Replace your human code review"],
    ["Run lint + tests internally (pre-PR)", "Replace your production CI/CD"],
    ["Deploy to dev/staging via adapter", "Deploy to production (that's your process)"],
    ["Stage 5 cross-area peer review (structural)", "Replace domain review by your engineers"],
    ["Record decisions in pipeline/context.md + ADRs", "Update Jira, close tickets, send notifications"],
  ];
  for (let i = 0; i < rows.length; i++) {
    const y = 2.53 + i * 0.5;
    const bg = i % 2 === 0 ? C.card_bg : C.light_card;
    s.addShape("rect", { x: 0.5, y, w: 4.5, h: 0.48, fill: { color: bg } });
    s.addShape("rect", { x: 5.1, y, w: 4.5, h: 0.48, fill: { color: bg } });
    s.addText(rows[i][0], { x: 0.6, y: y + 0.02, w: 4.3, h: 0.44, fontSize: 9.5, fontFace: FONT_B, color: C.text_dark, valign: "middle", margin: 0 });
    s.addText(rows[i][1], { x: 5.2, y: y + 0.02, w: 4.3, h: 0.44, fontSize: 9.5, fontFace: FONT_B, color: C.text_dark, valign: "middle", margin: 0 });
  }

  s.addShape("rect", { x: 0.5, y: 5.08, w: 9.1, h: 0.56, fill: { color: C.light_card } });
  s.addText("The full pipeline is 30–90 min. /quick is 5–10 min. /nano is 1–3 min. Ceremony is proportional to change size.", {
    x: 0.65, y: 5.1, w: 8.8, h: 0.52, fontSize: 9.5, fontFace: FONT_B, color: C.text_mid, valign: "middle", margin: 0 });
}

/** Slide 17: Adoption path — 4 cards in a 2×2 grid. */
function slideAdoptionPath(pres) {
  const s = pres.addSlide();
  s.background = { color: C.off_white };
  s.addText("Getting Your Team On Board", { x: 0.7, y: 0.35, w: 9, h: 0.55, fontSize: 30, fontFace: FONT_H, color: C.text_dark, bold: true, margin: 0 });
  s.addText("A 4–6 week path from first demo to normal workflow. Start boring — get to real features fast.", {
    x: 0.7, y: 0.88, w: 8.5, h: 0.3, fontSize: 12, fontFace: FONT_B, color: C.text_mid, margin: 0 });

  const cards = [
    { week: "Week 1", cmd: "/audit-quick", title: "Demo on your own codebase", body: "Run an architecture scan on a codebase the team already knows. The output is familiar — architecture map, health findings. The mechanic is new. Let skeptics see a structured output from a real codebase, not a toy example." },
    { week: "Weeks 1–2", cmd: "/audit", title: "Full audit + roadmap", body: "Run the 4-phase audit and walk through the roadmap together as a team. Use it for sprint planning. The brief it surfaces often contains scope questions that would otherwise emerge mid-implementation." },
    { week: "Weeks 2–3", cmd: "/pipeline", title: "First run on something boring", body: "Pick a self-contained, non-critical feature: a health-check endpoint, a utility function. The pipeline produces identical artefacts for boring work as for critical work — you get the full learning experience with zero risk." },
    { week: "Week 4+", cmd: "Normal workflow", title: "Pipeline as standard", body: "The signal that adoption is working: the team stops saying 'let me check what the pipeline produced' and starts saying 'where's the brief?' before any significant change begins." },
  ];

  for (let i = 0; i < 4; i++) {
    const col = i % 2, row = Math.floor(i / 2);
    const x = 0.5 + col * 4.8;
    const y = 1.3 + row * 1.95;
    s.addShape("rect", { x, y, w: 4.5, h: 1.78, fill: { color: C.card_bg },
      shadow: { type: "outer", blur: 4, offset: 1, angle: 135, color: "000000", opacity: 0.08 } });
    s.addShape("rect", { x, y, w: 0.06, h: 1.78, fill: { color: C.accent } });
    s.addShape("rect", { x: x + 0.15, y: y + 0.12, w: 0.85, h: 0.25, fill: { color: C.light_card } });
    s.addText(cards[i].week, { x: x + 0.15, y: y + 0.12, w: 0.85, h: 0.25, fontSize: 8, fontFace: FONT_B, color: C.text_mid, align: "center", valign: "middle", italic: true, margin: 0 });
    s.addText(cards[i].cmd, { x: x + 1.08, y: y + 0.1, w: 3.2, h: 0.28, fontSize: 10.5, fontFace: FONT_C, color: C.accent, bold: true, margin: 0 });
    s.addText(cards[i].title, { x: x + 0.15, y: y + 0.42, w: 4.2, h: 0.3, fontSize: 11, fontFace: FONT_H, color: C.text_dark, bold: true, margin: 0 });
    s.addText(cards[i].body, { x: x + 0.15, y: y + 0.74, w: 4.2, h: 0.98, fontSize: 9.5, fontFace: FONT_B, color: C.text_mid, valign: "top", margin: 0 });
  }

  s.addShape("rect", { x: 0.5, y: 5.25, w: 9.1, h: 0.4, fill: { color: C.light_card } });
  s.addText("Full adoption guide (Q&A for skeptics, what not to do, 6-week timeline): docs/adoption-guide.md", {
    x: 0.65, y: 5.27, w: 8.8, h: 0.36, fontSize: 9.5, fontFace: FONT_C, color: C.text_mid, valign: "middle", margin: 0 });
}

/** Slide 6+: Five building blocks. */
function slideFivePillars(pres, I) {
  const s = pres.addSlide();
  s.background = { color: C.off_white };
  s.addText("Five Building Blocks", { x: 0.7, y: 0.35, w: 9, h: 0.6, fontSize: 32, fontFace: FONT_H, color: C.text_dark, bold: true, margin: 0 });
  s.addText("Every feature of the framework is expressed through one of these five primitives.", {
    x: 0.7, y: 0.93, w: 8.5, h: 0.32, fontSize: 12, fontFace: FONT_B, color: C.text_mid, margin: 0 });

  const pillars = [
    { icon: I.users, title: "Agents", sub: "Scoped AI actors", body: "7 roles: PM, Principal, Backend, Frontend, Platform, QA, Security Eng. Each has specific file-area ownership and cannot touch another agent's files." },
    { icon: I.terminal, title: "Commands", sub: "You type, pipeline runs", body: "Slash commands invoke full workflows. /pipeline runs all 9 stages. /quick runs a lightweight single-area track. /nano for trivial edits." },
    { icon: I.brain, title: "Skills", sub: "Loaded automatically", body: "Passive knowledge triggered by context: coding standards, security checklists, review rubrics. Claude reads them when relevant — no pasting required." },
    { icon: I.cogs, title: "Rules", sub: "Always-on constraints", body: "Files in .claude/rules/ that Claude reads at startup: pipeline stages, gate schema, coding principles, escalation protocol, retrospective format." },
    { icon: I.sync, title: "Hooks", sub: "Post-action automation", body: "Shell scripts that run after Claude writes files. gate-validator.js enforces gate integrity. approval-derivation.js parses review files into gate JSON." },
  ];

  for (let i = 0; i < 5; i++) {
    const x = 0.35 + i * 1.88;
    s.addShape("rect", { x, y: 1.42, w: 1.72, h: 3.5, fill: { color: C.card_bg },
      shadow: { type: "outer", blur: 4, offset: 1, angle: 135, color: "000000", opacity: 0.08 } });
    s.addShape("rect", { x, y: 1.42, w: 0.06, h: 3.5, fill: { color: C.accent } });
    s.addImage({ data: pillars[i].icon, x: x + 0.15, y: 1.58, w: 0.36, h: 0.36 });
    s.addText(pillars[i].title, { x: x + 0.1, y: 2.04, w: 1.52, h: 0.32, fontSize: 13, fontFace: FONT_H, color: C.text_dark, bold: true, align: "center", margin: 0 });
    s.addText(pillars[i].sub, { x: x + 0.1, y: 2.34, w: 1.52, h: 0.25, fontSize: 9, fontFace: FONT_B, color: C.accent, italic: true, align: "center", margin: 0 });
    s.addText(pillars[i].body, { x: x + 0.12, y: 2.65, w: 1.5, h: 2.15, fontSize: 9.5, fontFace: FONT_B, color: C.text_mid, valign: "top", margin: 0 });
  }
}

/** Slide 5: Track selection — when to run which command. */
function slideTrackSelection(pres) {
  const s = pres.addSlide();
  s.background = { color: C.off_white };
  s.addText("Track Selection", { x: 0.7, y: 0.35, w: 9, h: 0.55, fontSize: 32, fontFace: FONT_H, color: C.text_dark, bold: true, margin: 0 });
  s.addText("Six tracks share agents, gates, and artefacts — they differ in which stages run and how many approvals are required.", {
    x: 0.7, y: 0.9, w: 8.5, h: 0.32, fontSize: 11, fontFace: FONT_B, color: C.text_mid, margin: 0 });

  // Table header
  s.addShape("rect", { x: 0.5, y: 1.3, w: 9.1, h: 0.38, fill: { color: C.bg_mid } });
  const hx2 = [0.6, 2.05, 3.85, 6.45];
  const hw2 = [1.35, 1.7, 2.5, 3.0];
  ["Command", "When to use", "Stages that run", "Review approvals"].forEach((h, c) => {
    s.addText(h, { x: hx2[c], y: 1.32, w: hw2[c], h: 0.34, fontSize: 10, fontFace: FONT_H, color: C.white, bold: true, valign: "middle", margin: 0 });
  });

  const tracks = [
    ["/pipeline", "Multi-area, auth/PII/migration, any new external dep", "Stages 1–9 in full", "2 per area (matrix)"],
    ["/quick", "≤ ~100 LOC, single area, no safety-stoplist item", "1 → 4 → 5 → 6 → 7 → 8 → 9", "1 per area (scoped)"],
    ["/nano", "Typo, comment fix, dead import — zero runtime effect", "4 → 6 → 7 (auto)", "None"],
    ["/hotfix", "Critical prod bug, expedited path", "4 → 4.5b → 5 → 6 → 7 → 8 → 9", "2 per area"],
    ["/config-only", "Config values only — no code logic change", "4 → 4.5a → 6 → 8", "N/A"],
    ["/dep-update", "Dependency upgrade with SCA + changelog scan", "4 → 5 → 6 → 8", "1 (supply-chain)"],
  ];
  for (let i = 0; i < tracks.length; i++) {
    const y = 1.68 + i * 0.5;
    const bg = i % 2 === 0 ? C.card_bg : C.light_card;
    s.addShape("rect", { x: 0.5, y, w: 9.1, h: 0.47, fill: { color: bg } });
    tracks[i].forEach((v, c) => {
      s.addText(v, { x: hx2[c], y: y + 0.02, w: hw2[c], h: 0.43, fontSize: c === 0 ? 10 : 9.5,
        fontFace: c === 0 ? FONT_C : FONT_B, color: c === 0 ? C.accent : C.text_dark, valign: "middle", bold: c === 0, margin: 0 });
    });
  }

  // Safety stoplist note
  s.addShape("rect", { x: 0.5, y: 4.72, w: 9.1, h: 0.62, fill: { color: C.red_bg } });
  s.addShape("rect", { x: 0.5, y: 4.72, w: 9.1, h: 0.04, fill: { color: C.red_soft } });
  s.addText("Safety stoplist — /pipeline is mandatory for: auth / crypto / PII / payments / schema migrations / new external deps / feature-flag introduction.", {
    x: 0.65, y: 4.77, w: 8.8, h: 0.55, fontSize: 9.5, fontFace: FONT_B, color: C.red_soft, valign: "middle", margin: 0 });
}

/** Slide 6 (section): The Pipeline */
// rendered inline in build() via sectionSlide()

/** Slide 7: 9-stage flow + human checkpoints. */
function slidePipelineStages(pres) {
  const s = pres.addSlide();
  s.background = { color: C.off_white };
  s.addText("9 Stages — 3 Human Checkpoints", { x: 0.7, y: 0.25, w: 9, h: 0.48, fontSize: 27, fontFace: FONT_H, color: C.text_dark, bold: true, margin: 0 });

  // Stage flow
  const stages = [
    { n: "1", l: "Brief", a: "PM", c: "7C3AED" },
    { n: "2", l: "Design", a: "Principal", c: "6D28D9" },
    { n: "3", l: "Clarify", a: "PM", c: "5B21B6" },
    { n: "4", l: "Build", a: "3 Devs", c: "4C1D95" },
    { n: "4.5", l: "Pre-review", a: "Platform", c: "7C3AED" },
    { n: "5", l: "Review", a: "Agents", c: "6D28D9" },
    { n: "6", l: "Test", a: "QA dev", c: "5B21B6" },
    { n: "7", l: "Sign-off", a: "PM", c: "4C1D95" },
    { n: "8", l: "Deploy", a: "Platform", c: "7C3AED" },
    { n: "9", l: "Retro", a: "All agents", c: C.accent },
  ];
  // 10 boxes: use x = 0.18 + i*0.97, w=0.88
  for (let i = 0; i < 10; i++) {
    const x = 0.18 + i * 0.97;
    s.addShape("rect", { x, y: 0.88, w: 0.88, h: 1.28, fill: { color: C.card_bg },
      shadow: { type: "outer", blur: 2, offset: 1, angle: 135, color: "000000", opacity: 0.06 } });
    s.addShape("rect", { x, y: 0.88, w: 0.88, h: 0.04, fill: { color: stages[i].c } });
    s.addShape("ellipse", { x: x + 0.22, y: 0.99, w: 0.44, h: 0.44, fill: { color: stages[i].c } });
    s.addText(stages[i].n, { x: x + 0.22, y: 0.99, w: 0.44, h: 0.44, fontSize: 11, fontFace: FONT_H, color: C.white, align: "center", valign: "middle", bold: true, margin: 0 });
    s.addText(stages[i].l, { x: x + 0.02, y: 1.5, w: 0.84, h: 0.27, fontSize: 8.5, fontFace: FONT_H, color: C.text_dark, bold: true, align: "center", margin: 0 });
    s.addText(stages[i].a, { x: x + 0.02, y: 1.75, w: 0.84, h: 0.22, fontSize: 7, fontFace: FONT_B, color: C.text_mid, align: "center", margin: 0 });
    if (i < 9) s.addShape("rightArrow", { x: x + 0.88, y: 1.28, w: 0.09, h: 0.1, fill: { color: C.border } });
  }

  // Human checkpoints band
  s.addShape("rect", { x: 0.18, y: 2.28, w: 9.5, h: 0.28, fill: { color: C.light_card } });
  s.addText("Human Checkpoints  —  Claude halts and waits for \"proceed\"", {
    x: 0.3, y: 2.29, w: 4, h: 0.26, fontSize: 9, fontFace: FONT_H, color: C.text_dark, bold: true, valign: "middle", margin: 0 });

  const cps = [
    { x: 1.0, label: "A", desc: "After Stage 1 — brief ready" },
    { x: 2.9, label: "B", desc: "After Stage 2 — design approved" },
    { x: 6.6, label: "C", desc: "After Stage 6 — tests pass" },
  ];
  for (const cp of cps) {
    s.addShape("ellipse", { x: cp.x, y: 2.31, w: 0.22, h: 0.22, fill: { color: C.accent } });
    s.addText(cp.label, { x: cp.x, y: 2.31, w: 0.22, h: 0.22, fontSize: 9, fontFace: FONT_H, color: C.white, align: "center", valign: "middle", bold: true, margin: 0 });
    s.addText(cp.desc, { x: cp.x + 0.25, y: 2.3, w: 1.5, h: 0.25, fontSize: 8, fontFace: FONT_B, color: C.text_mid, valign: "middle", margin: 0 });
  }

  // Gate rule
  s.addShape("rect", { x: 0.18, y: 2.65, w: 9.5, h: 0.27, fill: { color: "EDE9FE" } });
  s.addText("Every stage writes pipeline/gates/stage-XX.json  with  status: PASS | FAIL | ESCALATE  before the next stage can begin.", {
    x: 0.32, y: 2.65, w: 9.2, h: 0.27, fontSize: 8.5, fontFace: FONT_B, color: C.text_mid, valign: "middle", align: "center", margin: 0 });

  // Stage descriptions
  const descs = [
    { stage: "Stage 1", text: "PM writes pipeline/brief.md — acceptance criteria, scope, out-of-scope, open questions." },
    { stage: "Stage 2", text: "Principal drafts design spec. Devs annotate in parallel. Principal chairs review + writes ADRs." },
    { stage: "Stage 3", text: "Any QUESTION: in pipeline/context.md is routed to PM before build starts. Usually a no-op." },
    { stage: "Stage 4", text: "3 devs build in parallel git worktrees: backend (src/backend/), frontend (src/frontend/), platform (src/infra/)." },
    { stage: "Stage 4.5", text: "4.5a: lint + type-check + SCA always runs. 4.5b: security-engineer threat model when heuristic fires." },
    { stage: "Stage 5", text: "Scoped or matrix peer review by agents from other areas. approval-derivation.js derives gate approval." },
    { stage: "Stage 6", text: "dev-qa authors and runs tests. Maps every acceptance criterion to a test. Retry limit: 3 cycles." },
    { stage: "Stage 7", text: "PM sign-off. Auto-folds from Stage 6 when all criteria have 1:1 test coverage and pass." },
    { stage: "Stage 8", text: "Adapter-driven deploy (docker-compose, kubernetes, terraform). Requires pipeline/runbook.md first." },
    { stage: "Stage 9", text: "All 6–7 agents contribute in parallel. Principal synthesises. Lessons promoted to lessons-learned.md." },
  ];
  for (let i = 0; i < 10; i++) {
    const y = 3.03 + i * 0.27;
    s.addShape("rect", { x: 0.18, y, w: 9.5, h: 0.25, fill: { color: i % 2 === 0 ? C.card_bg : C.light_card } });
    s.addText(descs[i].stage, { x: 0.25, y, w: 1.0, h: 0.25, fontSize: 8.5, fontFace: FONT_H, color: C.accent, bold: true, valign: "middle", margin: 0 });
    s.addText(descs[i].text, { x: 1.3, y, w: 8.2, h: 0.25, fontSize: 8.5, fontFace: FONT_B, color: C.text_dark, valign: "middle", margin: 0 });
  }
}

/** Slide 8: Virtual team — 7 agents. */
function slideVirtualTeam(pres) {
  const s = pres.addSlide();
  s.background = { color: C.off_white };
  s.addText("The Virtual Team — 7 Agents", { x: 0.7, y: 0.35, w: 9, h: 0.55, fontSize: 30, fontFace: FONT_H, color: C.text_dark, bold: true, margin: 0 });
  s.addText("Each agent has a defined role, a model tier, and strict file-area ownership it cannot exceed.", {
    x: 0.7, y: 0.9, w: 8.5, h: 0.3, fontSize: 12, fontFace: FONT_B, color: C.text_mid, margin: 0 });

  // Table
  s.addShape("rect", { x: 0.5, y: 1.28, w: 9.1, h: 0.4, fill: { color: C.bg_mid } });
  const hx = [0.6, 1.85, 2.85, 4.0, 6.85];
  const hw = [1.15, 0.9, 1.05, 2.75, 2.65];
  ["Agent", "Model", "Stage(s)", "Domain / Outputs", "Boundaries"].forEach((h, c) => {
    s.addText(h, { x: hx[c], y: 1.3, w: hw[c], h: 0.36, fontSize: 10, fontFace: FONT_H, color: C.white, bold: true, valign: "middle", margin: 0 });
  });

  const team = [
    ["PM", "Opus", "1, 3, 7, 9", "Writes brief.md, answers questions, signs off on tests", "pipeline/ only — never edits src/"],
    ["Principal", "Opus", "2, 5*, 9", "Design spec, ADRs, chairs reviews, synthesis", "Read + Bash read-only; no src/ writes"],
    ["dev-backend", "Sonnet", "4, 5, 9", "APIs, services, data layer — PR in pipeline/pr-backend.md", "src/backend/ only"],
    ["dev-frontend", "Sonnet", "4, 5, 9", "UI components, client logic — pipeline/pr-frontend.md", "src/frontend/ only"],
    ["dev-platform", "Sonnet", "4, 4.5a, 5, 8, 9", "CI/CD, infra, lint/SCA, adapter-driven deploy", "src/infra/ only"],
    ["dev-qa", "Sonnet", "6, 9", "Authors tests, runs Stage 6 CI, retro contribution", "src/tests/ only"],
    ["security-engineer", "Opus", "4.5b, 5**, 9***", "Threat model — can veto at 4.5b; no override possible", "Read-only — veto power only"],
  ];
  const footnotes = ["* escalation / deadlock only", "** second signal on stage-05 gate", "*** only when 4.5b fired"];
  for (let r = 0; r < team.length; r++) {
    const y = 1.68 + r * 0.42;
    s.addShape("rect", { x: 0.5, y, w: 9.1, h: 0.4, fill: { color: r % 2 === 0 ? C.card_bg : C.light_card } });
    team[r].forEach((v, c) => {
      s.addText(v, { x: hx[c], y, w: hw[c], h: 0.4, fontSize: c === 0 ? 9.5 : 9,
        fontFace: c === 0 ? FONT_H : FONT_B, color: c === 2 ? C.accent : C.text_dark,
        bold: c === 0, valign: "middle", margin: 0 });
    });
  }
  footnotes.forEach((fn, i) => {
    s.addText(fn, { x: 0.5, y: 4.67 + i * 0.2, w: 5, h: 0.18, fontSize: 7.5, fontFace: FONT_B, color: C.text_mid, italic: true, margin: 0 });
  });

  // Key constraint callout
  s.addShape("rect", { x: 0.5, y: 5.27, w: 9.1, h: 0.36, fill: { color: C.light_card } });
  s.addText("Area boundary rule: dev-backend cannot write src/frontend/ even if it would be 'quicker'. Cross-boundary edits require a CONCERN: in pipeline/context.md first.", {
    x: 0.65, y: 5.27, w: 8.8, h: 0.36, fontSize: 9, fontFace: FONT_B, color: C.text_mid, valign: "middle", margin: 0 });
}

/** Slide 9: Gate system — PASS / FAIL / ESCALATE + two hooks. */
function slideGateSystem(pres) {
  const s = pres.addSlide();
  s.background = { color: C.off_white };
  s.addText("The Gate System", { x: 0.7, y: 0.35, w: 9, h: 0.55, fontSize: 30, fontFace: FONT_H, color: C.text_dark, bold: true, margin: 0 });
  s.addText("Every stage writes a JSON gate file before the pipeline can advance. No gate = no progress.", {
    x: 0.7, y: 0.9, w: 8.5, h: 0.3, fontSize: 12, fontFace: FONT_B, color: C.text_mid, margin: 0 });

  // Three status cards
  const statuses = [
    { status: "PASS", color: C.accent, bg: C.green_bg, desc: "Stage completed successfully. Pipeline advances to next stage automatically." },
    { status: "FAIL", color: C.red_soft, bg: C.red_bg, desc: "Stage failed with a clear fix. Owning dev is re-invoked. Retry limit: 3. Same failure twice → auto-escalate." },
    { status: "ESCALATE", color: "5B21B6", bg: C.light_card, desc: "Agent cannot proceed without human input. Pipeline halts. Orchestrator surfaces reason + options to user." },
  ];
  for (let i = 0; i < 3; i++) {
    const x = 0.5 + i * 3.15;
    s.addShape("rect", { x, y: 1.35, w: 2.9, h: 1.5, fill: { color: statuses[i].bg } });
    s.addShape("rect", { x, y: 1.35, w: 2.9, h: 0.05, fill: { color: statuses[i].color } });
    s.addText(statuses[i].status, { x, y: 1.42, w: 2.9, h: 0.38, fontSize: 20, fontFace: FONT_H, color: statuses[i].color, bold: true, align: "center", margin: 0 });
    s.addText(statuses[i].desc, { x: x + 0.1, y: 1.82, w: 2.7, h: 0.95, fontSize: 10, fontFace: FONT_B, color: C.text_dark, valign: "top", margin: 0 });
  }

  // Gate schema snippet
  s.addText("Required fields on every gate:", { x: 0.7, y: 3.0, w: 4, h: 0.3, fontSize: 12, fontFace: FONT_H, color: C.text_dark, bold: true, margin: 0 });
  const schema = `{
  "stage": "stage-05-backend",
  "status": "PASS",
  "agent":  "dev-frontend",
  "timestamp": "2026-04-23T14:22:00Z",
  "track":  "full",
  "blockers": [],
  "warnings": []
}`;
  s.addShape("rect", { x: 0.5, y: 3.32, w: 4.2, h: 2.06, fill: { color: "1E1042" } });
  s.addText(schema, { x: 0.6, y: 3.36, w: 4.0, h: 2.0, fontSize: 9, fontFace: FONT_C, color: C.accent2, valign: "top", margin: 0 });

  // Two hooks
  s.addText("Two hooks enforce integrity:", { x: 5.0, y: 3.0, w: 4.5, h: 0.3, fontSize: 12, fontFace: FONT_H, color: C.text_dark, bold: true, margin: 0 });

  const hooks = [
    { name: "gate-validator.js", when: "After every subagent stop", does: "Checks all gates for bypassed ESCALATEs, missing required fields, retry integrity (this_attempt_differs_by required), and track advisory. Exits non-zero to halt pipeline." },
    { name: "approval-derivation.js", when: "After Write/Edit on review files", does: "Parses REVIEW: APPROVED / CHANGES REQUESTED markers from pipeline/code-review/by-*.md and writes the approvals array into stage-05 gate JSON. Agents cannot author approvals directly." },
  ];
  for (let i = 0; i < 2; i++) {
    const y = 3.38 + i * 1.1;
    s.addShape("rect", { x: 5.0, y, w: 4.55, h: 1.0, fill: { color: C.card_bg },
      shadow: { type: "outer", blur: 3, offset: 1, angle: 135, color: "000000", opacity: 0.07 } });
    s.addShape("rect", { x: 5.0, y, w: 0.05, h: 1.0, fill: { color: C.accent } });
    s.addText(hooks[i].name, { x: 5.1, y: y + 0.07, w: 4.3, h: 0.26, fontSize: 10.5, fontFace: FONT_C, color: C.text_dark, bold: true, margin: 0 });
    s.addText(hooks[i].when, { x: 5.1, y: y + 0.32, w: 4.3, h: 0.18, fontSize: 8.5, fontFace: FONT_B, color: C.accent, italic: true, margin: 0 });
    s.addText(hooks[i].does, { x: 5.1, y: y + 0.5, w: 4.3, h: 0.48, fontSize: 9, fontFace: FONT_B, color: C.text_mid, valign: "top", margin: 0 });
  }
}

/** Slide 10: Stage 4.5 — automated pre-review checks. */
function slideStage45(pres, I) {
  const s = pres.addSlide();
  s.background = { color: C.off_white };
  s.addText("Stage 4.5 — Automated Pre-Review Checks", { x: 0.7, y: 0.35, w: 9, h: 0.55, fontSize: 26, fontFace: FONT_H, color: C.text_dark, bold: true, margin: 0 });
  s.addText("Between build (Stage 4) and peer review (Stage 5), two automated gates must pass. Catches what tooling already knows before human review tokens are spent.", {
    x: 0.7, y: 0.88, w: 8.5, h: 0.38, fontSize: 11, fontFace: FONT_B, color: C.text_mid, margin: 0 });

  // 4.5a card
  s.addShape("rect", { x: 0.5, y: 1.38, w: 4.35, h: 3.85, fill: { color: C.green_bg } });
  s.addShape("rect", { x: 0.5, y: 1.38, w: 4.35, h: 0.06, fill: { color: C.accent } });
  s.addText("4.5a — Always runs", { x: 0.7, y: 1.48, w: 3.7, h: 0.35, fontSize: 15, fontFace: FONT_H, color: C.accent, bold: true, margin: 0 });
  s.addText("dev-platform", { x: 0.7, y: 1.83, w: 3.7, h: 0.25, fontSize: 10, fontFace: FONT_B, color: C.text_mid, margin: 0 });

  const a_checks = [
    ["Lint", "ESLint / Prettier / project linter — no warnings allowed"],
    ["Type check", "tsc --noEmit or equivalent — zero errors"],
    ["SCA", "Dependency vulnerability scan — no HIGH or CRITICAL findings"],
    ["License check", "All new deps on the project allowlist"],
  ];
  for (let i = 0; i < a_checks.length; i++) {
    const y = 2.18 + i * 0.55;
    s.addShape("ellipse", { x: 0.75, y: y + 0.08, w: 0.2, h: 0.2, fill: { color: C.accent } });
    s.addText(a_checks[i][0], { x: 1.05, y, w: 1.0, h: 0.28, fontSize: 11, fontFace: FONT_H, color: C.text_dark, bold: true, margin: 0 });
    s.addText(a_checks[i][1], { x: 1.05, y: y + 0.27, w: 3.6, h: 0.25, fontSize: 9.5, fontFace: FONT_B, color: C.text_mid, margin: 0 });
  }

  s.addText("On failure: owning dev is re-invoked to fix before Stage 5 starts.", {
    x: 0.7, y: 4.42, w: 4.0, h: 0.35, fontSize: 9, fontFace: FONT_B, color: C.text_mid, italic: true, margin: 0 });

  // 4.5b card
  s.addShape("rect", { x: 5.15, y: 1.38, w: 4.35, h: 3.85, fill: { color: C.red_bg } });
  s.addShape("rect", { x: 5.15, y: 1.38, w: 4.35, h: 0.06, fill: { color: C.red_soft } });
  s.addText("4.5b — Conditional", { x: 5.35, y: 1.48, w: 3.7, h: 0.35, fontSize: 15, fontFace: FONT_H, color: C.red_soft, bold: true, margin: 0 });
  s.addText("security-engineer  (Opus)  —  has VETO power", { x: 5.35, y: 1.83, w: 3.7, h: 0.25, fontSize: 10, fontFace: FONT_B, color: C.text_mid, margin: 0 });

  s.addText("Fires when diff touches:", { x: 5.35, y: 2.18, w: 3.7, h: 0.28, fontSize: 10.5, fontFace: FONT_H, color: C.text_dark, bold: true, margin: 0 });
  const triggers = [
    "src/backend/ auth*, crypto*, payment*, pii*, session*, *secret*, *token*",
    "New or upgraded dependencies (any package manager)",
    "Dockerfile / docker-compose with service image, network, or volume change",
    "src/infra/ IAM, RBAC, network, firewall, certs, secrets, CI secret refs",
    "New database migrations or new .env.example secret references",
  ];
  for (let i = 0; i < triggers.length; i++) {
    s.addImage({ data: I.warning, x: 5.35, y: 2.53 + i * 0.37, w: 0.2, h: 0.2 });
    s.addText(triggers[i], { x: 5.62, y: 2.5 + i * 0.37, w: 3.75, h: 0.35, fontSize: 8.5, fontFace: FONT_B, color: C.text_dark, margin: 0 });
  }

  s.addShape("rect", { x: 5.15, y: 4.42, w: 4.35, h: 0.73, fill: { color: "FEE2E2" } });
  s.addText("veto: true  halts the pipeline completely. No peer-review approval can override it. The security-engineer must personally re-review and flip the flag.", {
    x: 5.3, y: 4.46, w: 4.05, h: 0.65, fontSize: 9, fontFace: FONT_B, color: C.red_soft, valign: "middle", margin: 0 });
}

/** Slide 11: Stage 5 — Peer review mechanics. */
function slideStage5Review(pres) {
  const s = pres.addSlide();
  s.background = { color: C.off_white };
  s.addText("Stage 5 — Peer Code Review", { x: 0.7, y: 0.35, w: 9, h: 0.52, fontSize: 30, fontFace: FONT_H, color: C.text_dark, bold: true, margin: 0 });
  s.addText("Agents from different areas review each other's code. A hook — not the reviewer — writes the approval.", {
    x: 0.7, y: 0.87, w: 8.5, h: 0.3, fontSize: 12, fontFace: FONT_B, color: C.text_mid, margin: 0 });

  // Two review shapes
  const shapes = [
    { title: "Scoped review", req: "required_approvals: 1", when: "Diff is area-contained — all changes in one of src/backend/, src/frontend/, src/infra/, src/tests/", pairing: "Default cross-area pairing:\n  backend → reviewed by platform\n  frontend → reviewed by backend\n  infra → reviewed by backend\n  tests → reviewed by backend", note: "Orchestrator must pre-create the stage-05-{area}.json gate with required_approvals: 1 before invoking the reviewer, or the hook defaults to 2." },
    { title: "Matrix review", req: "required_approvals: 2", when: "Diff crosses more than one area. Each dev reviews the other two areas' code.", pairing: "Matrix:\n  dev-backend reviews: frontend + platform\n  dev-frontend reviews: backend + platform\n  dev-platform reviews: backend + frontend", note: "Each area accumulates 2 approvals from reviewers whose own area is different. Gate reaches PASS when count ≥ 2 and changes_requested is empty." },
  ];
  for (let i = 0; i < 2; i++) {
    const x = 0.5 + i * 4.75;
    s.addShape("rect", { x, y: 1.28, w: 4.4, h: 3.0, fill: { color: C.card_bg },
      shadow: { type: "outer", blur: 3, offset: 1, angle: 135, color: "000000", opacity: 0.07 } });
    s.addShape("rect", { x, y: 1.28, w: 4.4, h: 0.06, fill: { color: "5B21B6" } });
    s.addText(shapes[i].title, { x: x + 0.15, y: 1.38, w: 4.1, h: 0.35, fontSize: 14, fontFace: FONT_H, color: C.text_dark, bold: true, margin: 0 });
    s.addText(shapes[i].req, { x: x + 0.15, y: 1.73, w: 4.1, h: 0.26, fontSize: 10, fontFace: FONT_C, color: C.accent, margin: 0 });
    s.addText("When: " + shapes[i].when, { x: x + 0.15, y: 2.05, w: 4.1, h: 0.6, fontSize: 9.5, fontFace: FONT_B, color: C.text_mid, margin: 0 });
    s.addText(shapes[i].pairing, { x: x + 0.15, y: 2.68, w: 4.1, h: 0.7, fontSize: 9, fontFace: FONT_C, color: C.text_dark, margin: 0 });
    s.addShape("rect", { x: x + 0.1, y: 3.43, w: 4.2, h: 0.78, fill: { color: C.light_card } });
    s.addText(shapes[i].note, { x: x + 0.2, y: 3.46, w: 4.0, h: 0.72, fontSize: 8.5, fontFace: FONT_B, color: C.text_mid, valign: "top", margin: 0 });
  }

  // READ-ONLY rule + approval-derivation
  s.addShape("rect", { x: 0.5, y: 4.38, w: 9.1, h: 0.98, fill: { color: C.red_bg } });
  s.addShape("rect", { x: 0.5, y: 4.38, w: 9.1, h: 0.04, fill: { color: C.red_soft } });
  s.addText("READ-ONLY Reviewer Rule", { x: 0.65, y: 4.44, w: 3, h: 0.28, fontSize: 11, fontFace: FONT_H, color: C.red_soft, bold: true, margin: 0 });
  s.addText("Reviewers write ONLY to pipeline/code-review/by-{reviewer}.md. No src/ edits — ever, even for a one-line obvious fix. If a bug is found: write REVIEW: CHANGES REQUESTED, list the BLOCKER, halt. The owning dev fixes it.", {
    x: 0.65, y: 4.72, w: 4.7, h: 0.58, fontSize: 9, fontFace: FONT_B, color: C.text_dark, valign: "top", margin: 0 });
  s.addText("approval-derivation.js parses REVIEW: APPROVED / CHANGES REQUESTED markers from review files and writes the approvals array into the gate JSON automatically. Agents that write approvals directly are overwritten on the next save.", {
    x: 5.4, y: 4.44, w: 4.1, h: 0.88, fontSize: 9, fontFace: FONT_B, color: C.text_dark, valign: "top", margin: 0 });
}

/** Slide 12: Lessons-learned loop — Stage 9 retro. */
function slideLessonsLearned(pres) {
  const s = pres.addSlide();
  s.background = { color: C.off_white };
  s.addText("The Learning Loop — Stage 9 Retrospective", { x: 0.7, y: 0.35, w: 9, h: 0.52, fontSize: 26, fontFace: FONT_H, color: C.text_dark, bold: true, margin: 0 });
  s.addText("Stage 9 runs after every pipeline — success or failure. It's the mechanism that makes the team smarter over time.", {
    x: 0.7, y: 0.87, w: 8.5, h: 0.32, fontSize: 12, fontFace: FONT_B, color: C.text_mid, margin: 0 });

  // Step 9a
  s.addShape("rect", { x: 0.5, y: 1.3, w: 4.35, h: 2.1, fill: { color: C.card_bg },
    shadow: { type: "outer", blur: 3, offset: 1, angle: 135, color: "000000", opacity: 0.07 } });
  s.addShape("rect", { x: 0.5, y: 1.3, w: 4.35, h: 0.05, fill: { color: "5B21B6" } });
  s.addText("Step 9a — Contribution (parallel)", { x: 0.65, y: 1.38, w: 4.0, h: 0.32, fontSize: 13, fontFace: FONT_H, color: C.text_dark, bold: true, margin: 0 });
  s.addText("6–7 agents invoked in parallel. Each appends its own section to pipeline/retrospective.md using a four-heading template:\n  • What worked\n  • What I got wrong (and how I noticed)\n  • Where the pipeline slowed me down\n  • One lesson worth carrying forward\n\nThe 'one lesson' is required — no opting out. The security-engineer contributes only when Stage 4.5b fired.", {
    x: 0.65, y: 1.73, w: 4.05, h: 1.6, fontSize: 9.5, fontFace: FONT_B, color: C.text_mid, valign: "top", margin: 0 });

  // Arrow
  s.addShape("rightArrow", { x: 4.92, y: 2.2, w: 0.4, h: 0.22, fill: { color: C.border } });

  // Step 9b
  s.addShape("rect", { x: 5.35, y: 1.3, w: 4.2, h: 2.1, fill: { color: C.card_bg },
    shadow: { type: "outer", blur: 3, offset: 1, angle: 135, color: "000000", opacity: 0.07 } });
  s.addShape("rect", { x: 5.35, y: 1.3, w: 4.2, h: 0.05, fill: { color: C.accent } });
  s.addText("Step 9b — Synthesis (Principal)", { x: 5.5, y: 1.38, w: 3.9, h: 0.32, fontSize: 13, fontFace: FONT_H, color: C.text_dark, bold: true, margin: 0 });
  s.addText("Principal reads all contributions + current lessons-learned.md and:\n  • Promotes up to 2 new rules to lessons-learned.md\n  • Retires rules proved wrong or reinforced ≥5 times\n  • Auto-ages out rules not reinforced in 10 runs\n  • Harvests PATTERN: entries from Stage 5 review files as positive-rule candidates\n  • Writes pipeline/gates/stage-09.json", {
    x: 5.5, y: 1.73, w: 3.9, h: 1.6, fontSize: 9.5, fontFace: FONT_B, color: C.text_mid, valign: "top", margin: 0 });

  // lessons-learned.md
  s.addShape("rect", { x: 0.5, y: 3.52, w: 5.8, h: 1.98, fill: { color: C.card_bg },
    shadow: { type: "outer", blur: 3, offset: 1, angle: 135, color: "000000", opacity: 0.07 } });
  s.addShape("rect", { x: 0.5, y: 3.52, w: 5.8, h: 0.05, fill: { color: C.accent } });
  s.addText("pipeline/lessons-learned.md", { x: 0.65, y: 3.6, w: 5.5, h: 0.3, fontSize: 13, fontFace: FONT_H, color: C.text_dark, bold: true, margin: 0 });
  s.addText("Persistent across pipeline resets. Loaded by PM before Stage 1, Principal before Stage 2, every dev before Stage 4, every reviewer before Stage 5. Each rule carries: title, date added, reinforcement count, rule, why, and how-to-apply.", {
    x: 0.65, y: 3.94, w: 5.5, h: 0.68, fontSize: 9.5, fontFace: FONT_B, color: C.text_mid, valign: "top", margin: 0 });

  const lesson = `### L007 — Clarify notify channel in brief
**Added:** 2026-04-17 (run: user-notifications)
**Reinforced:** 2 (last: 2026-04-21)
**Rule:** When the brief uses "notify", ask the PM
whether that means email, push, or inline UI.
**Why:** Two separate runs chose wrong defaults.
**How to apply:** Stage 1, any brief with notify/alert.`;
  s.addShape("rect", { x: 0.6, y: 4.65, w: 5.6, h: 0.78, fill: { color: "1E1042" } });
  s.addText(lesson, { x: 0.7, y: 4.68, w: 5.4, h: 0.73, fontSize: 7.5, fontFace: FONT_C, color: C.accent2, valign: "top", margin: 0 });

  // Severity rubric
  s.addShape("rect", { x: 6.5, y: 3.52, w: 3.1, h: 1.98, fill: { color: C.card_bg },
    shadow: { type: "outer", blur: 3, offset: 1, angle: 135, color: "000000", opacity: 0.07 } });
  s.addShape("rect", { x: 6.5, y: 3.52, w: 3.1, h: 0.05, fill: { color: "5B21B6" } });
  s.addText("Severity rubric", { x: 6.65, y: 3.6, w: 2.8, h: 0.3, fontSize: 12, fontFace: FONT_H, color: C.text_dark, bold: true, margin: 0 });
  const rubric = [
    { sev: "green", col: C.accent, desc: "Zero escalations, retries, or post-build BLOCKERs" },
    { sev: "yellow", col: "D97706", desc: "At least one retry, BLOCKER, or self-resolved ESCALATE" },
    { sev: "red", col: C.red_soft, desc: "User-visible defect shipped, gate bypassed, or pipeline halted unresolved" },
  ];
  for (let i = 0; i < 3; i++) {
    s.addShape("ellipse", { x: 6.65, y: 4.05 + i * 0.45, w: 0.22, h: 0.22, fill: { color: rubric[i].col } });
    s.addText(rubric[i].sev, { x: 6.65, y: 4.05 + i * 0.45, w: 0.22, h: 0.22, fontSize: 7, fontFace: FONT_H, color: C.white, align: "center", valign: "middle", bold: true, margin: 0 });
    s.addText(rubric[i].desc, { x: 6.95, y: 4.03 + i * 0.45, w: 2.5, h: 0.38, fontSize: 8.5, fontFace: FONT_B, color: C.text_mid, margin: 0 });
  }
}

/** Slide 13: Safety & Trust. */
function slideSafetyTrust(pres, I) {
  const s = pres.addSlide();
  s.background = { color: C.off_white };
  s.addText("Safety & Trust Model", { x: 0.7, y: 0.4, w: 9, h: 0.6, fontSize: 32, fontFace: FONT_H, color: C.text_dark, bold: true, margin: 0 });
  s.addText("Claude is powerful but scoped. Here is what it does autonomously and what always needs you.", {
    x: 0.7, y: 1.0, w: 8.5, h: 0.35, fontSize: 13, fontFace: FONT_B, color: C.text_mid, margin: 0 });

  // Left: Claude handles
  s.addShape("rect", { x: 0.5, y: 1.55, w: 4.3, h: 3.6, fill: { color: C.green_bg } });
  s.addShape("rect", { x: 0.5, y: 1.55, w: 4.3, h: 0.06, fill: { color: C.accent } });
  s.addText("Claude handles autonomously", { x: 0.7, y: 1.65, w: 3.8, h: 0.35, fontSize: 13, fontFace: FONT_H, color: C.accent, bold: true, margin: 0 });

  const does = [
    "Read brief, design spec, and lessons-learned",
    "Write code in the assigned area only",
    "Run lint, type-check, and test suites",
    "Write gate files in pipeline/gates/",
    "Derive approvals from review file markers",
    "Stage 9 retrospective and lesson synthesis",
  ];
  for (let i = 0; i < does.length; i++) {
    s.addImage({ data: I.check, x: 0.75, y: 2.15 + i * 0.45, w: 0.2, h: 0.2 });
    s.addText(does[i], { x: 1.05, y: 2.12 + i * 0.45, w: 3.5, h: 0.35, fontSize: 11, fontFace: FONT_B, color: C.text_dark, margin: 0 });
  }

  // Right: requires human
  s.addShape("rect", { x: 5.2, y: 1.55, w: 4.3, h: 3.6, fill: { color: C.red_bg } });
  s.addShape("rect", { x: 5.2, y: 1.55, w: 4.3, h: 0.06, fill: { color: C.red_soft } });
  s.addText("Requires your explicit decision", { x: 5.4, y: 1.65, w: 3.8, h: 0.35, fontSize: 13, fontFace: FONT_H, color: C.red_soft, bold: true, margin: 0 });

  const requires = [
    "Proceeding past Checkpoint A, B, or C",
    "Resolving any ESCALATE gate",
    "Committing or pushing code",
    "Overriding a security-engineer veto",
    "Deploying to any environment",
    "Accepting or rejecting the roadmap delta",
  ];
  for (let i = 0; i < requires.length; i++) {
    s.addImage({ data: I.lock, x: 5.45, y: 2.15 + i * 0.45, w: 0.2, h: 0.2 });
    s.addText(requires[i], { x: 5.75, y: 2.12 + i * 0.45, w: 3.5, h: 0.35, fontSize: 11, fontFace: FONT_B, color: C.text_dark, margin: 0 });
  }

  // Footer note
  s.addShape("rect", { x: 0.5, y: 5.28, w: 9.1, h: 0.36, fill: { color: C.light_card } });
  s.addText("Opt-in v2.5 features: budget gate (token/wall-clock limits), async checkpoint auto-pass (no_warnings or all_criteria_passed conditions).", {
    x: 0.65, y: 5.28, w: 8.8, h: 0.36, fontSize: 9, fontFace: FONT_B, color: C.text_mid, valign: "middle", italic: true, margin: 0 });
}

/** Slide 14: Getting Started. */
function slideGettingStarted(pres, I) {
  const s = pres.addSlide();
  s.background = { color: C.bg_dark };
  s.addShape("ellipse", { x: 7.5, y: -1.5, w: 5, h: 5, fill: { color: C.bg_mid, transparency: 50 } });

  s.addImage({ data: I.rocketW, x: 0.8, y: 0.55, w: 0.5, h: 0.5 });
  s.addText("Getting Started", { x: 1.5, y: 0.45, w: 7, h: 0.7, fontSize: 32, fontFace: FONT_H, color: C.white, bold: true, margin: 0 });

  const steps = [
    { num: "1", text: "Clone the repo (or just copy .claude/ and bootstrap.sh into your project)" },
    { num: "2", text: "Run  bash bootstrap.sh  — installs .claude/ structure, agents, commands, rules, hooks" },
    { num: "3", text: "Open a feature request and type  /pipeline  to start the full 9-stage pipeline" },
    { num: "4", text: "For smaller changes: /quick (single area), /nano (typo/comment), /hotfix (prod bug)" },
    { num: "5", text: "After each run, Stage 9 runs automatically and promotes lessons into lessons-learned.md" },
  ];
  for (let i = 0; i < steps.length; i++) {
    const y = 1.45 + i * 0.65;
    s.addShape("ellipse", { x: 1.0, y, w: 0.42, h: 0.42, fill: { color: C.accent } });
    s.addText(steps[i].num, { x: 1.0, y, w: 0.42, h: 0.42, fontSize: 16, fontFace: FONT_H, color: C.white, align: "center", valign: "middle", bold: true, margin: 0 });
    s.addText(steps[i].text, { x: 1.6, y: y + 0.02, w: 7.8, h: 0.42, fontSize: 13, fontFace: FONT_B, color: C.white, valign: "middle", margin: 0 });
  }

  s.addText("Prerequisites:  Claude Code CLI  +  a Git repo  +  Node 20+  +  10 minutes", {
    x: 1.0, y: 4.78, w: 8.2, h: 0.32, fontSize: 11, fontFace: FONT_B, color: C.text_light, margin: 0 });
  s.addText("github.com/mumit/claude-dev-team", {
    x: 1.0, y: 5.12, w: 8, h: 0.4, fontSize: 14, fontFace: FONT_C, color: C.accent2, margin: 0 });
}

/** Slide: Pipeline Observability — /status, /pipeline-context, /resume, /stage */
function slidePipelineObservability(pres) {
  const s = pres.addSlide();
  s.background = { color: C.off_white };
  s.addText("Pipeline Observability", { x: 0.7, y: 0.35, w: 9, h: 0.55, fontSize: 30, fontFace: FONT_H, color: C.text_dark, bold: true, margin: 0 });
  s.addText("Four commands to introspect and steer a live pipeline run — no restart needed.", {
    x: 0.7, y: 0.9, w: 8.5, h: 0.3, fontSize: 12, fontFace: FONT_B, color: C.text_mid, margin: 0 });

  const cmds = [
    { cmd: "/status",           role: "Gate dashboard",        desc: "Reads all pipeline/gates/*.json and prints a stage-by-stage status table. The fastest check: which stages passed, failed, or are still pending." },
    { cmd: "/pipeline-context", role: "State dump",            desc: "Full gate state + any open QUESTION: entries from pipeline/context.md. Run before /compact so the model preserves pipeline position across compaction." },
    { cmd: "/resume <N>",       role: "Continue from stage N", desc: "Verifies all prior gates are PASS, then picks up at stage N. Used after a human checkpoint approval, a resolved ESCALATE, or a manual mid-stage fix." },
    { cmd: "/stage <name>",     role: "Re-run one stage",      desc: "Invokes a single named stage explicitly — useful when one stage needs re-running with a corrected input without restarting the full pipeline." },
  ];

  for (let i = 0; i < 4; i++) {
    const col = i % 2, row = Math.floor(i / 2);
    const x = 0.5 + col * 4.8;
    const y = 1.35 + row * 1.58;
    s.addShape("rect", { x, y, w: 4.5, h: 1.38, fill: { color: C.card_bg },
      shadow: { type: "outer", blur: 4, offset: 1, angle: 135, color: "000000", opacity: 0.08 } });
    s.addShape("rect", { x, y, w: 0.06, h: 1.38, fill: { color: C.accent } });
    s.addText(cmds[i].cmd, { x: x + 0.2, y: y + 0.1, w: 4.2, h: 0.32, fontSize: 13, fontFace: FONT_C, color: C.text_dark, bold: true, margin: 0 });
    s.addText(cmds[i].role, { x: x + 0.2, y: y + 0.41, w: 4.2, h: 0.22, fontSize: 9.5, fontFace: FONT_B, color: C.accent, italic: true, margin: 0 });
    s.addText(cmds[i].desc, { x: x + 0.2, y: y + 0.63, w: 4.2, h: 0.68, fontSize: 9.5, fontFace: FONT_B, color: C.text_mid, valign: "top", margin: 0 });
  }

  s.addShape("rect", { x: 0.5, y: 4.62, w: 9.1, h: 0.76, fill: { color: C.light_card } });
  s.addShape("rect", { x: 0.5, y: 4.62, w: 0.05, h: 0.76, fill: { color: "5B21B6" } });
  s.addText("More partial-pipeline commands:", { x: 0.65, y: 4.66, w: 9, h: 0.26, fontSize: 10, fontFace: FONT_H, color: C.text_dark, bold: true, margin: 0 });
  s.addText("/design (Stages 1–2 only)  ·  /pipeline-brief (Stage 1 only)  ·  /pipeline-review (Stage 5 on current src/)  ·  /ask-pm (route a clarification mid-pipeline)  ·  /adr (create an Architecture Decision Record)  ·  /principal-ruling (binding technical ruling)", {
    x: 0.65, y: 4.93, w: 8.8, h: 0.42, fontSize: 9, fontFace: FONT_B, color: C.text_mid, valign: "top", margin: 0 });
}

/** Slide: Codebase Health Suite — /audit, /audit-quick, /health-check, /roadmap */
function slideCodebaseHealth(pres) {
  const s = pres.addSlide();
  s.background = { color: C.off_white };
  s.addText("Codebase Health Suite", { x: 0.7, y: 0.35, w: 9, h: 0.55, fontSize: 30, fontFace: FONT_H, color: C.text_dark, bold: true, margin: 0 });
  s.addText("A second mode of the framework — runs on existing code, independent of the active pipeline.", {
    x: 0.7, y: 0.9, w: 8.5, h: 0.3, fontSize: 12, fontFace: FONT_B, color: C.text_mid, margin: 0 });

  const tools = [
    { cmd: "/audit",        when: "Deep onboarding or periodic review", desc: "4-phase audit with human checkpoints: Phase 0 Bootstrap (architecture map), Phase 1 Health (conventions + tests + docs), Phase 2 Deep Analysis (security, perf, complexity), Phase 3 Roadmap (prioritised improvement plan). Writes to docs/audit/." },
    { cmd: "/audit-quick",  when: "Fast orientation or quick checkup",  desc: "Phases 0–1 only. Produces an architecture map and health findings in one pass, skipping deep analysis and roadmap generation. Good for onboarding onto an unfamiliar codebase." },
    { cmd: "/health-check", when: "Monthly cadence",                   desc: "Diffs current state against prior audit findings: new violations, untested components, stale docs, TODO/FIXME age, dependency changes, roadmap progress. Writes docs/audit/health-check-YYYY-MM.md." },
    { cmd: "/roadmap",      when: "Anytime — see what's next",         desc: "Reads docs/audit/10-roadmap.md and prints a status dashboard: batch progress, next 3 items, recently completed, and stalled items. Ends with the top systemic themes from the backlog." },
  ];

  for (let i = 0; i < 4; i++) {
    const col = i % 2, row = Math.floor(i / 2);
    const x = 0.5 + col * 4.8;
    const y = 1.35 + row * 1.65;
    s.addShape("rect", { x, y, w: 4.5, h: 1.5, fill: { color: C.card_bg },
      shadow: { type: "outer", blur: 4, offset: 1, angle: 135, color: "000000", opacity: 0.08 } });
    s.addShape("rect", { x, y, w: 0.06, h: 1.5, fill: { color: C.accent } });
    s.addText(tools[i].cmd, { x: x + 0.2, y: y + 0.1, w: 4.2, h: 0.3, fontSize: 13, fontFace: FONT_C, color: C.text_dark, bold: true, margin: 0 });
    s.addText("Use: " + tools[i].when, { x: x + 0.2, y: y + 0.4, w: 4.2, h: 0.22, fontSize: 9.5, fontFace: FONT_B, color: C.accent, italic: true, margin: 0 });
    s.addText(tools[i].desc, { x: x + 0.2, y: y + 0.63, w: 4.2, h: 0.82, fontSize: 9.5, fontFace: FONT_B, color: C.text_mid, valign: "top", margin: 0 });
  }

  s.addShape("rect", { x: 0.5, y: 4.73, w: 9.1, h: 0.65, fill: { color: C.light_card } });
  s.addShape("rect", { x: 0.5, y: 4.73, w: 0.05, h: 0.65, fill: { color: C.accent } });
  s.addText("/audit phases:  0 — Bootstrap (architecture map)  ·  1 — Health (conventions, tests, docs)  ·  2 — Deep Analysis (security, perf, complexity)  ·  3 — Roadmap (prioritised improvement plan). Extensible via docs/audit-extensions.md.", {
    x: 0.65, y: 4.77, w: 8.8, h: 0.58, fontSize: 9, fontFace: FONT_B, color: C.text_mid, valign: "middle", margin: 0 });
}

// ── Main build orchestrator ─────────────────────────────────

/** Build the 19-slide presentation deck. */
async function build() {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_16x9";
  pres.author = "Mumit Khan";
  pres.title = "Claude Dev Team — Structured Dev Pipeline with Claude Code";

  const I = {
    rocket:    await icon(FaRocket,           "#66BB6A"),
    search:    await icon(FaSearch,           "#4B8F29"),
    tools:     await icon(FaTools,            "#4B8F29"),
    branch:    await icon(FaCodeBranch,       "#4B8F29"),
    chart:     await icon(FaChartLine,        "#4B8F29"),
    shield:    await icon(FaShieldAlt,        "#4B8F29"),
    users:     await icon(FaUsers,            "#66BB6A"),
    cogs:      await icon(FaCogs,             "#4B8F29"),
    check:     await icon(FaCheckCircle,      "#4B8F29"),
    clipboard: await icon(FaClipboardList,    "#4B8F29"),
    layers:    await icon(FaLayerGroup,       "#4B8F29"),
    sync:      await icon(FaSyncAlt,          "#4B8F29"),
    brain:     await icon(FaBrain,            "#66BB6A"),
    terminal:  await icon(FaTerminal,         "#4B8F29"),
    calendar:  await icon(FaCalendarCheck,    "#4B8F29"),
    lightbulb: await icon(FaLightbulb,        "#66BB6A"),
    lock:      await icon(FaLock,             "#4B8F29"),
    warning:   await icon(FaExclamationTriangle, "#DC2626"),
    puzzle:    await icon(FaPuzzlePiece,      "#4B8F29"),
    ban:       await icon(FaBan,              "#DC2626"),
    exchange:  await icon(FaExchangeAlt,      "#4B8F29"),
    rocketW:   await icon(FaRocket,           "#FFFFFF"),
    searchW:   await icon(FaSearch,           "#FFFFFF"),
    toolsW:    await icon(FaTools,            "#FFFFFF"),
    branchW:   await icon(FaCodeBranch,       "#FFFFFF"),
    syncW:     await icon(FaSyncAlt,          "#FFFFFF"),
    lockW:     await icon(FaLock,             "#FFFFFF"),
    checkW:    await icon(FaCheckCircle,      "#FFFFFF"),
  };

  // 1. Title
  slideTitlePage(pres, I);
  // 2. The Problem
  slideProblem(pres);
  // 3. Before & After
  slideBeforeAfter(pres, I);
  // 4. What You'll Actually See (NEW)
  slideWhatYoullSee(pres);
  // 5. How It Fits Your Existing Workflow (NEW)
  slideWorkflowFit(pres);
  // 6. Five Building Blocks
  slideFivePillars(pres, I);
  // 7. Track Selection
  slideTrackSelection(pres);
  // 8. Section: The Pipeline
  sectionSlide(pres, "The Pipeline", "9 stages, 7 agents, 3 human checkpoints — from brief to production", I.branchW);
  // 9. Pipeline Stages + Checkpoints
  slidePipelineStages(pres);
  // 10. Virtual Team
  slideVirtualTeam(pres);
  // 11. Gate System
  slideGateSystem(pres, I);
  // 12. Stage 4.5 — Automated Checks
  slideStage45(pres, I);
  // 13. Stage 5 — Peer Review
  slideStage5Review(pres);
  // 14. Pipeline Observability
  slidePipelineObservability(pres);
  // 15. Lessons-Learned Loop
  slideLessonsLearned(pres, I);
  // 16. Safety & Trust
  slideSafetyTrust(pres, I);
  // 17. Adoption Path (NEW)
  slideAdoptionPath(pres);
  // 18. Codebase Health Suite
  slideCodebaseHealth(pres);
  // 19. Getting Started
  slideGettingStarted(pres, I);

  const outPath = process.env.BUILD_PRESENTATION_OUT || "claude-dev-team-lifecycle.pptx";
  await pres.writeFile({ fileName: outPath });
  console.log("Wrote " + outPath);
}

build().catch(err => { console.error(err); process.exit(1); });
