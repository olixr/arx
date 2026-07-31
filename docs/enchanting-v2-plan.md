# THE BOUND WORKING — enchanting v2

Arx is the energy and the matter that binds the world. Enchanting is the craft of
pressing some of it into a thing you carry, and having the thing answer.

This document is the proposal. It audits what enchanting is today, names what is
missing, and lays out six phases. Nothing here is shipped.

---

## 1. What exists today (the honest audit)

Enchanting already has real bones. `packages/content/src/equipment/enchants.ts`
carries the whole roster; `roll.ts` folds it into gear stats; the client already
paints weapon enchants and a tier-3 aura.

**The carrier.** One enchant per instance, in `ItemRoll.ench`
(`shared/src/rarity.ts:71`). It is bonded by USING a scroll, and applying takes
no skill at all, so a town's one enchanter powers up everybody's gear. That law
is good and stays.

**The routing.** Effects split two ways and this is the system's best idea:

- AGGREGATE effects fold into `GearStats` once per equipment change
  (`roll.ts:211 foldEffect`) and are never recomputed per hit or per frame.
- STRIKE effects (`onHitStatus`, `lifesteal`, `backstab`) are read at hit time
  from the weapon instance that landed, so two dual-wielded blades carry two
  different edges and each fires only when its own steel connects.

**The roster.** 38 enchants, 14 effect kinds, 3 tiers, 8 slots.

**The visuals.** `enchantedStyle()` (`rig.ts:4952`) re-aims the weapon painter's
mote channel at the enchant's element. `enchantAura()` (`renderer.ts:26101`)
gives tier-3 wearers a breathing corona that becomes a real scene light after
dark.

### 1.1 The seven holes

**1. The ladder stops at 54.** The highest enchant in the game is Dawnflash Edge
at enchanting 54. The skill caps at 99. **Levels 55 through 99 have nothing to
inscribe.** Forty-five levels of a named trade with no content in them is the
single largest defect in the system, and it is invisible in code review because
every individual enchant is fine.

**2. Armor enchants are invisible.** `enchantedStyle` only takes `'blade' |
'staff'`. A Titanic Ward on your chest, Windborne Stride on your boots, Aegis
Rune on your offhand: on the body these show **nothing at all** until tier 3,
where they collapse into one generic corona that is identical for every slot.
The player who chased those enchants cannot see them and neither can anyone else.

**3. There is no proc grammar.** Four effects are conditional in any sense:
`onHitStatus` (rolls a chance), `lifesteal`, `backstab`, `onKillHaste`. There is
no on-crit, no on-kill, no on-block, no on-hurt, no on-cast, no low-health
answer, no every-Nth-strike cadence, no stacking build-up, no internal cooldown.
Every conditional in the game keys off one trigger: a landed basic attack.

**4. The slots are wildly lopsided.** Weapon 16, gloves 6, body 5, head 3, boots
3, offhand 3, **legs 1**, **cape 1**. A player kitting out legs has exactly one
choice, which is not a choice. Cape likewise, and it is tier 3 only, so capes are
unenchantable for 49 levels.

**5. Two elements are hollow.** Nine elements exist. `astral` has **zero**
enchants and no reagent. `void` has two and borrows `gloomsilk_thread`, a
tailoring material. `radiant` has two. The elemental identity the tints and
reaction tables promise is only real for ember, frost, and storm.

**6. Nothing comes back.** There is no disenchanting. Gear is a one-way sink:
scrolls go in, nothing ever comes out. The junk-drop problem and the
enchanter's material problem are the same unsolved problem, and solving one
solves both.

**7. Inscribing has no agency.** It is a recipe with a level gate. Two
enchanters of level 12 and level 96 inscribe the identical Keen Edge. Nothing
about the craftsman survives into the craft, so there is no reason to seek out a
master and no market above the recipe floor.

### 1.2 What must not be broken

- **The affix index law.** Affixes derive from `(rar, seed)` by pool INDEX
  (`roll.ts:28`). Affix pools may be renamed in place, never reordered.
- **The aggregate/strike split.** Aggregates fold once at equip. Strikes read
  from the landed instance. Any new effect must declare which side it lives on.
- **Never per-frame.** `GearStats` is cached. Visual work reads the appearance
  object, which already carries per-slot enchant ids on the wire since protocol
  v6, so most of Phase 2 needs no protocol change at all.
- **Applying stays skill-free.** The enchanter's work is in the scroll.
- **No occult vocabulary.** Arx is energy and matter, sigils are engineering.
  Nothing in this system reaches for the supernatural register.
