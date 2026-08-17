# THE WATCHFUL GROUND — the trigger system
## + THE WATCH KNOWS YOUR FACE — guard greetings, its first tenant

*Drafted 2026-08-17. Status: Phase 1 + Phase 2 IN FLIGHT (this session).*

---

## 1. The mandate

The user's word (2026-08-17), distilled:

- **Fable's gate guards.** Walking into a town, a guard hails you; walking out,
  a guard sends you off. The hail reflects who you are: first visit vs. a face
  they know, a trusted name, a famous archer, a renowned smith. Spoken aloud
  (voice clip) AND shown as the pop-over dialogue (speech bubble), never the
  cinematic dialogue. Other players nearby see and hear it too.
- **Thresholds, not spam.** Walk in and straight back out: the guard says
  nothing. Minutes-scale cooldowns. Variety in the lines.
- **The deeper prize is the platform.** A core, content-authorable TRIGGER
  system: slugged triggers with areas (polygons the content team draws),
  schedules, cooldowns, player-condition gates; a trigger fires a named
  in-game EVENT that server systems subscribe to. Built once, core, lasting —
  the greeting is merely the first subscriber.
- **The name spoken aloud** (later phase): per-player generated voice lines
  ("Welcome back, Renna") produced OFFLINE on the user's machine by the
  existing voicelab lane, imported to the clip ledger, and picked up by the
  live system with zero code change.

## 2. What the ground already gives us (recon 2026-08-17, code-verified)

- **No event bus exists.** Today's "events" are hardcoded choke-point calls
  (`creditQuestEvent` with 3 call sites). The subscriber door is genuinely new.
- **No region primitive below the town rect.** `ZoneDef` = one rect; no
  polygon type, no `pointInPolygon` anywhere. Both are new.
- **The discovery detector fires every ~32 tiles** (`lastCenterChunk` gate) —
  far too coarse for a gate. Triggers need their own sweep.
- **`tickCallingWhens` + `whenHolds`** (gameServer ~15110..15254) is the house
  pattern for condition unions with rising/falling edges + hysteresis.
- **`content_docs` two-hash store** natively holds a multi-doc kind → the
  trigger lane needs NO migration. `seedContentDocs('trigger', …)` +
  `loadContentDocs` + `importContentDoc`/`revertContentDoc`, exactly the
  npc/loot lane (mapsApi ~898..1010).
- **The bark block** (gameServer ~15460..15494) is the speak template: face
  the player, pause the routine 80 ticks, `sayAloud` (bubble for everyone),
  transcript-matched clip (`matchActorLineClip` → `drawMatchedQuip`) else
  rationed slot draw, `vq` spatial audio. THE BARK KEEPS ITS WORD law:
  a voiced line speaks the exact words the bubble shows.
- **Guards are enforcers**: `npcEnforcerFid(eid)` (call-time doc read).
  Nearby lookup = `forEachNpcNear` chunk walk; sightline = `sightLine` +
  `sightVisibility` (the theftWitnesses idiom).
- **"Seen at this town before" already exists**: the discovery ledger
  (`zone:<id>` per character, durable at the moment).
- **Bands** (`known/trusted/champion`) and **skills** (`levelForXp`) give the
  revered-name and famous-archer reads.
- **Game-clock windows**: `slotContains(from, to, hours)` wraps midnight —
  reuse verbatim.

## 3. The laws of the trigger system (Phase 1 — THE WATCHFUL GROUND)

### THE TRIGGER IS CONTENT
`packages/content/src/triggers/` — types + THE ONE VALIDATOR + registry of
authored JSON defs (`defs/*.json`, filename = id, explicit imports, build
throws on a bad def). Persisted as `content_docs` kind `'trigger'`, one row
per def, two-hash law. Studio writes are tool-owned rows; authored defs ship
in code. No migration.

