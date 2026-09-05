# THE SLIPPED BLOW — the dodge leaves, the slip arrives

*Shipped 2026-09-05. Status: **LIVE** (main). Replaces the pressed dodge dash
at the root; the freed buttons stay free.*

## The wound

The dodge (Shift / pad Ⓑ) was one of the founding verbs: a 0.85-tile
impulse on a 1.2 s seq-cooldown, predicted client-side, twinned on the
server's tick clock, and later grown into THE DODGE-WEAVE (a fired dodge
cut swing recovery to 3 ticks) and THE DRAWN BREATH's canonical bail-out.
Three capes carried **Wolf Reflexes**: +35% stride for 1.5 s after a dodge.

In play none of that survived contact. Nobody dodged a slam. Players
pressed dodge on cooldown while walking — with Wolf Reflexes on, a dodge
every 1.2 s and a haste that outlived the cooldown made the "dodge" a
permanent +35% walk. The verb had become a stride exploit and nothing
else; its recovery cut and its bail-out were riders on a corpse. And it
sat on the pad's Ⓑ — the button ONE KEYMAP could never free.

## The laws

**1. THE ROOT COMES OUT.** No button dodge, anywhere. `InputButton` bit 2
is RETIRED and reserved (a stale client's Shift press must never fire a
new verb). `applyDodge`, `DODGE_DIST`, `DODGE_COOLDOWN_SEQ`,
`DODGE_CANCEL_FLOOR_TICKS`, `lastDodgeSeq`/`lastDodgeTick`, the predictor's
dodge replay and `onDodge`, the dodge FX/whoosh, the `dodge` binding, the
proving receipts — all gone, not disabled. Movement is the stride and the
transport arts (THE CROSSING) alone.

**2. THE SLIP IS ROLLED WHERE THE BLOW LANDS.** `shared/sim/evasion.ts` is
the one home: `evadeChancePct` sums the lanes and `rollSlip` rolls them.
The server's damage door (`damagePlayer`) rolls ONCE, before the armor
speaks; a slipped blow returns right there — no status, no ward touched, no
shield lesson, no mitigation — but it still blew your cover and still
counts as combat.

**3. THE LANES.** Percentage points, summed, then capped at
`EVADE_CAP_PCT` (50):

| lane    | source                                        | value                    |
|---------|-----------------------------------------------|--------------------------|
| worn    | **Wolf Reflexes** passive (the three capes)   | flat 10                  |
| gear    | the wardrobe's own `evade` effects (house words, the Weave scrolls) | the gear cache's summed `evadePct` |
| leather | each leather armor piece (head/body/legs/gloves/boots) | 2 per piece     |
| trained | the Sneak skill's effective level             | 0.1 per level (9.9 at 99) |
| buffs   | tonics (`evadePct`), callings' when-grants, boons | the forge's additive fold |

Armor is the plate's answer to a blow (it lands, softer); the slip is
leather's (it never lands). Two defensive lanes, each with one roll site.

**4. THE FEET ARE THE SLIP.** A slip is a body stepping aside, so the
chance rides the feet: a hold's stone feet slip nothing (move factor 0), a
chill slips slower (the factor scales the chance), and a seated or saddled
body never slips — the horse takes the blow.

**5. WHAT NEVER SLIPS.** A wound already inside the armor — burn, bleed and
venom pulses (`via`) and any armor-piercing drip — passes the door by its
own lane and never reaches the roll.

**6. THE WORD AND THE SMEAR.** The hit wire grew `sl` (additive; old
clients paint a quiet 0). The client says **Slip** in a cool silvered ink
(never a striker's "Miss" — the slip is the body's deed) and plays a
three-layer signature that can never be confused with a landed hit's warm
sparks: THE WHIFF (a thin pale streak crossing the body's front along the
striker's line — skipped when the striker is unknown; never draw a line
from nowhere), THE AFTERIMAGE (pale motes trailing opposite the sidestep),
THE FEET (a low dust kick on the ground layer). A breathier, quicker whoosh
than the dash (`sfx.slip`) and a faint own-body rumble, lighter than a hit.

**7. THE FREED HAND.** Shift and pad Ⓑ ship UNBOUND, on purpose — the first
genuinely open pad button since ONE KEYMAP. The next verb that truly needs
a thumb has somewhere to land; nothing squats there meanwhile.

