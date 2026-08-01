# Mounts — THE ROAD GROWS SHORT

*Design review 2026-07-31. Status: GREEN-LIT, unshipped. Phases land in
order; each phase is a commit with its laws proven by tests before the
next begins.*

The Dawnlands are about to get big — Pinereach opened the mountains,
Saltmere opened the water, and the map will keep growing. Feet that were
fast enough for Dawnmead's lanes are slow for the long roads between
holds. The answer is not a bigger tonic. The answer is the oldest
promise in the genre: **a beast of your own under you**, earned in the
mid-game, visible across a field, with a silhouette that says who you
are before your nameplate can.

A mount in Arx is a **travel stance, not a combat platform**. You ride
to cross the world; the moment you fight, gather, or build, your boots
are back on the ground. This keeps every combat, stealth, and economy
law untouched — the mount changes how far you can be, never how strong
you are.

---

## Part 1 — Audit: what exists today (verified in code, 2026-07-31)

### Speed is server-authoritative, composed at one site

- `PLAYER_SPEED = 5` tiles/sec (`shared/src/constants.ts:130`).
- The ONE movement site (`gameServer.ts` `processPlayerInputs`,
  ~17376-17390): draw-slow → buff mults (`b.speedMult` product) →
  `fleet_footed` 1.08 → `gear.speedMult` (boots/enchants ±8%) → chill
  0.55 → cast-freeze 0 → `stepMovement` (wade 0.55 inside).
- Swiftness already ships: `swiftness_tonic` 1.2×/60s, Swiftstep boots,
  `swift`/`fleet`/`windborne` stride enchants. A mount must beat this
  *categorically* (identity + speed), not incrementally.

### The client predicts at a hardcoded speed

