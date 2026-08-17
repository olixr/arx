# THE CROSSING — transport arts v2

The family of arts that move the caster — every dash, lunge, charge,
leap, and blink across all eight schools plus the NPC and companion
rosters — rebuilt on a foundation that tells the truth about motion.

## The wound (audited 2026-08-16)

34 player transport arts, 7 NPC movers, 8 companion arts — and every
one of them resolves inside a single server tick. A "charge" is a
teleport wearing a dust decal; a "blink" is a corridor dash that
collides with walls and wounds everything it passes; a leap never
leaves the ground. Ranges sit at 2–6 tiles — shallower than a basic
attack chain closes on its own. And `dash_strike` cannot be aimed at
all: the one predicate `groundAimed()` says a dash "aims a direction,
not a point," so the held ring, the clamp, and the prediction all
refuse it together.

## The laws

**1. THE TRAVELED ROAD.** Movement takes time. A transport art
declares its `travel` kind — `charge`, `dash`, `leap`, or `blink` —
and the first three TRAVERSE: the body crosses the world over real
ticks at a declared speed (charge 13 tiles/s — the heavy build-up
run; dash 18 — the blur-step; leap 14 through the air), moved by the
same `stepMovement` door as every stride, wall-stopped and
substepped. Watchers see the body actually cross because the body
actually crosses. One transit per body; input movement, dodges, and
second casts wait until the road ends.

**2. THE TORN VEIL.** A `blink` does not cross — it LEAVES. True
discontinuous relocation through one shared resolver
(`resolveTeleport`): the landing walks back along the line until the
body fits, never inside a wall, never through a lock the corridor
rule would have refused... and nothing between the doors is touched.
A teleport's damage is an ARRIVAL STRIKE — the emergence wounds a
small ring at the far door, the void between wounds nothing.

**3. THE LONG ROAD DOUBLED.** Family-wide reach roughly doubles
(player arts ~2x curated; NPC movers ~1.6–1.75x — they got honest
travel time, so the reach is dodgeable and fair). The ladder model's
per-tile dash utility halves (0.5 → 0.25) in the same stroke, so
every cycle value lands where it stood and no balance band moves.

