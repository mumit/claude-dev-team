#!/usr/bin/env bash
# ============================================================
# Claude Code Dev Team Bootstrap
# ============================================================
# Run this from the ROOT of your existing project:
#   curl -fsSL <url>/bootstrap.sh | bash
# Or if you have the zip:
#   unzip dev-team-bootstrap.zip && cd dev-team && bash bootstrap.sh /path/to/your/project
#
# What it does:
#   1. Copies .claude/ into your project (skips files that already exist)
#   2. Copies CLAUDE.md, AGENTS.md, EXAMPLE.md, README.md (with backup)
#   3. Creates pipeline/ directory structure
#   4. Makes gate-validator.js executable
#   5. Prints next steps
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET="${1:-$(pwd)}"

echo ""
echo "🤖  Claude Code Dev Team Bootstrap"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "    Source: $SCRIPT_DIR"
echo "    Target: $TARGET"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── Preflight checks ──────────────────────────────────────
command -v node  >/dev/null 2>&1 || { echo "❌  Node.js is required (for gate-validator.js). Install from nodejs.org"; exit 1; }
command -v git   >/dev/null 2>&1 || { echo "❌  Git is required (for worktrees during parallel builds)."; exit 1; }
command -v rsync >/dev/null 2>&1 || { echo "❌  rsync is required (for merging .claude/ without overwriting)."; exit 1; }
command -v claude >/dev/null 2>&1 || { echo "⚠️   Claude Code not found in PATH. Install: npm install -g @anthropic-ai/claude-code"; }

[ -d "$TARGET" ] || { echo "❌  Target directory does not exist: $TARGET"; exit 1; }

NODE_VERSION=$(node -e "process.stdout.write(process.version)")
echo "✅  Node.js $NODE_VERSION"
echo "✅  Git $(git --version | awk '{print $3}')"

# Check Claude Code version if installed
if command -v claude >/dev/null 2>&1; then
  CLAUDE_VERSION=$(claude --version 2>/dev/null | head -1 || echo "unknown")
  echo "✅  Claude Code $CLAUDE_VERSION"
  # Agent Teams requires 2.1.32+
  # (version check is best-effort — don't block install)
fi

echo ""

# ── Check for existing CLAUDE.md ─────────────────────────
if [ -f "$TARGET/CLAUDE.md" ]; then
  echo "⚠️   CLAUDE.md already exists at target."
  echo "    Backing up to CLAUDE.md.bak before overwriting."
  cp "$TARGET/CLAUDE.md" "$TARGET/CLAUDE.md.bak"
fi

# ── Copy .claude/ ─────────────────────────────────────────
echo "📁  Copying .claude/ ..."
if [ -d "$TARGET/.claude" ]; then
  echo "    .claude/ exists — merging (existing files will not be overwritten)"
  rsync --ignore-existing -a "$SCRIPT_DIR/.claude/" "$TARGET/.claude/"
else
  cp -r "$SCRIPT_DIR/.claude" "$TARGET/"
fi

# ── Copy root markdown files ──────────────────────────────
echo "📄  Copying CLAUDE.md, AGENTS.md, EXAMPLE.md ..."
cp "$SCRIPT_DIR/CLAUDE.md"  "$TARGET/CLAUDE.md"
cp "$SCRIPT_DIR/AGENTS.md"  "$TARGET/AGENTS.md"
cp "$SCRIPT_DIR/EXAMPLE.md" "$TARGET/EXAMPLE.md"

# Only copy README if one doesn't already exist
if [ ! -f "$TARGET/README.md" ]; then
  cp "$SCRIPT_DIR/README.md" "$TARGET/README.md"
  echo "📄  Copied README.md"
else
  echo "⏭️   README.md already exists — skipping (see dev-team-README.md for reference)"
  cp "$SCRIPT_DIR/README.md" "$TARGET/dev-team-README.md"
fi

# ── Create pipeline/ structure ────────────────────────────
echo "📁  Creating pipeline/ directory structure ..."
mkdir -p "$TARGET/pipeline/gates"
mkdir -p "$TARGET/pipeline/adr"
mkdir -p "$TARGET/pipeline/code-review"

# Initialise context.md only if it doesn't exist
if [ ! -f "$TARGET/pipeline/context.md" ]; then
  cp "$SCRIPT_DIR/pipeline/context.md" "$TARGET/pipeline/context.md"
  echo "📄  Created pipeline/context.md"
else
  echo "⏭️   pipeline/context.md already exists — skipping"
fi

# ── Create src/ structure (if src/ doesn't already exist) ─
if [ ! -d "$TARGET/src" ]; then
  echo "📁  Creating src/ structure ..."
  mkdir -p "$TARGET/src/backend"
  mkdir -p "$TARGET/src/frontend"
  mkdir -p "$TARGET/src/infra"
else
  echo "⏭️   src/ already exists — skipping (your existing source is preserved)"
fi

# ── Make hook executable ──────────────────────────────────
chmod +x "$TARGET/.claude/hooks/gate-validator.js"
echo "🔧  Made gate-validator.js executable"

# ── Append to .gitignore if it exists ─────────────────────
if [ -f "$TARGET/.gitignore" ]; then
  if ! grep -q "pipeline/gates/" "$TARGET/.gitignore" 2>/dev/null; then
    echo "" >> "$TARGET/.gitignore"
    echo "# Claude Code Dev Team pipeline artifacts" >> "$TARGET/.gitignore"
    echo "pipeline/brief.md" >> "$TARGET/.gitignore"
    echo "pipeline/design-spec.md" >> "$TARGET/.gitignore"
    echo "pipeline/design-review-notes.md" >> "$TARGET/.gitignore"
    echo "pipeline/pr-*.md" >> "$TARGET/.gitignore"
    echo "pipeline/code-review/" >> "$TARGET/.gitignore"
    echo "pipeline/test-report.md" >> "$TARGET/.gitignore"
    echo "pipeline/deploy-log.md" >> "$TARGET/.gitignore"
    echo "pipeline/hotfix-spec.md" >> "$TARGET/.gitignore"
    echo "pipeline/gates/" >> "$TARGET/.gitignore"
    echo "pipeline/adr/" >> "$TARGET/.gitignore"
    echo ".claude/settings.local.json" >> "$TARGET/.gitignore"
    echo "CLAUDE.local.md" >> "$TARGET/.gitignore"
    echo "🔧  Appended pipeline artifacts to .gitignore"
  else
    echo "⏭️   .gitignore already has pipeline entries — skipping"
  fi
fi

# ── Done ─────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅  Bootstrap complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next steps:"
echo ""
echo "  1. Review and customise your stack conventions:"
echo "       $TARGET/.claude/skills/code-conventions/SKILL.md"
echo "       $TARGET/.claude/skills/api-conventions/SKILL.md"
echo ""
echo "  2. Add your deploy steps to:"
echo "       $TARGET/.claude/agents/dev-platform.md"
echo "       (search: 'On a Deploy Task')"
echo ""
echo "  3. Start Claude Code:"
echo "       cd $TARGET && claude"
echo ""
echo "  4. Run your first pipeline:"
echo "       /pipeline-brief Describe your feature here"
echo ""
echo "  Read EXAMPLE.md for a full annotated walkthrough."
echo "  Read AGENTS.md for the team reference."
echo ""
