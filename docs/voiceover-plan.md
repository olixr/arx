# Voiceover — THE WORLD FINDS ITS VOICE

> STATUS: GREEN-LIT 2026-07-30. Phase 1 (The Fifth Bus) SHIPPED 2026-07-30
> (e1ad262) — engine `voice` bus + Voice slider (arx.audio.v1), THE DUCK RAIL
> amendment (gain = BASE × userVol × duck, setDuck the one system multiplier,
> pure busLevel test-pinned), audio/voice.ts VoicePlayer (24 MB LRU buffer
> cache, prefetch warming, supersession-tokened line playback with edge fades
> and LINE_DUCK 0.45/0.45/0.75, capped spatial quips, canPlayType probe,
> SILENCE IS VALID failure edges). Live-verified; 861 tests green. Phase 2
> (The Clip Ledger) SHIPPED 2026-07-30 (da0bd87) — migration v13
> (voice_clips two-hash rows, voice_banks weighted slot shuffles on the open
> owner axis, dialogue_nodes.voice column), content/voice.ts grammar + the
> 'voice' dials doc live at boot, content-addressed data/voice store behind
> the first binary upload door (base64-in-JSON), reference-guarded deletes,
> prod-safe immutable GET /voice/<hash>.<ext>, nginx /voice proxy + deploy
> shared/voice symlink. 871 tests green; upload→serve→guard→revert round
> trip live-verified. Phases 3-6 pending.

The world moves, asks, and remembers. This epic makes it **speak out loud**. Every
throat that earned a voice card in the VOICE epic gets an actual voice: full spoken
lines paced with the written word, and small fallback utterances (a greeting, a
grunt, a yes, a hm) wherever a full line isn't recorded, so that opening a
conversation always *sounds* like meeting a person. The mandate:

> Full spoken dialogues that pace themselves with the displayed message, with
> responses for each. Fallback sound effects played at interaction points when a
> full line isn't voiced: a quick intro, a salute, an acknowledgement, a yes or
> no, a grunt. Pre-warmed and pre-loaded so there are no heavy load times. An
> independent voiceover volume in the sound settings. Content-driven: proper
> database models, relational hierarchies so voice clips can be reused and hooked
> up elsewhere (objects, locations, future boss scenes and cutscenes) without
> code alterations. The dialogue system and the voice system each stand alone but
> live in a marriage.

---

## Ground truth this builds on (code-verified 2026-07-30)

- **The audio engine is bus-shaped and law-governed.** `AudioEngine` (audio/engine.ts)
  owns `sfx / music / tracks / ambience` GainNode buses, each with a reverb send,
  behind one master chain (warm lowpass → glue compressor → master). `BASE` mix
  constants at engine.ts:27; `VolumeKind` at :29 has four kinds; the tracks bus is
  driven by the music slider (:122). **ENGINE USER-VOLUME LAW**: `setUserVolume`
  is the only legal write path to bus gains. There is **no ducking anywhere**.
- **Two playback idioms already exist, and they are exactly the industry split.**
  Short sounds are synthesized per-shot into the `sfx` bus with **THE SPATIAL LAW**
  emitter (`sfx.spatial(at, range, body)`, sfx.ts:76 — cull, rolloff `(1-u)^1.6`,
  StereoPanner ±0.8). Long-form audio streams via `TrackPlayer` (tracks.ts):
  `HTMLAudioElement` + `MediaElementAudioSourceNode` cached one-per-element
  forever, `/music/*.mp3` out of `packages/client/public`, per-file LUFS trims,
  every edge a fade. **There is zero sample loading today** — no `decodeAudioData`
  call exists in the client. The VO system introduces the third idiom: fetched,
  decoded, cached buffers.
