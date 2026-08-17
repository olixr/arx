# The Arx voice pool — 59 samples, 45 cast on

Chatterbox generates every line from a conditioning sample. The pool lives in
`~/code/voicelab/voices/`, split across four shelves: `rpg_fantasy/{male,female}`
(46), `narrator/` (7) and `news/` (6). Provenance and licence notes live in
`voices/rpg_fantasy/SOURCES.md` there.

**SOURCES.md is stale.** It still describes the original 26 and has no rows for
the 28 samples added since, nor for the narrator and news shelves. Those were
confirmed cleared for use by the project owner on 2026-08-11, but the record of
*where they came from* has not been written down. Write it before this ships:
public-domain, royalty-free, or self-recorded/consented only, never a ripped
commercial performance and never a real person without consent.

## Voice ids are paths

The TTS service resolves a voice as `voices/<ttsVoice>.wav`, so `ttsVoice` is the
**path** under `voices/` without the extension — `rpg_fantasy/male/veil_ethan`,
not `veil_ethan`. `GET /voices` lists the valid ids, recursing and excluding
`voices/test/`, which holds game SFX rather than conditioning samples.

An unresolvable voice is a **hard 400**, and `generate.mts` turns that into
`exit 1` — a wave pass dies at the first character cast on a missing sample
rather than quietly substituting a default. That is the desired behaviour, and
it is why the pool and the casting have to be checked together:

```
npx tsx tools/voice/audit.mts        # exits non-zero if any cast voice is gone
```

**Samples do go missing.** Eight cast voices (`court_thomas2`, `hale_andy`,
`dread_john`, `sage_julie`, `court_joy`, `clear_liz`, `steel_cori`,
`folksy_phil`) were culled from the pool and stranded 27 shipped characters
until the 2026-08-11 pass recast them. Run the audit after any pool change.

## The three tuning layers

Two knobs, both 0..1, resolved most-specific-first through `resolveDelivery` in
`lib.mts`. Every lane goes through that one door, and the resumption stamps are
built from the **resolved** values, so a change at any layer re-speaks exactly
the takes it affects.

| layer | file | means |
|---|---|---|
| character | `characters.json` | a performance *this character* wants |
| voice | `voices.json` | how *this sample* reads by default |
| global | `tuning.json` | the pool-wide fallback |

`exaggeration` is the pace AND expression knob: 0.45 -> 0.75 measured +11%
words per second and +44% pitch range. It peaks near 0.75; past ~0.8 the model
destabilises and reads slower and flatter. `cfgWeight` is **not** a speed
control despite the folk wisdom — dropping it 0.55 -> 0.30 measured 12%
*slower*. Keep it 0.50 to 0.62.

Pace varies by sample: the same setting gave +11% on one voice and +3% on
another. That is what `voices.json` is for. Find a number by ear first:

```
npx tsx tools/voice/audition.mts guldan_m --tune 0.78,0.55
```

The 74 characters cast before 2026-08-11 pin both knobs on their own cards, so
voice tuning does not reach them; the audit names that shadowing. Cards written
since omit the knobs and inherit the voice.

## Auditioning before a pass

`audition.mts` speaks ONE line per voice — the whole pool in about seven
minutes — and writes a playable contact sheet at
`voicework/audition/index.html`, sorted by measured F0, filterable, with the
characters cast on each voice on its card.

```
npx tsx tools/voice/audition.mts                 the whole pool
npx tsx tools/voice/audition.mts female/ king_bob  substring match
npx tsx tools/voice/audition.mts --as reeve_halla  her tuning, her longest line
```

It reads the roster **live** from `GET /voices`, so a sample dropped into
voicelab appears with no edit here. Every other lane carries a hardcoded list,
which is how the eight culled voices went unnoticed.

`F0` below is the measured median fundamental frequency, computed by
autocorrelation over the conditioning sample and cached in
`voicework/audition/.f0.json`. It lands within ~5% of the hand-recorded values
it replaced. It is a sort key, not a measurement.

## Casting

**The runtime truth is `tools/voice/characters.json`** — the tables
below are a point-in-time reference and predate the 2026-08-16 great
recast; trust the JSON when they disagree.

