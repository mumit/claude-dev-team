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
#   1. Copies .claude/ into your project (overwrites framework files on update)
#   2. Creates CLAUDE.md and AGENTS.md only if they don't exist
#   3. Creates pipeline/ directory structure
#   4. Makes gate-validator.js executable
#   5. Prints next steps
#
# Safe to re-run: updates framework files, never touches your customizations.
# Customise via CLAUDE.md, CLAUDE.local.md, or .claude/settings.local.json.
# ============================================================

set -euo pipefail

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
command -v rsync >/dev/null 2>&1 || { echo "❌  rsync is required (for copying .claude/)."; exit 1; }
command -v claude >/dev/null 2>&1 || { echo "⚠️   Claude Code not found in PATH. Install: npm install -g @anthropic-ai/claude-code"; }

[ -d "$TARGET" ] || { echo "❌  Target directory does not exist: $TARGET"; exit 1; }

NODE_VERSION=$(node -e "process.stdout.write(process.version)")
echo "✅  Node.js $NODE_VERSION"
echo "✅  Git $(git --version | awk '{print $3}')"

# Check Claude Code version if installed
if command -v claude >/dev/null 2>&1; then
  CLAUDE_VERSION=$(claude --version 2>/dev/null | head -1 || echo "unknown")
  echo "✅  Claude Code $CLAUDE_VERSION"
fi

echo ""

# ── Copy .claude/ (overwrite framework files, preserve .local. and config.yml) ──
echo "📁  Copying .claude/ ..."
if [ -d "$TARGET/.claude" ]; then
  echo "    .claude/ exists — overwriting framework files (*.local.*, config.yml preserved)"
fi
# rsync with --exclude preserves user's local overrides and project config
rsync -a \
  --exclude='settings.local.json' \
  --exclude='*.local.*' \
  --exclude='config.yml' \
  "$SCRIPT_DIR/.claude/" "$TARGET/.claude/"

# Seed .claude/config.yml only on first install (v2.4+). User's existing
# config is never overwritten — they customise it for their project.
if [ ! -f "$TARGET/.claude/config.yml" ]; then
  cp "$SCRIPT_DIR/.claude/config.yml" "$TARGET/.claude/config.yml"
  echo "📄  Created .claude/config.yml (yours to customise — deploy adapter selection)"
else
  echo "⏭️   .claude/config.yml already exists — not touched"
fi

# Stamp .claude/VERSION from the framework's VERSION file (v2.5.1+). Every
# bootstrap run overwrites this so a re-run brings the installed project up
# to the framework's current version. Consumers can `cat .claude/VERSION`
# at any time to know which framework version they're running.
if [ -f "$SCRIPT_DIR/VERSION" ]; then
  cp "$SCRIPT_DIR/VERSION" "$TARGET/.claude/VERSION"
  FRAMEWORK_VERSION="$(tr -d '[:space:]' < "$TARGET/.claude/VERSION")"
  echo "🏷️   Stamped .claude/VERSION → $FRAMEWORK_VERSION"
else
  echo "⚠️   VERSION file missing from framework source — .claude/VERSION not stamped"
fi

# ── Create root files only if they don't exist ────────────
if [ ! -f "$TARGET/CLAUDE.md" ]; then
  cp "$SCRIPT_DIR/CLAUDE.md" "$TARGET/CLAUDE.md"
  echo "📄  Created CLAUDE.md (yours to customise)"
else
  echo "⏭️   CLAUDE.md already exists — not touched"
fi

if [ ! -f "$TARGET/AGENTS.md" ]; then
  cp "$SCRIPT_DIR/AGENTS.md" "$TARGET/AGENTS.md"
  echo "📄  Created AGENTS.md"
else
  cp "$SCRIPT_DIR/AGENTS.md" "$TARGET/AGENTS.md"
  echo "📄  Updated AGENTS.md"
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
    cat >> "$TARGET/.gitignore" <<'EOF'

# Claude Code Dev Team — pipeline artifacts (generated at runtime)
pipeline/brief.md
pipeline/design-spec.md
pipeline/design-review-notes.md
pipeline/pr-*.md
pipeline/code-review/
pipeline/test-report.md
pipeline/deploy-log.md
pipeline/hotfix-spec.md
pipeline/gates/
pipeline/adr/

# Claude Code Dev Team — local overrides (never committed)
.claude/settings.local.json
.claude/**/*.local.*
CLAUDE.local.md
EOF
    echo "🔧  Appended pipeline artifacts and local overrides to .gitignore"
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
echo "  1. Add project-specific instructions to CLAUDE.md"
echo "     (framework rules are in .claude/rules/ — loaded automatically)"
echo ""
echo "  2. Customise your stack conventions:"
echo "       $TARGET/.claude/skills/code-conventions/SKILL.md"
echo "       $TARGET/.claude/skills/api-conventions/SKILL.md"
echo ""
echo "  3. Pick your deploy adapter:"
echo "       $TARGET/.claude/config.yml — set deploy.adapter"
echo "       See $TARGET/.claude/adapters/ for the built-in adapters"
echo "       (docker-compose is the default)"
echo ""
echo "  4. Start Claude Code:"
echo "       cd $TARGET && claude"
echo ""
echo "  5. Run your first pipeline:"
echo "       /pipeline-brief Describe your feature here"
echo ""
echo "  Updating later:"
echo "    Re-run bootstrap.sh to get framework updates."
echo "    Files under .claude/ will be overwritten — your CLAUDE.md won't be."
echo "    Use CLAUDE.local.md or .claude/settings.local.json for local overrides."
echo ""
echo "  Read AGENTS.md for the team reference."
echo "  See EXAMPLE.md in the source repo for a full annotated walkthrough."
echo ""
