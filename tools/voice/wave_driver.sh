#!/bin/bash
# Voiceover driver: strictly serial — one TTS request in flight ever, one actor
# at a time, against a single long-lived voicelab process that is started once
# and then left warm for the whole batch.
#
#   ./wave_driver.sh                 first-wave actors (default)
#   ./wave_driver.sh all             every cast character in characters.json
#   ./wave_driver.sh warden_bryn ... just these actors
#     --fresh                        ignore stamps, redo everything
#
# RESUMABLE. An hour-long batch will get interrupted, so the driver has to be
# safe to just re-run. Two dotfiles per actor track state:
#
#   voicework/generated/<actor>/.voice        finished, at this signature
#   voicework/generated/<actor>/.inprogress   stale takes cleared, mid-generate
#
# The signature is "<voice> ex=<..> cfg=<..> tempo=<..>" — the speaker AND the
# performance, because retuning the knobs changes the takes just as much as
# recasting does. Per-character values come from characters.json, global ones
# from tuning.json.
#
# On each actor:
#   .voice matches the signature       -> skip entirely
#   .inprogress matches                -> resume; generate.mts skips clips that
#                                         already exist, so only the missing
#                                         ones are spoken
#   neither, or the signature changed  -> delete the actor's old takes, mark
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
# The stamp is a SIGNATURE, not just the voice. Retuning exaggeration/cfgWeight
# changes the performance as surely as recasting changes the speaker, and a
# voice-only stamp would mark every already-generated actor as done and silently
# keep takes in the old delivery. Including the knobs makes a retune invalidate
# exactly the actors it affects, with no --fresh sledgehammer.
voice_of() {
  node -e '
    const c = require("./tools/voice/characters.json");
    const t = require("./tools/voice/tuning.json");
    const v = c[process.argv[1]];
    if (!v || !v.ttsVoice) { console.error("no ttsVoice for " + process.argv[1]); process.exit(1); }
    console.log([
      v.ttsVoice,
      "ex=" + (v.exaggeration ?? t.defaultExaggeration),
      "cfg=" + (v.cfgWeight ?? t.defaultCfgWeight),
      "tempo=" + t.tempo,
      "temp=" + t.temperature,
    ].join(" "));
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

  # Ensure the service is up; do NOT restart it. `start` is idempotent.
  #
  # This used to restart voicelab before every actor "so MPS slowdown never
  # compounds". Measured, that slowdown does not exist: across 68 consecutive
  # clips on one process, generation held flat at ~5.5s/clip with no upward
  # trend, and RSS plateaued near 8 GB on a 128 GB machine. The restart cost
  # 18.4s each time — ~23 minutes of dead time over a 74-actor pass, about 20%
  # of the total — and it also dumped the voice conditionals cache, making the
  # first clip of every actor pay ~2s of re-preparation it had already done.
  (cd "$VL" && ./voicelab.sh start >/dev/null)
  npx tsx tools/voice/generate.mts "$actor"
  npx tsx tools/voice/import.mts "$actor"

  mv "$dir/.inprogress" "$dir/.voice"
  echo "  ✔ $actor complete"
}

for a in "${ACTORS[@]}"; do
  run_actor "$a"
done

echo "WAVE-COMPLETE"