```ts
interface TriggerDef {
  id: string;                 // slug, the trigger's name in the world
  label?: string;             // Studio display
  area: TriggerArea;          // where the ground watches
  on: 'enter' | 'exit' | 'both';
  event: string;              // the event slug fired into the door
  data?: Record<string, string>;   // opaque payload for subscribers
  conditions?: TriggerCondition[]; // ALL must hold at the edge
  cooldownSec?: number;       // per-character refractory (in-memory)
  cooldownGroup?: string;     // shared refractory key (default: the id)
  minInsideSec?: number;      // exit fires only after this dwell
  once?: boolean;             // per-character forever (character_flags)
  setFlag?: string;           // plain character flag stamped on fire
  disabled?: boolean;         // Studio kill switch
}

type TriggerArea =
  | { kind: 'zone'; zone: string }     // a whole authored zone, resolved LIVE
  | { kind: 'rect'; plane?: string; x: number; y: number; w: number; h: number }
  | { kind: 'polygon'; plane?: string; points: { x: number; y: number }[] };

type TriggerCondition =
  | { when: 'timeBetween'; from: number; to: number }   // game hours, wraps
  | { when: 'hpBelow' | 'hpAbove'; frac: number }
  | { when: 'hasItem'; item: string; qty?: number }
  | { when: 'skillAtLeast'; skill: SkillId; level: number }
  | { when: 'standingAtLeast' | 'standingAtMost'; faction: string; band: FactionBand }
  | { when: 'flag' | 'notFlag'; flag: string }          // plain namespace only
  | { when: 'discovered' | 'undiscovered'; place: string }
  | { when: 'sneaking' } | { when: 'night' } | { when: 'day' };
```

Condition vocabulary law (the SLOTS-ARE-CODE spirit): the union is code and
grows with the moment that needs a predicate; the validator refuses unknown
`when` kinds by name. Every predicate mirrors the read its precedent already
trusts (`night` = the daylight law, `sneaking` = `player.hidden`,
`standing*` = `standingBand` through the live doc, `discovered` = the ledger).

### THE GROUND IS GEOMETRY
`packages/shared/src/math/geom.ts` (new): `pointInPolygon` (ray cast,
half-open), `polyBounds`. Compiled triggers carry a bbox precheck; the
`zone` area kind resolves through a LIVE zone lookup at test time (zones are
runtime-mutable; a Studio zone edit re-aims the trigger on the next sweep).

### THE SWEEP AND THE EDGE
Pure module `packages/server/src/game/triggers.ts` (the exploration.ts law:
logic behind plain data, testable without GameServer): compile, containment,
condition evaluation against an injected fact context, cooldown/dwell
arithmetic. GameServer owns the sweep: `tickTriggers()` at `% 10 === 5`
(2 Hz per player — a walking body moves ~2 tiles between looks; gate-scale
areas cannot be jumped over, and the whole sweep is bbox-gated).

