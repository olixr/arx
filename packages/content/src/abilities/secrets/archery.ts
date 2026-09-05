/**
 * THE ARCHERY SECRET SHELF — the weapon-taught arts of this school and
 * their honed ranks, one file per school (THE MASTERED HAND,
 * techniques v3). Seats and anchors stay in secretArts.ts (THE ANCHOR
 * RULER is not this file's to move).
 *
 * THE SECRET SHELF (Phase 3 rebuild, 2026-09-05): a bow teaches its
 * art to ANY hand (THE FREE HAND), so every art here is THE
 * CROSS-SCHOOL SPICE — built on THE PATIENT EYE's spine (brand, plant,
 * loose; drawn shots and staked volleys) but with a twist no rung has,
 * and a combo that reaches across a school line: the fan that reads a
 * reeling line (stagger), the seekers that read the exposed, the ghost
 * that arrives from the dark (vanish), the kiln that falls on frost
 * (chill), the chord that follows the weave's hands, the hail and the
 * lark that leave arx's own words (chill, burn) for arx's rungs to
 * spend. Fourteen of the fifteen follows cross a school line; the
 * openers leave words archery AND arx read; two arts read a page
 * through the edge (venom, sunder); the called shot and the hunter's
 * shaft arm the red ledger.
 */
import type { AbilityDef, RankStep } from '@arx/shared';

type Steps = readonly [RankStep, RankStep, RankStep];

/**
 * THE REGISTER, per shelf (see schools/onehand.ts). The bow's secrets
 * lay no wave-one page: the archer's holds are the rungs' (Snare Shot's
 * root, Skyfall's stagger, Gloamshaft's weaken); the shelf brands,
 * chills, burns, shocks and bleeds. The register stands empty on
 * purpose — a secret that wants a hold must come here casted or fused.
 */
export const ARCHERY_SECRET_LICENSES: Record<string, string[]> = {};

