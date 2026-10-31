#!/usr/bin/env bash
# Install the vetted external skills into .claude/skills (project scope) for Claude Code.
# Sources are official orgs only. Re-running is safe.
# Uses the open "skills" CLI (https://skills.sh). If a flag is not recognized by your
# version, run `npx -y skills add --help` and adjust.
set -u

cd "$(dirname "$0")/.." || exit 1

FAILED=()

install() {
  echo ""
  echo "==> $*"
  if ! npx -y skills add "$@" --agent claude-code --yes; then
    FAILED+=("$*")
  fi
}

# GSAP — official GreenSock skills (core, timeline, ScrollTrigger, plugins, React)
install greensock/gsap-skills

# Vercel — React/Next.js performance, UI guidelines, composition, view transitions
install vercel-labs/agent-skills --skill vercel-react-best-practices
install vercel-labs/agent-skills --skill web-design-guidelines
install vercel-labs/agent-skills --skill vercel-composition-patterns
install vercel-labs/agent-skills --skill vercel-react-view-transitions

# Better Auth — official best-practice skills
install better-auth/skills

# Anthropic — distinctive frontend design, Playwright web-app testing, skill authoring
install anthropics/skills --skill frontend-design
install anthropics/skills --skill webapp-testing
install anthropics/skills --skill skill-creator

echo ""
echo "Installed skills:"
ls -1 .claude/skills 2>/dev/null || true

if [ ${#FAILED[@]} -gt 0 ]; then
  echo ""
  echo "These installs failed (check the name with 'npx -y skills add <repo> --list'):"
  printf '  - %s\n' "${FAILED[@]}"
  exit 1
fi
echo ""
echo "Done. Restart Claude Code (or start a new session) so it picks up new skills."
