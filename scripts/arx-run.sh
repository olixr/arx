#!/usr/bin/env bash
# The supervisor entrypoint: run the Arx game server in the foreground.
# Supervisor (or a Forge daemon) executes this; `exec` hands the process
# over to node so TERM/INT reach the server and shutdown stays clean.
set -euo pipefail
cd "$(dirname "$0")/.."

# Production knobs live in <repo>/.env (see .env.production.example).
# Under Forge release deployments the repo is <site>/current, and the
# site-level <site>/.env one directory up is the fallback.
ENV_FILE=".env"
[ -f "$ENV_FILE" ] || ENV_FILE="../.env"
if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1091
  . "$ENV_FILE"
  set +a
fi

export NODE_ENV="${NODE_ENV:-production}"
exec node_modules/.bin/tsx packages/server/src/index.ts