export const ARCHERY_SECRET_ARTS: AbilityDef[] = [
  // Anchor 1, PAYOFF. The first bow's fan reads the reeling line: loosed at a staggered (onehand, shield, twohand, combat) or branded body the whole spread lands heavier — the free hand's first cross-school combo.
  {
    id: 'volley',
    name: 'Volley',
    desc: 'Loose a fan of five arrows in one motion. Loosed at a staggered or branded line every shaft lands heavier.',
    color: '#8a6a45',
    code: 'Vo',
    cooldownTicks: 160, // 8 s
    shape: 'projectile_fan',
    damage: 6,
    range: 14,
    projectiles: 5,
    spreadArc: 0.55,
    projectileSpeed: 15,
    role: 'payoff',
    follow: { after: ['stagger', 'brand'], windowTicks: 60, damageMult: 1.4 },
  },

  // Anchor 18, PAYOFF. The heavy bolt reads the crack: on a sundered body (twohand, onehand, or archery's own brand) it drives through half again and SPENDS the crack — the shelf's one consume.
  {
    id: 'piercing_bolt',
    name: 'Piercing Bolt',
    desc: 'A single heavy shaft that punches through every target in line. On a sundered body it drives half again as deep and spends the crack.',
    color: '#6b8a5a',
    code: 'Pb',
    cooldownTicks: 170, // 8.5 s
    shape: 'projectile_fan',
    damage: 12,
    range: 18,
    projectiles: 1,
    projectileSpeed: 19,
    pierce: true,
    role: 'payoff',
    vs: { status: 'sunder', mult: 1.5, consume: true },
  },

  // Anchor 12, OPENER. The hunting shaft opens the vein and leaves the twin school's word (`rend`) for The Shears to spend; a quarry that drops hands the draw back.
  {
    id: 'broadhead',
    name: 'Broadhead',
    desc: 'One hunting shaft with a head like an axe. It opens the body it hits and leaves the wound for a rend to read; a kill gives the draw back.',
    color: '#7a5a36',
    code: 'Bh',
    cooldownTicks: 170, // 8.5 s
    shape: 'projectile_fan',
    damage: 10,
    range: 15,
    projectiles: 1,
    projectileSpeed: 18,
    status: { status: 'bleed', power: 1, durationTicks: 80 },
    role: 'opener',
    tag: 'rend',
    onKill: { refundTicks: 40 },
  },

  // Anchor 18, ANSWER. The flutter is a hop: three feathers loosed as the archer skips back a stride, a loosed word for Stringsong and Harrier, and from the dark (sneak's vanish) the feathers bite half again.
  {
    id: 'wingbeat',
    name: 'Wingbeat',
    desc: 'Skip back a stride and loose three arrows in one flutter. The loosed shot opens Stringsong and Harrier; loosed from the dark it bites half again.',
    color: '#4a8ab8',
    code: 'Wt',
    cooldownTicks: 120, // 6 s
    shape: 'dash_strike',
    damage: 5,
    dashTiles: -3.2, // a skip back, not a tumble
    range: 12,
    projectiles: 3,
    spreadArc: 0.3,
    projectileSpeed: 17,
    role: 'answer',
    tag: 'loose',
    follow: { after: 'vanish', windowTicks: 60, damageMult: 1.5 },
  },

  // Anchor 24, OPENER. The seed arrow gathers the patch (a pull) and plants it: the ground keeps its teeth after the burst, and the volleys fall on the planted patch.
  {
    id: 'verdant_burst',
    name: 'Verdant Burst',
    desc: 'Plant an arrow like a seed. The ground blooms teeth, drags the patch to center, and the thorns stay — a planted patch for Rain and Storm.',
    color: '#5a9a4a',
    code: 'Vb',
    cooldownTicks: 190, // 9.5 s
    shape: 'ground_aoe',
    damage: 9,
    range: 13,
    radius: 2.0,
    fuseTicks: 14,
    knockback: -1.0, // roots do not throw; they GATHER
    status: { status: 'bleed', power: 1, durationTicks: 60 },
    aftermath: { fieldTicks: 48, everyTicks: 16, damage: 1, status: { status: 'bleed', power: 1, durationTicks: 40 } },
    role: 'opener',
    tag: 'plant',
  },

  // Anchor 46, PAYOFF. The drawn song: a real draw, and sung on a rally (combat's shout) the note goes through the whole line half again as hard.
  {
    id: 'windsong',
    name: 'Windsong',
    desc: 'Draw until the bow sings, then loose the note through everything. Sung on a rally it strikes half again down the whole line.',
    color: '#8ab4c8',
    code: 'Wd',
    cooldownTicks: 180, // 9 s
    castTicks: 18, // 0.9 s drawn, 0.72 s planted
    shape: 'projectile_fan',
    damage: 13,
    range: 19,
    projectiles: 1,
    projectileSpeed: 21,
    pierce: true,
    role: 'payoff',
    follow: { after: 'rally', windowTicks: 60, damageMult: 1.5 },
  },

  // Anchor 18, PAYOFF. The briar hedge reads the opened vein: loosed after a rend (dualwield) or an expose (sneak) every thorn bites heavier — the shelf's bleed payoff.
  {
    id: 'thorn_fan',
    name: 'Thorn Fan',
    desc: 'A hedge of briar-shafts, loosed all at once. On a rent or exposed body every thorn bites heavier.',
    color: '#6a8a4a',
    code: 'Tv',
    cooldownTicks: 150, // 7.5 s
    shape: 'projectile_fan',
    damage: 5,
    range: 10,
    projectiles: 5,
    spreadArc: 0.6,
    projectileSpeed: 15,
    status: { status: 'bleed', power: 1, durationTicks: 50 },
    role: 'payoff',
    follow: { after: ['rend', 'expose'], windowTicks: 60, damageMult: 1.4 },
  },

  // Anchor 24, OPENER. The pack runs down the cold and leaves arx's word (`chill`) for Shatter and the frost payoffs; loosed after a quick shot the howl runs harder.
  {
    id: 'howling_loose',
    name: 'Howling Loose',
    desc: 'The string howls and the pack of arrows runs down the cold. The chill it leaves is a word for Shatter; loosed after a quick shot the pack runs harder.',
    color: '#9ab8d8',
    code: 'Hw',
    cooldownTicks: 170, // 8.5 s
    shape: 'projectile_fan',
    damage: 6,
    range: 14,
    projectiles: 4,
    spreadArc: 0.7,
    projectileSpeed: 16,
    status: { status: 'chill', power: 1, durationTicks: 60 },
    role: 'opener',
    tag: 'chill',
    follow: { after: 'loose', windowTicks: 60, damageMult: 1.3 },
  },

  // Anchor 32, ANSWER. The stamped limb: winter bursts outward, shoves the ring back and STAYS as a rime sheet on the floor; the chill is arx's word.
  {
    id: 'hoarfrost',
    name: 'Hoarfrost',
    desc: 'Stamp the frozen limb — winter bursts outward, shoves the ring back and grips it, and the rime stays on the floor. The cold is a word for Shatter.',
    color: '#b8d8e8',
    code: 'Hr',
    cooldownTicks: 180, // 9 s
    shape: 'nova',
    damage: 5,
    radius: 2.6,
    knockback: 1.0,
    status: { status: 'chill', power: 1, durationTicks: 90 },
    aftermath: { fieldTicks: 48, everyTicks: 16, damage: 1, status: { status: 'chill', power: 1, durationTicks: 40 } },
    role: 'answer',
    tag: 'chill',
  },

  // Anchor 24, PAYOFF. The arrow that arrives from nowhere: loosed from the dark (sneak's vanish) it hits harder than any shaft on the shelf and the ghost is nocked again sooner.
  {
    id: 'ghost_shaft',
    name: 'Ghost Shaft',
    desc: 'An arrow that declines to exist until it arrives. Loosed from the dark it strikes far harder, and the ghost is nocked again sooner.',
    color: '#a8a4c0',
    code: 'Gh',
    cooldownTicks: 160, // 8 s
    shape: 'projectile_fan',
    damage: 12,
    range: 17,
    projectiles: 1,
    projectileSpeed: 22,
    pierce: true,
    role: 'payoff',
    follow: { after: 'vanish', windowTicks: 60, damageMult: 1.6, refundTicks: 20 },
  },

  // Anchor 40, SUSTAIN. The burning downpour is a planted patch, and called over a body already burning (arx's word) the rain falls hotter.
  {
    id: 'cinder_rain',
    name: 'Cinder Rain',
    desc: 'Loose one burning shaft skyward. It comes back plural and KEEPS coming — a planted patch for the volleys, and hotter over a body already burning.',
    color: '#e8823d',
    code: 'Cd',
    cooldownTicks: 240, // 12 s
    shape: 'ground_field',
    damage: 4,
    range: 13,
    radius: 2.1,
    fieldTicks: 110, // a burning downpour, not a single strike
    pulseEveryTicks: 16,
    status: { status: 'burn', power: 1, durationTicks: 50 },
    role: 'sustain',
    tag: 'plant',
    follow: { after: 'burn', windowTicks: 60, damageMult: 1.3 },
  },

  // Anchor 40, PAYOFF. The royal warshot answers the challenge: loosed at what the shield has called out (taunt) or a reeling line (stagger) it strikes half again, and a fallen foe hands the crown's draw back.
  {
    id: 'kings_arrow',
    name: "King's Arrow",
    desc: 'The royal warshot: one command, gilded, not open to appeal. Loosed at a taunted or staggered line it strikes half again; a kill hands the draw back.',
    color: '#c9a23c',
    code: 'Kg',
    cooldownTicks: 190, // 9.5 s
    shape: 'projectile_fan',
    damage: 14,
    range: 18,
    projectiles: 1,
    projectileSpeed: 20,
    pierce: true,
    role: 'payoff',
    follow: { after: ['taunt', 'stagger'], windowTicks: 60, damageMult: 1.5 },
    onKill: { refundTicks: 40 },
  },

  // Anchor 40, SUSTAIN. The staked volley of the shelf: seven stars held for two beats, the second falling heavier, and under a hollowed sky (arx's word) the whole fall lands harder.
  {
    id: 'starfall_arrows',
    name: 'Starfall Arrows',
    desc: 'Hold the string and seven points of light leave it on every beat, the last fall heaviest. Under a hollowed sky the stars fall harder.',
    color: '#8a90d8',
    code: 'Sv',
    cooldownTicks: 200, // 10 s
    channelTicks: 32, // two falls of the sky
    pulseEveryTicks: 16,
    shape: 'projectile_fan',
    damage: 3,
    range: 16,
    projectiles: 7,
    spreadArc: 0.9,
    projectileSpeed: 17,
    role: 'sustain',
    finaleMult: 1.5,
    follow: { after: 'hollow', windowTicks: 60, damageMult: 1.3 },
  },

  // Anchor 46, OPENER. The railshot is DRAWN, tears a static line that keeps crackling after the shaft has gone, and leaves arx's word (`shock`).
  {
    id: 'skyrend',
    name: 'Skyrend',
    desc: 'Draw, and tear the horizon open along a line of your choosing. The line keeps crackling after the shaft has gone, and the shock is a word for the arx payoffs.',
    color: '#d8e4f0',
    code: 'Sy',
    cooldownTicks: 220, // 11 s
    castTicks: 20, // 1 s drawn, 0.8 s planted
    shape: 'beam', // the railshot: the arrow arrives before the sound does
    damage: 15,
    range: 18,
    width: 0.5,
    status: { status: 'shock', power: 1, durationTicks: 60 },
    aftermath: { fieldTicks: 48, everyTicks: 16, damage: 2, radius: 1.4, status: { status: 'shock', power: 1, durationTicks: 30 } },
    role: 'opener',
    tag: 'shock',
  },

  // Anchor 40, PAYOFF. THE DRAWN BREATH's bow voice: the longest draw on the shelf, loosed from behind a raised wall (shield's word) or over planted ground it goes through the whole line heavier, and a kill hands the whole draw back.
  {
    id: 'full_draw',
    name: 'The Full Draw',
    desc: 'Draw past the ear and hold it; planted feet loose sooner. Drawn behind a raised wall or over planted ground it goes through heavier, and a kill gives the draw back.',
    color: '#6a4f30',
    code: 'Fd',
    cooldownTicks: 240, // 12 s
    castTicks: 30, // 1.5 s drawn, 1.2 s planted
    shape: 'projectile_fan',
    damage: 16,
    range: 17,
    projectiles: 1,
    projectileSpeed: 22,
    pierce: true, // the shot does not stop for the first opinion
    role: 'payoff',
    follow: { after: ['wall', 'plant'], windowTicks: 60, damageMult: 1.4 },
    onKill: { refundTicks: 80 },
  },

  // Anchor 6, SUSTAIN. The rooted arrow is a planted patch that reads the poisoned: thorns drink deeper from an envenomed body (sneak's page) — the shelf's first field, and its first reading edge.
  {
    id: 'wakewood',
    name: 'Wakewood',
    desc: 'The arrow takes root where it lands and the ground bites for a while — a planted patch for the volleys, and the thorns drink deeper from a poisoned body.',
    color: '#6a8a4a',
    code: 'Ww',
    cooldownTicks: 200, // 10 s — a zone earns a longer breath
    shape: 'ground_field',
    damage: 4,
    range: 13,
    radius: 2.0,
    // Five pulses, not six — THE PAYOFF BRACKET FOR THE SHELF: a full
    // channel at the anchor band must never exceed the line fighter.
    fieldTicks: 90,
    pulseEveryTicks: 16,
    status: { status: 'bleed', power: 1, durationTicks: 60 },
    role: 'sustain',
    tag: 'plant',
    vs: { status: 'venom', mult: 1.3 },
  },

  // Anchor 12, OPENER. The morning line burns and STAYS: dawn lingers on the ground where the lark flew, and the burn is arx's word for Frost Lance's thermal shock.
  {
    id: 'larkshot',
    name: 'Larkshot',
    desc: 'One arrow up the morning line. Everything on it burns, the dawn stays on the ground it crossed, and the burn is a word for the arx payoffs.',
    color: '#ffd98a',
    code: 'Lk',
    cooldownTicks: 190, // 9.5 s
    shape: 'beam',
    damage: 10,
    range: 14,
    width: 0.55,
    status: { status: 'burn', power: 1, durationTicks: 50 },
    aftermath: { fieldTicks: 48, everyTicks: 16, damage: 1, radius: 1.4, status: { status: 'burn', power: 1, durationTicks: 40 } },
    role: 'opener',
    tag: 'burn',
  },

  // Anchor 12, OPENER. The hail lays frost wide and cheap — arx's opener grammar in a bow's hand: the chill is the word Shatter and the thermal payoffs read.
  {
    id: 'glasshail',
    name: 'Glasshail',
    desc: 'The bow rings once, and the sky answers in splinters. Everything under it walks slow — a chill for Shatter and the frost payoffs to spend.',
    color: '#bcd8f0',
    code: 'Gm',
    cooldownTicks: 170, // 8.5 s
    shape: 'projectile_fan',
    damage: 5,
    range: 13,
    projectiles: 6,
    spreadArc: 0.8,
    projectileSpeed: 17,
    status: { status: 'chill', power: 1, durationTicks: 60 },
    role: 'opener',
    tag: 'chill',
  },

  // Anchor 18, PAYOFF. The skipping stone is the free hand's Shatter: skipped across a chilled line (arx) or a branded one it strikes heavier at every head, and leaves shock for the ledger.
  {
    id: 'stormskip',
    name: 'Stormskip',
    desc: 'One arrow, skipped head to head like a stone across a pond. Skipped across a chilled or branded line every head takes it heavier, and the shock is a word for arx.',
    color: '#8fa2c4',
    code: 'Sk',
    cooldownTicks: 190, // 9.5 s
    shape: 'chain_zap',
    damage: 7,
    range: 12,
    radius: 3.0,
    chainTargets: 4,
    status: { status: 'shock', power: 1, durationTicks: 60 },
    role: 'payoff',
    tag: 'shock',
    follow: { after: ['chill', 'brand'], windowTicks: 60, damageMult: 1.4 },
  },

  // Anchor 18, PAYOFF. The kiln on the frost: dropped on a chilled body (arx's word) or a planted patch it lands heavier and wider — the thermal payoff by bow.
  {
    id: 'charfall',
    name: 'Charfall',
    desc: 'It goes up an arrow. It comes down a kiln. Dropped on a chilled body or a planted patch it lands heavier and wider.',
    color: '#ff8a3c',
    code: 'Cf',
    cooldownTicks: 200, // 10 s
    shape: 'ground_aoe',
    damage: 11,
    range: 13,
    radius: 2.1,
    fuseTicks: 16,
    status: { status: 'burn', power: 1, durationTicks: 60 },
    role: 'payoff',
    follow: { after: ['chill', 'plant'], windowTicks: 60, damageMult: 1.5, radiusMult: 1.2 },
  },

  // Anchor 24, PAYOFF. The silent seekers read the exposed (sneak's word) and the branded: nothing marked can hide from what hunts by sound.
  {
    id: 'hushfall',
    name: 'Hushfall',
    desc: 'Five feathers leave without a sound and every one knows the way in the dark. On an exposed or branded body they land heavier.',
    color: '#8d84a8',
    code: 'Hf',
    cooldownTicks: 200, // 10 s
    shape: 'projectile_fan',
    damage: 5,
    range: 13,
    projectiles: 5,
    spreadArc: 0.9,
    projectileSpeed: 15,
    homing: 3.0,
    element: 'void',
    role: 'payoff',
    follow: { after: ['expose', 'brand'], windowTicks: 60, damageMult: 1.3 },
  },

  // Anchor 32, PAYOFF. The called shot reads the body's last third: an execute, and the quarry that answers hands most of the draw back — the shelf's red ledger.
  {
    id: 'quarry_call',
    name: 'Quarry Call',
    desc: 'The called shot. The quarry hears its name; a body in its last third takes it far harder, and a kill hands most of the draw back.',
    color: '#c84a5a',
    code: 'Qc',
    cooldownTicks: 220, // 11 s — the called shot takes its time; the ledger gives it back
    shape: 'projectile_fan',
    damage: 15,
    range: 17,
    projectiles: 1,
    projectileSpeed: 20,
    pierce: true,
    status: { status: 'bleed', power: 1, durationTicks: 80 },
    role: 'payoff',
    executeBelow: { frac: 0.35, mult: 1.6 },
    onKill: { refundTicks: 60 },
  },

  // Anchor 24, SUSTAIN. Three notes off the silent strings, played after the weave's left or right hand (dualwield) the chord rings harder, and at IV the last note hangs in the room.
  {
    id: 'plucked_chord',
    name: 'The Plucked Chord',
    desc: 'Three notes off the silent strings; the room takes the music personally. Played after a left or right cut the chord rings harder.',
    color: '#c8b8f0',
    code: 'Pd',
    cooldownTicks: 200, // 10 s
    shape: 'pulse_nova',
    damage: 6,
    radius: 2.3,
    pulses: 3,
    pulseEveryTicks: 9,
    role: 'sustain',
    follow: { after: ['left', 'right'], windowTicks: 60, damageMult: 1.3 },
  },

  // Anchor 32, OPENER. The net gathers and is a planted patch: the loom draws the catch to center, the net stays on the floor, and Rain and Storm fall on the gathered.
  {
    id: 'nightweft',
    name: 'Nightweft',
    desc: 'The loom casts its net of night and draws the catch to center. The net stays on the floor — a planted patch for Rain and Storm to fall on.',
    color: '#9aa2c8',
    code: 'Nw',
    cooldownTicks: 190, // 9.5 s
    shape: 'nova',
    damage: 7,
    radius: 2.6,
    knockback: -1.5, // the net does not chase; it GATHERS
    aftermath: { fieldTicks: 32, everyTicks: 16, damage: 1 },
    role: 'opener',
    tag: 'plant',
  },

  // Anchor 40, ANSWER. The storm's anvil buys distance: it throws the crowd back, and set down on quaking ground (twohand's word) it rings heavier and throws them farther; the shock is arx's word.
  {
    id: 'the_anvil',
    name: 'The Anvil',
    desc: 'Point at the ground where the storm should set its anvil down. It throws the crowd back; on quaking ground it rings heavier and throws them farther.',
    color: '#cfe0ff',
    code: 'Aq',
    cooldownTicks: 220, // 11 s
    shape: 'ground_aoe',
    damage: 13,
    range: 13,
    radius: 2.4,
    fuseTicks: 18,
    knockback: 1.6,
    status: { status: 'shock', power: 1, durationTicks: 70 },
    role: 'answer',
    tag: 'shock',
    follow: { after: 'quake', windowTicks: 60, damageMult: 1.4, knockbackMult: 1.5 },
  },
];