- **docs/VOICE.md** governs every enchant name, description, and bench line,
  including the dash ban.

---

## 2. The design

Six pillars. Each becomes a phase.

### Pillar A — the trigger grammar

Today an effect is a flat record and the only conditional is an on-hit chance.
Generalize into **trigger x response**, with an internal cooldown.

```ts
type EnchantTrigger =
  | { on: 'hit';    chance: number }   // a landed basic
  | { on: 'crit' }                     // a critical landed
  | { on: 'kill' }
  | { on: 'hurt';   chance: number }   // a blow got through
  | { on: 'block' }                    // a raised shield turned one
  | { on: 'cast' }                     // an ability fired
  | { on: 'lowHp';  pct: number }      // crossing the line, downward
  | { on: 'cadence'; every: number }   // every Nth landed strike
  | { on: 'stacks'; per: EnchantTrigger; count: number }  // build then spend
  | { on: 'gather'; chance: number }   // a harvest tick completed
  | { on: 'stride'; tiles: number };   // distance covered
```

```ts
type ProcAction =
  | { do: 'status'; status: StatusId; power: number; ticks: number }
  | { do: 'nova';   damage: number; radius: number; element: ArxElement }
  | { do: 'bolt';   damage: number; element: ArxElement }
  | { do: 'chain';  damage: number; jumps: number }
  | { do: 'ward';   absorb: number; ticks: number }   // a damage shield
  | { do: 'heal';   amount: number }
  | { do: 'surge';  stat: SurgeStat; pct: number; ticks: number }  // timed self-buff
  | { do: 'cleanse' }
  | { do: 'yield';  extra: number }    // gathering only
  | { do: 'reveal'; radius: number; of: 'node' | 'chest' | 'foe' };
```

Every proc carries `icd` (internal cooldown, ticks). This is the law that keeps a
proc a moment instead of a texture: a 12% nova that can fire three times a second
is not a proc, it is a damage aura with extra steps.

**Stacks are the depth move.** `{ on: 'stacks', per: {on:'hit'}, count: 6 }`
gives a build-and-spend rhythm that a flat chance cannot: the player can *see*
it coming, which is the difference between a proc that feels random and one that
feels like a mechanic. Stacks get a HUD read (Pillar B).

Backwards compatibility: the existing 14 effect kinds stay exactly as they are
and keep folding through `foldEffect`. A proc is a new, separate member of the
`EnchantEffect` union: `{ kind: 'proc'; trigger; action; icd }`. Old enchants do
not change; old rolled items do not change.

**Routing.** Procs whose trigger is about your weapon landing (`hit`, `crit`,
`cadence`) are STRIKE effects, read from the landed instance. Procs about your
body (`hurt`, `block`, `lowHp`, `gather`, `stride`) are AGGREGATE, folded at
equip into a small per-player proc list. `kill` and `cast` are aggregate. This
keeps dual-wield honest: two edges proc independently, one pair of boots does not.

**Server truth.** Procs fire server-side and push an fx message. Cosmetic-only
visuals (Pillar B) derive client-side from appearance and cost nothing.

### Pillar B — THE WORN LIGHT (the visual grammar)

This is the pillar the whole epic is for. An enchantment the player cannot see is
a spreadsheet entry.

**The anti-mush law: one channel per slot.** A fully enchanted character wears up
to eight workings at once. If every slot glows the same way the character becomes
a blob. So each slot owns a *different* visual channel, in a different place, at
a different rhythm:

| Slot | Channel | Reads as |
|---|---|---|
| Weapon | the edge (existing) | light travelling the blade, motes off the staff |
| Offhand | the rune face | a sigil that sits quiet and **flares on block** |
| Head | the brow | a low mark at the temples; after dark, a real lamp |
| Body | the weave | rune dashes riding hem and seam lines, breathing slowly |
| Gloves | the knuckles | a flicker at the fists, brightest mid-swing and mid-craft |
| Legs | the greave lines | thin light down the thigh that **pulses in stride** |
| Boots | **the trail** | ground decals and shed motes behind a runner |
| Cape | the wake | motes shedding off the trailing hem as the cloth sways |

`armor.ts:50` already carries "glowing rune dashes riding the hem trim" as a
concept, so the body channel has precedent in the art to extend rather than
invent.

**The tier grammar.** Tier is loudness, element is hue, slot is place.

- **Tier 1** — a mark. One glint on a beat, no particles, visible mostly in
  motion or in the dark. Costs nothing and reads as "this is enchanted".
- **Tier 2** — a steady channel. The slot's own light plus sparse motes, and a
  small contribution to the scene glow after dark.