**PINEWATCH REMADE wave (2026-08-16, +11 throats, all cast in the
JSON):** Stellan `draven_m` (the Crown-garrison weight, Ottar's
register two forts over), Berget `nightborne_f` (the keeper's cool
formality at the requisition window), Ove `ilidan_m` (watch-bark),
Ranka `witherbard_f` (weathered and terse), Espen `belf_m` (the
gardener's gentleness, for a man who talks to trees), Kolbrun
`hush_morrow` (low field-report calm), Maren `faerin_f` (the sage
register), Torger `ember_tadhg` (the smeltmaster precedent), Sylvi
`sunny_posy` (road-warm chatter), northguard pool `solder_m` (the
standing soldier-pool voice), hunter pool `arathi_m` (outdoor clip).
Sex-checked against the defs; no voice repeats within Pinewatch's 29
entries.

**THE FALLS VALE wave (2026-08-16, +23 throats, all cast in the JSON, new
sheet region `vale` after `lowhall`; `kingsdelf` and `evenfall` also joined
REGION_ORDER):** every Vale voice was chosen against the Silverfall high-city
cast so the two halves of the capital do not echo each other, and by type:
Pip (twelve years old) takes `perky_tilly`, the lightest kid-register sample
in the pool and the same throat as Tansy the twin; Aldous the gravekeeper
the deepest (`guldan_m`); Soren the guildmaster the gruff weight of
`garrosh_m` (Grettir keeps `draven_m` — foreman and guildmaster must not
share a throat); Holm the reed-fisher `ember_tadhg` gravel; Ulf the door-
built taverner `dwarf_g_m`; Cato the ringmaster `flynn_m` (hall voice);
Serle `ilidan_m` (bark); Varn the young sergeant `bran_m`; Wick the chandler
`murozond_m` bright; Finn `edder` quiet; Torvald `jeff`; Brant `king_bob`
plain; Lucan `lorewake_m` professorial; Hedda `sunny_posy` warm run-on;
Una `xalath_f` command-with-a-laugh; Brigga `witherbard_f` weathered; Maeve
`elf_sentinel_f` cool hostel law; Ronnaug `flint_greta` brisk; Petya
`trade_nell` market-loud; Signe `garrif_f` warm; the three pools vale_watch
`george` (NOT `solder_m` — the Silver Gate watch is the rival), vale_pilgrim
`belf_m`, vale_carter `larry`. Sex-checked against the defs.

`rpg_fantasy/` is split male/female on disk and that split drives casting.
Check it by ear when a sample is added: `garrosh_f` sat in `female/` at 119 Hz
until 2026-08-11 and is now `male/garrosh_m`. `highmountain_f` (118 Hz) is
genuinely deep, and `klaaxxi_m`/`grif_m`/`volf_m` (242-250 Hz) genuinely high;
those are creature voices, not shelving errors.

### rpg_fantasy/male

| voice | F0 | cast on |
|---|---:|---|
| `draven_m` | 82 | serjeant_ottar, smokemaster_geir |
| `guldan_m` | 83 | tithekeeper_orvar |
| `veil_ethan` | 89 | company_broker, ferryman_peld, foreman_grettir, king_aeriex |
| `narrator_m` | 98 | angler_voss, sparmaster_yannick |
| `solder_m` | 108 | company_blade, saltmere_watch, wayward_watch |
| `arathi_m` | 109 | hartfell_herder, outfitter_hask, reeve_coppin |
| `frank` | 109 | company_toll_guard, crofter_beck, pinewatch_sawyer, veteran_skarn |
| `ember_tadhg` | 110 | crofter_tam, smeltmaster_koll, waykeeper_brant |
| `larry` | 113 | galleria_trader, hartfell_watch, round_trader, saltmere_fisher |
| `lorewake_m` | 113 | keeper_ansel, tinker_fen |
| `grand_mag_m` | 114 | buyer_ospren, master_tilo, steward_ansgar |
| `hald_m` | 117 | herdmaster_swein, wayfarer_petch |
| `belf_m` | 118 | gardener_ivo |
| `edder` | 118 | amberford_watch, boatwright_seff, tallyman_bram, waykeeper_hale |
| `garrosh_m` | 119 | portreeve_brack |
| `george` | 119 | dawnmead_ward, fletcher_haki, silverfall_watch, storekeep_nial |
| `jeff` | 119 | castle_guard, lookout_pike, smith_eirik |
| `ilidan_m` | 129 | hoargate_watch, huntmaster_kolgrim, warden_bryn |
| `court_phil` | 134 | buyer_hallward, carpenter_stig, crofter_holt, farmer_hobb, farmer_jorel |
| `dwarf_g_m` | 134 | outrider_joss, peddler_coff, pitchmaster_rullo |
| `king_bob` | 170 | elder_rowan, miller_garton, nurseryman_odd, pilot_fane |
| `murozond_m` | 176 | herald_ossian, tallyman_brusk |
| `flynn_m` | 180 | gate_monger, innkeep_brandulf |
| `gazlow_m` | 190 | fence_calder, pedlar_grimm |
| `telemancer_m` | 203 | banker_cormund, chandler_swale |
| `bran_m` | 222 | bonecarver_tuli, wayfarer_dray |
| `rune_phineas` | 222 | boomsman_kettil, company_runner, young_pip |
| `klaaxxi_m` | 242 | *unused* |
| `grif_m` | 246 | curio_ninebrass |
| `volf_m` | 250 | *unused* |

### rpg_fantasy/female

| voice | F0 | cast on |
|---|---:|---|
| `highmountain_f` | 118 | drillmaster_jorunn, drover_maren, smith_bretta, smith_vigga |
| `xalath_f` | 152 | assayer_runa, captain_ravna, smokemistress_alba, speaker_ashild |
| `hush_morrow` | 162 | enchantress_solvei, fisher_ylva, innkeep_ragna, magpie_mab, netkeeper_eyvor, warden_maren |
| `dour_mabel` | 170 | bursar_odele, crofter_maida, factor_ebba, factor_neave, lampkeeper_edda, tallywife_inga |
| `orc_f` | 176 | forgemistress_balla, reeve_halla, waykeeper_odessa |
| `flint_greta` | 178 | broker_varga, furrier_ranna, hostler_osa, marshal_kestrel, salter_ondra, warden_sigrun |
| `elf_sentinel_f` | 182 | captain_aldis, lightkeeper_lund, outrider_haldis |
| `witherbard_f` | 193 | elder_gunvor, old_torvi, orchardist_perl, wayfarer_senna |
| `trade_nell` | 200 | peddler_hetty, peddler_nix, pinewatch_watch, shrinekeeper_sella, waykeeper_signe |
| `spite_vex` | 219 | herbalist_wyn, queen_kayri, silversmith_vigdis |
| `garrif_f` | 225 | cook_signy, hearthkeeper_iona, innkeep_dunna, quartermaster_yeva, sawmistress_groa |
| `sunny_posy` | 242 | chandler_ulfa, grocer_merra, innkeep_dorrit, scrivener_tove, weaver_ottilie |
| `spark_wren` | 254 | cooper_dagny, farmer_tamsin, guide_sunn, mason_petra, roper_jessa |
| `perky_tilly` | 258 | castle_servant, courier_nib, innkeep_sunniva |
| `faerin_f` | 262 | sage_elowen |
| `nightborne_f` | 281 | springkeeper_maeva |

### narrator and news — NOT CAST ON

Thirteen further samples sit under `narrator/` (7) and `news/` (6). They are
deliberately **not cast on**. Casting stays inside `rpg_fantasy/`, for three
reasons: SOURCES.md documents provenance only for that shelf; `rpg_fantasy/` is
the only shelf split `male/`/`female/` on disk, and that split is what casting
follows; and the other two read as broadcast and reading-room voices, a
different texture from the RPG pack.

They still appear in `voices.json` and in the audition sheet, so they can be
heard and reconsidered. Casting on them is a deliberate decision, not a default.

| voice | F0 | shelf |
|---|---:|---|
| `wry_peter` | 83 | narrator |
| `slow_john` | 93 | news |
| `stanley` | 102 | narrator |
| `sly_adrian` | 103 | news |
| `dread_ben` | 115 | narrator |
| `dread_mark` | 123 | narrator |
| `crypt_kirksvoice` | 134 | narrator |
| `plain_mark` | 143 | news |
| `veil_anne` | 160 | narrator |
| `stage_mil` | 160 | news |
| `matron_michele` | 163 | news |
| `david` | 174 | narrator |
| `iron_sue` | 178 | news |

## Running a pass

```
tools/voice/run_all.sh --dry      preflight only, speaks nothing
tools/voice/run_all.sh            the whole cast, resumable
tools/voice/run_all.sh --generic  also the per-voice fallback bank
tools/voice/run_all.sh --fresh    ignore stamps, re-speak everything
```

`run_all.sh` gates on the audit, restarts voicelab once, checks the game
server's dev API *before* speaking anything, regenerates the sheet, runs the
character lane, and audits again at the end.

It restarts voicelab up front because a long-resident service has been observed
to **wedge**: zero CPU, no answer, every request hanging until the curl ceiling.
It deliberately does not restart between actors — measured across 68 consecutive
clips, generation held flat at ~5.5s with no drift, and a restart costs 18s and
dumps the voice conditioning cache.

### Resumption

A full pass is hours and will be interrupted; just re-run it. Two dotfiles per
actor track state:

| file | meaning |
|---|---|
| `voicework/generated/<actor>/.voice` | finished, at the signature named inside |
| `voicework/generated/<actor>/.inprogress` | stale takes cleared, generation partial |

The signature is `<voice> ex=<..> cfg=<..> tempo=<..> temp=<..>` — speaker *and*
performance, because retuning changes the takes as much as recasting does.
Matching `.voice` skips; matching `.inprogress` resumes; anything else clears
that actor's takes and starts over. Recasting leaves correct-*looking* files on
disk holding the **wrong voice**, and clearing them once up front is what makes
an unforced re-run safe.

`.voice` is written only after generate **and** import both succeed. If you
hand-copy takes in, drop the stamps for those actors.

## Why the HTTP service, not the CLI

| path | per clip |
|---|---:|
| `tts_cli.py` (cold each call) | **18.75s** |
| warm service over HTTP | **~5.5s** |

**3.1x faster.** The CLI reloads the model (7.0s) and pays Python/Torch import
(~3.5s) on *every* invocation; the service pays both once and keeps the model
resident and the voice conditionals cached.

## The generic fallback bank

Short character-neutral quips indexed by **voice** rather than by actor, so an
NPC with no authored dialogue can answer in the voice it was cast in. 44 slots
x 11 clips = 484.

```
npx tsx tools/voice/generic.mts             all slots
npx tsx tools/voice/generic.mts male_1 ...  just these
```

**Nothing imports it.** `generic.mts` writes to `voicework/generic/` and no
importer in the repo pushes those clips to the ledger — `voice_banks` are keyed
by (owner_kind, owner_id) where owner is an actor, poi or zone, and a voice slot
is none of those. The bank is real audio that currently reaches nothing in the
game, which is why `run_all.sh` skips it unless asked. It also matters less than
it did: all 139 speaking characters are now cast and generate real lines.

The slot map is an explicit literal in `generic.mts`: **append new slots, never
reorder**, or every already-generated clip silently changes voice. Each slot
carries a `.voice` stamp so a repointed slot clears and re-speaks.

This lane deliberately does not ride `buildManifest()`: `quips.json` may only
speak for actors defined in `packages/content/src/actors/defs/`, and those are
full game entities. A voice slot is not an NPC.

## Adding a voice

Drop a clean 10-20s mono WAV under
`~/code/voicelab/voices/rpg_fantasy/<male|female>/<id>.wav` (speech only, no
music, level room tone) and cast it by its path. First generation pays a few
seconds of conditioning, then caches. Then:

```
npx tsx tools/voice/audition.mts <id>   hear it, and add it to the sheet
npx tsx tools/voice/audit.mts           confirm nothing else broke
```

Keep SOURCES.md honest. The 28 samples added in 2026-08 average ~8.5s against
the pool standard of ~20s; short sources condition a thinner voice, so prefer
20s when you can get it.
