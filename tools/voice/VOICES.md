# The Arx voice pool — 26 clone-source voices

Chatterbox generates every line from a ~20s conditioning sample. The pool lives
in `~/code/voicelab/voices/rpg_fantasy/{male,female}/`; full provenance and
license notes are in `voices/rpg_fantasy/SOURCES.md` there. Thirteen samples are
cut from **public-domain LibriVox solo recordings**, eight from **royalty-free
RPG voice-pack demos**, and five are **self-recorded**. Three licences, all
usable — keep the distinction if this ever ships.

## Voice ids are paths now

The TTS service resolves a voice as `voices/<ttsVoice>.wav`. Samples live in
subfolders, so `ttsVoice` must be the **path** under `voices/` without the
extension — `rpg_fantasy/male/veil_ethan`, not `veil_ethan`. A bare id no longer
resolves. `GET /voices` lists the valid ids (it recurses, excluding
`voices/test/`, which holds game SFX rather than conditioning samples).

A voice that cannot be resolved is now a **hard 400**. It used to fall back to
the default voice with only a log line, which meant an entire batch could be
generated in the wrong voice and still look successful.

## Casting

The pool is sorted into `male/` and `female/` on disk and that split is
authoritative — characters are cast on a voice matching their own gender.
(An earlier pass put nearly everyone on a male voice; that was forced by there
being only five female samples, and no longer applies.) `F0` is the median
fundamental frequency of the sample; lower is deeper.

| voice | F0 | sound | cast on |
|---|---:|---|---|
| `rpg_fantasy/male/veil_ethan` | 85 Hz | bass; grave, ominous, authority | Broker, Peld, Grettir, Aeriex |
| `rpg_fantasy/male/frank` | 103 Hz | self-recorded; deepest of the five | Toll_guard, Beck, Skarn |
| `rpg_fantasy/male/ember_tadhg` | 107 Hz | quick ember energy, young | Tam, Koll, Brant |
| `rpg_fantasy/male/jeff` | 107 Hz | self-recorded | Guard, Pike |
| `rpg_fantasy/male/edder` | 109 Hz | self-recorded | Watch, Hale |
| `rpg_fantasy/male/george` | 109 Hz | self-recorded | Haki, Watch |
| `rpg_fantasy/male/larry` | 111 Hz | self-recorded; fastest delivery | Trader, Trader |
| `rpg_fantasy/male/dread_john` | 127 Hz | terse, watchful, soldier-dark | Hask, Bryn, Watch |
| `rpg_fantasy/male/folksy_phil` | 133 Hz | folksy cheer, selling patter | Coff, Coppin, Dray |
| `rpg_fantasy/male/court_phil` | 135 Hz | courtly, measured, flat-precise | Stig, Holt, Hobb, Jorel |
| `rpg_fantasy/male/court_thomas2` | 138 Hz | storyteller / pedant, reverent | Ivo, Ansel, Tilo, Fen, Petch |
| `rpg_fantasy/male/king_bob` | 178 Hz | warm elder, grandfatherly | Rowan, Garton |
| `rpg_fantasy/male/hale_andy` | 201 Hz | wry, bright, money & showmanship | Cormund, Ninebrass, Calder, Monger |
| `rpg_fantasy/male/rune_phineas` | 224 Hz | bright, young | Pip |
| `rpg_fantasy/female/hush_morrow` | 163 Hz | low, conspiratorial narrator | Solvei, Mab, Maren |
| `rpg_fantasy/female/sage_julie` | 165 Hz | warm, homely, unhurried | Signy, Iona, Senna |
| `rpg_fantasy/female/dour_mabel` | 172 Hz | flat, unbothered | Odele, Maida, Edda |
| `rpg_fantasy/female/flint_greta` | 182 Hz | hard-nosed, transactional | Varga, Osa, Kestrel |
| `rpg_fantasy/female/court_joy` | 183 Hz | bright, publican warmth | Dunna, Ragna, Perl |
| `rpg_fantasy/female/trade_nell` | 199 Hz | plain shopkeep | Hetty, Nix, Sella |
| `rpg_fantasy/female/clear_liz` | 214 Hz | precise, calm, cool-headed | Runa, Aldis, Elowen |
| `rpg_fantasy/female/spite_vex` | 219 Hz | gleeful little menace | Wyn, Kayri, Vigdis |
| `rpg_fantasy/female/steel_cori` | 221 Hz | rich, firm, command | Balla, Bretta, Odessa |
| `rpg_fantasy/female/sunny_posy` | 248 Hz | bright, sing-song trader | Merra, Tove, Ottilie |
| `rpg_fantasy/female/spark_wren` | 266 Hz | fast, energetic | Dagny, Tamsin, Petra |
| `rpg_fantasy/female/perky_tilly` | 269 Hz | chirpy, eager | Nib |

## Delivery tuning

