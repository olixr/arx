# THE WORN BOOK — the armor answers the book

*2026-08-17. The equipment lanes' authored wave — the recorded follow-on of THE BOOK OF
STATES — joined with the loot-route and material-sink passes the audits have owed. Built
from a five-lane audit (gear census, status-knob census, route census, material census,
industry survey); every claim below is cited in the audit reports (session scratchpad
`audit_*.md`) and was re-verified against live source on 2026-08-17.*

## Part 0 — The laws this wave lives under (none move)

- **TWO BUCKETS AND NO MORE**; **THE SET IS WORTH ONE EXTRA ITEM** (2pc 2-3%, 4pc 5-7%,
  full-set ≤12% — deliberately under the industry's observed ~15% compulsion threshold);
  **BEHAVIOR OVER NUMBERS**; **AFFIX INDEX UNTOUCHABLE** (words and tempers are their own
  channels; rolled-affix pools are never touched).
- **CRAFT-LANE SYMMETRY IS DESIGN** — craft-only families gain material theming, never
  drop routes. **Flood-law ceilings** — every new table entry passes `expectedYield`;
  sealed tables (skeleton line, troll, brigands, wolf) receive nothing.
- **THE REGISTER IS REWRITTEN CONSCIOUSLY** — every new wave-one applier or reader is
  named in `statusWave.test.ts` LICENSED/quiet-lanes in the same commit that authors it.
  Ledger pins (MEND BOUND, COAT BOUND, CONSUME CEILING, SWING ASSEMBLY) are re-priced,
  never dodged.
- Content boundary: no witch/hex/demon/devil/infernal/occult/coven/warlock vocabulary.
- Word budget pins hold: 2pc flat score ≤18, 4pc flat rider ≤25; strike triggers and
  lifesteal/backstab stay forbidden on worn sets.

## Part 1 — THE SIX NEW HOUSES (the armor itself; the wave's heart)

Six new 5-piece families, each opening a lane the census proved empty. Three are
**resurgences** — a beloved early silhouette recut at a higher band (the MH G-rank law:
renewal means the *fight* and the *words* change, not just numbers). All six follow the
`namedChaseDefs` / themed-family authoring pattern exactly (palette-driven visuals, house
naming voice, icons derive). Final names may be polished by the implementer within the
house voice; ids below are binding.

| id | class | band | acquisition | lane opened | resurgence of |
|---|---|---|---|---|---|
| `adderking` | leather (sneak) | 43-48 | drop | endgame venom | adderfang (10-13) |
| `stormtalon` | leather (archery) | 49-52 | drop | leather capstone + count-model chase + swing debut | skytalon (12-15) |
| `warvaliant` | plate | 31-35 | drop | melee-identity 2pc + stateApplied 4pc | valiant (8-12, hobgoblin legion recut) |
| `packlord` | leather (beastcraft) | 27-32 | drop | pet/companion gear (first ever) | — (named for the beast, MH law) |
| `weirkeeper` | leather | 22-26 | **craft-only** (leatherworking) | fishing words (first ever) | kingfisher's grown sibling |
| `wrightcloth` | cloth | 30-34 | **craft-only** (tailoring) | crafting words (first ever) | — |

The words (each exactly one 2pc flat + one 4pc behavioral, per the shipped grammar):

- **adderking** — 2pc `{speed 2%}`; 4pc `{vsState venom 30%}`. Venom's only armor payoff
  past 29 today is nothing; this is the lane's endgame home. Frozen-six state — no
  license needed.
- **stormtalon** — 2pc `{styleDmg archery 3%}` (archery's second identity word ever);
  4pc **THE COUNT CHASE**: `{on:'stacks', per:'hit', count:5} → {do:'boon', status:'quicken',
  power:1, ticks:100}`, icd 300. The recorded count-model 4pc chase set and the gear
  lane's first licensed boon in one word. Quicken's page (1.04 swing/stack, count max 5)
  and the band clamp price it; SWING ASSEMBLY pin is widened FIRST (Part 4).
- **warvaliant** — 2pc `{styleDmg onehand 3%}` (melee's first styleDmg word anywhere);
  4pc `{on:'stateApplied', status:'sunder'} → {do:'surge', stat:'damage', pct:10, ticks:80}`,
  icd 300 — the stateApplied trigger's armor debut, sunder-synergy for the shield-and-sword
  line. Frozen-six reader — no license needed.
- **packlord** — 2pc `{skill beastcraft +2}`; 4pc `{on:'stacks', per:'hit', count:6} →
  {do:'boon', status:'quicken', power:1, ticks:100, target:'pet'}`, icd 300 — **the pet
  lane opens**: the pack's rhythm quickens the companion (pets already fold
  statusSwingFactor since Ph5; the one new door is boon-to-pet, Part 4). Register-licensed.
- **weirkeeper** — 2pc `{skill fishing +2}`; 4pc `{on:'stacks', per:'gather', count:8} →
  {do:'yield', extra:1}`, icd 40 — the warden mold spoken in the fisher's voice (OSRS law:
  small % + a real capability). Materials are the aquatic economy (Part 3).
- **wrightcloth** — 2pc `{skill smithing +1}` + `{skill tailoring +1}`; 4pc
  `{on:'stacks', per:'craft', count:8} → {do:'yield', extra:1}` — **every eighth working
  yields twice.** Needs the `'craft'` StackSource door (Part 4). The first crafting word
  in the game.

Coverage math after the wave: 52 worded families; leather fields worded sets at
22-26 / 27-32 / 43-48 / 49-52 (its 25-32 archery hole and its missing ceiling both close);
the tier-6 capstone becomes plate/plate/cloth/leather. Remaining seams recorded as
follow-ups, not built: plate 46-48, cloth 16-17, native leather drop 35-39.

Plus one arena weapon: **`laurelbrand`** (one-hand sword, t5, drop-flagged,
arena-exclusive) with temper `{on:'cadence', every:8} → {do:'surge', stat:'swing', pct:8,
ticks:60}`, icd 240 — the surge-`'swing'` debut, the crowd's rhythm in the blade. Register
amendment + SWING ASSEMBLY coverage apply.

## Part 2 — THE ROUTES (loot tables; semantic, flood-gated)

Every entry lands only in verified headroom; the loot lane re-runs `expectedYield` and
`loot.test.ts` after each table touch. New negative pins accompany every exclusive.

1. **New-family routes**: adderking → fen_basilisk + elder_basilisk (0%/gear-open) +
   gilded chests; stormtalon → skral_tidelord/deepmaw, goblin_flame_tyrant,
   gnoll_matriarch (19-24% of boss ceiling) + chest_boss; warvaliant → hobgoblin line +
   hobgoblin_champion (48% gear at 58% stacks — swap-conscious) + the legion chest lot;
   packlord → the wolfkin/packlord bodies that grow packlord_mane, named rates.
2. **THE SAND PAYS** (arena identity): new `pit_arms` rack (existing low-band weapons)
   replaces crypt_arms in arena_purse_t1/t2 — grave-goods leave the sand; `laurelbrand`
   enters arena_purse_t3 (0.008) / t4 (0.012) beside sand_laurel as the sport's second
   exclusive.
3. **THE DROWNED WARDROBE**: skral + skral_harpooner pay the darkwater tidecaller lot at
   wild rates (~0.004/piece) — the fisher-people finally wear their own drowned cloth
   (100% headroom verified).
4. **duskwarden thickened**: wolf_oldfang (34% of boss gear ceiling) pays duskwarden at
   boss rates — the 45-48 cloth chaser gets a destination; the worg 0.002 long-hunt stays.
5. **Non-crypt plate at 24-30**: ogre_champion (55%) carries the oathgold lot — breaks
   the crypt monoculture without touching sealed skeleton tables.
6. **THE CAMPS BARE THEIR HOARDS** (chestLoot override, shipped but used once): a
   brigand-camp `pit_takings` lot (NOT redhand — reaver-exclusivity is pinned), a
   hobgoblin `legion_issue` lot (warvaliant + issue kit), an ogre `toll_hoard` lot
   (ogre_arms + trophy stacks) — three war-camp POIs get signature chests.

## Part 3 — THE HUNT FEEDS THE FORGE (materials; the sink pass)

The recorded open design is taken up: monster parts enter the craft lanes as INPUTS
(the wayfarer/cindersworn pattern — never drop routes for craft gear). MH ratio law:
mostly gathered filler, one or two hunted parts, no rare-gate despair.

- **Kingfisher re-themed aquatic**: skral_frill (the brine-folk's color-fast crest fin)
  joins every piece; fen_basilisk_hide enters one colorway — the riverking's fisher is
  tanned from river things.
- **Drakescale gets its scales**: basilisk_scale ×1-2 per piece (value-matched swap
  against iron_bar).
- **Luxury thread-ins** (one input line each, unlock bands unchanged): kingsward +
  packlord_mane; everwood_crest + elder_plume ×2; forgewrath + molten_slag ×2; coldsnap +
  everfrost_shard; boar_spear + razorback_tusk; yew bow line + owl_plume; sunforged
  pieces + ogre_tooth ×2 and the aegis + warlord_crest; vale_reliquary + hillstone_heart;
  aldarens_gate + golem_core.
- **New-family recipes as sinks**: weirkeeper consumes raw fish + skral_frill +
  crab_carapace; wrightcloth consumes forgeplate_scrap + linen chain.
- **The tanning rack learns the pelts**: gnoll_hide / lynx_pelt / fox_pelt /
  fen_basilisk_hide → leather intake recipes (craft_leather_scraps mold).
- Scoreboard: ≥14 of the 27 dead trophies gain a sink this wave. The six premium furs
  (feywolf/duskruff/smokebrush/direwolf pelts…) stay banked for the furrier arc
  (ladder-past-50 follow-up, recorded).

## Part 4 — THE ENGINE'S THREE SMALL DOORS (first, serial, test-pinned)

1. **Widen the SWING ASSEMBLY pin** (`statusLedger.test.ts`) to scan gear `swingSpeed`
   kinds and surge-`'swing'` across ENCHANT_DEFS / SET_WORDS / TEMPERS — closed BEFORE
   the first gear author ships.
2. **`'craft'` StackSource** + proc offer at the craft-completion door; `do:'yield'`
   at that door = one bonus output of the crafted recipe.
3. **`target:'pet'` on the boon action** — routes the page through the pet's existing
   NPC apply door (quicken already TRUE for pets); refused when no pet stands.
4. **Register rewrite** (same commits): LICENSED gains word_stormtalon, word_packlord,
   temper_laurelbrand + the two boon enchants; quiet-lanes pin consciously amended.
5. New enchant wave (drop-unlock scrolls, epic-scorer priced, affix pools untouched):
   two `swingSpeed` enchants (t4 +4% / t5 +6%), one cadence→surge-swing, one
   stateApplied echo, one stride→reveal-chest (the explorer's charm), one hurt→boon mend
   ("of quiet mending", MEND BOUND priced), one block→boon stonehide.
6. Stale comment defs.ts "Six chase sets" corrected while in the file.

## Part 5 — Recorded follow-ups (not built; the evergreen ledger)

Pity/melding valve for rare parts (MH Elder Melder + escalating-guarantee norm);
same-slot catalyst conversion (WoW); relic-style bonus decoupling (GW2/D4); rotating
entry-set gift (D3 Haedrig); leather/tailoring/woodworking ladders past 50 (the furrier
arc consuming the premium pelts); plate 46-48 + cloth 16-17 seam sets; thresholds on
quicken/stonehide (named tiers, ceremonies already engine-paid); first atMax:'consume'
detonate page; NPC ward carrier elite; dead StatMods channels (regenPer4s/cooldownMult/
damageDealtPct/statPerStack) wired or deleted before any page authors against them.

## AS-BUILT (2026-08-18) — three commits, all gates green

**Ph1 THE THREE DOORS — 2a54977f.** Engine grammar, content-free (the reserved-grammar
precedent). SWING ASSEMBLY widened FIRST, before any author, to scan gear swingSpeed
statics (additive per the roll fold) and surge-`'swing'` procs (multiplicative per
buffForge) across ENCHANT_DEFS / SET_WORDS / TEMPERS. `StackSource` gained `'craft'`;
`tickCraft` offers the moment at the completion door **inside the honest branch — a burnt
pan mints nothing**. `boon` gained `target:'pet'`, routed through the companion's own NPC
apply door, refused silently at both doors with no charge banked when no pet stands.
Register rewritten consciously; TEMPERS stay wholly quiet (a surge carries no page for
`leaks()` to see, so laurelbrand's licence lives in the assembly pin instead).

**Ph2 THE SIX HOUSES — c0889397.** All six families, their twelve words, laurelbrand, the
routes and the material sinks. Built as specified with these DELIBERATE DIVERGENCES:

- **laurelbrand's temper shipped at `pct: 3`, not the `pct: 8` Part 1 asks for.** At 8 the
  worst wardrobe leaned on the band and the clamp would have eaten the difference
  silently — an invisible number is a lie to the player. The number yielded to the pin,
  which is the law. **The pin passes at 1.4628 / 1.5 — margin 0.0372, and it is now nearly
  spent; assemble before authoring any future swing number.**
- **Tanning intakes are 1 pelt → 3 leather, not 2.** At 2 a gnoll hide (value 26) tanned
  into 24 of leather — a loss, and a sink dead on arrival is not a sink. At 3 every intake
  lands on the cowhide's own margin.
- **17 trophies gained a sink** (target was 14). Eleven remain deliberately sinkless: the
  four premium furs await the furrier arc, the rest are collector/boss pieces.
- **One conscious value inversion**: craft_boar_spear costs 192 against a 180-value spear
  (razorback_tusk at its smallest allowed qty). 47 recipes already invert, worst 3.45× —
  inside house tolerance, but it is a net vendor loss and the one thread-in that crosses a
  band. Flagged for the owner's eye.
- Shared-table fact discovered at authoring: the four crowned foes Part 2 names have no
  boss-only tables, so their named siblings inherit the lot. Boss-only stormtalon would
  need a new table in npcs.ts — out of scope, recorded.

**Ph3 THE HOUSES GET THEIR FACES — f2fcef22.** The 30 pieces shipped mechanically whole in
Ph2 painted as tinted generic silhouettes with burnt-lump icons; a set the player cannot
recognise is not a set. All 30 styles authored across the five armor tables with the
resurgence lineage legible (adderking keeps adderfang's DIAMONDHIDE band as the chest's
one cell). **Icon rows are SEEDS, never drawings** — the file's product-shot loop only
sees ids that already hold a row, so a generic glyph + the piece's own tint lets the body
art carry into the pack with zero drift. laurelbrand had no SwordStyle at all and painted
as NOTHING IN HAND (bladeStyle falls back only for ids containing 'sword'/'dagger'); four
other style-less weapons were paid off beside it, taking the roster 5 → 0. One latent
kludge widened: the staff drip channel keyed on bloodmoon's exact hex, so a second blood
staff would have shed beads instead of taking them — now a named BLOOD_FOCUS set.
Verified by execution (a fallback is a pure cache hit that draws nothing, so an empty
trace proves the lump): 31/31 real painters, no two sharing a geometry trace.

**Gates at every commit**: shared 291 / content 613 / server 601 / client 669 = **2174
pass, 0 fail**, tsc ×4 clean.

**Found by this wave, outside its remit**: seven complete endgame chase houses (aetherion,
duskwarden, flamewrought, gatefall, gloamsight, stormsinger, sunhallow) have full body art
but no icon rows at all; the nightveil barrowdusk colorway has neither.

## Part 6 — Gates & ceremony

tsc ×4 clean; content/shared/server/client suites green (setWords count pin 46→52
rewritten consciously; SET_NAMES coverage; loot flood gates; register + ledger).
Shared-tree ceremony per the git law: hunk-partition, empty-index STOP-gate,
pathspec only for wholly-owned files, provenance-checked closing restore.
