#!/bin/bash
# Voiceover driver: strictly serial — one TTS request in flight ever, one actor
# at a time, voicelab restarted between actors so MPS memory/speed degradation
# never compounds across the batch.
#
#   ./wave_driver.sh                 first-wave actors (default)
#   ./wave_driver.sh all             every cast character in characters.json
#   ./wave_driver.sh warden_bryn ... just these actors
#     --fresh                        ignore stamps, redo everything
#
# RESUMABLE. An hour-long batch will get interrupted, so the driver has to be
# safe to just re-run. Two dotfiles per actor track state:
#
#   voicework/generated/<actor>/.voice        finished, in this voice
#   voicework/generated/<actor>/.inprogress   stale takes cleared, mid-generate
#
# On each actor:
#   .voice matches the cast voice      -> skip entirely
#   .inprogress matches                -> resume; generate.mts skips clips that
#                                         already exist, so only the missing
#                                         ones are spoken
#   neither, or the voice changed      -> delete the actor's old takes, mark
#                                         .inprogress, then generate
#
# That last branch is why this works without --force. The reason --force was
# needed at all is that recasting leaves correct-looking files on disk holding
# the WRONG voice, and an unforced run would happily keep them. Deleting them
# once, up front, states the same intent without defeating resumption — and the
# stamp records which voice the surviving files are actually in.
#
# The .voice stamp is written only after BOTH generate and import succeed, so a
# crash mid-actor always redoes that actor's remaining clips rather than
# recording a half-finished pass as done.
set -e
cd /Users/aeriek/code/devcraft
VL=/Users/aeriek/code/voicelab
GEN=voicework/generated

FRESH=0
ARGS=()
for a in "$@"; do
  if [ "$a" = "--fresh" ]; then FRESH=1; else ARGS+=("$a"); fi
done
set -- "${ARGS[@]}"

actors_where() {          # "first" | "all"
  node -e '
    const c = require("./tools/voice/characters.json");
    const first = process.argv[1] === "first";
    console.log(Object.entries(c)
      .filter(([, v]) => v.ttsVoice && (!first || v.firstWave))
      .map(([k]) => k).join("\n"));
  ' "$1"
}
voice_of() {
  node -e '
    const c = require("./tools/voice/characters.json");
    const v = c[process.argv[1]];
    if (!v || !v.ttsVoice) { console.error("no ttsVoice for " + process.argv[1]); process.exit(1); }
    console.log(v.ttsVoice);
  ' "$1"
}

# macOS ships bash 3.2, which has no `mapfile` — read into the array by hand.
read_actors() {
  ACTORS=()
  while IFS= read -r line; do
    [ -n "$line" ] && ACTORS+=("$line")
  done < <(actors_where "$1")
}

case "${1:-first}" in
  all)   read_actors all ;;
  first) read_actors first ;;
  *)     ACTORS=("$@") ;;
esac

echo "actors to speak (${#ACTORS[@]}): ${ACTORS[*]}"
[ "$FRESH" = "1" ] && echo "--fresh: ignoring stamps, everything will be re-spoken"

run_actor() {
  local actor="$1"
  local dir="$GEN/$actor"
  local want; want="$(voice_of "$actor")"

  if [ "$FRESH" = "0" ] && [ -f "$dir/.voice" ] && [ "$(cat "$dir/.voice")" = "$want" ]; then
    echo "=== $actor — already done in $want, skipping ==="
    return 0
  fi

  echo "=============== $actor  ($want) ==============="
  mkdir -p "$dir"

  # Clear stale takes unless we are resuming a run already committed to this
  # voice. Without this, leftover files from the previous casting would be
  # silently kept: they exist, so an unforced generate skips them.
  if [ "$FRESH" = "1" ] || [ ! -f "$dir/.inprogress" ] || [ "$(cat "$dir/.inprogress")" != "$want" ]; then
    local had; had=$(find "$dir" -name '*.ogg' | wc -l | tr -d ' ')
    [ "$had" != "0" ] && echo "  clearing $had stale take(s) from a previous voice"
    find "$dir" -name '*.ogg' -delete
    rm -f "$dir/.voice"
    echo "$want" > "$dir/.inprogress"
  else
    local have; have=$(find "$dir" -name '*.ogg' | wc -l | tr -d ' ')
    echo "  resuming — $have clip(s) already spoken in $want"
  fi

  (cd "$VL" && ./voicelab.sh restart)
  npx tsx tools/voice/generate.mts "$actor"
  npx tsx tools/voice/import.mts "$actor"

  mv "$dir/.inprogress" "$dir/.voice"
  echo "  ✔ $actor complete"
}

for a in "${ACTORS[@]}"; do
  run_actor "$a"
done

echo "WAVE-COMPLETE"
