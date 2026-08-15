# THE OOZE FAMILY — the formless get their bestiary page

The slime was one green hopper and its split half, spawning in exactly
one dungeon roster. This pass makes the formless a true D&D-grounded
FAMILY: five distinct BODY PLANS (never a reskin), a three-stage split
chain, real hop attacks, a glistening trail, and homes in both the wild
and the deep.

## THE BODY-PLAN LAW

A variant earns its id with a different BODY, not a different fill:

| plan   | read at scale                                   | members |
|--------|--------------------------------------------------|---------|
| hopper | chamfered gel block, hop-squash, eyes            | slime, slime_small, giant_slime |
| puddle | low lobed pool, eyeless, leading pseudopod       | gray_ooze |
| amoeba | mid-height multi-lobe colony, several nuclei     | ochre_jelly, ochre_half |
| column | standing tar pillar, drips, crown lag            | black_pudding, pudding_half |
| cube   | translucent prism, top plane, swallowed debris   | gelatinous_cube |

Eyes are the CHARM TIER: only the hoppers have them. The dungeon oozes
are eyeless — that absence is the danger read.

## THE ROSTER

| id | name | L | hp | dmg | r | hitH | spd | attackStatus | resist / weak | split | home |
|----|------|---|----|-----|---|------|-----|--------------|----------------|-------|------|
| slime | Slime | 4 | 14 | 2 | .32 | .6 | 2.6 | — | bleed,venom / chill | 2× slime_small | marsh banks (wild), caverns |
| slime_small | Small slime | 1 | 4 | 1 | .18 | .35 | 3.0 | — | same | — | split child, born angry |
| giant_slime | Giant slime | 9 | 60 | 4 | .55 | 1.1 | 2.2 | — | bleed,venom / chill | 2× slime | wild knot lead, caverns |
| gray_ooze | Gray ooze | 13 | 55 | 5 | .40 | .35 | 2.0 | sunder 1 | bleed,venom,chill / burn | — | cavern+mine, close ambusher |
| ochre_jelly | Ochre jelly | 16 | 90 | 5 | .46 | .7 | 2.3 | sunder 1 | bleed,venom,shock / chill | 2× ochre_half | night forest (wild), caverns |
| ochre_half | Ochre half | 8 | 24 | 3 | .30 | .5 | 2.7 | — | same | — | split child |
| gelatinous_cube | Gelatinous cube | 19 | 160 | 6 | .60 | 1.6 | 1.6 | chill 2 (numbing engulf) | bleed,venom / burn | — | crypt+cavern corridors |
| black_pudding | Black pudding | 24 | 140 | 8 | .42 | 1.3 | 2.4 | sunder 2 | bleed,venom,shock,chill / burn | 2× pudding_half | deepest caverns |
| pudding_half | Pudding half | 12 | 40 | 4 | .28 | .9 | 2.8 | sunder 1 | same | — | split child |

- **The split chain is data**: giant → 2 slimes → 4 smalls; validator
  only bans self-split, and every chain terminates. Children are
  ephemeral and born hunting the killer (existing server law).
- **Hop attack**: hoppers get `pounce: true` — the gather-and-spring the
  painter already animates now truly closes the gap (mob pounce math).
- **The giant lands like weather**: kit `ground_slam` (cd 200, the
  crashing-mass splash, telegraphed and dodgeable).
- **D&D truth**: gray ooze corrodes (sunder), ochre jelly shrugs
  lightning and splits, black pudding shrugs nearly everything but
  fire and hits like acid, the cube numbs what it engulfs (chill) and
  CARRIES WHAT IT ATE — loot rides `heirlooms`, and the painter
  suspends the same story (bones, a sword, coins) inside the prism.
- Lanes: whole family FORMLESS (swallows shafts, fears the working).
- Tames: the whole family refuses the leash (`isOozeId`).

## THE TRAIL

Every ooze wets the ground it crosses: a per-body ring of ground dabs
(cap 12, ~2.5 s fade) painted in the SHADOW PASS so bodies walk over
them. Hoppers print LANDING-SPACED splats (the hop rhythm is legible in
the trail); sliders lay a near-continuous glisten. Zero per-frame
allocation — a reused ring buffer on the anim entry. Death adds a
last burst of gel splats at the point of collapse (oozes leave no
corpse — the splat is the funeral).

## As-built

(filled at ship)
