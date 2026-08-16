# Polearm — THE LONG STEEL

A new weapon class at the foundational level: the polearm — spears, lances,
glaives, halberds, pikes. Its own skill, its own grip laws, its own carry,
its own strike grammar, its own twenty-art school. Design of record.

## Part 0 — The brief and the lore research

User brief (2026-08-16): a new weapon type, hugely important, with a unique
play style. Wieldable with a shield (one hand, long thrust — the knight) or
alone (two hands, damage boost — the polearm fighter). Dual-wield felt wrong
to the user — research D&D. A new skill with 20 techniques, new FX, custom
implementation borrowing family patterns but foundationally its own. Attacks
are pokes, jabs, thrusts — no slash or sweep unless the head carries a blade
(halberd, glaive). Charge fantasy and channeled multi-thrust both named.
Rigs, carries, idles, sheathes, and attacks bespoke per body rig.

The D&D 5e research, applied as verdicts:

- **VERDICT: the school is named POLEARM** (skill id `polearm`). In 5e the
  lance is a narrow "special" weapon (mounted use, disadvantage within 5 ft,
  two hands when unmounted, and NOT covered by Polearm Master); "polearm" is
  the family — glaive, halberd, pike, spear share the space. The user leaned
  polearm; the lore agrees. Lances live INSIDE the class as high-tier knight
  weapons.
- **VERDICT: the grip law is 5e's VERSATILE property.** The spear is the
  model: 1d6 one-handed (shield in the off hand), 1d8 two-handed — a 4/3
  damage step. Our polearm is technically a one-handed weapon; an empty off
  hand automatically takes the war grip and earns the boost. No toggle, no
  stance to manage — the off hand IS the toggle.
- **VERDICT: NO DUAL-WIELD.** 5e two-weapon fighting requires the LIGHT
  property; no polearm is light. The user's hesitation was correct. Polearms
  never pair, never sit in the off hand.

## Part 1 — The laws

1. **THE FAMILY NAME** — one skill `polearm` trains every haft: spear,
   lance, glaive, halberd, pike. The lance is the knight's subline within
   it, not a sibling class.
2. **THE VERSATILE GRIP** — the polearm equips as a ONE-HANDED weapon (the
   off hand stays open for a shield). Off hand empty ⇒ THE WAR GRIP: both
   hands on the haft, damage × 4/3 (the honest d6→d8 step), resolved live
   from equipment state at the damage door — never stored, never toggled.
   Off hand shielded ⇒ THE COUCHED GRIP: base damage, the wall and the
   point together. Grip is also a RENDER truth: the carry, the strike
   choreography, and the item card all speak whichever grip the body is in.
3. **NO SECOND POLE** — polearms are excluded from dual-wield discovery in
   both directions: a polearm never enters the off hand, and a polearm main
   hand refuses a weapon off hand (shield/off-hand tools only). Not light,
   never paired.
4. **THE REACH IS THE IDENTITY** — the longest melee in the game. Reach is
   paid for with windup and cadence, not given free; the CADENCE CONTRACT
   holds (class cycle DPS lands inside the melee family band, TTK brackets
   untouched).
5. **THE THRUST IS NOT A CUT** — a new strike school: world-authored LINEAR
   lunges down the yaw (corridor geometry), not arcs. The wake is a streak
   down the line, not a ribbon across it. Sweeps exist ONLY as hafted-blade
   payoffs (glaive/halberd pages) — the spear and lance never slash.
6. **EVERY BODY HOLDS IT ITS OWN WAY** — bespoke carry anchors per rig
   family (standard + stoop lane), both grips, idle/run/strafe/sheathe;
   wieldlab rows appended; the STRIKE MIRROR LAW and one-projection doctrine
   govern all eight facings.
7. **THE TWENTY** — a deep school from birth: 20 arts on the deep-school
   seating, ≥5 casted + ≥5 channeled (assertBreathWave), every art shipping
   WITH its three rank steps, its icon plate, its breath dialect, and its
   bespoke FX signature in the same wave. Zero debt at ship.
8. **BORROW THE RAILS, OWN THE VOICE** — implementation rides the standing
   engines (ComboTrack, moveset book, strikes engine, technique ladder,
   grantXp door) with zero new parallel systems; identity lives in the data,
   the geometry, and the choreography, all bespoke.

## Part 2 — The class design

**Grip mechanics.** `warGrip(player) = polearm equipped && offhand empty`.
Damage door multiplies × 4/3 under war grip. The knight build (lance +
tower wall) trades that boost for the shield school's cover — two real
builds from one weapon, the user's exact fantasy.

**Movesets (two pages).**
- *The Line of the Lance* (class default — spears, lances, pikes): jab →
  jab → DRIVING THRUST payoff. Branch on the payoff: HOLD = the skewer, a
  piercing corridor through bodies in the line; TAP = the quick withdraw,
  single body, fast recovery. Reach full on every beat; the payoff extends
  a half tile further (the lean).
- *The Reaper's Round* (glaives, halberds): thrust → HOOK (short pull) →
  MOULINET payoff, the one lawful sweep in the school.

**The charge and the flurry** (user-named fantasies) both live in the
school as arts: the charge as a dash-line art, the flurry as a channeled
multi-thrust. See Part 3.

**Roster.** ~20 bespoke polearms across the material ladder (bronze →
starsteel + drop/craft specials), painters bespoke per the blade-roster
precedent: hunting spears and warspears early, pikes and boar spears mid,
glaives/halberds/partisans upper-mid, lances at silver+ (the knight's
line), one starsteel crown. Exact table authored in Phase 1 with tier
damage bands read off the standing rosters.