Edge state: `player.triggerInside: Map<id, sinceTick>`; enter = newly
contained, exit = newly absent (dwell read from `sinceTick`).
**THE FIRST SWEEP IS A CENSUS, NOT AN EDGE**: an undefined map is primed
from current containment with no fires — a relog inside the walls, a
respawn, a fresh login never fake a crossing. (`/tp` across a boundary IS a
crossing — the map disagrees with the ground, and that is the lever's charm.)

### THE BOUNCE RULE
Enter and exit share one cooldown group by default (the group key defaults to
the trigger id). Walk in, get hailed, turn straight around: the exit edge
finds the group still hot AND `minInsideSec` unmet — the guard holds his
tongue twice over. Leave properly after a real visit and the sendoff speaks.
Cooldowns are in-memory per character (minutes-scale theatre, not state);
`once` latches persist via `character_flags` (`trig:<id>`), written at the
moment through the one flag door (so they are dialogue-gateable for free).

### THE EVENT DOOR
`GameServer.onTrigger(event, handler)` → `triggerHooks: Map<string,
TriggerHandler[]>`; `fireTrigger` dispatches to every handler of the def's
event with `{ def, edge, eid, player }`. Subscribers are CODE, registered at
construction — the composable half is the content (which triggers fire which
event slugs with what payload), the reliable half is the handler roster (a
misspelled event in the Studio fires into silence, logged once by the
`/triggers` lever, never a crash). `setFlag` + `once` stamp through
`setPlayerFlag` BEFORE dispatch so handlers read the post-fire world.

### THE LEVERS
`/triggers` — list every compiled trigger, mark the ones holding you now,
show your cooldown stamps. `/trigger <id> [enter|exit]` — force-fire through
the full dispatch path, gates bypassed, conditions reported. Dev routes:
GET `/dev/content/triggers`, PUT/DELETE `/dev/content/triggers/:id`
(validate against the FULL candidate world with live zone/item/faction ids →
import → re-register live; the npc/loot lane verbatim).

### THE STUDIO BENCH (this session: forms; the drawn polygon: next phase)
CMS section `'triggers'`: list rows per def (event + area pills, disabled
dimmed), detail bench = label/event/edge/area editor (zone combobox from the
live zone roster, rect fields, polygon as one `x,y` pair per line),
conditions builder, dials (cooldown/group/dwell/once/flag/disabled),
Save▸Live / Revert-or-Delete / New entry. The Map Studio drawing lane
(editor2 polygon tool emitting trigger areas + a trigger lens) is Phase 3 —
the bench round-trips the same doc, so the drawn lane changes no server code.

## 4. THE WATCH KNOWS YOUR FACE (Phase 2 — the first subscriber)

### The content
Eight authored triggers, one per walled/watched town (dawnmead, amberford,
silverfall, saltmere, pinewatch, hartfell, evenfall, kingsdelf):
`{ id: 'town_<zone>', area: {kind:'zone', zone}, on: 'both', event: 'town',
data: { town: <zone> }, cooldownSec: 180, minInsideSec: 45 }`.

`packages/content/src/greetings.ts` — the line slates + the pure picker.
VOICE.md bark register: one short sentence, present tense, dash-banned,
watch diction. Categories, most-specific-first with weighted variety:

- enter × first visit ("the gate reads a stranger")
- enter × returning ("welcome back")
- enter × band ≥ trusted / champion (the revered name)
- enter × fame (highest skill ≥ 75 with a slate: archery, smithing, mining,
  fishing, arx, combat… "the famous archer comes home")
- exit (the sendoff), night-flavored exits ("the road is dark")

`{town}` and `{name}` tokens render at pick time. The picker takes a roll and
the player's last-heard line (the pickQuipClip no-repeat law); returns the
RENDERED line.

### The speak (the bark block's law, generalized)
On `town` fire: find the nearest live enforcer within 12 tiles with a true
sightline to the player (no greeting through the wall); skip when the player
is hidden (a guard does not hail what he has not seen) or dead, or the guard
is fighting. Then: face the player, pause the routine 80 ticks, `sayAloud`
(bubble + local chat for every witness), and — THE BARK KEEPS ITS WORD —
`matchActorLineClip(guardActor, renderedLine)` → `drawMatchedQuip`,
broadcast `vq` at the GUARD's position to every session whose interest set
holds him (the bark lane sent it to one ear; a greeting is public theatre).
No matched clip → the bubble speaks alone (never a wordless grunt under
worded text). No guard in sight → silence (the trigger still fired; other
subscribers still ran).

### Why the name-clip phase costs zero code later
The picker prefers the `{name}`-rendered line WHEN a transcript-matched clip
for it exists in the guard's ledger, else falls back to the nameless
rendering. Today no name clips exist → nameless lines speak. The day the
offline lane imports `guard clips` with transcript "welcome back to amberford,
renna", the very next entry hails her by name — the match is the feature.

## 5. Phase ladder

1. **THE WATCHFUL GROUND** (this session): shared geometry, content lane
   (types/validator/registry/8 town defs), server engine (compile, sweep,
   edges, cooldowns, census law, event door, levers, dev routes, boot seed),
   tests at every layer.
2. **THE WATCH KNOWS YOUR FACE** (this session): greetings content + the
   `town` subscriber, wired through the bark law end to end.
3. **THE DRAWN SNARE**: Map Studio polygon lane — editor2 tool draws a
   trigger's polygon on the living map, a trigger lens shows every area +
   live edge state; CMS bench gains "open in Map Studio".
4. **THE NAMED BREATH**: the offline name-clip lane. `tools/voice/` gains a
   greeting sheet source (per new character: render the name-bearing lines
   per town guard throat, queue them); the user runs generation locally
   (voicelab :5002) and `import.mts` lands clips + transcripts; no server
   code. A `name_clip_queue` need only be a generated worklist file — the
   clip ledger is already the system of record.
5. **MORE TENANTS** (as needed): scheduled triggers (a game-time window with
   no area = a town-crier moment), POI-edge triggers, quest `enter area`
   objectives riding trigger events, boss-arena thresholds.

## 6. Gates

Suites green across shared/content/server/client + `tsc -b` clean x4;
authored defs validated at build; live walk owed: enter/exit Amberford with
band + fame staged, bounce rule, cooldown, census-on-relog, second player
hearing the hail.
