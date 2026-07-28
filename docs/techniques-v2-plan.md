# Techniques v2 — The Honed Art & The Callings

Status: **PHASES 1–2 SHIPPED** (2026-07-28; Phase 1 HONED-ART commit d101b22,
Phase 2 OPEN LADDER same-day follow-up — 40 arts live, 10 per style). Phases
3–6 (Callings, Codex v2, Unwritten Page, balance pass) remain as planned below.
Companion to the combat-depth 4.1 slots, the Techniques codex (V screen), and
THE THREAT LAW (`shared/sim/damage.ts`). Read those before touching anything here.

The brief: skills should feel like an investment with endless build expression.
Five gaps close that brief — (1) techniques you unlocked early must keep growing
so the ladder is a *choice*, not a checklist; (2) every skill, combat or trade,
should offer **chosen, toggleable passives** — an identity you opt into, not just
stats your cape happens to carry; (3) a slow account-wide budget that deep
investment enlarges, so veterans literally run richer builds; (4) the roster
itself must be wide enough to carry deep dungeon play — **ten arts per style
minimum**, so two adventurers of the same school rarely fight alike; (5) beyond
the ladder, **hidden arts earned from events, feats, and quests** — the rewards
that make a veteran visibly, enviably unique.

---

## Part 1 — Audit: what exists today (verified in code, 2026-07-28)

### Actives (the R slot)

- 16 techniques in `content/src/abilities.ts:1314-1331` — **4 per style** at levels
  **5 / 15 / 30 / 45** (melee, archery, magic, sneak). One chosen per style
  (`character_techniques`, one row per (character, style)), free respec,
  server-validated against **base** skill level in `setTechnique`
  (`gameServer.ts:5554-5573`).
- Damage pipeline for a technique cast (`castAbility`, `gameServer.ts:5731-5771`):
  `ab.damage × (1 + 0.05·effectiveLevel(style)) × gear.styleDmgMult × gear.elementDmgMult`,
  cooldown `× gear.cooldownMult`. Trinket `powerMult` applies **only** to relic/sigil
  casts — techniques have **no growth axis of their own** beyond the uniform
  5%/level every attack already gets.
- The codex shows "Rank I–IV" (`panels.ts:1319`) — **cosmetic ladder position only**.
  No `rank` field exists anywhere; a technique's numbers are frozen at authoring.

### Ladder balance snapshot (damage per cooldown-cycle, authored numbers)

| rung | melee | archery | magic | sneak |
|---|---|---|---|---|
| Lv 5 | heavy_slam 10/8.5s ≈ **1.18** AoE+kb | tumble_shot 7/8s ≈ 0.88 +disengage | arc_bolt 21(3-chain)/8s ≈ **2.63** multi | rend 4+bleed²/7.5s |
| Lv 15 | whirlwind 12/12s ≈ 1.00 AoE | rain_of_arrows 9/11s ≈ 0.82 AoE | blink — utility | smoke_bomb 2+chill/12s |
| Lv 30 | bloodlust — 0.4 lifesteal, 43% uptime | twin_strike 20/9s ≈ **2.22** pierce | meteor_shard 13+burn/13s ≈ 1.0 | envenom — venom coat, 50% uptime |
| Lv 45 | earthbreaker 11/11s ≈ 1.00 +leap+kb | storm_of_shafts ~32/13s ≈ 2.46 stand-in | maelstrom 10/13s ≈ 0.77 +pull+chill | night_fangs 15(3-homing)/11s ≈ 1.36 |

Read: the ladder is already **shape-diverse, not strictly vertical** — earthbreaker
does not outclass heavy_slam on raw cycle value; it buys mobility. That's the right
foundation. The failure is that every rung is **static forever**: nothing you do
after unlock deepens the art, so the "choice" collapses to whichever shape fits
your kit once, then never breathes again.

### Passives

7 `PassiveId`s (`shared/sim/abilities.ts:380-446`), carried **only by gear** — 17
items, mostly capes and offhands. `hasPassive(player, id)` scans worn equipment;
hook sites are one-liners (thorns `:8537`, dodge_haste `:9853`, second_wind `:7286`,
battle_rush `:7145`, fleet_footed `:9796`, chill_charged `:9982`, ember_bolt `:5217`).
The player never *chooses* a passive; the wardrobe does. Trade skills grant access
(recipes, nodes, benches) but zero identity perks — a 99 herbalist plays exactly
like a 1 herbalist between sips.

### Meta-progression

