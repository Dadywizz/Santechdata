#!/usr/bin/env bash
set -e

# Install pnpm if not present
if ! command -v pnpm &>/dev/null; then
  npm install -g pnpm@10.26.1
fi

pnpm install
pnpm --filter @workspace/santech-data run build
pnpm --filter @workspace/api-server run build
