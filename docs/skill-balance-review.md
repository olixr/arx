# THE SCALES WEIGHED: skill economy balance review

Date: 2026-08-01. Scope: the full XP economy across all 24 skills, as built. This is an
audit, not a change; every claim carries a file anchor. Nothing here was modified.

## 1. The curve (the spine everything hangs on)

`packages/shared/src/skills.ts:132-152`: exact RuneScape cumulative curve, MAX_LEVEL 99.

| Level | Cumulative XP | Share of the road to 99 |
|---|---|---|
| 25 | 7,842 | 0.06% |
| 50 | 101,333 | 0.78% |
| 70 | 737,627 | 5.7% |
| 80 | 1,986,068 | 15.2% |
| 92 | 6,517,253 | 50.0% (the literal halfway point) |
| 99 | 13,034,431 | 100% |

The curve itself delivers exactly the stated design intent: the first 25 levels are a
sprint (no starting plateau), and the last third of the levels holds 97% of the XP. The
curve is NOT the problem. The award rates feeding it are, because they differ per lane by
up to two orders of magnitude, and one lane (combat) compounds while the others sit flat.

## 2. The award model per lane (as built)

One door: `grantXp` at `packages/server/src/game/gameServer.ts:5649`. It applies the
amount verbatim. There is no multiplier, no rested bonus, no daily cap, no level-gap
scaling, and no diminishing-returns mechanism anywhere in the codebase (verified by four
independent sweeps). The only derived grant is the combat half-echo
(`COMBAT_LESSON_FRAC = 0.5`, `skills.ts:201`).

### Combat: XP per damage point, uncapped
`gameServer.ts:14798-14802`: every point of damage dealt pays 4 XP to the weapon school
plus 2 to vitality; the school grant echoes 2 more into `combat`. Total: 8 XP per damage.
The only per-kill XP is `xpReward * 0.5` to vitality (`:14888`). Consequences:

- School XP/hour is literally `4 x DPS x 3600`. Nothing about the target modulates it.
- Damage scales as `weaponBase x (1 + 0.05 x level)` (`shared/src/sim/damage.ts:31-49`),
  so XP/hour COMPOUNDS: a level-80 starsteel fighter earns ~12x the XP/hour of a
  level-10 iron fighter, at the exact point the curve is supposed to slow them down.
- Defence trains at 3 XP per damage TAKEN (`:15206`), shield at 3 per damage blocked
  (`:15150`). Sneak has a passive proximity pulse worth up to 25 XP/second near unaware
  hostiles (`:17785-17807`) plus backstab bonuses.
- The ONE anti-farm clause in the game protects the wrong actor: the pet trickle caps
  beastcraft XP per mark at that mob's `xpReward` ("a thick-skinned punching bag never
  becomes a training dummy", `:10141-10143, :10211-10216`). Players have no such cap.

### Gathering: flat XP per action, hard 3-second floor, world-throttled
`gameServer.ts:3455-3470, 3311-3317`: gather time = `baseTicks / speedup`, floored at 60
ticks (3.0 s). Speedup comes from tool tier (+25%/tier), level surplus (+1%/level), and
Callings. Level NEVER raises XP per action or yield. Node XP: copper 30 up to starfall
330 (`content/src/nodes.ts`); trees 25 to 150/swing; fishing is a single 35-XP node at
level 1 that never depletes. Wild nodes regrow on world-state dials only: ore 4-15 hours
with 50% drift, trees 9-24 hours (`content/src/growth.ts:206-237`), so sustained
gathering is bounded by kept-ground routes (towns, dungeons, underground) and travel.

### Trades: flat recipe XP, material-throttled
`gameServer.ts:5004`: `recipe.xp` per craft, no scaling. Bench throughput is enormous in
theory (starsteel kris: 2,200 XP per 3-second craft, `recipes` L95) but every trade is
gated by its material stream, so trade XP/hour is really a function of the gathering
economy upstream. Cooking burns pay 0 XP (whiff-0 for trades, `:4959-4967`).

### Farming and the care faucets: wall-clock, tiny
Full crop cycle pays `1.25 x def.xp` per plot: carrot 75 XP/hour/plot, moonbell 103
(`crops.ts`, `gameServer.ts:4316, 4412`). Beastcraft bond moments: 6 XP per 240 s per
slot = 90 XP/hour ceiling (`pets.ts:109-111`).