None. Total level is client display only (`panels.ts:1120`). Combat level exists in
shared but feeds only NPC aggro range. No points, no spendable anything.

### Rails already in place (reuse, don't reinvent)

- **GearStats aggregate channels** (`equipment/roll.ts:167-186`): armor, skillBonus,
  maxHp, regen, styleDmgMult, elementDmgMult, cooldownMult, speedMult, thorns,
  critPct, onKillHasteTicks — folded once in `recomputeGear` (`gameServer.ts:5058`).
- **Buffs array law**: speeds multiply, shields sum, lifesteal/regen/gather max.
- **Row-presence unlock pattern** (hidden skills), **one-row-per-key tables**
  (character_techniques), **free-respec philosophy** (`abilities.ts:365`).
- **Effect vocabulary**: `EnchantEffect` typed union with aggregate vs strike
  channel split — the exact shape a passive effect system wants.

---

## Part 2 — The three laws

### LAW 1 — THE HONED-ART LAW (technique ranks)

**A technique's rank derives from your base skill level's surplus over its unlock
level. No new currency, no new persistence, no grind screen — the art grows with
the hand that carries it.**

- Rank thresholds: surplus **0 / +15 / +30 / +45** → Rank **I / II / III / IV**.
  - heavy_slam (unlock 5): Rank IV at melee **50** — the early art matures mid-game.
  - earthbreaker (unlock 45): Rank IV at melee **90** — the late art has the higher
    authored ceiling but takes a lifetime to fully hone.
  - This asymmetry IS the balance: at melee 60 you choose between a fully-honed
    heavy_slam and a Rank-II earthbreaker. Both are correct.
- Rank uses **base** level (matching the unlock law and the equip law — gear must
  never jump a rank; mastery is the character's, not the wardrobe's).
- **Data shape**: `TechniqueDef.ranks?: RankStep[]` (up to 3 steps past Rank I),
  where `RankStep = Partial<AbilityDef> & { note: string }` — a typed delta merged
  over the base def. One shared resolver `honedTechnique(ab, tech, baseLevel)` in
  `shared/sim/abilities.ts` so the server cast and the codex bench preview can
  never disagree (same law as `wieldingStyle` mirroring).
- **Authoring doctrine**: Rank II sharpens numbers (damage / cooldown / radius);
  Rank III adds a beat of utility (a 4th whirlwind pulse, rain_of_arrows leaves a
  brief slow, blink drops a decoy afterimage); Rank IV is the *signature* — one
  visible, nameable flourish per art (heavy_slam brief stun, arc_bolt +1 chain,
  rend bleed spreads on kill, tumble_shot reloads a snap shot). The note string is
  player-facing bench copy — VOICE.md applies.
- **Balance contract** (new test, sits beside the TTK brackets): for each style,
  every technique's Rank-IV cycle value must land within ±20% of the style's mean
  cycle value, and any lower rung at its mature rank must be ≥ 0.9× the cycle value
  of any higher rung available at the same base level. The relevance of early arts
  becomes a *tested invariant*, not a hope.

### LAW 2 — THE CALLING LAW (chosen, toggleable passives)

**Every skill — all 21, trades included — carries a short ladder of Callings:
passives you unlock by level, then choose to *answer* (toggle on) within a Focus
budget. Worn-gear passives stay the gear axis; Callings are the character axis.
Both feed the same hook sites.**

- **Data**: new `content/src/callings.ts` — `CallingDef { id, skill, unlockLevel,
  focusCost (1|2|3), name, desc, effect }`. Effect is a typed union extending the
  EnchantEffect vocabulary: aggregate kinds fold into channels; event kinds join
  the `hasPassive`-style hook sites. Target **2 per skill** at launch (~42 defs),
  unlocking at skill **20 / 60** (trades and combat alike — level 20 is where a
  skill stops being a dabble).
- **Toggle law**: unlocking is automatic at level (row appears, codex pip lights);
  *answering* a Calling is a free toggle any time, anywhere — same philosophy as
  technique respec. The constraint is never friction, it's the budget.
- **Server**: generalize `hasPassive(player, id)` → checks worn gear **or** an
  answered Calling granting that hook; aggregate-kind Callings fold in
  `recomputeGear` alongside gear stats (one recompute site, per the enchants law).
  Never fold a strike/event kind into the aggregate (same test-locked split).
