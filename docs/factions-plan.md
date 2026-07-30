# Factions & Reputation — The Name You Carry

> STATUS: GREEN-LIT 2026-07-30. Phase 1 (The Ledger of Names) SHIPPED
> 2026-07-30 — protocol v21, db v11, content doc kind 'factions',
> `faction:` namespace, the creditStanding one door + border law,
> Standing screen (L). Phase 2 (The Watch Has Eyes) SHIPPED same day —
> per-player enforcement through the one scan + one aggro door, camp
> peace, assault/slay deeds, the closed throat + fineActor carve-out,
> nameplate inks, Aldis's standing-gated greetings. Phase 3 (The Price
> of a Name) SHIPPED same day — band-priced shops (the mirror law) with
> tag-truth on the wire, the fine counters at all four fineActors, three
> penance repeatables, and the band-crossing ceremony. Phase 4 (The Two
> Roads) SHIPPED same day — the Tollhouse authored site with Ferrick the
> Company's Tongue (low-road quests with authored opposition costs, the
> blood-price), the opposed pair (lean_winter vs herd_stands via quest:
> forbids), the Rookery ladder paying standing. Phase 5 (The Light
> Fingers) SHIPPED same day — sneak-interact pickpocket over the
> authored actor pockets, the witness law (sightLine or unswayed), the
> per-unit stolen facet (no-laundering removeItem, fence factions =
> rookery/reavers via Calder's counter + Ferrick's Company's Cut),
> authored bank-vault locks picked at the sneak gate, town-chest theft,
> and the suspect eye in the perception scan. Phase 6 (The Studio Owns
> the Names) SHIPPED same day — the CMS Factions bench (roster cards
> with member/enforcer/fine-counter pickers, every dial group, derived
> consequence pills, save-live/revert on the two-hash law), the
> Dialogue Studio's political gates in the flag palette + the standing
> simulator in rehearsal (band dials answering faction: gates — walk a
> tree as an outlaw without becoming one), and the World Studio's
> Standing lens (marches at the honest marchTiles radius, ⚖ fine
> counters at their live posts). THE EPIC IS COMPLETE.

The world already *moves* (Living Frontier) and *asks* (Quest Ledger). This epic
makes it **remember who you are**. Every deed writes on the player's name; every
throat, gate, and counter in the Dawnlands reads it back. The mandate:

> Players align themselves and truly have an impact — actions reflect on your
> character, Fable-style. Become good or bad. Befriend a town and earn better
> standing and prices; attack its guards and its people close their doors, the
> watch attacks on sight. Factions oppose one another — aligning with one
> unaligns you with the other. Amberford and Silverfall join the same system.
> Every path has pros and cons; the player can stay neutral, be a hero, or go
> nefarious. Deep, integral, industry-leading.

---

## Ground truth this builds on (code-verified 2026-07-30)

- **There is no per-player NPC disposition anywhere.** `NpcComp` holds ONE target
  slot and ONE interest slot (gameServer.ts:487, :493); `noAggroUntilTick` is
  body-global. Disposition is static content baked at spawn
  (`actorCombatDef`, actors/registry.ts:255 — the neutral clamp `aggroRange = 0`).
- **But the seams are single doors, all four of them:**
  - `npcPerception` (gameServer.ts:11931) already iterates **per player** and
    reads per-player state (level, sneak, hidden). Its master gate is
    `npc.def.aggroRange > 0` (:12227) — exactly why town watch never scans.
  - `npcAggro` (:11755) is THE one door into chase — every path routes through it.
  - `damageNpc` (:10127) is the one damage choke; its invulnerable-ward branch
    (:10159) is today's only "swing at the watch and it answers" mechanism.
  - `dialogueHas` (:7096) already answers two synthetic namespaces (`quest:`,
    `world:`) live at BOTH the tree-pick and mid-conversation choice gates.
- **The ledger anticipates us.** `PlayerComp.flags` doc-comment (:987) and
  `accounts.setFlag` (:400) both literally say "and — soon — faction state."
  The dialogue hook union (dialogues/types.ts:112) names "faction shifts" as its
  open socket. The actor layer's own law (actors/types.ts:18) says factions get
  their own defs referencing the actor slug — never a field inside `NpcActorDef`.
- **Every infrastructure pattern exists and is proven:**
  - Per-character rows: `character_quests` + `saveQuestRow` fire-and-forget at
    every mutation site (db.ts:598, accounts.ts:428, `persistQuest` :7534).
  - Live content doc: FRONTIER (`content_docs` kind row, `validateFrontier` /
    `replaceFrontier`, call-time reads, CMS Weather bench) — no migration needed
    for a tunables doc.
  - Quiet wire: `pushQuestAvail` sig-diff + `tickQuests` two-beat ticker +
    S2CQuests/S2CQuestUpd/S2CQuestEvent trio (full / quiet patch / ceremony).
  - Per-viewer marks: `questMarkFor` resolves client-side against the static
    `EntityMeta.actor` slug — nothing personal on the shared meta (:14194 pushes
    ONE meta to all sessions; this invariant must survive).
- **Shops are flat.** `ShopDef` stock rows carry fixed integer prices; sell is a
  hardcoded `value/2` (gameServer.ts:4023). The client renders prices straight
  from content (stationPanels.ts:1097) — a rep multiplier must be a **shared pure
  function** both sides call, or prices desync.
- **Crime has scaffolding, no mechanics.** Actor inventories are reserved
  "future: pickpocketing" (actors/types.ts:80); `doorLocks` is a stub waiting for
  "keys and ownership" (:1394); owned ground-drops already exist (30s windows);
  fence_calder + calder_goods + the whole Rookery are authored and mechanically
  inert. Perception's `sightLine` gives us honest witnesses for free.
- **No PvP** (all 5 `damagePlayer` call sites are NPC-side), no item loss on
  death. Out of scope here; nothing in this plan assumes it.
- **The lore spine already drew the map.** Waykeepers, the Toll War, Captain
  Aldis, the Crown of Silverfall, Mab's Rookery and its Arrangement with the
  crown, the Redmask reavers, road tolls — the factions below invent nothing;
  they give names to loyalties the dialogue has been paying for weeks
  (`mab_word`, `rookery_trusted`, `arrangement_kept`, `kings_peace_kept`…).

## Industry laws we adopt (research digest)

- **Bands, not numbers** (WoW hated→exalted): players remember "Trusted," never
  "+43." All gameplay reads bands; the raw value is bookkeeping.
- **The world performs your reputation** (Fable): reactions live in barks,
  prices, guard posture, and refusals — not in a menu. The menu just confirms
  what the street already told you.
- **Crime is witnessed, punishment is escapable** (Elder Scrolls): a bounty you
  can pay off beats a permanent mark. Every negative band has an authored exit.
- **Per-player outlawry** (Ultima Online, done kindly): the murderer is hostile
  *to the law*, not deleted from the game. His fun changes shape.
- **No farmable virtue** (GW2 anti-farm law, our own flood law): standing pays on
  deeds that end things (a quest turned in, a camp broken, a fine paid) — never
  on repeatable friction.

## The factions (the closed roster, v1)

Reputation is for **speaking parties only** — beasts, kobolds, and the dead have
threat, not opinions. Five factions, every one already alive in shipped content:

| id | name | pole | who |
|---|---|---|---|
| `fordgate` | **The Amberford Charter** | law | Aldis's watch, the bank, Amberford's traders and crafters; Dawnmead's vale folk fold in (one hearth-country) |
| `crown` | **The Crown of Silverfall** | law | King Aeriex's line, castle guards, Silverfall watch, the guilds, the Undercroft reeve |
| `waykeepers` | **The Waykeepers** | law (roads) | Kestrel's chapter, the outposts, the Last Lamp, the shrine road-faith (Sella, Edda) |
| `rookery` | **The Rookery** | shadow | Mab, Calder, Pike — quiet hands, no blood on the road, the Arrangement |
| `reavers` | **The Red Company** | outlaw | the Redmask line: brigand camps, road tolls, toll-keepers — the world's standing villains, courtable |

Three lawful standings that mostly rise together, two shadow standings that cost
you the light. Dawnmead deliberately has no faction of its own (the quaint nook
stays pre-political); the Undercroft's civilians read the crown's ledger.

## The laws of this epic

- **THE ONE LEDGER LAW** — standing is one table, one in-memory map, one choke:
  `creditStanding(player, faction, deed)`. Nothing else may write it, exactly as
  `setPlayerFlag` is the one flag door. Every delta prints a quiet system line.
- **THE BAND LAW** — gameplay reads BANDS (Hunted / Outlaw / Suspect / Neutral /
  Known / Trusted / Champion), never raw values. Thresholds live in the FACTIONS
  doc; a Studio edit re-bands the world on the next beat.
- **THE WORLD ANSWERS, EXTENDED** — `faction:<id>:<band>` (+ `atleast:`/`atmost:`
  forms) is a synthetic namespace beside `world:` and `quest:` — answered live,
  never stored, never author-writable. Deed history stays plain story flags.
- **THE BODY IS THE BORDER** — enforcement is guards' eyes and swords, never
  tiles, teleports, or invisible walls. Town entry for an outlaw is *possible
  and lethal*, which is the honest version of "barred." Per-player hostility
  rides the ONE perception scan and the ONE aggro door.
- **THE DEED IS PUBLIC** — standing moves only through named deed kinds with
  doc-owned values, at attributable moments (turn-in, kill, first blow, fine).
  No hidden drift; no dial the player can't narrate back.
- **THE TWO POLES LAW** — the opposition matrix is real: courting the Red
  Company bleeds the charters; serving the crown closes the Rookery's doors a
  crack. Neutrality is a position you keep by choosing it.
- **THE ROAD BACK** — every negative band has an authored exit: fines at the
  captains, penance work, story amends. Time alone never launders a name
  (default drift dial ships at 0).
- **MEMBERSHIP IS ITS OWN DEF** — the factions doc references actor slugs and
  bestiary id prefixes. `NpcActorDef` grows nothing (the actor-split law, quoted
  in actors/types.ts itself).

---

## Phase 1 — The Ledger of Names (standing exists, the world can read it)

The spine: persistence, the choke, the namespace, the wire, the first surface.

### 1.1 Content: `packages/content/src/factions/`

- `types.ts` — `FactionDef { id, name, sigil, blurb, members: string[] (actor
  slugs), enforcers: string[] (the subset that polices it), npcPrefixes:
  string[] (bestiary ids, e.g. 'brigand' → reavers), anchors: {x,y}[] (settled
  anchors whose bounties/watch credit this faction), refusals: string[] (VOICE-
  checked cold-shoulder barks), fineActor?: string }`.
- `factions.ts` — the FRONTIER pattern verbatim: `FACTIONS` live doc (kind
  `'factions'`, id `'world'`) = `{ roster: FactionDef[], bands: {...thresholds},
  deeds: {...values}, oppose: {...matrix}, prices: {...band multipliers},
  enforcerAggro, peaceBand, finePerPoint, driftPerDay: 0 }` + `AUTHORED_FACTIONS`
  freeze + `validateFactions` (unknown-key refusal, cross-refs actor slugs +
  anchor coords, named cross-laws: bands strictly ordered; every enforcer is a
  member; oppose values ∈ [0,1]; no faction opposes itself) + `replaceFactions`
  in-place swap + module-load self-check. **Never destructure a dial.**
- `flags.ts` — `FACTION_FLAG_PREFIX 'faction:'`, full-grammar RE
  `^faction:([a-z][a-z0-9_]*):((atleast|atmost):)?(hunted|outlaw|suspect|neutral|known|trusted|champion)$`,
  `parseFactionFlag`, exported from content index. Roster membership checked at
  validate time (a typo dies in the Studio, never gates a tree in silence).
- Shipped defaults (the doc's authored seed — all Studio-ownable):
  - Bands: hunted ≤ −60 · outlaw ≤ −30 · suspect ≤ −10 · neutral · known ≥ +15
    · trusted ≥ +40 · champion ≥ +75; clamp ±100.
  - Deeds: `quest` (authored per-quest, validator caps |Δ| ≤ 25),
    `bounty_honored` +5, `toll_broken` +8, `assault_enforcer` −8 (once per
    NPC-life per attacker), `slay_member` −25, `fine_paid` (restores to −10),
    `story` (dialogue hook, capped ±15).
  - Oppose: reavers↔{fordgate .5, crown .5, waykeepers .6}; rookery↔crown .0
    (the Arrangement holds — on paper); rookery↔fordgate .25;
    reavers↔rookery .25 (Mab's rule: no blood on the road).

### 1.2 Server: the ledger and the choke

- **Migration v11**: `character_faction_standing (character_id FK CASCADE,
  faction_id TEXT, standing INTEGER, updated_at BIGINT, PK(character_id,
  faction_id))` + the `migrateSqliteToPg.ts` table-list line. DAL trio beside
  `saveQuestRow` (load / upsert-fire / delete).
- `PlayerComp.standing: Map<string, number>` loaded at enterWorld (guests
  memory-only), + `repSig` wire guard. `standingBand(value)` pure helper in
  content (band law: one implementation, both sides import it).
- **`creditStanding(player, factionId, deed, mult = 1)`** — the one door:
  reads `FACTIONS.deeds` at call time, applies the opposition matrix
  (cross-deltas through the same door, no recursion into opposition-of-
  opposition), clamps, persists the touched rows fire-and-forget, prints the
  quiet line ("The watch marks it. Amberford Charter −8."), and on a **band
  crossing** fires the ceremony event + re-answers quest/dialogue availability
  (`pushQuestAvail` — a band can open a quest gate).
- **Sources wired in this phase**: `QuestDef.rewards.standing?: [{faction,
  delta}]` paid inside `questTurnIn` (validator: roster + cap); dialogue hook
  `{kind:'standing', faction, delta}` in `runDialogueHook` (the documented open
  socket); frontier `payBounty` credits `bounty_honored` to the anchor's
  faction; `notePoiKill` on a `road_toll` credits `toll_broken`.
- **The namespace**: `isFactionFlag` guard in `setPlayerFlag` (:7812) — answered,
  never stored; a `faction:` branch in `dialogueHas` above the plain-flag
  fallthrough (speakerless — the name is the player's, not the speaker's);
  refusal lines in BOTH validators' write sites (dialogue choice `set`, quest
  `rewards.flags`), + the closed-roster/grammar check in `flagList`.

### 1.3 Wire + first surface (protocol v21)

- `S2CRep` full push at bind: `{standings: [{faction, value, band}], members:
  {slug→faction}, prefixes: {prefix→faction}}` — the membership table rides the
  bind push so client truth follows live Studio edits, not the shipped seed.
  `S2CRepUpd` quiet patch (sig-diffed); `S2CRepEvent {faction, band, rose}` =
  the ONLY ceremony trigger (quest-event discipline). Changelog line in
  constants.ts; older clients rejected cleanly.
- **Standing screen v1**: dock glyph + `screenRep` action (the 11-step
  registration checklist from questLog is the template): one row per faction —
  sigil, name, band label, banded meter, one-line "what this buys you" from the
  doc blurb. No history log yet (phase 3 polishes).
- Dev levers: `/standing` (list mine), `/standing <faction> <value|band>`,
  `/deed <kind> <faction>`, `/represet`.

### 1.4 Tests

Content: validator (roster closed, bands ordered, grammar RE, unknown-key
refusal), band math pure tests. Server: credit/clamp/opposition/persist,
guest memory-only, band-crossing event fires once, `faction:` answered in both
dialogueHas call sites, setPlayerFlag refusal. **THE LADDER CONTRACT** (the
TTK-bracket idea transposed): pinned deed arithmetic — 4 enforcer assaults =
outlaw; one slain member + one assault < hunted; a fine always lands exactly at
suspect floor. Move these deliberately or not at all.

## Phase 2 — The Watch Has Eyes (the world enforces)

The heart of the Fable fantasy: the same street, a different reception.

### 2.1 Per-player hostility (one scan, one door)

- At `spawnActor`, the server derives `NpcComp.factionId?` + `enforcer?` from
  the factions registry (content never touches NpcActorDef). Bestiary spawns
  (brigands, toll-keepers) get `factionId` via `npcPrefixes` at `spawnNpc`.
- **Perception gate widens**: `(npc.def.aggroRange > 0 || npc.enforcer)`. Inside
  the per-player loop the effective engage circle becomes:
  - enforcer + player band ≤ outlaw with npc's faction → `FACTIONS.enforcerAggro`
    (default 9 tiles), sizing-up law and sneak multiply as ever — a level-80
    outlaw still walks past a level-10 gate guard *carefully*;
  - hostile member + player band ≥ `peaceBand` (default trusted) with npc's
    faction → **skip the candidate**: the camp holds its fire for a friend.
    Walking into a reaver camp as their trusted knife is the payoff of the
    whole dark road.
- **`npcAggro` gets the same predicate as its guard** (rally, cry-for-help, and
  splits route here — a peaceful camp must not be dragged onto a friend by one
  packmate's cry). Damage retaliation ALWAYS overrides both directions: a blow
  is a blow (`damageNpc`/ward-insult paths pass `force`).
- Leash, return-and-heal, search, standoff fuse, craven — all untouched. An
  outlaw's gate fight is the existing combat, just aimed by a new eye.

### 2.2 The deeds of violence

- **Assault**: the ward branch (:10159) and the general retaliation branch
  (:10299) charge `assault_enforcer` when the attacker is a player and the body
  is an enforcer — once per NPC-life (a `chargedEid` field beside `helpCalled`),
  so a fight is one deed, not forty swings. Whiff-0 stays sacred (a 0-roll still
  charged the insult — you drew on the watch).
- **Slaying**: `killNpc` charges `slay_member` against the fallen's faction for
  the killer + the participation set (the `questWounders` precedent), and pays
  the opposition matrix — breaking a reaver toll *earns* charter standing
  through the same one door. The watch itself stays invulnerable (the law never
  dies in v1 — deliberate; killing civilians is likewise impossible since
  friendly = no combat body, and stays so).
- Refusal at the door: `interactNpc` checks the actor's faction band before
  `pickDialogue` — at ≤ outlaw the throat closes: a rotating doc-owned refusal
  bark ("Walk on. The watch knows your face."), no dialogue, no shop, quest
  turn-ins to that faction's actors implicitly frozen. At suspect, everything
  works but authors get `faction:` gates for frosty variants.

### 2.3 The street tells you

- Nameplate tint (the three fill sites): enforcers who would attack you render
  their name in ember; a camp at peace with you renders in the friendly parchment
  tone. Resolved per-viewer from `S2CRep` membership + own bands against
  `meta.actor`/`defId` — the shared-meta invariant survives untouched.
- The alert glyphs already speak the rest (?/! ladder). Precedence chain stays
  alert > quest-ready > quest-offer; no new overhead glyph in this phase.
- Guard trees join the frontier's world-flag ladder: a `faction:` gated
  greeting for known/trusted ("The wall sleeps better with you on the road"),
  the cold version for suspect. VOICE.md governs every line.

### 2.4 Tests + live recipe

Per-player predicate unit tests (enforcer sees outlaw at 9, ignores neutral;
peace skips candidate; rally can't pull a peaceful body; retaliation overrides
peace). Playwright: fresh account (the sizing-floor gotcha), assault Aldis's
gate watch → outlaw → walk the North Gate and get run down → `/standing` fine
→ walk it again in peace. Stage with the Phase-3 frontier pipeline recipe.

## Phase 3 — The Price of a Name (commerce and the road back)

- **Prices read bands**: `standingPriceMult(band)` pure in content (champion .88
  · trusted .94 · known .97 · neutral 1.0 · suspect 1.12; doc-owned) — `shopOp`
  applies it server-side at :4004/:4023, the shop panel calls the same function
  against its pushed bands, so both sides always agree. At ≤ outlaw the shop
  hook refuses before opening ("Your coin's no good here."). The shopkeeper's
  faction = the actor's membership; unaffiliated shops (peddlers) trade flat.
- **Fines**: the faction's `fineActor` (Aldis, Kestrel, the castle guard
  captain, Mab, and a Red Company go-between come Phase 4) carries a
  `faction:`-gated tree: fine = `finePerPoint × deficit below −10`, paid
  through the coins item like any shop op, restores standing exactly to the
  suspect floor (you buy back the courtroom, never the hearts), stamps
  `fine_paid` through the one door. No coins, no deal — go earn them somewhere
  the watch isn't.
- **Penance**: 2-3 repeatable quests per lawful faction (the repeatable rail
  exists) gated `faction:<id>:atmost:suspect` — visible only to the disgraced,
  paying standing not coin. The road back is work, and it's authored.
- **Ceremony polish**: band crossings get the questBanner treatment (quiet card
  falling, rays rising), `sfx` pair, standing screen gains the last-deed line
  per faction and the band's concrete effects legend.

## Phase 4 — The Two Roads (the dark path becomes content)

Everything above is machinery; this phase is the *game*. All content-shaped —
trees, quests, one new actor — riding rails from Phases 1-3.

- **The Rookery ladder**: Mab's existing arc (`mab_word`, `the_gilded_cage`,
  `arrangement_kept`) re-gates on `faction:rookery:atleast:known`; new work from
  Calder and Pike for the sneak-inclined; rookery standing buys the fence's real
  stock and the Broken Lantern's back-room trees. Crossing the crown for Mab
  costs crown standing through authored `standing` hooks — the Arrangement is
  real until *you* strain it.
- **The Red Company envoy**: one new authored actor at a fixed wild site (the
  first_road_toll cell has been waiting) — a toll-broker who talks to anyone at
  reaver ≥ suspect-clear and offers the low road: quests that bleed the charters
  (spook a caravan, dowse a waystation lamp, carry a red mark) with authored
  opposition costs stated in the offer. At trusted, camps hold fire (§2.1) and
  toll bars wave you through — the world's villains become your countryside.
- **Opposed pairs**: 3-4 quest pairs where the charter's ask and the company's
  ask are the same event from two sides — take one, the other's giver closes for
  that cycle. The player's slate becomes a stance.
- **Every zone joins**: Amberford and Silverfall watch/citizen trees gain one
  `faction:` texture node each where it pays; Dawnmead stays innocent.

## Phase 5 — The Light Fingers (theft, witnessed)

The crime layer, deliberately last — it stands on every prior phase.

- **Pickpocket**: sneak-interact on an actor (the reserved `NpcActorStock`
  finally earns its keep) — sneak-level roll vs. the mark; success skims
  authored stock; failure = the mark spins, cries (bounded-cry law), and the
  deed charges `theft_witnessed` if ANY faction body had `sightLine` to you
  (the perception epic gives honest witnesses for free — unseen is unswayed,
  the Thief fantasy and the Fable one in a single law).
- **Stolen goods**: skimmed items carry a `stolen` facet (quest-item precedent:
  a facet, not a new system) — town shops refuse them; `calder_goods` and the
  Phase-4 envoy pay full price. The fence dialogue finally means something.
- **Locks learn owners**: the `doorLocks` stub grows town ownership — a locked
  town door picked (sneak gate) is `theft_witnessed` if seen. Scope guard:
  container theft inside homes rides the same witnessed check on the chest
  interact; no new inventory UI.
- Dials all doc-owned (`theftBase`, `witnessRadius` cap, stolen-price mult).
  Charter/crown standing gates how hard the watch looks (suspect → they watch
  the sneak-crouch itself: standing feeds `sightRange` mult, one line in the
  per-player loop).

## Phase 6 — The Studio Owns the Names

- **CMS Factions bench**: the Weather-bench pattern — roster list (add/retire a
  faction = content-doc edit, validator cross-refs live actors), per-faction
  member/enforcer pickers against the actor registry, deed/band/oppose dial
  groups with derived consequence pills ("4 assaults = outlaw", "fine from
  hunted ≈ 312c"), authored-revert. Save steers the next beat; no restart.
- **Dialogue Studio**: `faction:` chips join the flag tray, rehearsal bench gets
  a standing simulator dial beside the world-flag tray (test a tree as an
  outlaw without becoming one).
- **World Studio lens**: a Standing lens tinting settled anchors by faction and
  marking fineActors/envoys — the living map learns politics.
- `/dev/content/factions` HTTP trio (GET/PUT/DELETE) beside the frontier route.

---

## What deliberately does NOT change

- **The flood law** — standing NEVER dials loot, drop rates, or gear rolls. No
  pity, no player-state faucets. Reputation pays in access, prices, peace, and
  story — never in tables.
- **Whiff-0 and the threat law** — combat math untouched; enforcement reuses
  the existing fight wholesale.
- **Friendly stays unhittable by construction** — civilian murder is not in
  this epic; the watch stays invulnerable. Violence against the lawful world is
  expressed through the assault deed, not corpses. (Revisit only on user ask.)
- **Towns are sacred** — tier 0 hosts no hostiles; an outlaw's danger in town is
  the watch, not spawns.
- **The shared EntityMeta invariant** — one meta per entity for all viewers;
  everything personal resolves client-side from pushed ledgers.
- **Parties** — no shared standing, ever; your name is your own. (Party quest
  credit already handles the shared-fight case.)
- **No PvP** — nothing here introduces player-vs-player harm.
- **VOICE.md** governs every bark, refusal, banner, and system line; the
  content-boundaries law (no witch/occult vocabulary) governs every name.

## Sequencing note

Each phase is independently shippable and player-visible: Phase 1 alone makes
standing real (quests and choices move it, dialogue reads it, the screen shows
it). Phase 2 delivers the headline fantasy — guards that remember. Phase 3 makes
it economic, Phase 4 makes it a story, Phase 5 makes it a playstyle, Phase 6
hands the whole ledger to the designers. Every phase ends with the workspace
suite green and a live Playwright verification recipe in the session notes.
