# THE FILLED HALL — the authoring brief for one ladder

*Callings v2, the content epoch. Read this whole page before you write a seat. The platform is
`docs/callings-v2-plan.md` (the constitution); this brief is what an author needs at the bench.*

## What a Calling is

A Calling is the **character axis** of a build — the class. A player answers Callings under a Focus
budget that can never hold everything (max 102 against a 650-point hall), toggles them freely, and
unlocks them by BASE level up a skill's ladder. What you hold answered IS your class: the smith who
fights, the archer who forages by night, the shield-wall that heals when pressed. Every Calling must
**bend a decision** — a player should feel it in the first minute and build around it in the first
hour. Nothing quiet, nothing cheap: a package that only nudges a number is a failed seat.

**THEME IS THE ROOT, NOT THE FENCE.** A Calling belongs to its skill by *story, seat, and ceremony*;
its benefits may land anywhere. The smith's calling may sharpen a sword arm; the fisher's may steady
a bow. Only the trade dials (`doubleGather / gatherSpeed / materialSave / craftSpeed`) stay keyed
to their own trade. Every ladder must send at least **three** seats outward — benefits that land
outside its own trade — and every ladder must feel like *that* skill's people wrote it.

**Content boundaries (hard law):** no witches / witchcraft, no demons / demonic / occult anywhere.
Skeletons, goblins, ruins, dungeons, the fey, the wild, the old kings — all fine.

## The ladder — THE SIXTEEN RUNGS

Sixteen seats, one each at **5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80**.
Price follows the seat (`focusCost`): **1** for seats 5..35, **2** for 40..75, **3** at 80.
Every seat is honed **I → IV** (three authored `ranks` steps); rank entitlement derives from level
by the technique clocks (stride 15 under 54, shortened above; a seat at 80 masters by 98).
Holding a deeper rank costs +1 Focus per rank past I — depth is a choice you afford.

**THE NO-LOSS LAW:** the founding rows already in your file keep their `id`, `skill`, and
`unlockLevel` exactly. Deepen their packages, add their ranks, keep them at least as good as they
were — but never move or rename them.

**Ladder arc (the shape that plays well):**
- **5 – 15**: three clean identities, one entry each. The level-5 seat is a new hand's first
  "I am a something" — legible, immediate, thematic. Cheap seats a fresh budget of 3 chooses among.
- **20 – 50**: the verbs arrive. Procs, when-clauses, perPiece, the trade rhythms. Two entries a
  package is normal here. At least one seat READS a page (a synergy answer) and one LAYS a page.