- **Persistence**: `character_callings (character_id, calling TEXT, PRIMARY KEY
  (character_id, calling))` — row presence = answered, mirroring the hidden-skill
  law. Protocol: `S2CCallings { answered: string[] }` + `C2SCalling { calling,
  on }`, PROTOCOL_VERSION bump.
- **Launch sketch** (2 per skill; numbers are placeholders for the balance pass —
  every aggregate rides an existing channel, every event names its hook site):

| skill | Lv 20 | Lv 60 |
|---|---|---|
| vitality | Hearty Meals — food heals +25% | Ironblood — regen +1/4s |
| melee | Follow-Through — finisher +10% dmg | Warpath — battle_rush hook (kill haste) |
| defence | Bulwark — +6 armor when stationary ~0.6s | Stonewall — shields gain +25% hp |
| archery | Fletcher's Eye — snap shots +15% | Longstride — full-draw move factor 0.55→0.7 |
| magic | Kindled Mind — −5% cooldowns | Attuned — +8% element dmg, worn enchant's element |
| sneak | Soft Step — aggro factor −0.05 | Opportunist — backstab +0.25× |
| dualwield | Ambidexter — echo delay 4→3 ticks | Twin Tempo — offhand factor +0.05 |
| mining | Prospector — 10% double ore | Deep Lungs — +15% gather speed underground |
| woodcutting | Timber Sense — 10% double log | Girdler — treefall AoE rustle, +1 tile reach |
| fishing | Patient Line — 12% double catch | Night Angler — +20% speed after dusk |
| foraging | Gleaner — 10% double pick | Verdant Eye — herb nodes glint at +4 tiles |
| farming | Green Thumb — crops grow 8% faster | Bounty — 10% double harvest |
| smithing | Sparing Hammer — 8% chance save 1 bar | Forgeheat — +3 effective smithing at furnace |
| woodworking | Clean Grain — 8% material save | Bowyer's Pride — crafted bows +1 affix roll bias |
| leatherworking | Whetstone Habit — melee crit +2% | Supple Fit — leather pieces +0.5% speed each |
| tailoring | Fine Seams — 8% material save | Quilted Lining — cloth pieces +2 maxHp each |
| cooking | Seasoned Palate — burn chance −30% | Field Kitchen — food buffs last +25% |
| construction | Salvager — refund +1 material on demolish | Homesteader — +10% build speed |
| herbalism | Herbalist's Blood — regen +1/4s | Long Brew — tonic buffs last +25% |
| enchanting | Dust Thrift — 15% chance save dust | Resonance — tier-1 gleam counts as tier-2 visual |
| beastcraft | Gentle Hand — produce +10% | Drover — livestock follow +1 tile |

  (Craft/gather Callings deliberately do **not** touch loot-economy dials — no pity,
  no player-state drop luck, per the flood law. Yield doubles ride the existing
  bonusYield/qty paths.)

### LAW 3 — THE OPEN LADDER (an art every five levels)

**Each combat style carries ten leveled arts: a new technique every five levels
from 5 through 50. The first fifty levels of a combat skill are the era of
discovery; fifty to ninety-five are the era of honing.**

- Unlock rungs: **5 / 10 / 15 / 20 / 25 / 30 / 35 / 40 / 45 / 50**. The existing
  16 keep their seats (5/15/30/45); each style gains **6 new arts** at
  10/20/25/35/40/50 — 24 new techniques, 40 total.
- The cap at 50 is deliberate: with HONED-ART thresholds (+45 to Rank IV), the
  level-50 art fully matures at **95** — every art in the game can be mastered
  before 99, and the deepest art honing IS the 50→99 endgame.
- With ten shapes per style and overlapping maturity curves, the R slot stops
  being "the best one I own" and becomes a *loadout decision per dungeon* —
  free respec is the point: swap arts at the gate like checking your pack.
- **Concept roster** (names/numbers are placeholders for the VOICE + balance
  pass; every art must map to an executor shape — new shapes flagged ⚠):

