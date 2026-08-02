#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# push-to-github.sh
# Push this repo to GitHub so Render can deploy it.
#
# Steps:
#   1. Create a GitHub repo at https://github.com/new  (call it e.g. santech-data)
#   2. Create a Personal Access Token at https://github.com/settings/tokens/new?scopes=repo
#   3. Run:
#        GITHUB_USER=<your-username> GITHUB_REPO=<repo-name> GITHUB_PAT=<token> bash scripts/push-to-github.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

: "${GITHUB_USER:?Set GITHUB_USER to your GitHub username}"
: "${GITHUB_REPO:?Set GITHUB_REPO to your GitHub repo name}"
: "${GITHUB_PAT:?Set GITHUB_PAT to your GitHub personal access token}"

REMOTE_URL="https://${GITHUB_PAT}@github.com/${GITHUB_USER}/${GITHUB_REPO}.git"

git config user.email "deploy@santechdata.ng" 2>/dev/null || true
git config user.name  "SanTech Deploy"        2>/dev/null || true

if git remote get-url origin &>/dev/null; then
  git remote set-url origin "$REMOTE_URL"
else
  git remote add origin "$REMOTE_URL"
fi

git push -u origin main

echo "✓ Pushed to https://github.com/${GITHUB_USER}/${GITHUB_REPO}"
echo ""
echo "Next: Go to https://render.com → New → Blueprint → connect that repo."
echo "      Render will read render.yaml and create the service + database automatically."
