# THE RED COMPANY: THE LOW ROADS HAVE A HOME

*The reavers get their sanctuary, their doors, and their worth.*

The Red Company (`reavers`) has been courtable since THE TWO ROADS:
Ferrick's Tollhouse, the blood-price, the low-road quests, the fence
counter. But the Company had no HOME — a faction you can join that
owns one waystation is a toll both, not a brotherhood. The user's
decree (2026-08-11): the Company gets its proper hideouts and delves,
tightly incorporated with the cities, its own sanctuary, high polish,
real value for players who choose its road.

## THE SHAPE

**THE LOW HALL** — a new dark-band zone (`lowhall`, origin (200,552),
88x56, CaveWall base like the Undercroft): the Company's buried
sanctuary, reached ONLY through hidden doors in the cities. Nobody
walks overland to it; that is the point. Inside:

- **THE FIVE DOORS** — the arrival ring: five alcoves around one
  chamber, each holding the portal back up to one city's hidden
  hatch, each with a plain signpost naming its road. The Company's
  whole thesis in one room: every city, one cellar.
- **THE EMBER HALL** — the feast hall: hearths, long tables, madder
  cloth on the walls, and Captain Ravna's seat at the north end.
- **THE COUNTING ROOM** — Tallyman Brusk: the fence counter (stolen
  goods welcome — the fence law already lists `reavers`), the
  Company vault, bank chests, THE DOCKET (the jobs wall).
- **THE KIT CAGE** — Quartermaster Yeva: racks, crates, the Company
  shop.
- **THE BUNKS** — hot bunks, the mess, the kitchen hearth, the still
  pool with its blind fish.

**THE FIVE DOORS (surface side)** — one hidden hatch per city, each a
small curated corner in the town's forgotten ground (no lamp, no
Company name on any sign — you find it or you're told): Amberford,
Silverfall (in the Rookery's back lot — Mab tolerates the door, the
red_mark quest already ties them), Saltmere, Pinewatch, Hartfell.
Dawnmead gets NO door by design: the Company does not work the
nursery, and Ferrick will say so.

## THE PEOPLE

- **Captain Ravna** — runs the Company like a shipping concern; the
  mask is administrative, not theatrical. The join arc lives with her.
- **Tallyman Brusk** — clean books for dirty goods; fence + docket.
- **Quartermaster Yeva** — the kit shop; loves gear, despises rust.
- **company_blade x5** (pooled, MEMBER + ENFORCER, invulnerable) —
  the sanctuary hunts its own outlaws; everyone else walks free.
  Strict gate-cell routines (the gate-line law binds steel).
- **company_runner x2** (pooled, friendly) — the errand legs.

## THE VALUE (why align red)

- The fence: Brusk buys stolen at a real counter beside a vault and
  the docket — one room closes the whole theft loop.
- THE DOCKET: repeatable jobs (+6 reavers each): wolves off the low
  road, kobolds out of the low vaults, leather for the blades.
- THE RED HAND: the one-time join arc (requires known standing,
  Ferrick vouches, Ravna seals it; +12 reavers, authored −6 fordgate
  −6 crown stated in the offer — the border law never auto-crosses).
- Standing-gated depth: Ravna's court opens rooms of conversation at
  known/trusted/champion; the closed throat still refuses Company
  outlaws everywhere.
- Five doors = the fastest cross-map web a player can earn.

## LAWS THAT BIND THIS EPIC

Flood law (standing never dials loot); NO-LAUNDERING (job collects
use clean goods only); authored opposition costs stated in offer
text; opposed-pair exclusivity via offer-tree forbids; camp-peace and
closed-throat run as shipped; no lamp or Company name at any surface
door; content-boundaries; DASH BAN; VOICE.md.

## PHASES

1. **THE PLAN** — this document.
2. **THE LOW HALL** — zone + five doors + registration + tests.
3. **THE COMPANY MUSTERS** — cast, dialogues, jobs, shops,
   membership, VOICE.
4. **THE WALK** — tour every door and hall at gameplay zoom, fix,
   ship, memory.

## AS-BUILT LEDGER

- **Phase 1 THE PLAN** 7e63280.
- **Phases 2+3 THE FIVE DOORS OPEN** 3a9ac10 — zone, doors, cast,
  jobs, shops, membership in one landing. Build-truths:
  - lowhall (200,552) 88x56 CaveWall; spawn (217.5,583.5) = the ring
    (the underground nearest-spawn law now has two hearths down
    here: the Landing and the ring).
  - Doors (world): Amberford hatch (389,38), Silverfall (-338,-181),
    Saltmere (367,291), Pinewatch (534,-141), Hartfell (845,-384).
    Every hatch is dirt + a crate + no name; every alcove signs its
    road INSIDE the hall. Arrival dests always land BESIDE the
    paired portal, never on it (the Undercroft pairing law).
  - The alcove stubs must genuinely touch the ring ellipse — the
    Hartfell stub shipped two rows short and sealed until extended
    (the desk audit BFS caught it; alcove throats are 1-wide at the
    ellipse tips and that is fine, they read as doorways).
  - company_blade = member + ENFORCER: correct inside a hidden
    sanctuary (hunts Company outlaws only), still wrong beside open
    roads (the tollhouse rule stands).
  - Brusk's company_counter is a fence by construction (faction of
    shop keeper is reavers, theft.fences lists reavers) — the whole
    theft loop closes in one room: fence, vault, bank chests, docket.
  - Tests: lowhall content test pins the five-door web BOTH ways
    (every up-portal lands in a town rect, every town keeps a hatch
    landing in the hall). TS7022 gotcha: the BFS `const x = i %
    z.width` pattern trips self-referential inference here — annotate
    the locals.
- **Phase 4 THE WALK** — toured the hall and all five doors live
  (r*.jpeg): the ring's five glowing alcoves, Ravna's hall, blades
  posted, runners running, every hatch sitting in honest forgotten
  ground. No curation findings; shipped as built.

## DEBTS

- VO for Ravna/Brusk/Yeva/blades/runners (casting office pass).
- A Company mount or dye cosmetic as a champion-band reward (flood
  law: shop-sold, never dropped).
- The old Redmask captain "somewhere north" is a hanging thread for
  a future delve epic.
- Rival-faction counterplay: a charter-side quest to shadow a door
  (opposed-pair rail exists).
