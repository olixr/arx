#!/usr/bin/env bash
# arxctl — operate the Arx game server.
#
#   scripts/arxctl.sh start     start the supervised program
#   scripts/arxctl.sh stop      graceful stop (players save, DB drains)
#   scripts/arxctl.sh restart   graceful restart + wait until /healthz answers
#   scripts/arxctl.sh status    process state + live /healthz probe
#   scripts/arxctl.sh ping      /healthz only (exit 1 if unreachable)
#
# The supervisor program is DISCOVERED, not configured: Forge writes
# each daemon's config to /etc/supervisor/conf.d/, and the one whose
# command runs arx-run.sh is ours — so recreating the daemon (new id)
# needs no env change. ARX_PROGRAM overrides discovery if ever needed.
# If supervisor can't be addressed at all, restart/stop fall back to a
# SIGTERM at the port's listener: the server shuts down cleanly and
# supervisor's autorestart brings it back on the current release.
set -euo pipefail
cd "$(dirname "$0")/.."

# <repo>/.env, or the site-level .env when the repo is <site>/current.
ENV_FILE=".env"
[ -f "$ENV_FILE" ] || ENV_FILE="../.env"
if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1091
  . "$ENV_FILE"
  set +a
fi

PORT="${PORT:-8790}"
ADDR="${HOST:-127.0.0.1}"
[ "$ADDR" = "0.0.0.0" ] && ADDR="127.0.0.1"
HEALTH_URL="http://${ADDR}:${PORT}/healthz"

# ---------------------------------------------------------- discovery

find_program() {
  if [ -n "${ARX_PROGRAM:-}" ]; then
    printf '%s\n' "$ARX_PROGRAM"
    return 0
  fi
  local conf name
  conf=$(grep -lsE 'arx-run\.sh' /etc/supervisor/conf.d/*.conf 2>/dev/null | head -1 || true)
  if [ -n "$conf" ]; then
    name=$(sed -n 's/^\[program:\([^]]*\)\].*/\1/p' "$conf" | head -1)
    if [ -n "$name" ]; then
      printf '%s:*\n' "$name"
      return 0
    fi
  fi
  return 1
}

PROGRAM="$(find_program || true)"

# supervisorctl needs root on a stock Forge box; fall back to sudo -n
# (non-interactive — a deploy must never hang on a password prompt).
# supervisorctl can exit 0 while printing "ERROR (no such process)",
# so the output text is part of the verdict.
ctl() {
  local out
  if out=$(supervisorctl "$@" 2>&1) && ! grep -q 'ERROR' <<<"$out"; then
    printf '%s\n' "$out"
    return 0
  fi
  if out=$(sudo -n supervisorctl "$@" 2>&1) && ! grep -q 'ERROR' <<<"$out"; then
    printf '%s\n' "$out"
    return 0
  fi
  printf '%s\n' "$out" >&2
  return 1
}

# ------------------------------------------------- port-level fallback

listener_pids() {
  lsof -t -iTCP:"$PORT" -sTCP:LISTEN 2>/dev/null || true
}

# SIGTERM the listener and wait for the port to free. With supervisor
# autorestart the process comes straight back on the new release.
term_listener() {
  local pids i
  pids=$(listener_pids)
  if [ -z "$pids" ]; then
    echo "no process listening on :$PORT"
    return 1
  fi
  echo "sending SIGTERM to listener on :$PORT (pid $pids)"
  # shellcheck disable=SC2086
  kill -TERM $pids 2>/dev/null || sudo -n kill -TERM $pids
  for i in $(seq 1 20); do
    [ -z "$(listener_pids)" ] && return 0
    sleep 1
  done
  echo "listener on :$PORT did not exit within 20s" >&2
  return 1
}

# ----------------------------------------------------------- health

ping_server() {
  curl -fsS --max-time 5 "$HEALTH_URL"
}

# Poll /healthz until it answers (fresh boot takes a few seconds for
# migrations + content seeding).
wait_healthy() {
  local i body
  for i in $(seq 1 30); do
    if body=$(ping_server 2>/dev/null); then
      echo "health: ${body}"
      return 0
    fi
    sleep 1
  done
  echo "server not answering ${HEALTH_URL} after 30s" >&2
  return 1
}

# ----------------------------------------------------------- commands

do_restart() {
  if [ -n "$PROGRAM" ] && ctl restart "$PROGRAM"; then
    :
  else
    [ -n "$PROGRAM" ] && echo "supervisorctl restart failed — falling back to graceful signal" >&2
    # supervisor autorestart revives the process; even if nothing was
    # listening, give the health poll a chance before failing.
    term_listener || true
  fi
  wait_healthy
}

case "${1:-}" in
  start)
    if [ -n "$PROGRAM" ]; then
      ctl start "$PROGRAM"
      wait_healthy
    else
      echo "no supervisor program found (no ARX_PROGRAM, nothing in /etc/supervisor/conf.d runs arx-run.sh)" >&2
      echo "create the Forge Daemon first — DEPLOY.md section 5" >&2
      exit 1
    fi
    ;;
  stop)
    if [ -n "$PROGRAM" ] && ctl stop "$PROGRAM"; then
      :
    else
      term_listener || true
    fi
    ;;
  restart)
    do_restart
    ;;
  status)
    if [ -n "$PROGRAM" ]; then
      echo "program: $PROGRAM"
      ctl status "$PROGRAM" || true
    else
      echo "program: (none discovered — port-level fallback in effect)"
    fi
    if body=$(ping_server 2>/dev/null); then
      echo "health: ${body}"
    else
      echo "health: UNREACHABLE (${HEALTH_URL})"
      exit 1
    fi
    ;;
  ping)
    body="$(ping_server)" && echo "${body}"
    ;;
  *)
    echo "usage: $0 {start|stop|restart|status|ping}" >&2
    exit 64
    ;;
esac
