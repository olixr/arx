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

# Voice clips must outlive releases: under Forge release deployments
# data/voice has to be a symlink into the site's shared/voice store,
# but each new release ships a bare data/ from git. Heal here, before
# the server opens the store — and rescue any clips a symlink-less
# boot already wrote into a release's own data/voice. Outside a Forge
# layout (no releases/ dir in a parent) this is a no-op.
SITE=""
for cand in "$(dirname "$PWD")" "$(dirname "$(dirname "$(pwd -P)")")"; do
  if [ -d "$cand/releases" ]; then SITE="$cand"; break; fi
done
if [ -n "$SITE" ]; then
  mkdir -p "$SITE/shared/voice"
  if [ -d data/voice ] && [ ! -L data/voice ]; then
    mv -n data/voice/* "$SITE/shared/voice/" 2>/dev/null || true
    rm -rf data/voice
  fi
  ln -sfn "$SITE/shared/voice" data/voice
fi

export NODE_ENV="${NODE_ENV:-production}"
exec node_modules/.bin/tsx packages/server/src/index.ts