Global knobs live in `tools/voice/tuning.json`, per-character `exaggeration` /
`cfgWeight` in `characters.json`. Both feed the stamp signature, so editing
either re-speaks exactly the takes it affects — no `--fresh` needed.

Measured on this pool (3 takes per setting, `king_bob` + `veil_ethan`):

| change | pace | pitch range |
|---|---:|---:|
| exaggeration 0.45 → 0.75 | **+11%** | **+44%** |
| cfg_weight 0.55 → 0.30 | −12% | +8% |
| exaggeration 0.75 → 0.85 | −3% | −32% |

Two things worth knowing, both counter to the usual advice:

**Exaggeration is the pace knob, not just the emotion knob** — it buys speed and
expression together, and peaks around 0.75. Push it to 0.85 and the model
destabilises: slower *and* flatter.

**Lowering `cfg_weight` does not speed delivery on these samples — it slows it.**
The widely-repeated "drop cfg_weight to 0.3 for faster speech" measured 12%
*slower* here and fights the gain exaggeration gives. Keep it mid (0.5–0.62).

The model's own pacing is stochastic — identical settings gave +11% on one voice
and +3% on another — so `tempo` applies a pitch-preserving ffmpeg `atempo` stage
after generation to make the speed-up deterministic. Keep it under ~1.15; past
that it reads clipped rather than brisk. Combined, the current settings measured
**+30% pace and +20% pitch range** against the pre-tuning takes.

## Re-running the wave

```
tools/voice/wave_driver.sh              # the 12 firstWave actors
tools/voice/wave_driver.sh all          # every cast character (74)
tools/voice/wave_driver.sh warden_bryn  # just these
tools/voice/wave_driver.sh --fresh      # ignore stamps, re-speak everything
```

It restarts voicelab between actors so MPS slowdown never compounds.

**It is resumable — just re-run it after a crash.** A full pass is an hour or
more, so it will get interrupted. Two dotfiles per actor track state:

| file | meaning |
|---|---|
| `voicework/generated/<actor>/.voice` | finished, at the signature named inside |
| `voicework/generated/<actor>/.inprogress` | stale takes cleared, generation partial |

The signature is `<voice> ex=<..> cfg=<..> tempo=<..>` — speaker *and*
performance, since retuning the knobs changes the takes as much as recasting
does. Per actor: `.voice` matching → skip; `.inprogress` matching → resume and
speak only the missing clips; neither, or anything in the signature changed →
delete that actor's old takes, mark `.inprogress`, generate.

That last branch is the point. Recasting leaves correct-*looking* files on disk
holding the **wrong voice**, and an unforced run keeps them because they exist —
which is why this used to pass `--force` unconditionally. Deleting them once, up
front, states the same intent without destroying resumption, and the stamp
records which voice the surviving files are actually in.

`.voice` is written only after generate **and** import both succeed, so a crash
mid-actor redoes that actor's remaining clips rather than recording a
half-finished pass as done.

If you ever hand-copy takes in, drop the stamps for those actors so the driver
re-evaluates them.

## The generic fallback bank

Short, character-neutral quips indexed by **voice** rather than by actor, so an
NPC with no authored dialogue can still answer in the voice it was cast in.

```
tools/voice/generic.mts                     all 26 slots
tools/voice/generic.mts female_5 female_6   just these
tools/voice/generic.mts --force             re-speak clips that already exist
```

Output is `voicework/generic/<slot>/<kind>_<n>.ogg` (mono Ogg/Opus 48k, same as
the character lane) plus `voicework/generic/manifest.json`, which carries the
slot → voice map and every transcript.

Slots are `male_1`…`male_14` and `female_1`…`female_12`. The mapping is an
explicit literal in `generic.mts`: **append new slots, never reorder**, or every
already-generated clip silently changes voice.

Each slot also carries a `.voice` stamp. If a slot's declared voice changes (the
pool gets re-sorted, a sample is replaced), the stamp no longer matches and that
slot's clips are cleared and re-spoken — without it the clips would look
complete and the slot would quietly hold the wrong voice.

Eleven clips per slot (286 total): `greet` ×2, `ack` ×2, `yes` ×2, `no` ×2,
`farewell` ×2, `hm` ×1 — one or two words each.

This lane deliberately does **not** ride `buildManifest()`. `quips.json` may
only speak for actors defined in `packages/content/src/actors/defs/`, and those
are full game entities (combat stats, equipment, spawn data) — a voice slot is
not an NPC, so inventing 26 of them would put 21 spawnable strangers in the
world.

## Adding a voice

Drop a clean 10–20s mono WAV under `~/code/voicelab/voices/rpg_fantasy/<male|
female>/<id>.wav` (speech only, no music, level room tone) and cast it by its
path. First generation with a new voice pays a few seconds of conditioning;
it caches after that. Keep SOURCES.md honest: public-domain, royalty-free, or
self-recorded/consented voices only — never rip a commercial performance or
clone a real person without consent.