| lvl | melee | archery | magic | sneak |
|---|---|---|---|---|
| 5 | heavy_slam ✓ | tumble_shot ✓ | arc_bolt ✓ | rend ✓ |
| 10 | bull_rush — dash_strike gap-close + kb | piercing_bolt — projectile, pierce line | frost_lance — beam, chill | shadowstep — dash_strike, backstab-angle tele-lunge |
| 15 | whirlwind ✓ | rain_of_arrows ✓ | blink ✓ | smoke_bomb ✓ |
| 20 | rally_cry — self_buff shieldHp | snare_shot — summon snare_trap at range | ward_shell — self_buff shieldHp | caltrops — ground_field bleed+slow |
| 25 | crescent_wave — projectile arc-wave, short range | ricochet — chain_zap arrow, 2 hops | ember_fan — projectile_fan ×3 burn | fan_of_knives — nova of blades, bleed |
| 30 | bloodlust ✓ | twin_strike ✓ | meteor_shard ✓ | envenom ✓ |
| 35 | stagger_stomp — nova kb + shock | skyfall_arrow — ground_aoe single heavy | stormcall — ground_field shock | feint_double — summon decoy |
| 40 | headsman_stroke — melee_arc executeBelow | phantom_flight — returns (boomerang) pierce arrow | mirror_image — summon decoy | exposing_strike — melee_arc executeBelow |
| 45 | earthbreaker ✓ | storm_of_shafts ✓ | maelstrom ✓ | night_fangs ✓ |
| 50 | warlords_descent — leap_slam + brief war-shout buff ⚠(compound) | arrow_tempest — flurry single-target barrage | starfall — ground_aoe grand, radiant | thousand_cuts — flurry, bleed stacks |

- All 24 ride existing executor shapes except the one flagged compound — the 13
  shapes + modifier axes (executeBelow, drainFrac, negative knockback, returns,
  homing, summons incl. snare_trap/decoy) already cover this roster. That was the
  point of the interpreter design; we're finally spending it.
- The content test tightens from "≥3 per style" to **exactly the rung table** —
  every style has an art at every rung, no gaps, no doubles.
- **THE FLOURISH CONTRACT** (extends the FX v2/v3 laws): a technique does not
  ship until it has (a) a bespoke `FX_STYLES` entry — the existing uniqueness
  test (no two abilities share the mid/ring/debris/decal/punch face) already
  enforces this at scale, 24 new faces required; (b) a spell-plate icon; (c) its
  Rank-IV signature visibly distinct in-world (the honed art must LOOK honed —
  rank-aware fx accents: wider rims, deeper aftermath, added motif beats); (d) a
  bench card in VOICE. The FX pass also revisits the original 16 under v3
  (ground-truth AoE volumes, staged aftermath) so old arts don't read flat next
  to new ones.

### LAW 4 — THE UNWRITTEN PAGE (hidden arts, earned not leveled)

**Beyond the ladder live hidden arts with no level rung: earned through events,
feats, quests, and encounters. They are the ecosystem's envy engine — the art a
player carries that you cannot get by grinding, only by having been there.**

- **Data**: `TechniqueDef.hidden?: { anchorLevel: number }` — hidden arts belong
  to a style but sit outside the rung table; `anchorLevel` seeds HONED-ART rank
  derivation (surplus over anchor) so earned arts still grow with the hand.
- **Unlock ledger**: the existing `character_flags` rail (`art:<id>` flags) —
  the same durable-flag store dialogue already writes, and exactly what the
  quest/faction state was reserved for. Granting an art = setting a flag from
  any source: dialogue trees, feat detection in server hooks, boss first-kills,
  seasonal events. No new table; `setTechnique` validation grows one branch
  (rung arts check level, hidden arts check flag).
- **Codex law**: hidden arts are invisible until earned — no veiled plate, no
  rumor row, nothing to min-max against. The DISCOVERED ceremony pattern (Chart
  epic) fires on the grant; the art then takes a normal seat in its style rail
  wearing an earned-mark seal. What players see of each other IS the discovery
  surface: an unfamiliar flourish in a dungeon is the advertisement.
