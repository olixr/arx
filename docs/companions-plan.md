# THE COMPANY YOU KEEP — companions apart from tamed beasts

*As-built record, 2026-08-29. The user mandate: the house cat was
tamable through the beastcraft cast, occupied a beast stall, and rode
the whole pet machine as a "docile" special case. Companions are a
different idea — pure company, befriended not tamed — and deserved a
whole system of their own, so a keeper can walk with a tamed beast AND
a companion at once and never see the two systems touch.*

## The design pillars

- **ONE DOOR PER SPECIES.** A species is courted (TAMES, beastcraft,
  stalls, combat) OR befriended (COMPANIONS, a treat by hand, the
  company roster) — never both. Both roster validators refuse overlap,
  so the split can never silently regrow together.
- **COMPANY IS NOT A LESSER PET — IT IS A DIFFERENT THING.** No level,
  no xp, no bond ledger, no arts, no hp, no downed state, no stall, no
  skill gate. The absence of machinery is the design; the two UI rooms
  teach the split at a glance (instruments vs. a hearthside
  introduction; collar vs. whiskers in the dock glyph pair).
- **NON-COMBAT BY CONSTRUCTION, twice over.** First, the companion
  brain (tickCompanion) contains no fight block to reach. Second,
  every combat door checks the `companions` store beside `pets`
  (aggro, damageNpc, melee arc, projectiles, homing, snares, becalm
  sweeps, keeper arts, chase targeting) — even a future missed guard
  meets the second wall.
- **THE TWO HEELS NEVER COMPETE.** `PlayerComp.petEid` and
  `PlayerComp.companionEid` are separate; the calm counters, mirrors,
  dirty sets, and signature gates are separate; a wolf and a cat walk
  beside the same keeper.
- **THE BEFRIENDING IS A KINDNESS, NOT A LADDER.** Interact with a
  wild companion body while carrying its treat: refusals teach aloud
  (guest / company full / empty hands name the morsel), success
  consumes the treat, seals with the tame ceremony's bond-green burst,
  and raises the one naming card. Gentle the Wild aimed at a companion
  species refuses with a line that points at the right door.

## As-built map

- **Content** — `packages/content/src/companions.ts`: `CompanionDef`
  {species, treat, pat, flavor}, `COMPANION_DEFS` (cat: raw_trout),
  `companionErrors`/`companionRosterErrors` (damage-0, aggro-0, xp-0,
  no loot, no livestock, not in TAMES, no art shelf). The cat left
  `TAME_DEFS` (20 → 19) and `TameDef.docile` was deleted whole — the
  tame validator now refuses any damage-0 body back to the company.
- **Shared** — `sim/companions.ts` (COMPANION_CAP 3, its own follow
  dials — deliberately not imports from sim/pets), `EntityMeta.company`
  (what tells the two owned lanes apart on the wire; no collar, no
  level plate, never a fight offer), protocol **v35**: `CompanionInfo`
  / `S2CCompanions` (sig-gated mirror, ceremony slot) and
  `C2SCompanionOp` (heel/home/part, no tile gate) / `C2SCompanionName`.
- **Server** — db v44 `character_companions` (slot-addressed, thin:
  species/name/state/look_seed/met_at), **v45 the rescue** (every old
  tamed cat walks out of character_pets into the company, name and
  coat intact), v46 frees the stolen stall. `CompanionComp` store;
  `trySpawnCompanion` / `despawnCompanionEntity` / `tickCompanion`
  (follow only) / `tickCompanionTrailing` / `sendCompanions` /
  `companionOp` / `companionRename` / `tryBefriend`; join, logout,
  keeper death, and plane crossings all carry the company beside the
  pet. The two docile special cases (petDefend return-first,
  point_the_fang refusal) are deleted — structure replaced them.
  Dev lever: `/company` (list / grant / heel / home / part).
- **Client** — the old misnamed beast UI is renamed to what it is
  (`BeastHall` #beast-panel "Beasts", `BeastPlaque` #beast-plaque,
  beasthall.css/beastplaque.css, dock glyph `beast` = pawprint over
  collar, Quote key). The company got its own rooms: `CompanionsPanel`
  #companions-panel (rail of kept friends + THE STANDING with call /
  send home / rename / two-press part; empty state teaches each
  species' morsel concretely), `CompanionChip` in the northwest column
  (order 2 — THE NORTHWEST COLUMN law), dock glyph `companion` = cat
  skull + vertical pupils + whiskers, BracketLeft key. THE OFFERED
  HAND: the lure-badge painter answers for companion bodies too
  (green check = treat packed + a place open; no level state exists).
  'Befriend' is the interact verb on wild companion bodies; the pat
  stays a deliberate click (body or chip) and answers in the species'
  own words (`CompanionDef.pat`). The naming card grew a kicker
  parameter: A NEW COMPANION / THE WILD AT HEEL / A NEW CHARGE.

## Live-proven (isolated rig, lane 35: vite.config.rig35 → :5217/:8791)

Migrations v44–46 applied on a real db; /company cat → naming card
("A NEW COMPANION") + chip; roster panel verbs (home/call/part-arming);
wild befriend end-to-end with a real trout ("The cat takes the raw
trout from your hand, and decides you will do."); wolf tamed BESIDE
the companion — plaque (Wolf 12, collar, bond-green) and chip (Pip,
no collar, no level) stacked in the northwest column; both bodies
persisted across relogin AND a full server restart; the chip pat spoke
the cat's own line. Live-caught fixes: the chip's `display:flex` beat
the `[hidden]` UA rule (restated in CSS); companion nameplates showed
the species' wild level (buildMeta now deletes `meta.level` for
company); the panel grid crushed the dressPanel chrome (chrome rows
now span the columns).

## Deviations and debts

- Client suite verified green (736) before a neighbor session's
  in-flight pois/strongholds edit began throwing "invalid stronghold
  shelf" tree-wide; my later changes (CSS guard, buildMeta line)
  touch no client test surface. Reported to the peer; rerun after
  their land.
- The companion portrait uses the shared petPortrait pipeline
  unchanged; the cat's portrait reads more generic-quadruped than the
  world body. A portrait pass is a debt, not a defect.
- Future companions: add a row to COMPANION_DEFS (species must be a
  damage-0/aggro-0/xp-0/no-loot body) — the validators, UI invite
  list, badge, and befriend door all follow from the registry.
