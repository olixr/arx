# THE TWIN SCHOOL — the dual-wield technique ladder

Status: design locked, implementing (2026-07-29). Companion to
docs/techniques-v2-plan.md (HONED-ART / OPEN LADDER / CALLING / FREE HAND /
UNWRITTEN PAGE laws), THE SHIELD SKILL (367b873) and THE GREAT SCHOOL
(609a2d5) — the two shipped precedents for growing a school around a
hidden/new skill. Read those before touching anything here.

The debt this pays: dual wield shipped as a hidden skill (ac05936) with an
echo strike, an XP rail, and two Callings — and an explicitly deferred
technique ladder. The skill you discover by trying the thing has had nothing
to spend itself on. This epic gives the two-blade hand its own ten arts,
its unwritten page, and one new mechanic rail.

## The school's identity

**Tempo.** Melee is weight, twohand is mass, sneak is the unseen moment —
dualwield is RHYTHM: everything arrives in pairs, the second beat is the
identity. Shorter cooldowns and lighter per-blow numbers than melee, paid
back in doubled beats, crossing geometry, and the echo made louder.

- 7th `CombatStyleId`. Gear has no dualwield damage axis — twin steel is
  melee steel, so casts ride the melee multiplier (the sneak/shield alias law).
- Arts unlock on the dualwield skill (trained by landed echoes and by the
  school's own casts, per THE FREE HAND).
- FX grammar: **TWIN STEEL — everything answers twice.** Paired trails,
  mirrored strokes, crossed X marks, counter-rotation. Bright steel with the
  school's brass-amber (#d9a441 family); blood only where bleed is the point.
  No two signatures share a centerpiece, and none arrives alone.

## THE MIRRORED HAND (the one new rail)

`AbilitySelf.offhandWeight` → `PlayerBuff.offhandWeight` (max across buffs,
cap 1.0). While it rides, `offhandStrike` uses the buff weight in place of
the trained factor when the buff is higher. The passive curve's law stands
untouched — `offhandDamageFactor` still climbs 0.35→0.85 and never mirrors;
the STANCE may briefly reach parity (never past it: the off hand never
out-hits the main, even honed). One hook site, the reflectFrac pattern.

## The ladder (rungs 5–50)

| lvl | id | shape | the advantage it buys |
|---|---|---|---|
| 5 | twin_cut | flurry ×2 quick | the one-two opener; IV crossed wounds (bleed) |
| 10 | heron_step | dash_strike + bleed | pass THROUGH; both edges collect on the way |
| 15 | crossed_throw | projectile_fan ×2 tight | reach; IV the pair comes back (returns) |
| 20 | mirrored_hand | self_buff offhandWeight | the stance: no off hand for a while |
| 25 | turning_reel | nova | the circle-breaker when they ring you; IV rings shock |
| 30 | red_ribbons | self_buff onHitStatus bleed + speed | the weaving stance — both hands leave ribbons |
| 35 | swallows_dive | leap_slam | mobility burst, point-first landing |
| 40 | the_shears | melee_arc executeBelow | the closing cut for the nearly-done |
| 45 | storm_of_two | pulse_nova | the storm you carry while moving |
| 50 | hundred_hands | flurry ×5→6 | the capstone finale — count the hands later |

Unwritten page: **two_answers** (anchor 30) — flurry ×2 near-simultaneous
heavy with a small drainFrac. Deed: fell any `*_champion` with a weapon in
the OFF hand — the third rail beside champions_wall (shield offhand) and
giantsfall (twohand main). The three deeds stay mutually exclusive by
equipment: the hands disagree.

Rank doctrine per HONED-ART: II sharpens, III adds a beat, IV is the
nameable flourish. Balance settles BY THE TESTS (LADDER MODEL band,
PAYOFF BRACKET at L10–95, monotone steps) — never by ear.

## Callings (already live, reviewed and kept)

`ambidexter` (20, echo delay 4→3) and `twin_tempo` (60, factor +0.05,
cap held) shipped with the Callings epic and both hook sites are wired.
No changes.

## Delivery checklist (FLOURISH CONTRACT)

- 11 FX_STYLES faces, uniqueness-tuple clean, TWIN STEEL grammar.
- 11 spell-plates on a shared crossed-pair silhouette (`twinBlades` glyph).
- fxSigsDualwield.ts — 11 named centerpieces, registered in fxSignatures.
- VOICE bench copy: descs + 33 rank notes, quiet-quartermaster register.
- Style plumbing: shared CombatStyleId, ladder.test/content.test style
  lists, accounts.ts preference order, castAbility gear alias.
- Server: offhandWeight buff rail + the two_answers deed in killNpc.
- Live pass: /xp dualwield ceremony, casts on staged goblins, stance
  echo parity on the wire, deed grant, codex rail + bench clocks.