- **55 – 75**: packages of two or three entries; the outward seats live here (the master smith's
  sword arm, the herbalist's poisoned edge); the ladder's own synergy pair closes.
- **80, the capstone (cost 3)**: the master's seat. Usually THE MASTER'S LICENSE (an `art`) plus a
  dial, or the ladder's signature proc at its fullest — the thing a 99 in this skill is *for*.

**Rank steps** replace the package WHOLE (restate every entry you keep). Each step must change
something; a shared dial may climb at most **2.5×** I→IV; each `note` is one player-facing line
(≤90 chars) saying what deepened. Rank IV is where a package may grow its second verb — the
signature flourish. Rank II/III deepen numbers or lengthen durations; do not invent a new calling
under the same name.

## The vocabulary (ONE GRAMMAR)

Types: `packages/content/src/callingTypes.ts`. Proc grammar and status pages:
`packages/content/src/equipment/enchants.ts`, `packages/shared/src/sim/statusBook.ts`.
20 ticks = 1 second.

| kind | shape | notes |
|---|---|---|
| `gear` | `{ kind:'gear', effect: EnchantEffect }` | aggregate kinds only: `armor`, `maxHp`, `regen` (per 4s), `skill` (+levels to a skill, effective not base), `styleDmg` (pct, style onehand/twohand/polearm/archery/arx), `elementDmg` (pct, ember/frost/storm/verdant/void/radiant/blood/arcane/astral), `crit` (pct), `cooldown` (pct), `speed` (pct), `thorns`, `onKillHaste` (ticks), `vsState` (pct vs bodies carrying a page; HIGHEST WINS across sources). **Never** strike kinds (`onHitStatus`, `lifesteal`, `backstab`) and **never** `swingSpeed` (THE SWING BUDGET). |
| `perPiece` | `{ kind:'perPiece', armorClass, speedPct?, maxHp?, armor? }` | scaled by worn pieces of that armor class (cloth / leather / plate...). |
| `perk` | `{ kind:'perk', perk: PerkId, magnitude }` | one-site dials, listed with their meaning and units in callingTypes.ts (`PerkId` comments) and their fold law (`PERK_FOLD`: mult dials default 1, sum dials 0, `drawMoveFactor` max, `offhandDelayTicks` min). |
| `doubleGather` / `gatherSpeed` / `materialSave` / `craftSpeed` | keyed to YOUR skill only | trade rhythms; across answered callings the BEST wins (max chance / max gatherSpeed mult / min craftSpeed mult) — two seats on the same dial do not add. |
| `proc` | `{ kind:'proc', proc: ProcEffect }` | THE WAKING HAND. `id` MUST be `calling:<your calling id>` (one meter per calling), `name` ≤24 floats when it wakes. Triggers: `hit{chance}`, `hitState{status,chance}`, `crit`, `kill`, `hurt{chance}`, `block`, `cast`, `lowHp{pct}`, `cadence{every≥4}`, `stacks{per,count 4..8}`, `gather{chance}`, `stride{tiles}`, `stateApplied{status}` (you laid that page — the synergy hinge). Actions: `status{status,power,ticks}` (needs a foe), `bolt{damage}` (needs a foe), `nova{damage,radius}`, `chain{damage,jumps}`, `ward{absorb,ticks}`, `heal{amount}`, `surge{stat: speed/armor/crit/damage/regen/swing, pct, ticks}`, `cleanse`, `yield{extra}` (gather only), `reveal{radius, of: node/foe}`, `boon{status,power,ticks}` (a boon page on YOURSELF: quicken / mend / stonehide). `procMismatch` must be null. Damage moments rest ≥160t; every proc has icd > 0. **One proc per package** (per rank). |
| `when` | `{ kind:'when', cond, grant }` | THE WHEN CLAUSE: a held buff while the condition is true. Conditions: `hpBelow{frac}`, `hpAbove{frac}`, `still`, `moving`, `shieldRaised`, `underground`, `night`, `day`, `stateRiding{status}`, `wellFed`, `sneaking`, `mounted`, `wielding{style}`, `dualWielding`, `petOut`, `inCombat`, `outOfCombat`, `outnumbered{count 2..6}`. Grant: `{ name (≤24, the chip), armor?, speedMult?, attackSpeedMult? (≤1.08), critPct?, dmgMult?, regenPer4s?, reflectFrac?, meleeLifesteal?, gatherSpeed?, quiet? }` — at least one field must move. |
| `art` | `{ kind:'art', ability }` | THE MASTER'S LICENSE: while answered, that art seats in either technique seat whatever its rung, deed, or teaching weapon says, and casts at max(its natural rank, this calling's applied rank). Set the calling down and the seat sleeps (never empties). The ability must be in the technique pool: a rung art (`TECHNIQUES` in `packages/content/src/abilities.ts`), an unwritten page, or a secret weapon-art (`SECRET_ARTS` in `packages/content/src/secretArts.ts`). One license per package. |