- **Tier 3** — the living corona at full voice, plus the slot signature. What
  exists today, but no longer collapsing every slot into one shape.
- **Tier 4/5** — a *named* working with a silhouette-touching element: burning
  footprints that linger in the grass, a comet wake off the cape, an aura blade
  standing a hand's width off the steel.

**The boot trail, specified.** Named explicitly because it is the request's
centrepiece and because ground-writing is the easiest thing in a 2D renderer to
get wrong.

- A trail is two things: a **ground decal** stamped at each footfall, and a
  **mote shed** while moving.
- **Speed-gated.** Walking leaves nothing, or one faint print. Running leaves the
  full trail. The trail is a reward for motion, never a permanent smear under a
  standing player. This alone is what keeps a town square legible.
- Decals **sort under the body**, respect `renderLift` for elevation, and fade in
  roughly 1.2s so a circling player does not paint the ground solid.
- Rate-gated on `frameDt` exactly like `statusAmbience`, so the effect costs the
  same at 30 and 144 fps.
- Per element, and each is a genuinely different read, not a recolor:
  - **ember** — scorch prints, edges still orange, ember flecks lifting off
  - **frost** — rime prints that whiten the grass, crystal flecks that fall
  - **storm** — a fading spark line between footfalls, the occasional arc
  - **verdant** — a small bloom that opens and wilts inside the fade
  - **void** — an inverted print: the ground *darkens*, flecks darker than body
    (the tint table already runs void inverted at `renderer.ts:392`)
  - **radiant** — a warm print that lights its own rim
  - **blood** — deep, slow, heavy
  - **astral** — a scatter of pinpoint stars that fade out of order

**The darkness law.** Tier 2 and up contribute to the scene light. This turns a
cosmetic into real play: an enchanted party lights its own way through the
underground, and a head enchant is a lantern you do not have to hold. Given the
lighting v3 system this is free value.

**The readability cap.** Ten enchanted players in a market must not become soup.
Concurrent auras cap by count and distance, remote players draw a reduced
channel set, and the trail stays the only system allowed to write on the ground.

**Stacks need a read.** A build-and-spend proc shows its charge on the body, not
only in a UI number: motes gathering tighter as the count climbs, and a visible
discharge on the spend.

### Pillar C — the long ladder

Take the roster from 38 to roughly 90, and run it to 99.

**Two new bands.**
- **Tier 4, greater workings** — roughly levels 58 to 78. One line per element.
- **Tier 5, masterworks** — roughly 80 to 99. One per element, nine total, each
  named, each with a signature proc and its own silhouette-touching visual.
  These are the things a player builds a character around.

**Fill the thin slots.** Every slot gets a full tier 1/2/3 line at minimum, which
alone fixes legs (1 today) and cape (1 today, tier 3 only).

**Finish the elements.** Astral gets a full line and becomes the school of
*perception and distance* (reveal, light, stride, fall). Void gets its own
reagent and a full line as the school of *absence* (stealth, silence, blunting).
Radiant and blood fill out.

**Non-combat is a first-class family, not a footnote.** The request named
gathering, exploration, and defense, and those are exactly where a customization
system earns its keep, because they compete with combat enchants for the same
slot. That competition IS the build decision.

- **Gathering** — on-gather procs: a chance at a bonus yield, a faster swing at
  nodes, bait that sometimes survives the bite, ore that announces itself.
  (Carefully distinct from the `gentle_hand` and `dust_thrift` Callings, which
  already own the doubling channel. Enchants take rhythm and reach; Callings keep
  thrift and doubling.)
- **Exploration** — light after dark, a softened fall, faster water, a mark that
  reveals an undiscovered site nearby, out-of-combat stride.
- **Defense** — a ward that answers a hard hit, a reflect on block, an emergency
  working at low health with a long internal cooldown.

### Pillar D — materials and the deepening economy

Twelve reagents today: arcane dust, five essences, gloomsilk thread, sunflower,
four gems. Sources are mining bonus yields, mob loot, and one forage.

**Disenchanting is the keystone.** Break a rolled item at the table into dust,
plus a chance at an essence keyed to the item's nature, scaled by rarity and
level. This single addition:

- gives enchanting its own gathering loop, which it does not have today,
- makes every junk drop in the game worth carrying home,
- closes the item economy's only open end,
- and gives the trade a reason to exist between inscriptions.

It should be the first thing built after the ladder, and honestly it may be the
highest-value item in this entire document.

**Refinement.** Five raw essence refine into one distilled essence at the table.
An XP method for the low bands, a required input for the high ones, and a sink
that keeps early-zone drops relevant at level 80.