**4. THE CHOSEN GROUND.** `dash_strike` joins the held ring:
`groundAimed` says yes, `groundAimRange` = |dashTiles| — hold the
button, steer the ghost, release to travel THAT far and no farther
(a ring placed short travels short, the leap's own law). A bare tap
keeps the old grammar: full distance along the facing. And a charge
released on a foe LOCKS: the transit re-derives its heading toward
the target's live body every tick and ends at striking distance with
the impact blast — the warrior's charge finds the man, not the spot
he stood.

**5. THE ROAD IS SEEN.** The wire's one `dash` fx grows `ticks`: the
streak becomes a SWEPT wake whose head crosses the path in the same
time the body does, afterimages and kicked dust trailing the head,
never a full-drawn line before the body arrives. Blinks speak a new
`warp` wire (two doors, no line): departure implosion, arrival
emergence, each art's own matter — smoke for the rogue's step, the
torn dark for the arcanist's rift, embers for the relic. Charges end
in a real impact voice at the contact. All matter through the
library per ONE-VOICE.

**6. ONE LAW, TWO MIRRORS (inherited, binding).** The predictor
walks the same road: transit mirrored per input frame in the seq
domain (deterministic window from the cast frame, input suppressed
while traveling, replayed in reconcile), teleports mirrored through
the SAME shared resolver. Tick-vs-seq skew during travel is the
recorded bounded-drift class — both ends of the road agree exactly,
the middle folds through the error offset.

## The seats (who travels how)

- **charge** (13 t/s, corridor sweep, target-lock on release-at-foe,
  impact blast at a locked arrival): bull_rush, shield_rush,
  shoulder_check, breaker_charge, knights_charge, sundering_lance,
  couched_charge, fifth_road, first_light; NPC: rending_lunge,
  throat_lunge, shallows_rush, drawn_bolt; pets: gore_charge,
  the_charge, the_winter_stalk.
- **dash** (18 t/s, corridor sweep): lunge, stinger, beak_first,
  riptide, green_verse, shadow_fang, kings_bane, last_word,
  ghost_step, heron_step, vaulting_step, tumble_shot (negative =
  away); NPC: shrilling_dart; pets: nip_and_dart, the_dark_descent,
  talon_stoop, coiled_strike.
- **leap** (14 t/s, airborne — no corridor sweep, crater at the
  fall): earthbreaker, warlords_descent, anchorfall, forgefall,
  skysunder, horizon_fall, swallows_dive, mirrorfall,
  skydriver_fall; NPC: breaching_crash; pets: the_long_furrow.
- **blink** (instant, arrival strike): blink, shadowstep,
  riftwalker_step, ember_dash; NPC: glimmer_step.

## Phases

1. **THE SHARED ROAD** — travel vocabulary, transit math, teleport
   resolver, aim-ruler extension, pinned-test recuts.
2. **THE SERVER WALKS** — transit records on the one tick, cast
   branches start roads instead of finishing them, the cancel
   roster, NPC/pet integration, arrival payloads.
3. **THE CLIENT BELIEVES** — predictor transit window, castImpulse
   teleports, the dash ghost ring.
4. **THE ROAD IS SEEN** — swept wake, warp doors, charge impacts,
   bespoke teleport signatures.
5. **THE ROSTER RE-SEATED** — travel kinds + doubled ranges + rank
   steps + ladder weight, all pins green.

## As built (2026-08-16, first cut)

- **Shared**: `TravelKind` + `travel` on AbilityDef; `TRAVEL_SPEEDS`
  (charge 13 / dash 18 / leap 14 t/s); `travelKindOf` /
  `transitTicks` (floor 2, blink 0) / `CHARGE_CONTACT_DIST` 0.85 /
  `BLINK_STRIKE_RADIUS` 1.1 in sim/abilities.ts; `resolveTeleport`
  (marches OUT, first obstruction ends the march — the veil never
  opens past stone, a locked gate stays locked) + `transitStep`
  (≤0.4 substeps, onSubstep hook, blocked = <5% covered) in
  sim/movement.ts; `groundAimed` says yes to forward dashes
  (negative retreat hops keep direction-aim), `groundAimRange`
  covers them; fx wire grew `warp` and `dash.ticks` (additive).
- **Server**: one `transits` ledger (players, NPCs, companions),
  `beginTransit` (dry-runs the road so the promised wake never draws
  past a wall; wire carries the clock) → `tickTransits` (after
  tickNpcs, before the history ring) → `finishTransit` (payload
  closures captured at cast: leap crater + landing re-root, tumble
  arrow tail, locked-charge impact blast). Blink resolves inline:
  relocate, `warp` wire, arrival strike in BLINK_STRIKE_RADIUS —
  the void between wounds nothing. `lockChargeTarget` elects the
  assistMark foe nearest the released ring (≤1.4); the road
  re-derives heading each tick and ends at contact. Suppression:
  input speed 0, dodge/sit/mount refused, casts refuse honestly
  (cooldown resend), NPC/pet steering skipped, kit clocks still run.
  Cleanup: /tp, killNpc, death/despawn/plane-change guards in the
  tick. Companion gap-closers ride the same engine (stop-short law
  kept; strike at ARRIVAL).
- **Client**: predictor `CastMove` — blink through the SAME shared
  resolver on the cast frame; roads walk one transit step per frame
  in the seq window, `rooted()` extended so the window's frames
  zero input speed and dodge is refused; replay identical (the
  charged-fire late-register keeps its one-trip skew). castImpulse
  predicts EVERY transport art now (unaimed leaps included — the
  server law is deterministic); aimed rings clamp with the one
  ruler. Dash ghost = landing pip (0.6) + travel chevrons.
- **FX**: the `dash` painter is TIME-SWEPT (head crosses on the
  wire's clock, wake + afterimages + speed ticks trail the head,
  dust kicked at the live head on gated emission, arrival burst
  fires when the head arrives; clockless wires keep the old
  one-beat grammar). New `warp` painter: collapsing slit + inward
  streaks + ground memory at the departure, opening slit +
  emergence rays + blooming ring at the arrival, NO line between.
  Warp sig set-pieces crown the ARRIVAL door. Sound: warp speaks
  twice (collapse near, zap at the far door + close shake).
  Signatures: blink lost its travel line (nothing crossed the
  ground); shadowstep gained the true smoke poof (billow at the
  departure, veil at the arrival) over its two dark doors;
  riftwalker's unstitched corridor STAYS (the rift is the passage);
  ember_dash + glimmer_step stay true dashes — their lane stories
  stay honest.
- **Content**: THE LONG ROAD DOUBLED — every player + companion
  road exactly ×2 (defs and every rank step, secrets included) with
  the ladder's dash weight halved 0.5 → 0.25 in the same stroke:
  utility contributions byte-identical, all 570 content pins green
  untouched. NPC movers curated ~1.6–1.75x (they earned honest
  travel time): rending 5, throat 7 (charge), glimmer 8, dart 3.6,
  shallows 6.5 (charge), breaching 7, drawn_bolt 8 (charge).
  Charges named: bull_rush, shield_rush, shoulder_check,
  breaker_charge, knights_charge, sundering_lance, couched_charge,
  fifth_road, first_light, gore_charge, the_charge. Blinks named:
  blink, shadowstep, riftwalker_step.

**Open doors** (recorded, not debts): the airborne leap ARC on the
body itself (a per-entity lift beside the terrain renderLift — the
wake + crater carry the read today); a bespoke charge gather-pose
on the winding chargers beyond the breath dialects; blocked-early
roads over-suppress the client stick a few frames (the seq window
runs its fixed length — bounded, folds).