- `Predictor` is constructed once with `PLAYER_SPEED`
  (`clientGame.ts:271`, `prediction.ts:56`) and never learns modifiers;
  today's 1.2× tonic drift is silently absorbed by reconciliation. At
  mount speed that drift becomes per-frame rubber-banding. The
  `weaponStyle` mirror on the predictor ("must mirror the server's
  view") is the exact precedent for a `speedMult` mirror.

### The netcode already reserved a lane

- `interpolation.ts:46` — `SMOOTH_MAX_SPEED = 12` t/s, comment verbatim:
  *"a sprinting mount stays under this; a correction snap does not."*
- Bounded extrapolation projects speeds in [0.15, 30] t/s. Mount speeds
  below live comfortably inside both ceilings.

### Quadrupeds with true gaits are shipped tech

- `LegRig` (`client/src/render/legs.ts`) — N legs, two-segment IK,
  world-planted feet, diagonal trot pairs via `quadLegs()`, facing slew,
  anatomical `kneeFwd` hock law, joint hysteresis, weight-shift drag.
- `BEAST_SPECS` + per-species look/body painters in `rig.ts` (cow, bull,
  wolf, dire wolf, worg, boar, ram, stag, bear...). A mount body is a
  new spec + painter in a proven system.
- Foot plants already drive per-material dust (`kickDust`, radius-scaled)
  and footstep audio (`onFootstep`), free of charge for any LegRig body.

### The rider's seat is half-built

- `PoseState` is a u8 with room (Lie = 16). Sit/Lie precedent: the wire
  carries ONE byte, the client re-derives context from the world.
- `RigPose.sitT/seatH` already blend the humanoid hip line onto a seat
  height (`rig.ts:2744-2746`) — leg armor dresses draped legs for free.
- Server furniture seats (`player.seat`, claim/evict, dismount-on-move
  at 17387) are the behavioral template for the saddle.

### Identity rides the appearance channel

- `AppearanceData` (`shared/src/entities.ts:110`) carries equip ids,
  enchant ids, look, carry styles to every watcher — the mount id is one
  more field on it. Protocol sits at v24; this epic takes 25.

---

## Part 2 — The laws

### THE SADDLE IS A STANCE (the foundation law)

The mount is **the player's appearance, never a second entity**. No
mount AI, no mount HP, no mount pathing, no lead-a-horse-by-rope. While
mounted the player entity IS horse-and-rider: one position, one
collision radius, one snapshot row. This is what keeps the epic
buildable at master quality instead of shipping a haunted NPC.

### THE SADDLE OUTRANKS THE SOLES (speed composition)

Mounted speed = `PLAYER_SPEED × mountDef.speedMult`, and the mount mult
**replaces** the buff/gear stride stack — the effective multiplier is
`max(mountMult, buffProduct × gearMult × fleetFooted)`, never the
product. Tonics stay meaningful on foot; the saddle is simply faster.
The math: courser 1.6× = 8.0 t/s; prestige tiers cap at 1.9× = 9.5 t/s,
under the netcode's 12 t/s smoothing ceiling with margin for the wade
factor's release snap. **No mount mult above 2.0, ever** — 12 t/s is a
law from another epic, not a suggestion.

Terrain still speaks: wade (0.55) and chill (0.55) apply mounted. A
beast fords a river no faster than it should.

### BOOTS ON THE GROUND FOR EVERY DEED (dismount law)

Riding yields to everything, the sit law's bigger sibling:

- Attack press, any ability press, gather, build mode, sneak, sit —
  each dismounts FIRST, then does the thing on the following press
  (the safety pattern: one press to dismount is the drawn-weapon
  grammar players already know from the sheathe).
- **Landed damage dismounts.** Getting caught mounted by a wolf pack is
  the intended cost of riding through danger — speed is the defense.
- Interiors refuse the saddle: no mounting under a roof or in the
  Undercroft/delves; crossing into one dismounts at the threshold.
- Movement NEVER dismounts. That is the point of the mount.

Dismount is instant and safe (no cast time, no vulnerability window
beyond losing the speed) — the friction is in remounting mid-danger,
not in a punishing animation.

### THE WHISTLE ANSWERS ONCE (input law, per ONE KEYMAP)

One new action `mount` ("Call mount"), kb `KeyP` (free, verified against
the ACTIONS table), pad **unbound** (all 16 buttons are spoken for; pads
mount from the character screen's stable row, pad-navigable). Press
edge toggles: mounted → dismount; afoot with an active mount → mount.
Never a hardcoded `e.code` anywhere.

### THE BEAST IS YOURS ALONE (acquisition law)

Mounts are **character unlocks** (DB rows), not inventory items. They
are earned in the mid-game the way the sit-by-the-fire moment is earned:
you'll have crossed the map on foot enough times to *want* one, and
recently enough to feel the difference. First mount: Hostler Osa's
stable in Silverfall (she exists, voice card and all — "horse-first,
people-second"). Steep gold price + a short errand in her voice; no
level wall, the price IS the gate (economy gating is the Arx idiom —
weapons have no levelReq either).

Rare/prestige mounts obey the **loot flood-law**: flat rates, no pity
timers, no player-state dials. A rare mount is rare for everyone every
time, and that is why seeing one means something.

### THE WIRE STAYS ONE BYTE (network law)

`PoseState.Ride = 17`. Remote clients learn WHAT you ride from
`AppearanceData.mount?: string` (the flaming-blade precedent: identity
facts every watcher needs ride appearance). The own client additionally
mirrors `speedMult` + owned/active mounts over JSON for prediction and
the stable UI. Protocol 24 → 25.

### THE PREDICTOR LEARNS ITS LEGS (the enabling fix)

`Predictor.speedMult`, updated by the same server messages that change
the truth (mount/dismount ack, buff gain/expiry). This fix ships in
Phase 1 and quietly improves tonics/boots feel on foot too — the drift
reconciliation absorbs today becomes zero.

---

## Part 3 — The phases

### Phase 1 — THE SADDLE LAW (server + shared + prediction)

`PoseState.Ride`, `InputButton.Mount`, `player.mount` (active def id) +
`player.mounts` (owned set), the speed composition law at the one
movement site, every dismount trigger, interior refusal, the
`speedMult` mirror message + predictor plumbing, `/mount` dev command
for live testing before acquisition ships. Content: `MOUNTS` registry
in `content/src/mounts.ts` (id, name, speedMult, spec hooks, flavor).
Tests: speed composition (max-not-product, ceiling assert vs
SMOOTH_MAX_SPEED), each dismount trigger, press-edge grammar, predictor
speed parity with the server site.

### Phase 2 — THE BEAST UNDER THE BODY (render)

The first mount body: **the Dawnlands courser** — a working horse in
the brutalist shape language, not a parade animal. New `BeastSpec`
(horse proportions, trot pairs, hoof feet) + bespoke painter: neck and
head with the facing-band law, mane in the shade-half discipline, tail
sway keyed to `nowMs`, **saddle and girth drawn as worn gear on the
barrel**, blanket in the owner's look palette. The rider composite:
beast far legs → rider far leg → barrel + saddle → rider (sit-blend hip
line at saddle height, reins hands) → beast near legs → rider near leg.
Rider head/torso use the existing billboard bands; capes stream at
speed via the shipped CapeSim. Hoof dust via `kickDust` sizeMult ~1.3 +
canter clods (streak shape) past 6 t/s. Own-body first; remote bodies
land in Phase 3.

### Phase 3 — THE NEIGHBOR RIDES (wire + remote)

`AppearanceData.mount`, protocol 25, remote mounted bodies through
`sampleSmoothed` verified at 8-9.5 t/s (the lane the netcode reserved),
outline/sprite-cache keys extended with the mount signature, ragdoll
handoff on death (rider dies dismounted — the beast is appearance, it
simply isn't drawn on a corpse).

### Phase 4 — THE STABLE DOOR (acquisition + persistence)

DB migration: `character_mounts` (character_id, mount_id, acquired ms)
+ active mount column. Osa's stable dialogue (VOICE.md, her card, dash
ban, "..." never hers), the errand, the price, the purchase flow, the
character-screen stable row (pad path). The courser sells in three
coats (bay, grey, black-legged dun) — same speed, chosen at purchase;
identity begins at the first buy.

### Phase 5 — A HERD OF ONE'S OWN (variety)

The prestige ladder, each with a bespoke painter, not a recolor:
- **Hoargate garron** — shaggy mountain pony, Pinewatch stable, cold
  country errand chain.
- **The sabercat** — the night-saber fantasy; moves in the wolf/dire
  family's low lope, rare-drop saddle from deep content (flat rate,
  flood-law).
- Faction standing may gate a livery (blanket colors), never a speed.
Speeds within the ladder are close (1.6/1.7/1.75) — variety is
identity, not power creep.

### Phase 6 — THE ROAD REMEMBERS (polish + live proof)

Reveal/see-through envelope for the taller silhouette, grass disturber
radius while mounted, outline bounds + headroom, mounted wall-fade,
touch UI affordance, hoof audio material pass, gallop camera check at
120 Hz + Firefox budget check (render-perf law: mounts add ONE more
body's draw cost, the patch caches must not thrash), full live ride
Silverfall → Pinewatch → Saltmere.

---

## Part 4 — What this epic refuses

- **No mounted combat.** Not now, not as a stretch goal. It re-opens
  every reach/kite/threat law for a traversal feature.
- **No mount stats, feeding, or durability.** The beast is not a chore.
- **No flying, no water mounts.** The Dawnlands are walked land; boats
  belong to a Saltmere epic if ever.
- **No speed-stacking.** The max-not-product law is load-bearing; the
  first "just let the tonic stack" regression breaks the netcode
  ceiling math.
- **No second entity.** The day a mount needs to exist without its
  rider is the day this law is re-argued, in a new design review, not
  in a patch.