**8. THE LOWERED RING.** THE HELD SIGIL's bail-out was the dodge press. It
is the SHEATHE press now (H / d-pad ◀): the one "put it away" verb the hand
already knows, which the server already treated as a breath-breaker. While
a ground ring is held the press is EATEN whole — it lowers the ring and
never reaches the server to stow the steel you were about to cast with.
The mode strip names it ("Cancel").

## The grammar it opened

- `BuffLike.evadePct` (buff forge: ADDITIVE × stacks, cap at the roll) —
  `buffEvadePct` folds it; `PlayerBuff` carries it; `mkBuff` defaults 0.
- `CallingGrant.evadePct` — a when-clause may grant it; THE CALLING LAW
  counts it as "grants something"; the codex speaks it ("slips N% of blows").
- Consumable `BuffDef.evadePct` — a draught may carry it (as scarce as the
  other combat dials; the content law counts it as "does something").
- `describeBuff` speaks it on chips: "slips N% of blows".
- Leather's card blurb speaks its lane; Sneak's hall blurb reads
  "Unseen, unheard, untouched"; Wolf Reflexes' card reads its new desc.

No shipped calling or draught carries `evadePct` yet. Authoring is a
content edit, never engine work.

## THE WARDROBE ANSWERS (armor pass, same day)

The armor houses carry no native effects; their identity is THE HOUSE
WORD (2pc flat line, 4pc behavioral word). So the slip enters the
wardrobe through a new flat effect kind, `{ kind: 'evade', pct }`,
folded into the gear cache (`GearStats.evadePct`) and priced as crit's
defensive twin (2.5 per point) in the budget pins. Cards speak it as
"N% of blows slip past you"; quality scales it like every pct.

| where                 | line                                                        |
|-----------------------|-------------------------------------------------------------|
| Nightveil 2pc         | **Quiet Cloth** — 3% of blows slip (was +2 sneak)            |
| Skydancer 2pc (cloth) | **Light Feet** — 2% of blows slip (was +3% move speed)       |
| Stormtalon 4pc        | **The Fifth Stoop** + rider: 4% of blows slip                |
| Rookfeather 4pc       | **Molt and Be Elsewhere** + rider: 3% of blows slip          |
| Broodsilk 4pc         | **What Bites the Web** + rider: 3% of blows slip             |
| Legs scroll line      | **Sidestep 2 / Ghoststep 3 / Shadowstep 5 (+1 sneak) / Phantomstep 7 (+2% speed) / Untouched 9 (+2 sneak, +2% speed)**, tiers 1..5 |

THE OPENER IS THE HOUSE holds: two houses on the slip opener at
different numbers (the law allows two, never three). Every 2pc line
stays flat; every 4pc word keeps its behavioral effect. A full
Nightveil rogue in five leather pieces with Untouched legs and a Wolf
Reflexes cape stands at 10 + 3 + 10 + 9 = 32 before Sneak — a real
lane, still well under the cap.

## As-built receipts

- `packages/shared/src/sim/evasion.ts` (+ `evasion.test.ts`: lanes sum,
  cap closes, feet scale, planted never slips, roll reads its sample).
- `packages/server/src/game/gameServer.ts` `damagePlayer`: the one roll;
  `broadcastHit(..., slip)`; the dodge block replaced by a retirement note.
- `packages/client/src/main.ts` `onSlip`; `clientGame.ts` "Slip" floaty
  + `onSlip` event; `sfx.slip`; `groundAim.ts` THE LOWERED RING.
- Bindings: `dodge` action removed; the pad-reachability test no longer
  lists it; the rebind test steals Space for `interact` instead.
- Proving: `combatV2` (dodge-weave receipt retired), `drawnBreath`
  (sheathe bail receipts), `mounts` (dodge dismount receipt removed).
- Suites green at ship: shared 302, content 621, server 625, client 1115.

## Follow-ups (not blocking)

- A standing "slips N% of blows" readout on the hero pane, fed by the
  buffs wire the way `swing` already is — the lanes speak on their cards
  today; a single summed number is the next courtesy.
- First authored `evadePct` grants: a Sneak calling rank ("Smoke and
  Gone" wants it), one draught.
