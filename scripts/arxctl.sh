#!/usr/bin/env bash
# arxctl — operate the Arx game server running under supervisor.
#
#   scripts/arxctl.sh start     start the supervisor program
#   scripts/arxctl.sh stop      stop it
#   scripts/arxctl.sh restart   restart it (use after every deploy)
#   scripts/arxctl.sh status    supervisor state + live /healthz probe
#   scripts/arxctl.sh ping      /healthz only (exit 1 if unreachable)
#
# The supervisor program name defaults to "arx" (the shipped
# deploy/arx-supervisor.conf). Running as a Forge-created daemon
# instead? Set ARX_PROGRAM in .env to that daemon's name, e.g.
#   ARX_PROGRAM="daemon-123456:*"
set -euo pipefail
cd "$(dirname "$0")/.."

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi

PROGRAM="${ARX_PROGRAM:-arx}"
PORT="${PORT:-8787}"
ADDR="${HOST:-127.0.0.1}"
[ "$ADDR" = "0.0.0.0" ] && ADDR="127.0.0.1"

# supervisorctl needs root on a stock Forge box; fall back to sudo.
ctl() {
  if supervisorctl "$@" 2>/dev/null; then return 0; fi
  sudo supervisorctl "$@"
}

ping_server() {
  curl -fsS --max-time 5 "http://${ADDR}:${PORT}/healthz"
}

case "${1:-}" in
  start)   ctl start "$PROGRAM" ;;
  stop)    ctl stop "$PROGRAM" ;;
  restart) ctl restart "$PROGRAM" ;;
  status)
    ctl status "$PROGRAM" || true
    if body="$(ping_server)"; then
      echo "health: ${body}"
    else
      echo "health: UNREACHABLE (http://${ADDR}:${PORT}/healthz)"
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