## Part 3 — The twenty arts (draft slate; balance math at authoring time)

Instant strikes: Lunging Skewer (the opener), Haft Strike (butt-end bash),
Hooking Reap (the pull), Warden's Measure (brace buff), Knight's Charge
(THE charge: dash down the line, arrival blow), Crescent Reap (hafted
sweep), Skydriver Fall (vaulting leap, impaling landing), Gatebreaker
(shield-splitting heavy).

Casted (≥5): Perfect Thrust, Impaling Drive (corridor), Rampart Breaker
(armor shred), Banner Advance (line buff), Stormpoint (called strike).

Channeled (≥5): Flurry of Points (THE multi-stab), Wall of Points (braced
pike field), Moulinet Guard (spinning haft around the body), Serpent's
Tongue (alternating rapid jabs), Hold the Line (rooted cone).

Capstone at 90: **The Sundering Lance** — the full charge through
everything in the line, pierce and shock in the wake.

Names final at authoring (prose law, dash ban, uniqueness test). Every art:
3 rank steps, FX_STYLES hand, icon plate with the school glyph, breath
dialect from the matter library, signature in `fxSigsPolearm.ts`.

## Part 4 — The phases

REORDERED after the census: THE SECRET BAND prices weapon arts against
the school ladder's rung envelope, and every weapon MUST teach an art
(content.test.ts THE SECRET LEDGER) — so the armory cannot ship before
the twenty. The build order is therefore:

- **Phase 0 — THE CENSUS**: seam audit + this plan. DONE.
- **Phase 1 — THE HAFT**: the foundation, no content — skill + style +
  grips + gates + the class-default page. SHIPPED (as-built below).
- **Phase 2 — THE TWENTY**: the school's 20-art ladder + the full FX
  wave (plates, dialects, signatures), in band.
- **Phase 3 — THE CARRY AND THE CUT**: client render — PoleStyle
  painters, both grips' carries per rig, sheathe, the pole strike
  school, wieldlab rows.
- **Phase 4 — THE ARMORY**: the weapon roster + its secret arts, seats,
  and ranks (RANK_DEBT zero at ship).
- **Phase 5 — THE PROVING**: gates green, audit sheets judged, live rig
  walk, memory write.

### Phase 1 — THE HAFT: as-built (2026-08-16)

- `shared/skills.ts`: `polearm` in SkillId + SKILL_IDS (after twohand),
  `combatLevel()` strike max, COMBAT_SCHOOL_IDS (THE SHARED LESSON
  echoes free). Not hidden, no SKILL_NAMES row (the id reads as its
  name).
- `shared/sim/abilities.ts`: CombatStyleId + COMBAT_STYLES grow
  `polearm` — TECHNIQUE_STYLES, sendTechniques, and the codex gate all
  follow derived.
- `shared/sim/combat.ts`: THE REACHING SCHOOL section —
  `POLEARM_WAR_GRIP_MULT = 4/3` (the d6→d8 step) + the grip/pairing
  laws in prose; STRIKE_CLOCKS grows a polearm row (swing 340ms/8t,
  finisher 520ms/12t — between the sword's time and the mountain's).
- `content/items.ts`: CombatStyle + MovesetId (`line_of_lance`);
  THE TWO-HANDS LAW carries THE VERSATILE GRIP AMENDMENT — polearm
  equips one-handed; `isTwoHanded` excludes it. equipment.test.ts's
  two-hands pin amended deliberately (in-comment law).
- `content/movesets.ts`: THE LINE OF THE LANCE — jab/jab/IMPALE
  (sweepAll inside arcHalf 0.3: the corridor payoff, depth never
  breadth), TAP branch THE DRIVE (single body 2.75). Every beat
  authors its own narrow cone (THE THRUST IS NOT A CUT). Rate 1.286
  defines the polearm cadence band; drive 1.357 inside +10%.
  movesetFor grows the polearm arm; cadence-bands baseline added.
- `content/callings.ts`: founding pair — Longarm (20, poleReach 0.35)
  and Impaler (60, warGripBonus 0.1, riding beside the war-grip mult);
  PerkId + server Perks/defaultPerks grow both dials. Old Campaigner
  copy now says five schools (warSchooling covers polearm).
- `content/equipment/`: roll.ts styleDmgMult init, tables.ts plate
  +3% polearm (+blurb), enchants.ts worldbreaker_edge +polearm,
  naming.ts epithet `of the Lance`.
- `server/gameServer.ts`: THE VERSATILE GRIP at the one damage door
  (war grip = polearm + no held offhand, backMounted exempt; ×(4/3 +
  warGripBonus)); NO SECOND POLE shed branch beside the two-hands law
  + the login sanitize twin; poleReach in the strike range fold;
  coating gate takes oil on the haft; warSchooling schools five;
  FOUR ROADS stays FOUR by deliberate comment (the deed is named and
  walked — the haft's deeds live in its own school).
- Balance intent (recorded): cd 9, sword damage band, reach ~2.9–3.1
  (past the greatblade's 2.6 — REACH IS THE IDENTITY), base cycle ≈
  87% of the sword line beside a shield, war grip lands between the
  sword and the mountain.
- Client: deliberately ZERO edits this phase — no polearm items exist
  yet, so nothing can render or mispredict. SKILL_WINGS/SKILL_FACE/
  Reach-label and the STRIKE_CLOCKS mirror pick land with Phases 3–4.
- Gates at ship: shared green, content 567/567, client 617/617,
  tsc clean on my files (neighbor arena WIP red in their worktree
  hunks only), server suite run same session.