**Pages in the book** (the synergy currency): hostile — `burn` (tick damage, power = per-tick),
`chill` (slow), `shock` (reaction fodder), `bleed` (per-source DoT), `venom` (per-source DoT),
`sunder` (takes +power%), `root` (hold ≤2s), `stagger` (brief hold), `weaken` (deals −power%);
boons — `quicken` (count stacks, swing haste), `mend` (heal power per second), `stonehide` (3 coats
of +4 armor, fading). Reactions: burn+chill Thermal Shock, burn+shock Combust, chill+shock Shatter.
Precedent powers/durations from the enchant roster: chill p2 90t, bleed p3 100t, burn p2 70t;
heal 18..60; ward 26..90 absorb over 120..200t; surge crit 12% 80t, speed 20..28% 70..90t; damage
procs 9..26 (novas low, bolts high).

**Synergy by vocabulary, never by lookup.** A ladder LAYS pages (`status`, `boon`) and READS pages
(`stateApplied`, `hitState`, `vsState`, `stateRiding`). Design your ladder so that at least **two
distinct pages are laid** and **two are read** across its sixteen seats, and so that at least one
read answers a page some OTHER skill's people would plausibly lay (an herbalist's venom, an arx
hand's burn, a smith's sunder). You are not authoring pairs — you are authoring hinges. Note in your
report which hinges you built and which you expect other ladders to meet.

**THE REGISTER.** Every page your ladder lays or reads needs a row in your file's `*_LICENSES`
array: `{ calling, status, via }` with `via` one of `lay:status`, `lay:boon`, `read:stateApplied`,
`read:hitState`, `read:stateRiding`, `read:vsState`. No row → fault. A row nobody touches → fault.

## Numbers that are FELT (the ledger's floors)

A dial-only package must move at least: armor 4, styleDmg 6%, elementDmg 6%, speed 5%, crit 2%,
regen 1, cooldown 5%, maxHp 6, skill 3, thorns 3, vsState 6%, onKillHaste 10t — or carry a verb
(a proc, a when, a trade rhythm, a perPiece, a perk, an art). Prefer FELT over floor: a level-5 seat
at +5% speed is a decision; +4 armor at level 60 is not (bring a verb). Precedent scale for gear:
tier-4/5 enchants carry armor 1..10, speed 1.5..4%, styleDmg 4..10%, cooldown 12%, maxHp 6..25.
A calling is a class choice, not one enchant — a rank-I gear entry sits around a strong enchant, and
rank IV around two.

## Voice

Names ≤24 chars, evocative, the skill's own dialect (a smith speaks in tempers and quenches; a
forager in hedgerows and seasons); no two names alike across the hall. `desc` ≤90 chars, one honest
line: a fiction clause and a mechanic clause ("Years of tasting your own brews. Poison and burning
grip you weakly."). Rank notes ≤90 chars, plain about what deepened. **The dash ban**: no em dash,
en dash, minus sign, or `--` in any player-facing string. Colors `#rrggbb`, chosen from the skill's
palette (read the founding rows' colors), varied across the ladder.

## Where you write, how you check

- Your file: `packages/content/src/callings/<skill>.ts` — the `*_CALLINGS` array and the
  `*_LICENSES` array. Touch NO other file. Do not add perks, conditions, statuses, or actions;
  put every want on the **wishlist** in your report (kind, name, meaning, why it is worth a hook).
- Audit (the same laws the gate reads): from `packages/content`,
  `npx tsx scripts/callingAudit.ts <skill>` — prints your ladder at every rank and every fault.
  Loop until it says `lawful.` Then `npx tsc -p . --noEmit` from `packages/content` must be clean.
  Do NOT run the whole test suite or `tsc -b` (other ladders are being written beside yours).
- `npx tsx scripts/callingAudit.ts --synergy` shows the hall's register as it stands.

## Report (your final message is data, not prose)

Return JSON: `{ skill, seats: [{seat, id, name, cost, oneLine, kinds: [..], outward: bool}],
licenses: [..], laid: [pages], read: [pages], hinges: [{page, expects: 'who might lay/read it'}],
artLicensed: [{seat, ability, why}], outwardSeats: [ids], faults: 0, wishlist: [{kind:
'perk'|'condition'|'grant'|'action'|'status'|'trigger', name, meaning, why, wouldReplace?}],
notes: '≤600 chars of design intent' }`.