## 3. Measured rates and time-to-level

Assumptions stated: onehand at 7-tick cooldown, mean hit 0.6 x maxHit (uniform roll plus
10% crit), 50% real-world uptime for combat; gathering/trade rates are sustained-route
estimates from node timings, respawns, and material coupling. Combos, AoE packs, and
dual wielding all push combat HIGHER than shown.

| Lane | Sustained XP/hr | Hours to L50 | Hours to L99 |
|---|---|---|---|
| Combat school (compounding) | 37k at L10 rising to 490k at L95 | ~1 | ~35 |
| Sneak (pulse + backstab) | ~35k | ~3 | ~370 |
| Fishing | ~25k | ~4 | ~520 |
| Mining (kept-ground routes) | ~22k | ~5 | ~590 |
| Woodcutting | ~18k | ~6 | ~720 |
| Smithing (ore-fed, blended) | ~15k | ~7 | ~870 |
| Cooking (fish-fed, blended) | ~15k | ~7 (ceiling L22 anyway) | n/a |
| Enchanting (supply-fed) | ~12k | ~8 | ~1,090 |
| Beastcraft (pet trickle) | ~12k | ~8 | ~1,090 |
| Construction (blended) | ~8k | ~13 (ceiling L32) | n/a |
| Farming (20 plots, wall-clock) | ~2k | ~51 | effectively unreachable |

And the felt experience that triggered this review, explained: level 25 in a combat
school costs 7,842 XP; at the level-10-with-iron rate that is UNDER 15 MINUTES of
fighting. The curve intends 25 to be quick; the combat coefficients make it instant.
Meanwhile a fighter's vitality and combat skills ride along free at half rate, so one
play hour levels 3-4 skills at once, while a farmer's hour levels one skill at 2k.

## 4. Findings, ranked

- F1. COMBAT COMPOUNDS, EVERYTHING ELSE IS FLAT. XP/hour proportional to DPS means the
  curve's late-game brake is cancelled by power growth: 99 in a hard week (~35 focused
  hours), against 400-1,000 hours for every gathering/trade lane. Directly violates the
  stated goal that no lane finishes inside a week.
- F2. NO THREAT LINK. A chicken's damage-XP is worth exactly a boss's damage-XP per
  point. Zero-risk sponges (high HP, low damage, fast respawn) are optimal training
  dummies; AoE multiplies XP by pack size with no cap. The pet ledger already solved
  this (trickle capped by `xpReward` per mark); keepers got the fix, players did not.
- F3. CROSS-LANE PARITY IS OFF BY 10-100x at equal level. Level 50 means one evening
  (combat), a week of sessions (gathering), or 51 plot-hours (farming). Players reading
  the same number on two skills are being told a false story about equal investment.
- F4. CURVE-CONTENT MISMATCH. Content ceilings: cooking L22, construction L32,
  herbalism L40, leather/tailoring L48, woodworking L50, foraging L20, FISHING L1 (one
  node, one fish, nothing to unlock, full 99 curve). Past 50 only smithing (92),
  enchanting (95), mining (90), onehand/twohand gear (80), and secret-art rank clocks
  (up to 99) give the curve meaning. Focus (+1 at 50, +1 at 99) is the only universal
  reason to climb the dead road.
- F5. REPEAT-GATHER PATH DROPS THE TOOL. `gameServer.ts:3858-3865`: follow-up swings on
  an un-felled tree or fishing spot rebuild ticks from buffs only, discarding tool
  power, level surplus, and Callings. Your starsteel axe only matters for the first
  swing on each tree. Reads as a bug, not a law.
- F6. SNEAK'S PASSIVE PULSE IS EXPLOIT-SHAPED. Up to 25 XP/s (90k/hour) for pacing
  0.5 tiles/s near unaware tier-5 hostiles; the fastest low-risk faucet in the game,
  AFK-able with a movement macro.
- F7. DUAL WIELD IS A FREE SECOND STREAM. The offhand echo pays dualwield fully on its
  own damage (up to 0.85 factor), each half echoing into combat: a discovered-secret
  multiplier of ~1.5-1.8x on total XP/hour with no opportunity cost.
