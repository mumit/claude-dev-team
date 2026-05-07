const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const SCRIPT = path.resolve(__dirname, "..", "scripts", "visualize.js");

function run(cwd, args = []) {
  return spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd,
    encoding: "utf8",
  });
}

function writeGate(dir, stageName, gate) {
  const gatesDir = path.join(dir, "pipeline", "gates");
  fs.mkdirSync(gatesDir, { recursive: true });
  fs.writeFileSync(path.join(gatesDir, `${stageName}.json`), JSON.stringify(gate) + "\n");
}

describe("visualize script", () => {
  let tmp;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "claude-vis-"));
    fs.mkdirSync(path.join(tmp, "pipeline", "gates"), { recursive: true });
    fs.writeFileSync(path.join(tmp, "pipeline", "context.md"), "# Context\n");
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("exits 0 and writes pipeline/diagram.md", () => {
    const result = run(tmp);
    assert.equal(result.status, 0);
    assert.match(result.stdout, /written pipeline\/diagram\.md/);
    assert.equal(fs.existsSync(path.join(tmp, "pipeline", "diagram.md")), true);
  });

  describe("empty pipeline (no gates)", () => {
    it("generates valid mermaid block for empty pipeline", () => {
      const result = run(tmp);
      assert.equal(result.status, 0);

      const diagram = fs.readFileSync(path.join(tmp, "pipeline", "diagram.md"), "utf8");
      assert.match(diagram, /```mermaid/);
      assert.match(diagram, /stateDiagram-v2/);
      assert.match(diagram, /```/);
    });

    it("shows all stages as gray (not-run)", () => {
      run(tmp);
      const diagram = fs.readFileSync(path.join(tmp, "pipeline", "diagram.md"), "utf8");
      // All stages should have gray class applied
      assert.match(diagram, /class \w+ grayState/);
      // No pass/fail classes applied to any stage (classDefs always present)
      assert.doesNotMatch(diagram, /class \w+ passState/);
      assert.doesNotMatch(diagram, /class \w+ failState/);
    });
  });

  describe("active pipeline (some gates)", () => {
    it("colors PASS stages green", () => {
      writeGate(tmp, "stage-01", { status: "PASS", warnings: [] });
      writeGate(tmp, "stage-02", { status: "PASS", warnings: [] });

      run(tmp);
      const diagram = fs.readFileSync(path.join(tmp, "pipeline", "diagram.md"), "utf8");
      assert.match(diagram, /passState/);
    });

    it("colors FAIL stages red", () => {
      writeGate(tmp, "stage-01", { status: "PASS", warnings: [] });
      writeGate(tmp, "stage-02", { status: "FAIL", warnings: [], blockers: ["Arch not approved"] });

      run(tmp);
      const diagram = fs.readFileSync(path.join(tmp, "pipeline", "diagram.md"), "utf8");
      assert.match(diagram, /failState/);
    });

    it("colors ESCALATE stages orange", () => {
      writeGate(tmp, "stage-01", { status: "PASS", warnings: [] });
      // Stage 5 (peer-review) gate name in claude is stage-05-backend.
      writeGate(tmp, "stage-05-backend", { status: "ESCALATE", warnings: [] });

      run(tmp);
      const diagram = fs.readFileSync(path.join(tmp, "pipeline", "diagram.md"), "utf8");
      assert.match(diagram, /escalateState/);
    });

    it("includes stage labels in the diagram", () => {
      writeGate(tmp, "stage-01", { status: "PASS", warnings: [] });

      run(tmp);
      const diagram = fs.readFileSync(path.join(tmp, "pipeline", "diagram.md"), "utf8");
      assert.match(diagram, /Requirements/);
    });
  });

  describe("complete pipeline (all gates PASS)", () => {
    it("generates diagram with all stages green", () => {
      // Claude's full track has 10 gates (vs codex's 9): pre-review (4.5a)
      // and a separate sign-off (7) before deploy.
      const gates = [
        ["stage-01", { status: "PASS" }],
        ["stage-02", { status: "PASS" }],
        ["stage-03", { status: "PASS" }],
        ["stage-04", { status: "PASS" }],
        ["stage-04a", { status: "PASS" }],
        ["stage-05-backend", { status: "PASS" }],
        ["stage-06", { status: "PASS" }],
        ["stage-07", { status: "PASS" }],
        ["stage-08", { status: "PASS" }],
        ["stage-09", { status: "PASS" }],
      ];

      for (const [name, gate] of gates) {
        writeGate(tmp, name, { ...gate, warnings: [], blockers: [] });
      }

      run(tmp);
      const diagram = fs.readFileSync(path.join(tmp, "pipeline", "diagram.md"), "utf8");
      assert.match(diagram, /stateDiagram-v2/);
      assert.match(diagram, /passState/);
      // No fail or escalate classes applied to any stage
      assert.doesNotMatch(diagram, /class \w+ failState/);
      assert.doesNotMatch(diagram, /class \w+ escalateState/);
    });
  });

  describe("Mermaid syntax validity", () => {
    it("diagram has opening and closing mermaid fence", () => {
      run(tmp);
      const content = fs.readFileSync(path.join(tmp, "pipeline", "diagram.md"), "utf8");
      // Basic check: contains ```mermaid ... ``` block
      assert.match(content, /```mermaid[\s\S]+```/);
    });

    it("diagram block contains required stateDiagram-v2 header", () => {
      run(tmp);
      const content = fs.readFileSync(path.join(tmp, "pipeline", "diagram.md"), "utf8");
      assert.match(content, /stateDiagram-v2/);
    });

    it("diagram contains [*] start and end transitions", () => {
      run(tmp);
      const content = fs.readFileSync(path.join(tmp, "pipeline", "diagram.md"), "utf8");
      assert.match(content, /\[\*\] -->/);
      assert.match(content, /--> \[\*\]/);
    });

    it("diagram contains legend section", () => {
      run(tmp);
      const content = fs.readFileSync(path.join(tmp, "pipeline", "diagram.md"), "utf8");
      assert.match(content, /## Legend/);
      assert.match(content, /PASS/);
      assert.match(content, /FAIL/);
      assert.match(content, /ESCALATE/);
    });

    it("all state IDs are alphanumeric (no hyphens in state names)", () => {
      run(tmp);
      const content = fs.readFileSync(path.join(tmp, "pipeline", "diagram.md"), "utf8");
      const mermaidBlock = content.match(/```mermaid([\s\S]+?)```/);
      assert.ok(mermaidBlock, "Expected mermaid block");
      // Extract state IDs from class assignments: "class <id> <className>"
      const classLines = mermaidBlock[1].match(/class \w+ \w+/g) || [];
      for (const line of classLines) {
        const parts = line.split(" ");
        const stateId = parts[1];
        assert.doesNotMatch(stateId, /-/, `State ID contains hyphen: ${stateId}`);
      }
    });

    it("classDef lines define pass, fail, and escalate styles", () => {
      run(tmp);
      const content = fs.readFileSync(path.join(tmp, "pipeline", "diagram.md"), "utf8");
      assert.match(content, /classDef passState/);
      assert.match(content, /classDef failState/);
      assert.match(content, /classDef escalateState/);
    });
  });

  describe("summary output", () => {
    it("includes track info in the written file", () => {
      run(tmp);
      const content = fs.readFileSync(path.join(tmp, "pipeline", "diagram.md"), "utf8");
      assert.match(content, /Track:/);
    });

    it("includes stage count in the written file", () => {
      run(tmp);
      const content = fs.readFileSync(path.join(tmp, "pipeline", "diagram.md"), "utf8");
      assert.match(content, /Stages:/);
    });
  });
});
