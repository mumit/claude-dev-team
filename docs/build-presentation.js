const pptxgen = require("pptxgenjs");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const sharp = require("sharp");

const { FaRocket, FaSearch, FaTools, FaCodeBranch, FaChartLine, FaShieldAlt, FaUsers, FaCogs, FaCheckCircle, FaClipboardList, FaLayerGroup, FaSyncAlt, FaProjectDiagram, FaBrain, FaTerminal, FaCalendarCheck, FaArrowRight, FaLightbulb, FaLock, FaExclamationTriangle, FaPuzzlePiece, FaBan, FaExchangeAlt } = require("react-icons/fa");

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

function renderIconSvg(Icon, color, size) {
  return ReactDOMServer.renderToStaticMarkup(React.createElement(Icon, { color, size: String(size) }));
}
async function icon(Icon, color, size = 256) {
  const svg = renderIconSvg(Icon, color, size);
  const buf = await sharp(Buffer.from(svg)).png().toBuffer();
  return "image/png;base64," + buf.toString("base64");
}

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

function sectionSlide(pres, title, subtitle, iconData) {
  const s = pres.addSlide();
  s.background = { color: C.bg_dark };
  s.addShape("ellipse", { x: 7.5, y: -1.5, w: 5, h: 5, fill: { color: C.bg_mid, transparency: 50 } });
  if (iconData) s.addImage({ data: iconData, x: 0.8, y: 1.6, w: 0.6, h: 0.6 });
  s.addText(title, { x: 1.6, y: 1.5, w: 7, h: 0.8, fontSize: 36, fontFace: FONT_H, color: C.white, bold: true, margin: 0 });
  s.addText(subtitle, { x: 1.6, y: 2.4, w: 7, h: 0.5, fontSize: 16, fontFace: FONT_B, color: C.text_light, margin: 0 });
  return s;
}

