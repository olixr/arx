# The Shield Skill — the school of the Wall

Status: SHIPPING. The design record for the shield skill epic: a hidden combat
skill discovered behind a raised shield, a full ten-rung technique ladder plus
one unwritten page, two Callings, and the three defensive rails (buff armor,
the turned blow, the challenge) that tanking rides on.

Builds on: THE OPEN LADDER / HONED-ART / CALLING / FOCUS / FREE HAND laws
(docs/techniques-v2-plan.md), THE THREAT LAW (shared/sim/damage.ts), THE
SIGNATURE LAW (docs/fx-signature-plan.md), the shield render epics
(render/shields.ts).

---

## Part 1 — The laws

### THE WALL'S LESSON (training law)

Today a blow that gets through trains defence (`dmg * 3` at the mitigate site)
and a blow that is fully turned trains **nothing**. The new law completes the
duality:

> **What gets through trains the flesh; what the wall stops trains the wall.**

At the one mitigate site (`damagePlayer`), when an offhand **shield** is
raised and a real blow arrives (`raw > 0`, not a DoT — DoTs are already
inside the armor):

- `blocked = raw - dmg` (post-mitigation, pre-soak) grants **shield XP
  `blocked * 3`** — symmetric with defence's `dmg * 3`.
- Defence XP is untouched. Whiff-0 stays sacred: a missed swing teaches no one.

### THE DISCOVERED WALL (hidden-skill law)

`shield` is a **hidden skill** (the dualwield rail): invisible until the deed.
The deed is the first real blow that lands on a raised shield. The server
creates the row, speaks the discovery, and from then on the skill lives in
the Combat Arts wing. No new table, no new protocol.

### THE RAISED WALL (mitigation law)

The skill must matter in the math, not just the ledger. With a shield
equipped, the mitigate site adds `shieldLevel * SHIELD_ARMOR_PER_LEVEL`
(0.5) bonus armor — i.e. 1.5 armor-class rating per shield level, only while
the wall is up. The THREAT LAW pipeline itself is untouched (same
`mitigate()`, same cap 0.75, same attacker-level pierce); the shield is a
*contribution at the call site*, exactly like Bulwark's planted stance.

### The three new rails

1. **Buff armor** — `AbilitySelf.armor` → `PlayerBuff.armor`, summed into
   the armor term at the mitigate site. The stance rail: until now the only
   defensive buff channel was `shieldHp` (flat soak after mitigation).
2. **THE TURNED BLOW** — `AbilitySelf.reflectFrac` → `PlayerBuff.reflectFrac`:
   a fraction of post-mitigation damage is returned to the striking NPC
   (resolved inside `damagePlayer` via `opts.sourceEid`, so melee, bolts and
   blasts all answer). Reflected damage is dealt in the shield style — the
   wall's own damage trains the wall.
3. **THE CHALLENGE** — `AbilityDef.tauntRadius`: at the cast's final position
   (the same spot THE COMPOUND LAW applies `self`), every hostile-capable NPC
   in the radius is force-switched onto the caster via `npcAggro` — the decoy
   force-switch precedent, now a knight's shout. This is the game's first
   player-held taunt.

### THE FREE HAND holds

Shield arts slot on R like any art, unlock on **shield base level**, and a
cast scales by and trains the shield school (the sneak precedent: gear damage
mult aliases `shield → melee`; there is no shield gear-damage axis). The slot
is never gated by what's in your hands — a bare-fisted challenge is legal,
just unwise.

### Combat level

`shield` stays OUT of `combatLevel` (like sneak and dualwield): the wilds
size you up by staying power and strike; the wall is how you cheat that math,
not part of it.

---

## Part 2 — The ladder (10 rungs + 1 page)

Rung table per THE OPEN LADDER: 5/10/15/20/25/30/35/40/45/50. Damage arts
(band-checked, PAYOFF-bracketed): 5, 15, 35, 40, 45. Utility arts
(damage < 3, band-exempt): 10, 20, 25, 30, 50.

| Rung | Art | Shape | The mechanic |
|---|---|---|---|
| 5 | **Shield Bash** `shield_bash` | melee_arc | The face of the wall into a jaw — damage, shock stagger, knockback. |
| 10 | **Set the Wall** `set_the_wall` | self_buff | The stance: buff armor for a stretch (rail 1's showcase). |
| 15 | **Shield Rush** `shield_rush` | dash_strike | Drive through behind the boss — line damage, heavy shove. |
| 20 | **Draw Iron** `draw_iron` | nova | The challenge: token damage, `tauntRadius` turns every blade in the yard to you. |
| 25 | **Shield Roof** `shield_roof` | self_buff | Pull the sky to arm's length: a deep `shieldHp` soak, slower steps. |
| 30 | **Turned Blow** `turned_blow` | self_buff | The reflect stance: what strikes the wall belongs to the wall. |
| 35 | **Rampart Break** `rampart_break` | ground_aoe | The rim driven into the earth — blast, chilled footing. |
| 40 | **Wheel of Iron** `wheel_of_iron` | projectile_fan | The thrown shield, spinning out and **returning** (the `returns` rail). |
| 45 | **Hold the Line** `hold_the_line` | ground_field | The held ground: a pulsing yard that batters and chills whoever stands in it. |
| 50 | **Unbroken** `unbroken` | self_buff | The great stand: armor + soak + reflect at once; Rank IV closes wounds as it holds. |
| page | **Champion's Wall** `champions_wall` | pulse_nova | Unwritten page, anchor 30. Deed: fell a **champion** with a shield on your arm. A ringing wall that pulses outward and dares the survivors (taunt rider). |

Every art carries 3 rank steps (II sharpens, III adds the utility beat, IV is
the signature flourish), a bespoke FX face, an icon plate, a named-centerpiece
signature, and VOICE bench copy. Balance is settled by the contract tests
(LADDER MODEL band, monotonic ranks, PAYOFF BRACKET, seeker law) — never
by ear.

## Part 3 — The Callings (20/60) and perks

- **Shieldarm** (20, 1 Focus) — `perk: shieldArm`: +3 armor while a shield is
  raised. The everyman tank perk.
- **Ironback** (60, 2 Focus) — `perk: shieldThorns`: +4 thorns while a shield
  is raised. The wall bites back.

Both are new `PerkId`s with one-line hook sites at the mitigate/thorns sums,
tagged with the calling names per the registry convention.

## Part 4 — The visuals

- **The block spark**: a new `S2CFx` kind `'block'` (protocol v18) emitted
  from the mitigate site when the wall eats a real bite of a blow, throttled
  per player (≥8 ticks apart). The renderer draws a bespoke rim-spark — the
  shield SAYS it blocked.
- 11 FX faces (uniqueness-law compliant), 11 plates, 11 signatures in a new
  `fxSigsShield.ts` (`SHIELD_SIGS`), each with a named centerpiece.
- Skill face: the tower shield in frost-steel; the school joins the Combat
  Arts wing (hidden until discovered).

## Part 5 — What does NOT change

- THE THREAT LAW pipeline functions and their tests.
- Defence: its XP, its gating of shield equipment, its Callings.
- The FREE HAND: no equipment gating on the technique slot, ever.
- Loot/economy: no new items in this epic — the trophy rack already hangs.
- Protocol shape beyond the additive `'block'` fx kind.