- **Launch seeds** (4, one per style, all grantable from existing systems):
  riftwalker_step (magic — first riftgate dungeon clear), oathbound_edge (melee —
  a Silverfall quest-line flag), warden_volley (archery — garrison event feat),
  whisper_fang (sneak — Rookery dialogue chain). Sigils remain the boss-trophy
  axis; hidden arts are the *deed* axis — never drop-luck, always a feat or a
  story (the flood law's no-pity spirit applies: deeds, not dice).

### LAW 5 — THE FOCUS LAW (the budget that deep investment enlarges)

**Focus is the account's capacity to hold Callings answered. It grows only from
skill milestones — breadth and depth both pay — and it is the endgame chase the
user asked for: veterans run visibly richer builds.**

- `Focus = 2 (base) + 1 per skill at level ≥ 50 + 1 per skill at level ≥ 99`.
  Ceiling 2 + 21 + 21 = **44**; a realistic completionist sits ~20–30.
- Derived, never stored — computed from `character_skills` exactly like levels
  (no new persistence; the milestone IS the ledger).
- Sum of answered Callings' focusCost ≤ Focus, enforced server-side on toggle and
  re-checked on login (skills can only rise, so re-checks are belt-and-braces).
- Curve feel: fresh character (one skill past 50) = 3 Focus → two or three minor
  Callings, a real but tight choice. Mid-game (~4 skills past 50) = 6–7 → a build.
  Maxed account → most of the book open, and the 99-cape crowd wears it in play,
  not just on the crest.
- Costs: 1 = minor QoL / small aggregate; 2 = build-defining aggregate or event
  hook; 3 = keystone (reserved, none at launch — headroom for future chase).

---

## Part 3 — Why this fits the machine we already built

- **Zero new currencies, one new table.** Ranks derive from level surplus; Focus
  derives from milestones. Only answered-Calling rows persist. No migration risk
  beyond one CREATE TABLE + protocol bump.
- **One recompute site.** Callings fold where enchants already fold; hook-kind
  Callings land at hook sites that already exist for gear passives. The
  aggregate/strike split stays test-locked.
- **The codex was built for this.** The V screen grows a second wing: Actives
  (existing rails, now with live rank pips and next-rank bench preview via
  `honedTechnique`) and Callings (budget meter up top, per-skill rows, answered
  toggles). NEW-pip/seen-ledger/veiling patterns reuse as-is; the tech rail
  relayouts from 4 plates to a scrollable 10-rung column (NEXT-RUNG veiling law
  unchanged — one upcoming rung visible, the deep ladder stays a mystery), with
  earned-mark seats appearing as hidden arts land. No new keys — THE ONE KEYMAP
  stands.
- **Combinatorics without new slots.** Q/E/R/T keep their four-axis identity. The
  build space becomes: 10 rungs + hidden arts × rank maturity per style × ~42
  Callings chosen under budget × gear passives × enchants × relics/sigils. That
  is the "endless playstyles" surface — earned, not sprawled across new keybinds.
- **Whiff-0, TTK brackets, and NPC-side scaling stay sacred.** Rank deltas and
  Calling magnitudes tune *inside* THE THREAT LAW; the balance contract tests
  extend the existing bracket suite rather than replacing it.

## Part 4 — Implementation phases

1. **The Honed Art** — shared `RankStep` + `honedTechnique` resolver; author 3 rank
   steps × 16 existing techniques; server cast integration (rank at cast from base
   level); codex bench rank preview + rank pips; ladder balance-contract test.
   No DB, no protocol change.
2. **The Open Ladder** — author the 24 new arts (defs + rank steps + FLOURISH
   CONTRACT: bespoke FX_STYLES faces, icons, VOICE bench copy); codex rail
   relayout to 10 rungs; tighten the content test to the full rung table;
   FX v3 revisit of the original 16. Ships in style-sized slices (one style per
   session is a healthy bite); still no DB/protocol change.
3. **The Callings foundation** — `content/src/callings.ts` (~42 defs) + shared
   types; `character_callings` table + accessors; protocol v12 (S2CCallings /
   C2SCalling); server fold + `hasPerk` generalization + Focus enforcement;
   content tests (every skill has ≥2, every effect names a real channel/hook).
4. **Codex v2** — Callings wing in the V screen, Focus meter, toggle UX, pad nav
   per THE ONE KEYMAP; NEW pips on unlock; skill-card cross-links.
5. **The Unwritten Page** — `hidden`/`anchorLevel` on TechniqueDef, `art:<id>`
   flag branch in setTechnique validation, DISCOVERED-style grant ceremony, the
   4 launch seeds wired to their sources (riftgate clear, quest flag, garrison
   feat, Rookery dialogue).
6. **The balance pass** — live-tune rank steps, roster cycle values, and Calling
   magnitudes against the TTK brackets and gather/craft baselines; Playwright
   live-verify (rank IV signature visible, toggle round-trip, Focus rejection
   message, hidden-art grant ceremony).

## Open questions (recommendation first)

- **Milestones at 50/99 only, or add 25/75?** Recommend 50/99 — keeps Focus scarce
  enough that answering is a real choice; 25/75 can be added later as a pure buff.
- **Rank thresholds +15/+30/+45 flat, or per-technique?** Recommend flat to start —
  the authored deltas are the tuning surface; two dials invite drift.
- **Third Calling per skill (Lv 90 keystones, cost 3)?** Recommend deferring to a
  follow-up epic once launch magnitudes settle.