- **The dialogue wire is blind and that is a feature.** The client never sees
  `(dialogueId, nodeId)` — `S2CDialogueNode` (messages.ts:834) carries only
  `speaker/text/choices/last/gifts/quest`. Server's `dialogueEnterNode`
  (gameServer.ts:7406) is THE one authoritative "beat entered" point: hooks run,
  choices filter, gifts/quest chips attach, `dlgnode` sends. A voice reference is
  one more server-resolved attachment in that list. Per the protocol law
  (constants.ts:55-65), **an additive optional field on an existing message does
  not bump the version** — the `InvSlot.stolen` precedent.
- **The client has clean beat seams and already paces text.** `DialogueCinema`
  (ui/dialogueCinema.ts): `showNode` :222 is the single entry for every beat,
  `stopReveal` :341 the single teardown, `finishReveal` :348 the landing.
  Typewriter at `CHAR_SEC = 1/52` with punctuation holds; `sfx.dialogueScratch`
  ticks every 3rd glyph; skip = first press completes the line, second advances.
- **Barks and examines are single doors.** Actor bark rotation is one site
  (gameServer.ts:7185-7199, `actorComp.nextLine` cursor → `sys()` chat line).
  `NpcActorDef.lines`/`examine` are authored + stored (npc_actor_lines table) —
  examine has no runtime surface yet.
- **The content plumbing is proven and waiting.** Relational two-hash tables
  (dialogues: db/dialogues.ts) and whole-doc two-hash `content_docs`
  (db/contentDocs.ts) both exist; live swap via the `replaceX`/call-time-read
  idiom; dev routes in mapsApi.ts behind `config.devCommands` + nginx `/dev` 404;
  migrations = append to the `MIGRATIONS` array (current v12). The CMS bench
  registration recipe is 12 known touch points (cms.ts + editors.ts + api.ts);
  Dialogue Studio's `beatCard` (dialogueEditor.ts:1266) has an obvious slot for a
  per-node voice row between the text block and the flow control.
- **Asset serving is the one genuinely new ground.** The node server serves NO
  static files (index.ts:324 — `/healthz`, `/dev/*`, 404). The web root is the
  per-release `/public` built by Vite (`emptyOutDir: true` — wiped every deploy).
  `data/` (`config.dataDir`, DATA_DIR) is the only dir that persists across
  releases AND is already runtime-written (zone/prefab PUTs write JSON there) —
  and it is not web-served. There is no binary upload endpoint; `readBody`
  buffers UTF-8 text, 32 MB cap.

## Industry alignment

The norms (Wwise/FMOD dialogue pipelines, MDN web-game audio guidance) map onto
this stack almost one-to-one:

- **Event-keyed VO, not file-keyed.** AAA dialogue systems address audio by
  *speaker + context* and resolve the actual clip at runtime through fallback
  rules. Ours: the server resolves `(node voice) → (speaker bank slot) → silence`
  at `dialogueEnterNode` and ships only a URL. The client stays dumb; designers
  re-wire everything live.
- **Banks + preload for short, streaming for long.** Short clips are decoded into
  memory ahead of need (decode during "loading screens", never during play —
  our loading screen is the conversation-open beat plus proximity); long-form
  streams. Our split: quips and node lines = decoded `AudioBuffer` cache (a
  480-char line ≈ 30 s speech ≈ ~200 KB Opus — trivially decodable); future
  cutscene reels = the TrackPlayer idiom.
- **Voice codec: Opus.** Transparent for speech at 32-48 kbps, lowest latency of
  the general codecs, universal in 2026 browsers (incl. Safari). Mono, 48 kbps
  Ogg/Opus is the recommended master; the pipeline accepts wav/mp3/m4a/ogg and
  stores what it's given (a Phase-1 decode probe verifies the fleet's reality
  before we pin the recommendation — see Risks).
- **A dedicated VO bus with ducking.** Every shipped RPG ducks music under
  speech. We add the fifth bus + slider, and a duck rail as a lawful amendment
  to the user-volume law (duck composes multiplicatively; it never writes gains
  directly).

## The shape of the system

### 1. The clip — one asset, one row, one immutable URL

A **voice clip** is a slug-addressed content row plus a binary on disk:

- Table `voice_clips` (migration v13): `id` (slug, the designer-facing name, e.g.
  `dunna_greet_2`, `grunt_low_1`), `file_hash` (sha1 of bytes), `ext`, `mime`,
  `dur_ms` (probed at upload), `bytes`, `transcript` (what's spoken — searchable,
  VOICE.md-auditable), `actor` (optional owning slug, '' = shared/generic),
  `tags` (JSON list: `greet`, `grunt`, `female`, ...), `content_hash`,
  `authored_hash`, `updated_at`. Two-hash law like everything else; binaries are
  content, uploaded through the Studio, so most rows will be tool-born
  (`authored_hash NULL`).
- Binary lives at `data/voice/<file_hash>.<ext>` — the deploy-surviving dir.
  Upload dedupes by hash; deleting a clip row only unlinks the file when no other
  row references the hash.
- Served at `GET /voice/<file_hash>.<ext>` by the game server (read-only,
  hash-named ⇒ `Cache-Control: public, max-age=31536000, immutable` — cache
  busting and CDN-friendliness for free). Production nginx gains one location:
  `/voice/` → alias into the shared data dir (fall back to proxying the node
  server if Forge's layout fights the alias). Dev: Vite proxies `/voice` next to
  `/dev`.

### 2. The address — where a clip can be hooked (the relational hierarchy)

Two attachment layers, both pure data:

- **The spoken line** — `dialogue_nodes.voice` (new nullable column, v13):
  a clip id on the node. Threads through `DialogueNode.voice?` (types →
  validator allow-list → insertChildren/loadDialogues → interchange JSON), so
  authored defs, the DB, the CLI export, and Dialogue Studio all carry it.
- **The voice bank** — table `voice_banks` (v13): `owner_kind` ('actor' now;
  'poi', 'item', 'zone', 'cutscene' join later — the same open axis as
  `DialogueBinding.kind`), `owner_id`, `slot`, `idx`, `clip_id`, `weight`,
  PRIMARY KEY (owner_kind, owner_id, slot, idx). A slot is a named moment:

  | slot | fires |
  |---|---|
  | `greet` | conversation opens (`dlgopen`) |
  | `ack` | a choice is picked / node entered with no full line |
  | `yes` / `no` | affirmative / negative beat (designer marks the node) |
  | `farewell` | last node / conversation end |
  | `hm` | mid-conversation filler (thinking grunt) |
  | `bark` | overworld bark line accompaniment |

  One clip can sit in any number of banks and any number of nodes — that's the
  reuse hierarchy. Generic packs (e.g. `grunt_low_*` tagged clips) can be bulk-
  assigned to many actors in the Studio.
- **The fallback chain, resolved server-side at the beat:** node has `voice` →
  play the full line. No full line → the speaker's bank slot for the moment
  (greet on open, ack on advance/choice, farewell on `last`) → weighted pick with
  a per-actor no-repeat cursor (the `nextLine` idiom) and a cooldown so quips
  punctuate rather than chatter. Nothing in the bank → silence, exactly today.

### 3. The wire — server-resolved, additive, quiet

- `S2CDialogueOpen.voice?: VoiceWire` and `S2CDialogueNode.voice?: VoiceWire`
  where `VoiceWire = { url: string; durMs: number; kind: 'line' | 'quip' }`.
  Additive optionals — **no protocol bump** (the stated `InvSlot.stolen` rule).
- `S2CDialogueOpen.prefetch?: string[]` — URLs for every clip reachable from the
  start node (server walks the tree it already owns; capped ~12, quips first).
  The client warms its buffer cache the moment the frame opens; by the time a
  line is on screen its audio has long been decoded. `dlgnode` may carry a
  smaller `prefetch` for newly-reachable beats deeper in big trees.
- Barks: the bark rotation site attaches the `bark`-slot clip as a spatial quip.
  New optional S2C `{ t: 'vq', eid, url, durMs }` (voice quip at an entity) —
  cosmetic, unknown-`t`-tolerant clients drop it silently; rides the next natural
  bump if we decide strictness demands it (judgment call flagged below).

### 4. The player — the client VoicePlayer

New `audio/voice.ts`, the third playback idiom:

- **The voice bus.** `engine.voice` GainNode (BASE ≈ 0.8, reverb send ≈ 0.06 —
  speech stays dry and close), `VolumeKind` gains `'voice'`, `ROWS` in
  audioMenu.ts gains `['voice', 'Voice']`, persisted in `arx.audio.v1`. One new
  slider, same idiom, gamepad nav included.
- **THE DUCK RAIL (user-volume law amendment, written into engine.ts law text):**
  bus gain = `BASE × userVol × duck`, where `duck` defaults 1 and only
  `engine.setDuck(kind, k, tc)` may move it (smoothed `setTargetAtTime`). While a
  `line` clip plays, music/tracks duck to ~0.45 and ambience to ~0.75, releasing
  over ~0.6 s on end. Quips don't duck. `setUserVolume` remains the only legal
  path for *user* gain; duck is the only legal *system* multiplier; nothing else
  ever writes bus gains.
- **Buffer cache.** `fetch` → `decodeAudioData` → `Map<url, AudioBuffer>` with
  LRU cap (~24 MB / ~48 clips); immutable URLs make the HTTP cache the second
  tier. Prefetch lists from the wire warm it; decode failures degrade to silence
  (never block the conversation).
- **Playback.** One `line` at a time: `showNode` starts it, `stopReveal`/`close`
  stop it (80 ms fade — every edge is a fade). Quips overlap-tolerant but capped
  at 2 concurrent. Spatial quips (`vq`, future object/location emitters) reuse
  THE SPATIAL LAW math onto the voice bus.
- **THE PACED WORD (typewriter marriage).** Unvoiced lines: exactly today's
  behavior. Voiced lines: the reveal duration stretches to match the clip
  (`CHAR_SEC` scaled so text lands at ~92% of `durMs`, floor at today's speed —
  audio may outlast text, text never outruns audio by more than a beat), and the
  `dialogueScratch` tick mutes (a voice and a scratching quill fight). Skip
  keeps its two-press contract: first press completes the text AND fades the
  clip, second turns the page. Choices appear at `finishReveal` as today.
- **Warmup & unlock.** All playback sits behind the existing gesture unlock
  (engine.unlock). Proximity pre-warm is server-known, not client-guessed: the
  interact that opens the frame carries the prefetch — in practice the frame's
  340 ms open animation plus the greet quip covers the first line's decode
  window. No boot-time loading walls: total cold-start cost of a fully-voiced
  conversation ≈ one small fetch burst of tagged-Opus files.

### 5. The studio — content team owns everything

- **Voice bench (new CMS section 'voice', the 12-touch-point recipe):**
  - *The library*: clip rows (id, transcript, actor, tags, duration, size,
    edited/authored badge), audition button (plays through the real voice bus),
    upload (file input → `PUT /dev/content/voice/clips/:id` with binary body —
    the first binary dev route; hash + probe duration server-side), replace,
    delete, revert on the two-hash law.
  - *The banks*: per-owner cards — pick an actor, see its slots, drag clips in,
    set weights, audition the whole slot's shuffle.
- **Dialogue Studio**: `beatCard` gains a voice row (between text and flow):
  clip combobox filtered to the bound actor + shared clips, audition, a quiet
  "fallback: greet → dunna_greet_2" pill showing what the resolver would do
  today, and a transcript-mismatch hint when the clip's transcript drifts from
  the node text. Rehearsal plays voice like the live client.
- **Actor bench**: a voice summary strip (slots filled / total, jump to bank).
- **The dials** — content doc kind `'voice'` (`id 'world'`, the frontier/weather
  skeleton: validate + replace + call-time reads + bench section): `quipChance`
  (ack quips per advance, default ~0.45), `quipCooldownMs`, `duckLine`,
  `duckRelease`, `prefetchCap`, `maxClipBytes`, `bankSlots` roster. No code
  changes to tune the feel.

## Proposed standing laws

1. **ONE RESOLVER** — the server resolves what plays (node line → bank slot →
   silence) at the beat door; the client never picks clips, it plays URLs.
2. **THE WIRE STAYS BLIND** — no dialogue/node/clip ids to the client, URLs only;
   additive optionals on existing messages.
3. **THE DUCK RAIL** — `BASE × userVol × duck`; setUserVolume for users,
   setDuck for the system, nothing else touches bus gains.
4. **EVERY EDGE IS A FADE** (inherited) — no clip starts or stops at a cliff.
5. **SILENCE IS VALID** — a missing/failed clip degrades to today's unvoiced
   behavior at every layer; VO can never block or break a conversation.
6. **THE HASH IS THE FILE** — binaries are content-addressed, immutable-cached,
   deploy-surviving (`data/voice`), deduped; rows are the mutable layer.
7. **THE TRANSCRIPT IS PLAYER-FACING TEXT** — VOICE.md governs it (dash ban
   included); the Studio surfaces drift between transcript and node text.

## Phases

1. **THE FIFTH BUS** — engine `voice` bus + slider + persistence; THE DUCK RAIL
   amendment; `audio/voice.ts` VoicePlayer (buffer cache, LRU, fades, spatial
   quip path); decode-format probe. Tests: duck composition, LRU, resolver-free
   playback. *Client-only, invisible until fed.*
2. **THE CLIP LEDGER** — migration v13 (`voice_clips`, `voice_banks`,
   `dialogue_nodes.voice`); `data/voice` store + `/voice/` serving route +
   nginx/vite wiring; upload/list/delete/revert dev routes; `'voice'` dials doc.
   Tests: two-hash lifecycle, dedupe, route caps.
3. **THE SPOKEN LINE** — `DialogueNode.voice` end-to-end (types, validator, db
   pack/unpack, interchange, CLI); resolver v1 (node line only) at
   `dialogueEnterNode`; wire optionals + prefetch; DialogueCinema marriage
   (paced reveal, scratch mute, skip fade). Tests: resolver, pacing math,
   prefetch walk.
4. **THE THROAT CLEARS** — banks + slots + weighted no-repeat cursor + cooldowns;
   greet/ack/farewell moments in the conversation flow; `vq` spatial quips on
   barks. This is the phase where every conversation in the game starts
   *sounding* inhabited off a few dozen generic clips. Tests: fallback chain,
   cooldown, cursor rotation.
5. **THE STUDIO SPEAKS** — Voice bench (library + upload + audition + banks),
   Dialogue Studio voice row + fallback pill + rehearsal audio, actor strip,
   dials bench section. Zero-code content ownership lands here.
6. **THE WORLD SPEAKS** (the longevity phase, scoped when needed) — `poi`/`zone`
   owner kinds (a spirit at a shrine, a voice on the wind at a location),
   examine-line voicing, and the cutscene/boss reel: long-form streamed VO via
   the TrackPlayer idiom against the same clip ledger, for the day a boss opens
   its mouth mid-fight.

## Risks & judgment calls (flagged, not resolved)

- **Safari Ogg/Opus decode.** 2026 sources say universal; Phase 1 ships a
  one-line `decodeAudioData` capability probe and the upload path stores
  originals, so if a real device says no we re-encode server-side or pin AAC —
  policy change, not schema change.
- **The `vq` message.** Strictly a new family old clients would drop (bump per
  the letter of the law) vs. purely-cosmetic additive (no bump per its spirit).
  Phases 1-3 need no new family; decide at Phase 4 with the law in hand.
- **nginx location.** One added block in deploy/nginx-arx.conf + DEPLOY.md; if
  Forge's alias pathing fights it, proxy `/voice/` to node like `/ws` (clips are
  small; node streaming is fine at our scale).
- **Recording pipeline is out of scope.** This epic builds the machine; where
  clips come from (actors, TTS, the user's own throat) is a content decision.
  The transcript column + VOICE.md law keep whatever arrives honest.
