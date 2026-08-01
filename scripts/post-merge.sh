#!/bin/bash
set -e
# Task agents may add new deps; --no-frozen-lockfile lets pnpm update the lockfile
pnpm install --no-frozen-lockfile
pnpm --filter @workspace/db run push