export const ARCHERY_SECRET_RANKS: Record<string, Steps> = {
  // --------------------------------------------- archery, the flights
  volley: [
    { note: 'Every shaft bites deeper.', damage: 7 },
    { note: 'The spread holds tighter and carries farther.', spreadArc: 0.45, range: 16 },
    { note: 'A sixth shaft joins the flight, and the reeling line waits four seconds for it.', projectiles: 6, follow: { after: ['stagger', 'brand'], windowTicks: 80, damageMult: 1.4 } },
  ],
  wakewood: [
    { note: 'The thorns rake deeper.', damage: 5 },
    { note: 'The rooting ground spreads wider.', radius: 2.2 },
    { note: 'The wood wakes one growth longer and drinks the poisoned dry.', fieldTicks: 106, vs: { status: 'venom', mult: 1.5 } },
  ],
  broadhead: [
    { note: 'The head cuts a wider channel.', damage: 11 },
    { note: 'The draw settles quicker.', cooldownTicks: 155 },
    { note: 'The wound it leaves stays open, and a fallen quarry hands the whole draw back.', status: { status: 'bleed', power: 2, durationTicks: 80 }, onKill: { refundTicks: 60 } },
  ],
  glasshail: [
    { note: 'Each shard bites deeper.', damage: 6 },
    { note: 'The hail holds a tighter pattern.', spreadArc: 0.65 },
    { note: 'A seventh shard rides the gust, and the frost does not let go.', projectiles: 7, status: { status: 'chill', power: 1, durationTicks: 80 } },
  ],
  larkshot: [
    { note: 'The lark strikes brighter.', damage: 11 },
    { note: 'The song cuts a wider line.', width: 0.7 },
    { note: 'Dawn stays on the ground longer and burns where it stays.', aftermath: { fieldTicks: 64, everyTicks: 16, damage: 2, radius: 1.4, status: { status: 'burn', power: 1, durationTicks: 40 } } },
  ],
  charfall: [
    { note: 'The char falls heavier.', damage: 12 },
    { note: 'The burn ground spreads wider.', radius: 2.4 },
    { note: 'The bough drops without a rustle, and the frost waits four seconds for the kiln.', fuseTicks: 11, follow: { after: ['chill', 'plant'], windowTicks: 80, damageMult: 1.5, radiusMult: 1.2 } },
  ],
  piercing_bolt: [
    { note: 'The bolt drives deeper.', damage: 13 },
    { note: 'The shot carries farther.', range: 20 },
    { note: 'It leaves through the third rank, and a cracked body takes it near double.', projectileSpeed: 30, cooldownTicks: 160, vs: { status: 'sunder', mult: 1.8, consume: true } },
  ],
  stormskip: [
    { note: 'The skip strikes harder.', damage: 8 },
    { note: 'The storm leaps farther between marks.', radius: 3.4 },
    { note: 'A fifth mark takes the arc.', chainTargets: 5 },
  ],
  thorn_fan: [
    { note: 'Every thorn bites deeper.', damage: 6 },
    { note: 'The fan holds a tighter spread.', spreadArc: 0.5 },
    { note: 'A sixth thorn joins the fan, and the opened vein waits four seconds for it.', projectiles: 6, follow: { after: ['rend', 'expose'], windowTicks: 80, damageMult: 1.4 } },
  ],
  wingbeat: [
    { note: 'The beat strikes harder.', damage: 6 },
    { note: 'The wings ready again sooner, and the skip carries a stride farther.', cooldownTicks: 105, dashTiles: -4.0 },
    { note: 'A fourth feather leaves the string.', projectiles: 4 },
  ],
  ghost_shaft: [
    { note: 'The shaft bites deeper.', damage: 13 },
    { note: 'The ghost flies farther.', range: 19 },
    { note: 'It passes and is nocked again before the fall.', cooldownTicks: 140 },
  ],
  howling_loose: [
    { note: 'The howl bites deeper.', damage: 7 },
    { note: 'The pack runs tighter.', spreadArc: 0.55 },
    { note: 'A fifth voice joins the howl.', projectiles: 5 },
  ],
  hushfall: [
    { note: 'The hush lands heavier.', damage: 6 },
    { note: 'The silence seeks more surely.', projectileSpeed: 26 },
    { note: 'A sixth quiet joins the falling.', projectiles: 6 },
  ],
  plucked_chord: [
    { note: 'The chord strikes deeper.', damage: 7 },
    { note: 'The resonance rings wider.', radius: 2.5 },
    { note: 'The last note hangs in the room after the strings go still.', aftermath: { fieldTicks: 48, everyTicks: 16, damage: 1 } },
  ],
  verdant_burst: [
    { note: 'The burst cuts deeper.', damage: 10 },
    { note: 'The greening spreads wider.', radius: 2.2 },
    { note: 'The heartwood bursts almost at once, and the thorns stay a season longer.', fuseTicks: 10, aftermath: { fieldTicks: 64, everyTicks: 16, damage: 1, status: { status: 'bleed', power: 1, durationTicks: 40 } } },
  ],
  hoarfrost: [
    { note: 'The frost bites deeper.', damage: 7 },
    { note: 'The rime rings wider.', radius: 2.8 },
    { note: 'The cold does not consider letting go, and gathers again quickly.', status: { status: 'chill', power: 1, durationTicks: 120 }, cooldownTicks: 160 },
  ],
  nightweft: [
    { note: 'The weft cuts deeper.', damage: 9 },
    { note: 'The loom gathers from wider.', radius: 2.8 },
    { note: 'The threads pull harder, the net lies longer, and the loom never rests.', knockback: -2.1, cooldownTicks: 170, aftermath: { fieldTicks: 48, everyTicks: 16, damage: 1 } },
  ],
  quarry_call: [
    { note: 'The call strikes deeper.', damage: 16 },
    { note: 'The quarry is named from farther.', range: 19 },
    { note: 'What is called bleeds until it answers.', status: { status: 'bleed', power: 2, durationTicks: 80 } },
  ],
  cinder_rain: [
    { note: 'The rain burns hotter.', damage: 5 },
    { note: 'The cinder fall spreads wider.', radius: 2.4 },
    { note: 'The rain lingers past its welcome.', fieldTicks: 126 },
  ],
  kings_arrow: [
    { note: 'The arrow strikes with more of the crown behind it.', damage: 15 },
    { note: 'The royal flight goes farther.', range: 20 },
    { note: 'The king does not wait on ceremony.', cooldownTicks: 170 },
  ],
  starfall_arrows: [
    { note: 'Each star burns deeper.', damage: 4 },
    { note: 'The constellation holds its shape and reaches farther.', spreadArc: 0.75, range: 18 },
    { note: 'The last fall of the sky lands double.', finaleMult: 2 },
  ],
  the_anvil: [
    { note: 'The anvil falls heavier.', damage: 14 },
    { note: 'The strike plate spreads wider.', radius: 2.7 },
    { note: 'The hammer needs no backswing.', fuseTicks: 12 },
  ],
  full_draw: [
    { note: 'The shaft arrives heavier.', damage: 18 },
    { note: 'The next shaft is nocked before the dust settles.', cooldownTicks: 210 },
    { note: 'The full draw comes to the ear like a habit.', castTicks: 22 },
  ],
  skyrend: [
    { note: 'The rend cuts deeper.', damage: 16 },
    { note: 'The tear opens wider.', width: 0.65 },
    { note: 'The sky closes slowly, and hurts the whole while.', status: { status: 'shock', power: 1, durationTicks: 80 } },
  ],
  windsong: [
    { note: 'The song strikes deeper.', damage: 14 },
    { note: 'The verse carries farther.', range: 21 },
    { note: 'The refrain returns sooner.', cooldownTicks: 160 },
  ],
};
