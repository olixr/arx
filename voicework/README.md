# voicework — the staging floor for spoken lines

Audio takes stage here on their way into the live voice ledger. Nothing in
this tree ships through git (both lanes are gitignored); the ledger
(`voice_clips` in the db + content-addressed binaries in `data/voice`) is
the system of record once a take is imported.

```
voicework/
  recorded/<actor_id>/<clip_slug>.wav     human takes — ALWAYS win
  generated/<actor_id>/<clip_slug>.ogg    Chatterbox TTS lane
```

## The loop

1. **Read the sheet.** `docs/voice-script.md` lists every character, their
   direction, and every line with its exact clip slug (also the filename).
   Regenerate it after content changes: `npx tsx tools/voice/sheet.mts`.
2. **Record** into `recorded/<actor_id>/<clip_slug>.wav` (mono, 44.1/48 kHz,
   quiet room). Any of wav/ogg/opus/mp3/m4a/webm works.
3. **Or generate.** With the voicelab TTS up (`~/code/voicelab/voicelab.sh
   start`): `npx tsx tools/voice/generate.mts [actor...]`. Casting +
   expression dials live in `tools/voice/characters.json` (`ttsVoice`
   names a sample in `~/code/voicelab/voices/`; characters cast `null`
   are skipped). The generator never overwrites a human take.
4. **Import.** With the game server running: `npx tsx tools/voice/import.mts
   [actor...]`. Uploads clips (deduped, content-addressed), publishes each
   actor's quip bank, and writes `voice` refs into the authored dialogue
   JSON defs — commit those JSON edits afterward.

Re-running any step is safe: generation skips existing files, import
upserts. To re-voice a line, delete its file, re-record or `--force`
regenerate, and import again.

Keep this tree around after import — the import step re-derives dialogue
voice refs from the files present here, so an emptied tree followed by an
import would strip refs for that actor.
