#!/bin/bash
#
# THE FULL PASS — speak every cast character and push them into the ledger.
#
#   tools/voice/run_all.sh                 the whole cast, resumable
#   tools/voice/run_all.sh --dry           preflight only: say what would happen
#   tools/voice/run_all.sh --generic       also re-speak the generic fallback bank
#   tools/voice/run_all.sh --fresh         ignore stamps, re-speak EVERYTHING
#   tools/voice/run_all.sh reeve_halla ... just these characters
#
# It is safe to re-run. Every stage is resumable and every stage is idempotent,
# so if this dies at hour two you re-run the same command and it picks up where
# it stopped. Nothing here is destructive to a take that is already correct.
#
# WHAT IT DOES, IN ORDER
#   0. preflight   audit for blockers, then confirm the TTS service answers
#   1. sheet       regenerate docs/voice-script.md from the current content
#   2. characters  wave_driver.sh: per actor, generate -> import -> stamp
#   3. generic     (opt-in) the per-voice fallback bank
#   4. report      audit again, so the end state is stated rather than assumed
#
# EXPECTED COST at the time of writing: 92 characters need speaking (65 newly
# cast, 27 recast off the trashed voices), about 1039 clips, roughly two hours
# at ~7s a clip. The other 47 characters already hold valid takes and are
# skipped by their stamp. --generic adds ~50 minutes on top.
#
# READ THIS BEFORE YOU START IT
#   * Do not push to main while this runs. Forge quick-deploys on every push to
#     main, which swaps the release and restarts the server mid-import.
#   * This fills the LOCAL ledger only. Shipping the clips to production is a
#     separate runbook: DEPLOY.md, "Pushing voice clips to production".
#   * The dev server must be up on :8790 for the import half of each actor.
#   * A voicelab that has been resident for days has been observed to wedge:
#     zero CPU, no answer, every request hanging until the curl ceiling. This
#     script restarts it ONCE up front for that reason. It deliberately does
#     NOT restart between actors — measured, there is no MPS drift to justify
#     the 18s cost, and restarting dumps the voice conditioning cache.
#
set -euo pipefail
cd "$(dirname "$0")/../.."
REPO="$PWD"
VL="$HOME/code/voicelab"
API="${ARX_API:-http://localhost:8790}"
SERVICE="${ARX_TTS:-http://localhost:5002}"

DRY=0
GENERIC=0
PASS_ARGS=()
for a in "$@"; do
  case "$a" in
    --dry)     DRY=1 ;;
    --generic) GENERIC=1 ;;
    *)         PASS_ARGS+=("$a") ;;   # --fresh and actor ids go to the driver
  esac
done

say() { printf '\n\033[1m=== %s\033[0m\n' "$*"; }

# ---- 0. preflight --------------------------------------------------------
say "0/4  preflight"

# The audit is the gate, not decoration. It exits non-zero on a BLOCKER — a
# character cast on a voice the service does not serve, which does not degrade
# to a default take but kills generate.mts at that actor with exit 1. Finding
# that here costs seconds; finding it at actor 40 costs the whole run.
if ! npx tsx tools/voice/audit.mts --service "$SERVICE"; then
  echo
  echo "BLOCKED: fix the blockers above, then re-run. Nothing has been spoken."
  exit 1
fi

# One restart up front: see the wedge note in the header.
say "0/4  restarting voicelab (once, deliberately)"
if [ "$DRY" = "0" ]; then
  (cd "$VL" && ./voicelab.sh restart >/dev/null 2>&1) || (cd "$VL" && ./voicelab.sh start >/dev/null)
  # Model load takes a while; wait for a real answer rather than guessing.
  for i in $(seq 1 60); do
    if curl -sf -m 5 "$SERVICE/health" >/dev/null 2>&1; then break; fi
    sleep 5
    if [ "$i" = "60" ]; then echo "voicelab never came back on $SERVICE"; exit 1; fi
  done
fi
curl -sf -m 10 "$SERVICE/health" || { echo "no TTS service at $SERVICE"; exit 1; }
echo

# The import half of every actor needs the game server's dev routes. Failing
# here after two hours of generation would mean re-running the import anyway,
# so check before a single clip is spoken.
if ! curl -sf -m 10 "$API/dev/content/voice" >/dev/null 2>&1; then
  echo "no game server dev API at $API — start the dev server first."
  echo "(generation would succeed and every import would then fail.)"
  exit 1
fi
echo "game server dev API: up at $API"

if [ "$DRY" = "1" ]; then
  say "--dry: preflight passed, stopping before any audio is spoken"
  exit 0
fi

# ---- 1. the sheet --------------------------------------------------------
# Regenerated first so the human-readable script and the clips about to be
# spoken describe the same content. The sheet is generated: never edit it.
say "1/4  regenerating docs/voice-script.md"
npx tsx tools/voice/sheet.mts

# ---- 2. the character lane ----------------------------------------------
# wave_driver handles per-actor resumption, stale-take clearing and stamping.
# 'all' means every character in characters.json carrying a ttsVoice.
say "2/4  speaking the cast (this is the long one)"
if [ ${#PASS_ARGS[@]} -eq 0 ]; then
  tools/voice/wave_driver.sh all
else
  tools/voice/wave_driver.sh "${PASS_ARGS[@]}"
fi

# ---- 3. the generic fallback bank ---------------------------------------
# OFF by default, and not because it is slow.
#
# NOTHING IMPORTS IT. generic.mts writes 616 clips into voicework/generic/ and
# there is no importer anywhere in the repo that pushes them to the ledger:
# voice_banks are keyed by (owner_kind, owner_id) where owner is an actor, poi
# or zone, and a voice slot is none of those. So the bank is real audio that
# currently reaches nothing in the game.
#
# It also matters less than it did. The bank existed so an NPC with no authored
# dialogue could still answer in its cast voice; every one of the 139 speaking
# characters is now cast and generating real lines.
#
# Run it when the importer exists, or when you want the clips on disk anyway.
if [ "$GENERIC" = "1" ]; then
  say "3/4  generic fallback bank (~50 min)"
  npx tsx tools/voice/generic.mts --service "$SERVICE"
  echo
  echo "NOTE: these clips are on disk only. No importer pushes the generic"
  echo "      bank into the ledger yet, so the game cannot draw from them."
else
  say "3/4  generic fallback bank — skipped (pass --generic to include it)"
fi

# ---- 4. the closing report ----------------------------------------------
# State the end condition instead of implying it. A clean audit here means
# every cast character holds takes at the delivery the repo currently asks for.
say "4/4  closing audit"
npx tsx tools/voice/audit.mts --service "$SERVICE" || true

cat <<'EOF'

RUN COMPLETE.

  Takes      voicework/generated/<actor>/
  Ledger     local only — clips + actor banks are in the dev database
  Refs       dialogue voice refs were written into the authored JSON defs

Next:
  1. git diff packages/content/src/dialogues/defs   # review the voice refs
  2. commit the JSON refs
  3. push clips to production: see DEPLOY.md, "Pushing voice clips to production"
     (push to main FIRST, then import — Forge quick-deploys on every push)
EOF