**The missing reagents.** Astral needs one (night, height, the Pinereach). Void
needs its own instead of borrowing tailoring's thread. Void, radiant, blood, and
astral each need a tier-3+ gem so no line falls back to `gold_bar`.

**Placement.** New reagents get authored sources across the zone ladder so the
material chase walks the world rather than sitting on one table.

### Pillar E — the enchanter's hand

Give the craftsman a way to matter.

**Scroll quality.** A scroll inscribes at a quality derived from how far the
enchanter's level sits past the recipe's floor, plus Callings and station.
Quality scales the bonded enchant's magnitudes inside a band, roughly 85% to
115%. Consequences: a master's scrolls are worth real money, "who inscribed
this" becomes a question players ask each other, and the trade gets a market
above the recipe floor. Cost: one number on the scroll's roll.

**Resonance, not failure.** Never fail-and-lose-materials. Instead: an item that
already carries an enchant of the same element accepts a same-element working at
a discount; crossing to a different element costs an extra sundering step. That
is a choice with a shape, not a punishment with a dice roll.

**The bench.** The enchanting table gets a real face: what you are about to bond,
what it will replace, the quality band you personally will hit, and what the item
looks like after. Built on the existing station-panel skeleton.

**The trade's people.** Solvei the enchantress already exists with her own
dialogue and routine. The high bands want a teacher, a reason to travel, and
capstone recipes that are found rather than bought.

### Pillar F — the deepening (the ceiling)

**A second enchant on masterwork gear.** The endgame customization ceiling: a
rare working that lets one item hold two enchants.

This is the riskiest item in the document and it is flagged as such. One-per-item
is a clean law, and doubling it doubles the balance surface. It should ship last,
behind tight gates: high rarity only, a rare consumable, a high level, and a rule
that the two workings cannot both be from the same family. Implementation is an
additive `ench2?: string` on `ItemRoll`, so old instances are untouched.

If the balance pass says no, it gets cut without disturbing anything else in the
epic. That is why it is last.

---

## 3. Phases

**Phase 1 — THE DEEPER SIGIL.** The trigger/response grammar, internal
cooldowns, stacks, the server proc engine wired into the existing strike and
aggregate doors. No new content. Purely the loom.

**Phase 2 — THE WORN LIGHT.** The per-slot visual grammar: the boot trail, the
cape wake, the body weave, the knuckle flicker, the greave pulse, the brow lamp,
the offhand flare. Tier grammar, the darkness law, the readability caps, stack
reads, and fx signatures for the new proc kinds. Mostly client-side, because
appearance already carries per-slot enchant ids.

**Phase 3 — THE LONG LADDER.** Tiers 4 and 5, thin slots filled, elements
finished, the non-combat family. 38 enchants to roughly 90, and a trade that runs
to 99.

**Phase 4 — THE UNMAKING.** Disenchanting, refinement, the new reagents and gems,
and their sources placed across the zones.

**Phase 5 — THE ENCHANTER'S HAND.** Scroll quality, resonance and sundering, the
bench rebuild, Solvei and the high-band teaching, the enchanting Callings pass.

**Phase 6 — THE DEEPENING.** The second slot, the tier-5 named workings, capstone
acquisition, and the full balance pass across everything above.

---

## 4. Costs, honestly

- **Protocol bump.** New fx kinds for the proc vocabulary. One bump, Phase 1 or 2.
- **`ItemRoll` grows.** Quality in Phase 5, `ench2` in Phase 6. Both additive
  optionals, so both are legacy-safe, but both touch db and wire.
- **Balance surface.** Going from 4 conditionals to a trigger grammar with ~90
  enchants is a genuinely large tuning job. Phase 6 must budget for it rather
  than assume it.
- **Art volume.** Eight slot channels times nine elements times the tier grammar
  is the largest single body of work here, and it is where the epic either
  becomes the thing the request describes or does not. Phase 2 should not be
  rushed and should not be merged into another phase.

## 5. Open questions

1. **Do procs show damage numbers?** A proc that fires silently into the damage
   stream is invisible; one that floats its own number every 1.5s is noise.
   Leaning toward: named procs float their name once, not their number.
2. **Should tier 4/5 visuals be hideable?** Some players will want the stats
   without the corona. A cosmetic toggle is cheap and respects the wearer, but it
   also hides the thing the epic exists to show.
3. **Does quality apply retroactively?** Scrolls inscribed before Phase 5 have no
   quality. They should probably read as the band's midpoint rather than its
   floor, so nobody's stock is devalued by a patch.
4. **Is the second slot worth it at all?** Genuinely open. See Pillar F.