async function build() {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_16x9";
  pres.author = "Mumit Khan";
  pres.title = "Claude Dev Team — Full Lifecycle with Claude Code";

  const I = {
    rocket: await icon(FaRocket, "#66BB6A"),
    search: await icon(FaSearch, "#4B8F29"),
    tools: await icon(FaTools, "#4B8F29"),
    branch: await icon(FaCodeBranch, "#4B8F29"),
    chart: await icon(FaChartLine, "#4B8F29"),
    shield: await icon(FaShieldAlt, "#4B8F29"),
    users: await icon(FaUsers, "#66BB6A"),
    cogs: await icon(FaCogs, "#4B8F29"),
    check: await icon(FaCheckCircle, "#4B8F29"),
    clipboard: await icon(FaClipboardList, "#4B8F29"),
    layers: await icon(FaLayerGroup, "#4B8F29"),
    sync: await icon(FaSyncAlt, "#4B8F29"),
    brain: await icon(FaBrain, "#66BB6A"),
    terminal: await icon(FaTerminal, "#4B8F29"),
    calendar: await icon(FaCalendarCheck, "#4B8F29"),
    lightbulb: await icon(FaLightbulb, "#66BB6A"),
    lock: await icon(FaLock, "#4B8F29"),
    warning: await icon(FaExclamationTriangle, "#DC2626"),
    puzzle: await icon(FaPuzzlePiece, "#4B8F29"),
    ban: await icon(FaBan, "#DC2626"),
    exchange: await icon(FaExchangeAlt, "#4B8F29"),
    rocketW: await icon(FaRocket, "#FFFFFF"),
    searchW: await icon(FaSearch, "#FFFFFF"),
    toolsW: await icon(FaTools, "#FFFFFF"),
    branchW: await icon(FaCodeBranch, "#FFFFFF"),
    syncW: await icon(FaSyncAlt, "#FFFFFF"),
    lockW: await icon(FaLock, "#FFFFFF"),
    checkW: await icon(FaCheckCircle, "#FFFFFF"),
  };

  // ════════════════════════════════════════════════════════════
  // 1. TITLE
  // ════════════════════════════════════════════════════════════
  {
    const s = pres.addSlide();
    s.background = { color: C.bg_dark };
    s.addShape("ellipse", { x: 6.5, y: -2, w: 7, h: 7, fill: { color: C.bg_mid, transparency: 40 } });
    s.addShape("ellipse", { x: 7.5, y: -1, w: 5, h: 5, fill: { color: C.accent, transparency: 80 } });
    s.addImage({ data: I.rocketW, x: 0.8, y: 0.8, w: 0.7, h: 0.7 });
    s.addText("Claude Dev Team", { x: 0.8, y: 1.7, w: 7, h: 0.9, fontSize: 40, fontFace: FONT_H, color: C.white, bold: true, margin: 0 });
    s.addText("Full Software Lifecycle with Claude Code", { x: 0.8, y: 2.55, w: 7, h: 0.5, fontSize: 20, fontFace: FONT_B, color: C.accent2, margin: 0 });
    s.addText("From codebase audit to production deployment", { x: 0.8, y: 3.1, w: 7, h: 0.4, fontSize: 14, fontFace: FONT_B, color: C.text_light, margin: 0 });
    s.addText("github.com/mumit/claude-dev-team", { x: 0.8, y: 4.5, w: 7, h: 0.35, fontSize: 12, fontFace: FONT_C, color: C.text_light, margin: 0 });
  }

  // ════════════════════════════════════════════════════════════
  // 2. THE PROBLEM
  // ════════════════════════════════════════════════════════════
  {
    const s = pres.addSlide();
    s.background = { color: C.off_white };
    s.addText("The Problem", { x: 0.7, y: 0.4, w: 9, h: 0.6, fontSize: 32, fontFace: FONT_H, color: C.text_dark, bold: true, margin: 0 });
    s.addText("AI coding tools are powerful. Without structure, they're unreliable.", {
      x: 0.7, y: 1.0, w: 8.5, h: 0.35, fontSize: 13, fontFace: FONT_B, color: C.text_mid, margin: 0 });

    const problems = [
      { title: "Context evaporates", body: "Every /compact or new session loses decisions, findings, and progress. You repeat yourself constantly." },
      { title: "Ad-hoc prompting", body: "Everyone writes different prompts for the same task. No consistency, no reuse, no shared learning." },
      { title: "No guardrails", body: "AI writes code that ignores your team's conventions, security rules, and architecture decisions." },
      { title: "No checkpoints", body: "Long workflows run to completion or fail silently. No pause, no review, no human in the loop." },
    ];
    for (let i = 0; i < 4; i++) {
      const col = i % 2, row = Math.floor(i / 2);
      addCard(s, 0.7 + col * 4.5, 1.65 + row * 1.55, 4.1, 1.3, problems[i].title, problems[i].body, null);
    }
  }

  // ════════════════════════════════════════════════════════════
  // 3. BEFORE & AFTER
  // ════════════════════════════════════════════════════════════
  {
    const s = pres.addSlide();
    s.background = { color: C.off_white };
    s.addText("Before & After", { x: 0.7, y: 0.4, w: 9, h: 0.6, fontSize: 32, fontFace: FONT_H, color: C.text_dark, bold: true, margin: 0 });

    // Before column
    s.addShape("rect", { x: 0.5, y: 1.15, w: 4.3, h: 4.15, fill: { color: C.red_bg } });
    s.addShape("rect", { x: 0.5, y: 1.15, w: 4.3, h: 0.06, fill: { color: C.red_soft } });
    s.addText("Without Structure", { x: 0.7, y: 1.3, w: 3.5, h: 0.4, fontSize: 16, fontFace: FONT_H, color: C.red_soft, bold: true, margin: 0 });

    const befores = [
      "Copy-paste prompts from a wiki page",
      "Re-explain your architecture each session",
      "Hope Claude follows your conventions",
      "Review 500-line AI diffs with no context",
      "Forget what was already audited",
      "No way to resume interrupted work",
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
      "Type /audit and the workflow runs itself",
      "Context persists in docs/audit/ across sessions",
      "Skills load your rules automatically",
      "Human checkpoints before every major step",
      "status.json tracks exactly where you left off",
      "/audit --resume picks up mid-workflow",
    ];
    for (let i = 0; i < afters.length; i++) {
      s.addImage({ data: I.check, x: 5.5, y: 1.85 + i * 0.5, w: 0.22, h: 0.22 });
      s.addText(afters[i], { x: 5.8, y: 1.82 + i * 0.5, w: 3.5, h: 0.35, fontSize: 11, fontFace: FONT_B, color: C.text_dark, margin: 0 });
    }
  }

  // ════════════════════════════════════════════════════════════
  // 4. THE SOLUTION — 3 PILLARS
  // ════════════════════════════════════════════════════════════
  {
    const s = pres.addSlide();
    s.background = { color: C.off_white };
    s.addText("How It Works", { x: 0.7, y: 0.4, w: 9, h: 0.6, fontSize: 32, fontFace: FONT_H, color: C.text_dark, bold: true, margin: 0 });
    s.addText("Three building blocks, each with a clear purpose.", {
      x: 0.7, y: 1.0, w: 8.5, h: 0.35, fontSize: 13, fontFace: FONT_B, color: C.text_mid, margin: 0 });

    const pillars = [
      { icon: I.terminal, title: "Commands", sub: "You type, it runs", body: "Deterministic workflows with built-in checkpoints. /audit runs a 4-phase analysis. /pipeline builds a feature end-to-end. /review checks code before merge." },
      { icon: I.brain, title: "Skills", sub: "Claude loads automatically", body: "Passive knowledge triggered by context. Coding conventions, security checklists, review rubrics. Claude reads them when relevant — you don't have to paste anything." },
      { icon: I.users, title: "Agents", sub: "Scoped AI actors", body: "A virtual team: PM, Principal, 3 Developers. Each has specific file permissions and a defined role. The PM can't write code. Devs can't touch each other's files." },
    ];
    for (let i = 0; i < 3; i++) {
      const x = 0.7 + i * 3.1;
      s.addShape("rect", { x, y: 1.55, w: 2.8, h: 3.2, fill: { color: C.card_bg },
        shadow: { type: "outer", blur: 4, offset: 1, angle: 135, color: "000000", opacity: 0.08 } });
      s.addShape("rect", { x, y: 1.55, w: 0.06, h: 3.2, fill: { color: C.accent } });
      s.addImage({ data: pillars[i].icon, x: x + 0.2, y: 1.7, w: 0.4, h: 0.4 });
      s.addText(pillars[i].title, { x: x + 0.7, y: 1.7, w: 1.9, h: 0.35, fontSize: 16, fontFace: FONT_H, color: C.text_dark, bold: true, margin: 0 });
      s.addText(pillars[i].sub, { x: x + 0.7, y: 2.05, w: 1.9, h: 0.25, fontSize: 10, fontFace: FONT_B, color: C.accent, italic: true, margin: 0 });
      s.addText(pillars[i].body, { x: x + 0.2, y: 2.5, w: 2.4, h: 2.1, fontSize: 11, fontFace: FONT_B, color: C.text_mid, valign: "top", margin: 0 });
    }
  }

  // ════════════════════════════════════════════════════════════
  // 5. WHEN TO USE WHAT (moved up)
  // ════════════════════════════════════════════════════════════
  {
    const s = pres.addSlide();
    s.background = { color: C.off_white };
    s.addText("When to Use What", { x: 0.7, y: 0.4, w: 9, h: 0.6, fontSize: 32, fontFace: FONT_H, color: C.text_dark, bold: true, margin: 0 });
    s.addText("Two entry points, one system. Pick the row that matches your situation.", {
      x: 0.7, y: 1.0, w: 8.5, h: 0.35, fontSize: 12, fontFace: FONT_B, color: C.text_mid, margin: 0 });

    // Table header
    s.addShape("rect", { x: 0.7, y: 1.5, w: 8.6, h: 0.45, fill: { color: C.bg_mid } });
    s.addText("Situation", { x: 0.85, y: 1.52, w: 3.8, h: 0.4, fontSize: 12, fontFace: FONT_H, color: C.white, bold: true, valign: "middle", margin: 0 });
    s.addText("What to run", { x: 4.8, y: 1.52, w: 4.3, h: 0.4, fontSize: 12, fontFace: FONT_H, color: C.white, bold: true, valign: "middle", margin: 0 });

    const rows = [
      { situation: "Just inherited a codebase", cmd: "/audit-quick  then  /audit" },
      { situation: "Want a deep analysis of existing code", cmd: "/audit" },
      { situation: "Working through audit improvements", cmd: "implement skill  then  /review" },
      { situation: "Building a brand-new feature", cmd: "/pipeline" },
      { situation: "About to merge non-pipeline code", cmd: "/review" },
      { situation: "Monthly quality check", cmd: "/health-check" },
      { situation: "Checking roadmap progress", cmd: "/roadmap" },
    ];
    for (let i = 0; i < rows.length; i++) {
      const y = 1.95 + i * 0.48;
      const bg = i % 2 === 0 ? C.card_bg : C.light_card;
      s.addShape("rect", { x: 0.7, y, w: 8.6, h: 0.46, fill: { color: bg } });
      s.addText(rows[i].situation, { x: 0.85, y: y + 0.02, w: 3.8, h: 0.42, fontSize: 11, fontFace: FONT_B, color: C.text_dark, valign: "middle", margin: 0 });
      s.addText(rows[i].cmd, { x: 4.8, y: y + 0.02, w: 4.3, h: 0.42, fontSize: 11, fontFace: FONT_C, color: C.accent, valign: "middle", margin: 0 });
    }

    // Bottom note
    s.addShape("rect", { x: 0.7, y: 5.0, w: 8.6, h: 0.4, fill: { color: C.light_card } });
    s.addText("Every command writes persistent output to docs/ or pipeline/  —  context survives across sessions.", {
      x: 0.9, y: 5.0, w: 8.2, h: 0.4, fontSize: 10, fontFace: FONT_B, color: C.text_mid, align: "center", valign: "middle", italic: true, margin: 0 });
  }

  // ════════════════════════════════════════════════════════════
  // 6. SECTION: AUDITING
  // ════════════════════════════════════════════════════════════
  sectionSlide(pres, "Auditing a Codebase", "Understand, analyze, and build an improvement roadmap", I.searchW);

  // ════════════════════════════════════════════════════════════
  // 7. AUDIT PHASES
  // ════════════════════════════════════════════════════════════
  {
    const s = pres.addSlide();
    s.background = { color: C.off_white };
    s.addText("/audit  —  4 Phases, 3 Checkpoints", { x: 0.7, y: 0.3, w: 9, h: 0.55, fontSize: 28, fontFace: FONT_H, color: C.text_dark, bold: true, margin: 0 });

    const phases = [
      { num: "0", label: "Bootstrap", desc: "Project context\nArchitecture map\nGit history scan", color: "7C3AED" },
      { num: "1", label: "Health", desc: "Convention compliance\nTest health\nDocumentation gaps", color: "6D28D9" },
      { num: "2", label: "Deep Analysis", desc: "Security scan\nPerformance review\nCode quality", color: "5B21B6" },
      { num: "3", label: "Roadmap", desc: "Cross-cutting synthesis\nPrioritized batches\nSequenced plan", color: C.accent },
    ];
    for (let i = 0; i < 4; i++) {
      const x = 0.5 + i * 2.45;
      s.addShape("rect", { x, y: 1.1, w: 2.1, h: 2.4, fill: { color: C.card_bg },
        shadow: { type: "outer", blur: 4, offset: 1, angle: 135, color: "000000", opacity: 0.08 } });
      s.addShape("rect", { x, y: 1.1, w: 2.1, h: 0.06, fill: { color: phases[i].color } });
      s.addShape("ellipse", { x: x + 0.75, y: 1.3, w: 0.55, h: 0.55, fill: { color: phases[i].color } });
      s.addText(phases[i].num, { x: x + 0.75, y: 1.3, w: 0.55, h: 0.55, fontSize: 18, fontFace: FONT_H, color: C.white, align: "center", valign: "middle", bold: true, margin: 0 });
      s.addText(phases[i].label, { x: x + 0.1, y: 1.95, w: 1.9, h: 0.35, fontSize: 13, fontFace: FONT_H, color: C.text_dark, bold: true, align: "center", margin: 0 });
      s.addText(phases[i].desc, { x: x + 0.1, y: 2.3, w: 1.9, h: 1.1, fontSize: 10, fontFace: FONT_B, color: C.text_mid, align: "center", valign: "top", margin: 0 });
      if (i < 3) s.addShape("rightArrow", { x: x + 2.1, y: 2.1, w: 0.35, h: 0.2, fill: { color: C.accent } });
    }

    // Checkpoints
    s.addShape("rect", { x: 0.5, y: 3.75, w: 9.0, h: 1.05, fill: { color: C.light_card } });
    s.addText("Human Checkpoints — Claude pauses and waits for you", { x: 0.7, y: 3.8, w: 8, h: 0.3, fontSize: 12, fontFace: FONT_H, color: C.text_dark, bold: true, margin: 0 });
    const cps = [
      { label: "A", desc: "After Phase 0 — confirm architecture understanding" },
      { label: "B", desc: "After Phase 2 — review findings before roadmap" },
      { label: "C", desc: "After Phase 3 — approve roadmap before work begins" },
    ];
    for (let i = 0; i < 3; i++) {
      const x = 0.7 + i * 3.0;
      s.addShape("ellipse", { x, y: 4.2, w: 0.3, h: 0.3, fill: { color: C.accent } });
      s.addText(cps[i].label, { x, y: 4.2, w: 0.3, h: 0.3, fontSize: 11, fontFace: FONT_H, color: C.white, align: "center", valign: "middle", bold: true, margin: 0 });
      s.addText(cps[i].desc, { x: x + 0.38, y: 4.2, w: 2.5, h: 0.3, fontSize: 9.5, fontFace: FONT_B, color: C.text_mid, valign: "middle", margin: 0 });
    }

    // Resume
    s.addText("Session interrupted?  /audit --resume  picks up from the last completed phase.", {
      x: 0.7, y: 5.05, w: 8.6, h: 0.35, fontSize: 10, fontFace: FONT_C, color: C.text_mid, align: "center", margin: 0 });
  }

  // ════════════════════════════════════════════════════════════
  // 8. AUDIT OUTPUT + EXAMPLE FINDING
  // ════════════════════════════════════════════════════════════
  {
    const s = pres.addSlide();
    s.background = { color: C.off_white };
    s.addText("What the Audit Produces", { x: 0.7, y: 0.3, w: 9, h: 0.55, fontSize: 28, fontFace: FONT_H, color: C.text_dark, bold: true, margin: 0 });

    // Left: file list
    s.addText("11 markdown files + status tracker in docs/audit/", {
      x: 0.7, y: 0.85, w: 4.5, h: 0.3, fontSize: 11, fontFace: FONT_B, color: C.text_mid, margin: 0 });

    const files = [
      "00-project-context.md", "01-architecture.md", "02-git-analysis.md",
      "03-compliance.md", "04-test-health.md", "05-documentation.md",
      "06-security.md", "07-performance.md", "08-code-quality.md",
      "09-synthesis.md", "10-roadmap.md",
    ];
    for (let i = 0; i < files.length; i++) {
      const y = 1.25 + i * 0.32;
      s.addShape("rect", { x: 0.7, y, w: 3.8, h: 0.28, fill: { color: i % 2 === 0 ? C.card_bg : C.light_card } });
      s.addText(files[i], { x: 0.8, y, w: 3.6, h: 0.28, fontSize: 9.5, fontFace: FONT_C, color: C.text_dark, valign: "middle", margin: 0 });
    }
    s.addShape("rect", { x: 0.7, y: 1.25 + 11 * 0.32, w: 3.8, h: 0.28, fill: { color: C.light_card } });
    s.addText("status.json  (resume tracker)", { x: 0.8, y: 1.25 + 11 * 0.32, w: 3.6, h: 0.28, fontSize: 9.5, fontFace: FONT_C, color: C.text_mid, valign: "middle", italic: true, margin: 0 });

    // Right: example finding
    s.addShape("rect", { x: 5.0, y: 0.85, w: 4.5, h: 4.5, fill: { color: C.card_bg },
      shadow: { type: "outer", blur: 4, offset: 1, angle: 135, color: "000000", opacity: 0.08 } });
    s.addShape("rect", { x: 5.0, y: 0.85, w: 4.5, h: 0.06, fill: { color: C.accent } });
    s.addText("Example finding from 03-compliance.md", { x: 5.15, y: 0.95, w: 4.2, h: 0.3,
      fontSize: 10, fontFace: FONT_B, color: C.accent, bold: true, margin: 0 });

    const finding = [
      { text: "VIOLATION", options: { fontSize: 9, fontFace: FONT_H, color: C.red_soft, bold: true, breakLine: true } },
      { text: "LLM client instantiated per-request", options: { fontSize: 12, fontFace: FONT_H, color: C.text_dark, bold: true, breakLine: true } },
      { text: " ", options: { fontSize: 6, breakLine: true } },
      { text: "File: ", options: { fontSize: 10, fontFace: FONT_B, color: C.text_mid, bold: true } },
      { text: "src/api/handlers/generate.py:42", options: { fontSize: 10, fontFace: FONT_C, color: C.text_dark, breakLine: true } },
      { text: " ", options: { fontSize: 6, breakLine: true } },
      { text: "Current: ", options: { fontSize: 10, fontFace: FONT_B, color: C.text_mid, bold: true } },
      { text: "ChatOpenAI() called inside", options: { fontSize: 10, fontFace: FONT_C, color: C.red_soft, breakLine: true } },
      { text: "request handler", options: { fontSize: 10, fontFace: FONT_C, color: C.red_soft, breakLine: true } },
      { text: " ", options: { fontSize: 6, breakLine: true } },
      { text: "Expected: ", options: { fontSize: 10, fontFace: FONT_B, color: C.text_mid, bold: true } },
      { text: "Initialize in FastAPI lifespan,", options: { fontSize: 10, fontFace: FONT_C, color: C.accent, breakLine: true } },
      { text: "reuse via app.state", options: { fontSize: 10, fontFace: FONT_C, color: C.accent, breakLine: true } },
      { text: " ", options: { fontSize: 6, breakLine: true } },
      { text: "Rule: ", options: { fontSize: 10, fontFace: FONT_B, color: C.text_mid, bold: true } },
      { text: "\"LLM client lifecycle\" from CLAUDE.md", options: { fontSize: 10, fontFace: FONT_B, color: C.text_dark, italic: true, breakLine: true } },
      { text: " ", options: { fontSize: 6, breakLine: true } },
      { text: "Confidence: ", options: { fontSize: 10, fontFace: FONT_B, color: C.text_mid, bold: true } },
      { text: "HIGH", options: { fontSize: 10, fontFace: FONT_H, color: C.accent, bold: true } },
    ];
    s.addText(finding, { x: 5.2, y: 1.35, w: 4.1, h: 3.8, valign: "top", margin: 0 });
  }

  // ════════════════════════════════════════════════════════════
  // 9. CUSTOMIZING FOR YOUR STACK
  // ════════════════════════════════════════════════════════════
  {
    const s = pres.addSlide();
    s.background = { color: C.off_white };
    s.addText("Customizing for Your Stack", { x: 0.7, y: 0.4, w: 9, h: 0.6, fontSize: 28, fontFace: FONT_H, color: C.text_dark, bold: true, margin: 0 });
    s.addText("The generic audit covers ~80% of any codebase. Add project-specific checks in one file.", {
      x: 0.7, y: 1.0, w: 8.5, h: 0.35, fontSize: 12, fontFace: FONT_B, color: C.text_mid, margin: 0 });

    // How it works
    s.addShape("rect", { x: 0.5, y: 1.55, w: 9, h: 1.8, fill: { color: C.card_bg },
      shadow: { type: "outer", blur: 3, offset: 1, angle: 135, color: "000000", opacity: 0.06 } });
    s.addShape("rect", { x: 0.5, y: 1.55, w: 9, h: 0.05, fill: { color: C.accent } });

    s.addText("docs/audit-extensions.md", { x: 0.7, y: 1.7, w: 4, h: 0.35, fontSize: 14, fontFace: FONT_C, color: C.text_dark, bold: true, margin: 0 });
    s.addText("Loaded automatically by /audit after each phase. Write checks that linters can't catch.", {
      x: 0.7, y: 2.05, w: 8.5, h: 0.3, fontSize: 11, fontFace: FONT_B, color: C.text_mid, margin: 0 });

    // Three extension points
    const exts = [
      { label: "After Phase 1", desc: "Your team's coding standards, framework patterns, naming rules" },
      { label: "After Phase 2", desc: "Stack-specific perf checks: DB queries, caching, connection pooling" },
      { label: "After Phase 3", desc: "Deploy sequencing: infra deps, env differences, migration order" },
    ];
    for (let i = 0; i < 3; i++) {
      const x = 0.7 + i * 3.0;
      s.addShape("ellipse", { x, y: 2.55, w: 0.25, h: 0.25, fill: { color: C.accent } });
      s.addText(exts[i].label, { x: x + 0.32, y: 2.5, w: 2.5, h: 0.3, fontSize: 11, fontFace: FONT_H, color: C.text_dark, bold: true, margin: 0 });
      s.addText(exts[i].desc, { x: x + 0.32, y: 2.8, w: 2.5, h: 0.4, fontSize: 10, fontFace: FONT_B, color: C.text_mid, margin: 0 });
    }

    // Example snippets
    s.addText("Example: what goes in the file", { x: 0.7, y: 3.6, w: 8, h: 0.35, fontSize: 13, fontFace: FONT_H, color: C.text_dark, bold: true, margin: 0 });

    const examples = [
      { stack: "Python / FastAPI", check: "Verify all routes use the shared auth middleware, not custom decorators" },
      { stack: "React / Next.js", check: "Check that API calls use the centralized fetch wrapper, not raw fetch()" },
      { stack: "Go microservices", check: "Ensure gRPC services implement the health check interface" },
      { stack: "Java / Spring", check: "Validate that @Transactional boundaries match the expected isolation levels" },
    ];
    for (let i = 0; i < 4; i++) {
      const y = 4.05 + i * 0.42;
      s.addShape("rect", { x: 0.7, y, w: 8.6, h: 0.38, fill: { color: i % 2 === 0 ? C.card_bg : C.light_card } });
      s.addText(examples[i].stack, { x: 0.85, y, w: 1.8, h: 0.38, fontSize: 10, fontFace: FONT_H, color: C.accent, bold: true, valign: "middle", margin: 0 });
      s.addText(examples[i].check, { x: 2.8, y, w: 6.3, h: 0.38, fontSize: 10, fontFace: FONT_B, color: C.text_dark, valign: "middle", margin: 0 });
    }
  }

  // ════════════════════════════════════════════════════════════
  // 10. SECTION: IMPLEMENTING
  // ════════════════════════════════════════════════════════════
  sectionSlide(pres, "Implementing Improvements", "From audit findings to merged code", I.toolsW);

  // ════════════════════════════════════════════════════════════
  // 11. IMPLEMENT SKILL + SAFETY
  // ════════════════════════════════════════════════════════════
  {
    const s = pres.addSlide();
    s.background = { color: C.off_white };
    s.addText("The implement Skill", { x: 0.7, y: 0.3, w: 9, h: 0.55, fontSize: 28, fontFace: FONT_H, color: C.text_dark, bold: true, margin: 0 });
    s.addText("Say \"implement Batch 2 item 3\" — Claude reads the roadmap, plans, codes, and verifies.", {
      x: 0.7, y: 0.85, w: 8.5, h: 0.35, fontSize: 12, fontFace: FONT_B, color: C.text_mid, margin: 0 });

    const steps = [
      { num: "1", label: "Plan", desc: "Reads audit findings.\nIdentifies files to change.\nProposes approach.\nStops for your approval.", color: "7C3AED" },
      { num: "2", label: "Execute", desc: "Makes the changes.\nRuns lint and tests.\nLogs fixes to context.\nStops if tests fail.", color: "6D28D9" },
      { num: "3", label: "Verify", desc: "Confirms tests pass.\nMarks roadmap [DONE].\nSuggests /review\nbefore merge.", color: C.accent },
    ];
    for (let i = 0; i < 3; i++) {
      const x = 0.7 + i * 3.2;
      s.addShape("rect", { x, y: 1.4, w: 2.8, h: 2.65, fill: { color: C.card_bg },
        shadow: { type: "outer", blur: 4, offset: 1, angle: 135, color: "000000", opacity: 0.08 } });
      s.addShape("rect", { x, y: 1.4, w: 2.8, h: 0.06, fill: { color: steps[i].color } });
      s.addShape("ellipse", { x: x + 1.1, y: 1.6, w: 0.55, h: 0.55, fill: { color: steps[i].color } });
      s.addText(steps[i].num, { x: x + 1.1, y: 1.6, w: 0.55, h: 0.55, fontSize: 20, fontFace: FONT_H, color: C.white, align: "center", valign: "middle", bold: true, margin: 0 });
      s.addText(steps[i].label, { x: x + 0.15, y: 2.25, w: 2.5, h: 0.35, fontSize: 15, fontFace: FONT_H, color: C.text_dark, bold: true, align: "center", margin: 0 });
      s.addText(steps[i].desc, { x: x + 0.15, y: 2.65, w: 2.5, h: 1.3, fontSize: 11, fontFace: FONT_B, color: C.text_mid, align: "center", valign: "top", margin: 0 });
      if (i < 2) s.addShape("rightArrow", { x: x + 2.8, y: 2.55, w: 0.4, h: 0.2, fill: { color: C.accent } });
    }

    // Safety callout
    s.addShape("rect", { x: 0.5, y: 4.3, w: 9, h: 1.05, fill: { color: C.light_card } });
    s.addImage({ data: I.lock, x: 0.7, y: 4.45, w: 0.35, h: 0.35 });
    s.addText("Safety: Claude never commits or pushes without explicit human approval.", {
      x: 1.15, y: 4.4, w: 5, h: 0.4, fontSize: 12, fontFace: FONT_H, color: C.text_dark, bold: true, margin: 0 });
    s.addText("Every step has a stop-and-report checkpoint. If tests fail, Claude stops and explains what happened instead of pushing through. You review the diff, you decide to merge.", {
      x: 1.15, y: 4.8, w: 8, h: 0.45, fontSize: 10, fontFace: FONT_B, color: C.text_mid, margin: 0 });
  }

  // ════════════════════════════════════════════════════════════
  // 12. PRE-MERGE REVIEW
  // ════════════════════════════════════════════════════════════
  {
    const s = pres.addSlide();
    s.background = { color: C.off_white };
    s.addText("/review  —  Pre-Merge Check", { x: 0.7, y: 0.4, w: 9, h: 0.6, fontSize: 28, fontFace: FONT_H, color: C.text_dark, bold: true, margin: 0 });
    s.addText("Catches issues before they reach human reviewers. Loads skills automatically.", {
      x: 0.7, y: 1.0, w: 8.5, h: 0.35, fontSize: 12, fontFace: FONT_B, color: C.text_mid, margin: 0 });

    const checks = [
      { icon: I.branch, title: "Full-File Diff Analysis", body: "Reads complete changed files, not just diffs. Catches context-dependent bugs that line-by-line review misses." },
      { icon: I.clipboard, title: "Convention Compliance", body: "Loads your coding standards skill. Checks naming, patterns, imports, error handling against your rules." },
      { icon: I.shield, title: "Security Scan", body: "Loads the security checklist skill. Hardcoded secrets, injection risks, auth gaps, unsafe defaults." },
      { icon: I.search, title: "Regression Detection", body: "Cross-references known violations from the audit. Ensures old patterns don't creep back in." },
    ];
    for (let i = 0; i < 4; i++) {
      const col = i % 2, row = Math.floor(i / 2);
      addCard(s, 0.7 + col * 4.5, 1.6 + row * 1.5, 4.1, 1.3, checks[i].title, checks[i].body, checks[i].icon);
    }

    s.addText("Focus areas:  /review security    /review performance    /review tests", {
      x: 0.7, y: 4.85, w: 8.6, h: 0.35, fontSize: 10, fontFace: FONT_C, color: C.text_mid, align: "center", margin: 0 });
  }

  // ════════════════════════════════════════════════════════════
  // 13. SECTION: BUILDING FEATURES
  // ════════════════════════════════════════════════════════════
  sectionSlide(pres, "Building New Features", "A structured pipeline with a virtual dev team", I.branchW);

  // ════════════════════════════════════════════════════════════
  // 14. PIPELINE + TEAM (combined)
  // ════════════════════════════════════════════════════════════
  {
    const s = pres.addSlide();
    s.background = { color: C.off_white };
    s.addText("/pipeline  —  Feature Build in 8 Stages", { x: 0.7, y: 0.25, w: 9, h: 0.5, fontSize: 26, fontFace: FONT_H, color: C.text_dark, bold: true, margin: 0 });

    // Compact 8-stage flow
    const stages = [
      { n: "1", l: "Brief", a: "PM", c: "7C3AED" },
      { n: "2", l: "Design", a: "Principal", c: "6D28D9" },
      { n: "A", l: "Checkpoint", a: "Human", c: C.accent },
      { n: "4", l: "Build", a: "3 Devs", c: "5B21B6" },
      { n: "5", l: "Review", a: "Cross-review", c: "4C1D95" },
      { n: "6", l: "Test", a: "Platform", c: "6D28D9" },
      { n: "B", l: "Sign-off", a: "PM + Human", c: C.accent },
      { n: "8", l: "Deploy", a: "Platform", c: "7C3AED" },
    ];
    for (let i = 0; i < 8; i++) {
      const x = 0.35 + i * 1.2;
      s.addShape("rect", { x, y: 0.9, w: 1.0, h: 1.35, fill: { color: C.card_bg },
        shadow: { type: "outer", blur: 2, offset: 1, angle: 135, color: "000000", opacity: 0.06 } });
      s.addShape("rect", { x, y: 0.9, w: 1.0, h: 0.04, fill: { color: stages[i].c } });
      s.addShape("ellipse", { x: x + 0.3, y: 1.02, w: 0.38, h: 0.38, fill: { color: stages[i].c } });
      s.addText(stages[i].n, { x: x + 0.3, y: 1.02, w: 0.38, h: 0.38, fontSize: 13, fontFace: FONT_H, color: C.white, align: "center", valign: "middle", bold: true, margin: 0 });
      s.addText(stages[i].l, { x: x + 0.02, y: 1.48, w: 0.96, h: 0.3, fontSize: 9.5, fontFace: FONT_H, color: C.text_dark, bold: true, align: "center", margin: 0 });
      s.addText(stages[i].a, { x: x + 0.02, y: 1.75, w: 0.96, h: 0.25, fontSize: 8, fontFace: FONT_B, color: C.text_mid, align: "center", margin: 0 });
      if (i < 7) s.addShape("rightArrow", { x: x + 1.0, y: 1.38, w: 0.2, h: 0.12, fill: { color: C.border } });
    }

    // Gate note
    s.addShape("rect", { x: 0.35, y: 2.4, w: 9.3, h: 0.3, fill: { color: C.light_card } });
    s.addText("Every stage writes a JSON gate:  PASS  /  FAIL  /  ESCALATE  —  deterministic, no ambiguity", {
      x: 0.5, y: 2.4, w: 9, h: 0.3, fontSize: 9, fontFace: FONT_B, color: C.text_mid, align: "center", valign: "middle", margin: 0 });

    // Team table
    s.addText("The Virtual Team", { x: 0.7, y: 2.9, w: 4, h: 0.4, fontSize: 16, fontFace: FONT_H, color: C.text_dark, bold: true, margin: 0 });

    s.addShape("rect", { x: 0.7, y: 3.3, w: 8.6, h: 0.35, fill: { color: C.bg_mid } });
    const hx = [0.8, 2.1, 3.2, 6.5];
    const hw = [1.2, 1.0, 3.2, 2.6];
    ["Role", "Model", "Domain", "Boundaries"].forEach((h, c) => {
      s.addText(h, { x: hx[c], y: 3.31, w: hw[c], h: 0.33, fontSize: 10, fontFace: FONT_H, color: C.white, bold: true, valign: "middle", margin: 0 });
    });

    const team = [
      ["PM", "Opus", "Requirements, acceptance, sign-off", "pipeline/ only — no code"],
      ["Principal", "Opus", "Architecture, design review, ADRs", "Read + Bash (read-only)"],
      ["Backend", "Sonnet", "APIs, services, data layer", "src/backend/ only"],
      ["Frontend", "Sonnet", "UI components, client logic", "src/frontend/ only"],
      ["Platform", "Sonnet", "Tests, CI/CD, deployment", "src/infra/ only"],
    ];
    for (let r = 0; r < team.length; r++) {
      const y = 3.65 + r * 0.33;
      s.addShape("rect", { x: 0.7, y, w: 8.6, h: 0.31, fill: { color: r % 2 === 0 ? C.card_bg : C.light_card } });
      team[r].forEach((v, c) => {
        s.addText(v, { x: hx[c], y, w: hw[c], h: 0.31, fontSize: 9, fontFace: c === 0 ? FONT_H : FONT_B, color: C.text_dark, bold: c === 0, valign: "middle", margin: 0 });
      });
    }

    // Insight — positioned below table with clearance
    s.addImage({ data: I.lightbulb, x: 0.7, y: 5.38, w: 0.22, h: 0.22 });
    s.addText("Role separation prevents scope creep. Devs can't touch each other's code. The PM can't make technical decisions.", {
      x: 1.0, y: 5.35, w: 8.3, h: 0.25, fontSize: 9, fontFace: FONT_B, color: C.text_mid, valign: "middle", margin: 0 });
  }

  // ════════════════════════════════════════════════════════════
  // 15. SAFETY & TRUST MODEL
  // ════════════════════════════════════════════════════════════
  {
    const s = pres.addSlide();
    s.background = { color: C.off_white };
    s.addText("Safety & Trust Model", { x: 0.7, y: 0.4, w: 9, h: 0.6, fontSize: 32, fontFace: FONT_H, color: C.text_dark, bold: true, margin: 0 });
    s.addText("Claude is powerful but scoped. Here's what it can and can't do without you.", {
      x: 0.7, y: 1.0, w: 8.5, h: 0.35, fontSize: 13, fontFace: FONT_B, color: C.text_mid, margin: 0 });

    // Left: what Claude does
    s.addShape("rect", { x: 0.5, y: 1.55, w: 4.3, h: 3.6, fill: { color: C.green_bg } });
    s.addShape("rect", { x: 0.5, y: 1.55, w: 4.3, h: 0.06, fill: { color: C.accent } });
    s.addText("Claude handles", { x: 0.7, y: 1.65, w: 3.5, h: 0.35, fontSize: 14, fontFace: FONT_H, color: C.accent, bold: true, margin: 0 });

    const does = [
      "Read and analyze the full codebase",
      "Write findings to structured files",
      "Generate prioritized roadmaps",
      "Draft code changes with tests",
      "Run lint and test suites",
      "Track progress in status.json",
    ];
    for (let i = 0; i < does.length; i++) {
      s.addImage({ data: I.check, x: 0.75, y: 2.15 + i * 0.45, w: 0.2, h: 0.2 });
      s.addText(does[i], { x: 1.05, y: 2.12 + i * 0.45, w: 3.5, h: 0.35, fontSize: 11, fontFace: FONT_B, color: C.text_dark, margin: 0 });
    }

    // Right: what requires human
    s.addShape("rect", { x: 5.2, y: 1.55, w: 4.3, h: 3.6, fill: { color: C.red_bg } });
    s.addShape("rect", { x: 5.2, y: 1.55, w: 4.3, h: 0.06, fill: { color: C.red_soft } });
    s.addText("Requires your approval", { x: 5.4, y: 1.65, w: 3.5, h: 0.35, fontSize: 14, fontFace: FONT_H, color: C.red_soft, bold: true, margin: 0 });

    const requires = [
      "Proceeding past any checkpoint",
      "Committing or pushing code",
      "Approving the implementation plan",
      "Accepting the roadmap priorities",
      "Deploying to any environment",
      "Resolving escalated decisions",
    ];
    for (let i = 0; i < requires.length; i++) {
      s.addImage({ data: I.lock, x: 5.45, y: 2.15 + i * 0.45, w: 0.2, h: 0.2 });
      s.addText(requires[i], { x: 5.75, y: 2.12 + i * 0.45, w: 3.5, h: 0.35, fontSize: 11, fontFace: FONT_B, color: C.text_dark, margin: 0 });
    }
  }

  // ════════════════════════════════════════════════════════════
  // 16. SECTION: MAINTENANCE
  // ════════════════════════════════════════════════════════════
  sectionSlide(pres, "Ongoing Maintenance", "Keep quality high between audits", I.syncW);

  // ════════════════════════════════════════════════════════════
  // 17. HEALTH CHECK + ROADMAP
  // ════════════════════════════════════════════════════════════
  {
    const s = pres.addSlide();
    s.background = { color: C.off_white };
    s.addText("Health Check & Roadmap", { x: 0.7, y: 0.4, w: 9, h: 0.6, fontSize: 28, fontFace: FONT_H, color: C.text_dark, bold: true, margin: 0 });

    // Left: health check
    s.addShape("rect", { x: 0.7, y: 1.15, w: 4.2, h: 3.8, fill: { color: C.card_bg },
      shadow: { type: "outer", blur: 4, offset: 1, angle: 135, color: "000000", opacity: 0.08 } });
    s.addShape("rect", { x: 0.7, y: 1.15, w: 4.2, h: 0.06, fill: { color: C.accent } });
    s.addImage({ data: I.calendar, x: 0.9, y: 1.35, w: 0.35, h: 0.35 });
    s.addText("/health-check", { x: 1.35, y: 1.3, w: 3, h: 0.4, fontSize: 16, fontFace: FONT_H, color: C.text_dark, bold: true, margin: 0 });
    s.addText("Run monthly or before big releases", { x: 1.35, y: 1.7, w: 3, h: 0.25, fontSize: 10, fontFace: FONT_B, color: C.text_mid, margin: 0 });

    const hcItems = [
      "New convention violations since last audit",
      "Untested components added recently",
      "Dependency changes (new, removed, bumps)",
      "Documentation that's now stale",
      "TODOs older than 30 days",
      "Roadmap progress vs. last check",
    ];
    for (let i = 0; i < hcItems.length; i++) {
      s.addShape("ellipse", { x: 1.0, y: 2.2 + i * 0.4, w: 0.12, h: 0.12, fill: { color: C.accent } });
      s.addText(hcItems[i], { x: 1.2, y: 2.12 + i * 0.4, w: 3.5, h: 0.35, fontSize: 10, fontFace: FONT_B, color: C.text_mid, margin: 0 });
    }

    // Right: roadmap
    s.addShape("rect", { x: 5.2, y: 1.15, w: 4.2, h: 3.8, fill: { color: C.card_bg },
      shadow: { type: "outer", blur: 4, offset: 1, angle: 135, color: "000000", opacity: 0.08 } });
    s.addShape("rect", { x: 5.2, y: 1.15, w: 4.2, h: 0.06, fill: { color: "7C3AED" } });
    s.addImage({ data: I.chart, x: 5.4, y: 1.35, w: 0.35, h: 0.35 });
    s.addText("/roadmap", { x: 5.85, y: 1.3, w: 3, h: 0.4, fontSize: 16, fontFace: FONT_H, color: C.text_dark, bold: true, margin: 0 });
    s.addText("Progress dashboard at a glance", { x: 5.85, y: 1.7, w: 3, h: 0.25, fontSize: 10, fontFace: FONT_B, color: C.text_mid, margin: 0 });

    const batches = [
      { label: "Batch 1 (Critical)", done: "3/4", pct: 0.75 },
      { label: "Batch 2 (High)", done: "1/6", pct: 0.17 },
      { label: "Batch 3 (Medium)", done: "0/5", pct: 0.0 },
      { label: "Batch 4 (Low)", done: "0/3", pct: 0.0 },
    ];
    for (let i = 0; i < 4; i++) {
      const y = 2.2 + i * 0.6;
      s.addText(batches[i].label, { x: 5.4, y, w: 2.5, h: 0.25, fontSize: 10, fontFace: FONT_B, color: C.text_dark, bold: true, margin: 0 });
      s.addText(batches[i].done, { x: 8.4, y, w: 0.8, h: 0.25, fontSize: 10, fontFace: FONT_B, color: C.text_mid, align: "right", margin: 0 });
      s.addShape("rect", { x: 5.4, y: y + 0.28, w: 3.8, h: 0.12, fill: { color: C.light_card } });
      if (batches[i].pct > 0) {
        s.addShape("rect", { x: 5.4, y: y + 0.28, w: 3.8 * batches[i].pct, h: 0.12, fill: { color: C.accent } });
      }
    }
  }

  // ════════════════════════════════════════════════════════════
  // 18. GETTING STARTED
  // ════════════════════════════════════════════════════════════
  {
    const s = pres.addSlide();
    s.background = { color: C.bg_dark };
    s.addShape("ellipse", { x: 7.5, y: -1.5, w: 5, h: 5, fill: { color: C.bg_mid, transparency: 50 } });

    s.addImage({ data: I.rocketW, x: 0.8, y: 0.6, w: 0.5, h: 0.5 });
    s.addText("Getting Started", { x: 1.5, y: 0.5, w: 7, h: 0.7, fontSize: 32, fontFace: FONT_H, color: C.white, bold: true, margin: 0 });

    const steps = [
      { num: "1", text: "Clone the repo into your project" },
      { num: "2", text: "Run bootstrap.sh to install the .claude/ structure" },
      { num: "3", text: "Add a docs/audit-extensions.md for your stack (optional)" },
      { num: "4", text: "Run /audit-quick to orient, then /audit for full analysis" },
      { num: "5", text: "Use the implement skill to work through the roadmap" },
    ];
    for (let i = 0; i < steps.length; i++) {
      const y = 1.5 + i * 0.6;
      s.addShape("ellipse", { x: 1.0, y, w: 0.42, h: 0.42, fill: { color: C.accent } });
      s.addText(steps[i].num, { x: 1.0, y, w: 0.42, h: 0.42, fontSize: 16, fontFace: FONT_H, color: C.white, align: "center", valign: "middle", bold: true, margin: 0 });
      s.addText(steps[i].text, { x: 1.6, y, w: 7, h: 0.42, fontSize: 14, fontFace: FONT_B, color: C.white, valign: "middle", margin: 0 });
    }

    // Prerequisites and time
    s.addText("Prerequisites:  Claude Code CLI  +  a Git repo  +  10 minutes", {
      x: 1.0, y: 4.4, w: 8, h: 0.35, fontSize: 12, fontFace: FONT_B, color: C.text_light, margin: 0 });

    s.addText("github.com/mumit/claude-dev-team", {
      x: 1.0, y: 4.9, w: 8, h: 0.4, fontSize: 14, fontFace: FONT_C, color: C.accent2, margin: 0 });
  }

  const outPath = "claude-dev-team-lifecycle.pptx";
  await pres.writeFile({ fileName: outPath });
  console.log("Wrote " + outPath);
}

build().catch(err => { console.error(err); process.exit(1); });
