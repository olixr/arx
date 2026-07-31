#!/bin/bash
# First-wave voiceover driver: strictly serial — one TTS request in
# flight ever, one actor at a time, voicelab restarted between actors
# so MPS memory/speed degradation never compounds across the batch.
set -e
cd /Users/aeriek/code/devcraft
VL=/Users/aeriek/code/voicelab

# Auditions for the three new voices first (service is warm now).
audition() {
  local voice="$1"; shift
  local text="$1"; shift
  local out="/Users/aeriek/code/voicelab/arx_auditions/${voice}.wav"
  [ -f "$out" ] && return 0
  curl -sf --max-time 900 -X POST http://localhost:5002/v1/audio/speech \
    -H 'Content-Type: application/json' \
    --data-binary "{\"model\":\"tts-1\",\"input\":\"$text\",\"voice\":\"$voice\",\"exaggeration\":0.5,\"cfg_weight\":0.5,\"temperature\":0.6}" \
    -o "$out"
  echo "audition: $voice done"
}
audition iron_sue "Gates quiet. Speak your business, keep your blade tied, and remember the names on that plaque got there holding this line."
audition market_tricia "Oh, hello dear, come in, come in. The apples came up from Perl's this morning, and you will not believe what Nib told me before breakfast."
audition tavern_sonia "Welcome to the Rest, love. Sit anywhere dry. First pour comes with road news, and you look like you are carrying some."

run_actor() {
  local actor="$1"; shift
  echo "=============== $actor ==============="
  (cd "$VL" && ./voicelab.sh restart)
  npx tsx tools/voice/generate.mts "$actor" "$@"
  npx tsx tools/voice/import.mts "$actor"
}

for a in warden_bryn hearthkeeper_iona tinker_fen smith_bretta captain_aldis \
         innkeep_dunna grocer_merra outfitter_hask banker_cormund; do
  run_actor "$a"
done
# Hobb and Pip carry old placeholder-voice takes: re-speak them.
run_actor farmer_hobb --force
run_actor young_pip --force

echo "WAVE-COMPLETE"