- F8. ENDGAME SMITHING XP-PER-ORE RAMPS ~200x. Bronze pays 12.5 XP per ore mined;
  a starsteel bar into a 2,200-XP kris pays ~2,680 per 5 gathers. Escalation per tier is
  right and good; the magnitude at the top deserves a deliberate look.
- F9. ACTIVE/PASSIVE WEIGHTING IS INCOHERENT. Passive faucets range from 90 XP/hour
  (bond moments) to 90,000 (sneak pulse), with defence tanking and farming in between.
  No stated principle relates attended play to unattended accrual.

## 5. Recommended levers (all compatible with standing laws)

Whiff-0 stays sacred; no player-state dials (flood-law spirit); world-state throttles
only. Every lever below is a coefficient or a world fact, never a pity meter.

- R1. WRITE THE XP CONTRACT. A `content` test in the ladder.test.ts tradition: a
  nominal XP/hour model per lane (like ladderModel.ts is for art value) with target
  bands, so every future recipe/node/mob lands inside the band or fails CI. The number
  to pick first: ONE STANDARD HOUR. Suggested: a focused, tier-appropriate hour pays
  20-40k XP in any lane, active beats passive by 3-5x, and combat sits at the TOP of
  the band, not 10x above it.
- R2. GIVE PLAYERS THE PET'S CAP. Per-mark school XP capped at ~1.5x the mob's
  `xpReward` (the mechanism already shipped at `gameServer.ts:10211`). For authored
  mobs, 4 x HP already lands near 1.0-1.5x xpReward, so tier-appropriate fighting is
  barely touched; sponges, packs, and afk-farms are cut off at the knees. xpReward
  already scales `level^1.05` (`npcs.ts:1049-1060`), so the cap naturally pushes
  players UP the danger ladder to keep their rate growing: risk becomes the rate dial.
- R3. RE-WEIGHT PER-DAMAGE VS PER-KILL. Move part of the school grant (e.g. 4/dmg down
  to 2-3/dmg) onto a kill-time school grant drawn from `xpReward`. Same average rate at
  the intended target band, threat-linked at the edges. R2 and R3 are alternatives;
  R2 is smaller and reuses a shipped, tested idea.
- R4. FIX THE REPEAT-GATHER PATH (F5) so tool, level, and Callings apply to every
  swing. This alone lifts sustained woodcutting/fishing 30-50% at high tools, which is
  the direction gathering needs.
- R5. PAY FARMING FOR THE TIME IT ASKS. Crop XP proportional to grow time (target:
  a tended plot-hour worth ~10x today, still far below active lanes), and/or paid
  tending actions (watering already exists and pays nothing). Farming's 1.25 x def.xp
  per multi-minute cycle is the single most under-paid deed in the game.
- R6. GIVE FISHING ITS LADDER. One node at level 1 with a 99 curve is the largest
  content hole the review found: tiers, waters, and level gates in the mining pattern.
- R7. THROTTLE THE SNEAK PULSE. Keep the deed (casing a camp IS sneak-craft), bound the
  faucet: per-mob saturation (each unaware witness pays for, say, 30 s per visit,
  world-state on the NPC, not the player) or halve the cap and require line-of-sight
  variety. 90k/hour for pacing must not beat every honest lane.
- F8/R8. Decide the top-tier trade ramp on purpose: either bless the 200x XP-per-ore
  escalation as the reward for a 90+ climb (defensible: the material stream is brutal)
  and record it in the contract, or flatten craft XP toward XP-per-bench-second bands.

## 6. What is already right (keep these)

- The curve itself: fast start, honest wall, 92-is-halfway. Do not touch it.
- Whiff-0 and burn-0: no XP for nothing, everywhere, consistently.
- Trade-skill law (no generic crafting skill) and the gather/produce split.
- The world-state-only regrowth throttle (THE WORLD OWES YOU NOTHING) already prevents
  gathering camp-farms with zero player-state dials: it is the model R2 follows.
- Focus milestones make breadth pay without making depth mandatory.
- The one-door grantXp architecture: every fix above is a small patch at one address.
