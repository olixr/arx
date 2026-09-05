/**
 * THE ONEHAND SECRET SHELF — the weapon-taught arts of this school and
 * their honed ranks, one file per school (THE MASTERED HAND,
 * techniques v3, Phase 3 rebuild). Seats and anchors stay in
 * secretArts.ts (THE ANCHOR RULER is not this file's to move).
 *
 * THE DUELIST'S TEMPO, taught by the blade to ANY hand (THE FREE HAND):
 * a secret is the cross-school spice. Every art here speaks the
 * school's spine — stagger and sunder from a wind-up, the riposte
 * inside the window, the held press, the step and the guard — with a
 * twist a rung does not own: it reads ANOTHER school's word, or leaves
 * one for another school's rungs to spend. Every follow on this shelf
 * crosses a line (archery's brand and loose, arx's burn/chill/hollow,
 * sneak's expose and vanish, shield's taunt and wall, twin `left`/
 * `right`/`rend`, combat's rally and weaken, polearm's hook and line);
 * the openers leave chill, burn, venom, brand, plant and rend so the
 * other schools' payoffs have a mark from a sword hand.
 *
 * The shelf's own signature: Still Air (casted, roots the ring) →
 * Last Word (follows root: the weary hear it loudest, a kill returns
 * it) — and across the line, Storm Brand (leaves archery's brand) →
 * Bone Needle (reads brand, finds marrow).
 */
import type { AbilityDef, RankStep } from '@arx/shared';

type Steps = readonly [RankStep, RankStep, RankStep];

/** A quicken stack laid on the caster's own hand — the twin school's page, spoken by one link here. */
const QUICKEN_STACK = { status: 'quicken' as const, power: 0, durationTicks: 120 };

/**
 * THE REGISTER, per shelf (see schools/onehand.ts): the wave-one pages
 * this shelf lays, by art id. Shockwave's stagger is 14 ticks (the
 * page's cap) behind a 10-tick raise on a 180-tick rest (duty 5.9%);
 * Still Air's root is 28 ticks behind a 16-tick cast on a 180-tick
 * rest plus the page's 120 of immunity (duty 9.3%). Quicksilver's
 * quicken is a self page worn only when its link lands.
 */
export const ONEHAND_SECRET_LICENSES: Record<string, string[]> = {
  shockwave: ['stagger'],
  still_air: ['root'],
  quicksilver: ['quicken'],
};

export const ONEHAND_SECRET_ARTS: AbilityDef[] = [
  // ------------------------------------------------------ weapon arts
  // OPENER. The first sword any hand owns opens the round: a bleeding circle that leaves the twin school's word, so the Shears have a wound to spend from a sword hand.
  {
    id: 'crescent_sweep',
    name: 'Crescent Sweep',
    desc: 'Spin a full circle and open every body around you. The wound is a rend: a twin-blade payoff spends it, and a kill on the sweep gives the seat back.',
    color: '#d9a05a',
    code: 'CS',
    cooldownTicks: 140, // 7 s
    castFreezeTicks: 5,
    shape: 'nova',
    damage: 6,
    radius: 1.9,
    knockback: 1.2,
    status: { status: 'bleed', power: 1, durationTicks: 70 },
    role: 'opener',
    tag: 'rend',
    onKill: { refundTicks: 50 },
  },

  // PAYOFF. The pinning step: a lunge that reads a cracked guard or a polearm's hook — the hooked body is already coming to the point.
  {
    id: 'lunge',
    name: 'Lunge',
    desc: 'Dash forward, blade first, through everything in your path. On a cracked guard, or a body a hook just dragged in, the point lands half again.',
    color: '#8d9299',
    code: 'Lu',
    cooldownTicks: 160, // 8 s
    shape: 'dash_strike',
    damage: 8,
    dashTiles: 6.8,
    status: { status: 'bleed', power: 1, durationTicks: 70 },
    role: 'payoff',
    follow: { after: ['sunder', 'hook'], windowTicks: 60, damageMult: 1.4 },
  },

  // ANSWER. The step through the dark: a blink that leaves the riposte word, and out of a sneak's vanish it arrives half again.
  {
    id: 'shadowstep',
    name: 'Shadowstep',
    desc: 'Melt forward through the dark; the knife arrives before you do. Out of a vanish it lands half again, and the step opens your riposte.',
    color: '#7a68a8',
    code: 'Sp',
    cooldownTicks: 150, // 7.5 s
    shape: 'dash_strike',
    damage: 5,
    dashTiles: 6.0,
    travel: 'blink',
    role: 'answer',
    tag: 'riposte',
    follow: { after: 'vanish', windowTicks: 60, damageMult: 1.5 },
  },

  // OPENER. The shelf's stagger, raised and warned like every duelist's hold: a short lift, then the ring reels and the ripostes of every school have their window.
  {
    id: 'shockwave',
    name: 'Shockwave',
    desc: 'Raise the blade a beat and slam the ground. Everything near you is thrown and staggers for a breath, and every riposte you own is open on them.',
    color: '#b8bec8',
    code: 'Sh',
    cooldownTicks: 180, // 9 s: 14t of stagger against 236t of cycle is under the tenth
    castTicks: 10, // 0.5 s raised: warns 10t for a 14t hold
    shape: 'nova',
    damage: 11,
    radius: 2.4,
    knockback: 2.6,
    status: { status: 'stagger', power: 1, durationTicks: 14 },
    role: 'opener',
    tag: 'stagger',
  },

  // ------------------------------------------ blade-roster weapon arts
  // OPENER. The casted crack: a committed overhead that sunders deep, so Levinstroke, the Headsman, Gloomfall and the twohand readers all have a mark from one sword.
  {
    id: 'sundering_chop',
    name: 'Sundering Chop',
    desc: 'Raise the blade and commit. One overhead cut that cracks the guard open for anything that reads a crack, and a kill on the chop returns it to your hand.',
    color: '#a4744b',
    code: 'Sd',
    cooldownTicks: 160, // 8 s
    castTicks: 14, // 0.7 s raised, 0.56 s planted
    shape: 'melee_arc',
    damage: 10,
    range: 2.1,
    arc: 0.8,
    knockback: 1.8,
    status: { status: 'sunder', power: 15, durationTicks: 60 },
    role: 'opener',
    tag: 'sunder',
    onKill: { refundTicks: 60 },
  },

  // OPENER. The briar planted: a raking cut that bleeds and leaves a barbed patch a stride ahead — archery's readers of a planted ground spend it.
  {
    id: 'thorn_lash',
    name: 'Thorn Lash',
    desc: 'The briar uncoils in a raking cut. It leaves barbs behind on the ground that bleed whatever stands in them, and the patch counts as planted for a bow that reads one.',
    color: '#5a7a42',
    code: 'Tl',
    cooldownTicks: 160, // 8 s
    shape: 'melee_arc',
    damage: 7,
    range: 2.2,
    arc: 1.2,
    status: { status: 'bleed', power: 1, durationTicks: 90 },
    role: 'opener',
    tag: 'plant',
    aftermath: { fieldTicks: 48, everyTicks: 16, damage: 1, radius: 1.4, status: { status: 'bleed', power: 1, durationTicks: 40 } },
  },

  // PAYOFF. The link: three thrusts that follow a riposte or either twin hand, and when the link lands the hand quickens — the twin school's page from a sword.
  {
    id: 'quicksilver',
    name: 'Quicksilver',
    desc: 'Three thrusts in the time other blades manage one. After a riposte, or a left or right hand, they land harder and the link quickens your hand.',
    color: '#e6ddc8',
    code: 'Qs',
    cooldownTicks: 120, // 6 s — the duelist fights in tempo
    shape: 'flurry', // the drumroll: a burst of arc strikes you can move through
    damage: 4,
    range: 2.0,
    arc: 0.8,
    hits: 3,
    pulseEveryTicks: 5,
    role: 'payoff',
    follow: {
      after: ['riposte', 'left', 'right'],
      windowTicks: 60,
      damageMult: 1.3,
      self: { selfStatus: QUICKEN_STACK, durationTicks: 1 },
    },
  },

  // OPENER. The tide going out: a cold rush that leaves a frost wake along the road, and the chill word for arx's Shatter readers.
  {
    id: 'riptide',
    name: 'Riptide',
    desc: 'Surge forward like the tide going out. Cold drags at every cut, the road behind you stays frosted a while, and a spark that reads chill has its mark.',
    color: '#3d7a78',
    code: 'Rp',
    cooldownTicks: 150, // 7.5 s
    shape: 'dash_strike',
    damage: 7,
    dashTiles: 5.6,
    status: { status: 'chill', power: 1, durationTicks: 80 },
    role: 'opener',
    tag: 'chill',
    aftermath: { fieldTicks: 48, everyTicks: 16, damage: 1, radius: 1.4, status: { status: 'chill', power: 1, durationTicks: 40 } },
  },

  // PAYOFF. The ember seam reads the cold: a burning crescent after a chill or a stagger lands half again — Thermal Shock from a sword hand.
  {
    id: 'cinder_arc',
    name: 'Cinder Arc',
    desc: 'The ember seam flares in a burning crescent. Swung through a chilled or staggered foe it lands half again, and the fire stays in the cut.',
    color: '#c4623c',
    code: 'Ca',
    cooldownTicks: 160, // 8 s
    shape: 'melee_arc',
    damage: 8,
    range: 2.2,
    arc: 1.1,
    status: { status: 'burn', power: 1, durationTicks: 70 },
    role: 'payoff',
    follow: { after: ['chill', 'stagger'], windowTicks: 60, damageMult: 1.5 },
  },

  // OPENER. The slow cold cut: winter left in the wound for the spark readers, and a kill on the edge gives the seat back.
  {
    id: 'winters_edge',
    name: "Winter's Edge",
    desc: 'A slow, glittering cut that leaves the cold in the wound for five seconds. A spark that reads chill has its mark; a kill on the edge returns it.',
    color: '#a8c8dc',
    code: 'We',
    cooldownTicks: 150, // 7.5 s
    shape: 'melee_arc',
    damage: 7,
    range: 2.1,
    arc: 1.0,
    status: { status: 'chill', power: 1, durationTicks: 100 },
    role: 'opener',
    tag: 'chill',
    onKill: { refundTicks: 60 },
  },

  // SUSTAIN. The harvest held: a scything sweep turned into a channel that reads open wounds, and at mastery the last swing takes the tithe.
  {
    id: 'reapers_arc',
    name: "Reaper's Arc",
    desc: 'Set your feet and scythe the row, beat after beat. Every sweep bleeds, bleeding bodies take more, and the last swing takes the tithe.',
    color: '#4a5a48',
    code: 'Rc',
    cooldownTicks: 170, // 8.5 s
    channelTicks: 48, // 2.4 s held, three sweeps of the scythe
    pulseEveryTicks: 16,
    shape: 'melee_arc',
    damage: 3,
    range: 2.4,
    arc: 1.6,
    status: { status: 'bleed', power: 1, durationTicks: 80 },
    vs: { status: 'bleed', mult: 1.3 },
    role: 'sustain',
  },

  // SUSTAIN. The tally run red: a train of three cuts around you that leaves the twin school's word, so a sword hand feeds the Shears.
  {
    id: 'red_harvest',
    name: 'Red Harvest',
    desc: 'Every edge at once, three times over while you keep moving. The tally around you runs red, and the rend it leaves is a twin-blade payoff waiting.',
    color: '#8a3040',
    code: 'Rh',
    cooldownTicks: 180, // 9 s
    shape: 'pulse_nova',
    damage: 3,
    radius: 2.0,
    pulses: 3,
    pulseEveryTicks: 10,
    status: { status: 'bleed', power: 1, durationTicks: 90 },
    role: 'sustain',
    tag: 'rend',
  },

  // OPENER. The grounded bolt that BRANDS: the line it leaps down is marked for a bow's readers — archery's word from a sword.
  {
    id: 'storm_brand',
    name: 'Storm Brand',
    desc: 'The blade grounds a bolt that leaps down the line of foes. What it strikes is branded: a bow that reads a brand spends it. A kill on the bolt returns it.',
    color: '#5a6a9c',
    code: 'Sb',
    cooldownTicks: 160, // 8 s
    shape: 'chain_zap',
    damage: 7,
    range: 6,
    radius: 3.0,
    chainTargets: 3,
    status: { status: 'shock', power: 1, durationTicks: 70 },
    role: 'opener',
    tag: 'brand',
    onKill: { refundTicks: 50 },
  },

  // ANSWER. The court dismissed: a shove that answers a rally — after the shout, the decree throws them half again as far.
  {
    id: 'kings_decree',
    name: "King's Decree",
    desc: 'The court is dismissed: everything near you is thrown from it. Spoken after a rally the throw goes half again as far.',
    color: '#e8c04c',
    code: 'Kd',
    cooldownTicks: 190, // 9.5 s
    castFreezeTicks: 6,
    shape: 'nova',
    damage: 9,
    radius: 2.6,
    knockback: 3.2,
    role: 'answer',
    follow: { after: 'rally', windowTicks: 60, knockbackMult: 1.5 },
  },

  // PAYOFF. Dawn on a frosted or branded ring: the gold flash lands half again on a body the cold or a bow already marked.
  {
    id: 'sunburst',
    name: 'Sunburst',
    desc: 'Dawn happens here: a flash of gold that scorches the circle. On a chilled or branded ring it lands half again.',
    color: '#e8b64c',
    code: 'Su',
    cooldownTicks: 195, // 9.75 s
    castFreezeTicks: 5,
    shape: 'nova',
    damage: 9,
    radius: 2.4,
    knockback: 1.4,
    status: { status: 'burn', power: 1, durationTicks: 60 },
    role: 'payoff',
    follow: { after: ['chill', 'brand'], windowTicks: 60, damageMult: 1.4 },
  },

  // OPENER. The shelf's falling opener: a fused star that cracks every guard in the crater and leaves it burning — sunder for the readers, fire for the ground.
  {
    id: 'starfall_strike',
    name: 'Starfall',
    desc: 'Point the blade; a piece of the sky keeps the appointment. The crater cracks every guard in it and burns a while after, and the crack is a mark for anything that reads one.',
    color: '#4a4066',
    code: 'Sk',
    cooldownTicks: 260, // 13 s
    shape: 'ground_aoe',
    damage: 12,
    range: 10,
    radius: 2.0,
    fuseTicks: 18,
    knockback: 1.6,
    status: { status: 'sunder', power: 15, durationTicks: 60 },
    role: 'opener',
    tag: 'sunder',
    aftermath: { fieldTicks: 64, everyTicks: 16, damage: 2, status: { status: 'burn', power: 1, durationTicks: 60 } },
  },

  // ANSWER. The oath: lifesteal that leaves the riposte word, and sworn behind a shield's wall it comes back sooner.
  {
    id: 'vow_unbroken',
    name: 'Vow Unbroken',
    desc: 'For six seconds the oath holds: every cut you give, gives back. Swearing it opens your riposte, and sworn behind a wall it is sooner yours again.',
    color: '#e8e8f0',
    code: 'Vu',
    cooldownTicks: 260, // 13 s
    shape: 'self_buff',
    damage: 0,
    self: { meleeLifesteal: 0.35, durationTicks: 120 },
    role: 'answer',
    tag: 'riposte',
    follow: { after: 'wall', windowTicks: 60, refundTicks: 80 },
  },

  // SUSTAIN. The doorwarden's stand as HELD GROUND: a channeled ring that, when the note ends, leaves the kept ground under you — armor while you stand on it.
  {
    id: 'kept_ground',
    name: 'Kept Ground',
    desc: 'Plant your point and hold. The ring bites whatever steps in every beat, and when the note ends the ground stays yours: stand on it and you are armored.',
    color: '#b8c4cc',
    code: 'Kg',
    cooldownTicks: 200, // 10 s
    shape: 'nova',
    damage: 3,
    radius: 2.6,
    knockback: 0.4, // the line holds; what steps in is put back out
    channelTicks: 48, // 2.4 s held, three beats
    pulseEveryTicks: 16,
    role: 'sustain',
    aftermath: { fieldTicks: 64, everyTicks: 16, damage: 1, radius: 2.6, self: { armor: 3, durationTicks: 18 } },
  },

  // ------------------------------------- the ten crowns, sword arts
  // OPENER. The undertow: a cold sweep that reads a burning body (the wave over fire) and leaves the chill word — arx's Shatter readers have their mark from a sword.
  {
    id: 'drag_under',
    name: 'Drag Under',
    desc: 'The sweep is a wave. Everything it touches goes down slow and comes up slower; over a burning body it lands harder, and a spark that reads chill has its mark.',
    color: '#7fae9e',
    code: 'Du',
    cooldownTicks: 150, // 7.5 s
    castFreezeTicks: 4,
    shape: 'melee_arc',
    damage: 6,
    range: 2.2,
    arc: 1.4,
    status: { status: 'chill', power: 1, durationTicks: 90 },
    vs: { status: 'burn', mult: 1.3 }, // the wave over fire
    role: 'opener',
    tag: 'chill',
  },

  // PAYOFF. The word answers the shout: after a rally the light lands half again and a step wider.
  {
    id: 'spoken_light',
    name: 'Spoken Light',
    desc: 'The blade reads its word aloud, once, and the circle goes white. Spoken after a rally it lands half again and reaches a step wider.',
    color: '#ffd977',
    code: 'So',
    cooldownTicks: 170, // 8.5 s
    castFreezeTicks: 5,
    shape: 'nova',
    damage: 7,
    radius: 2.0,
    knockback: 1.2,
    role: 'payoff',
    follow: { after: 'rally', windowTicks: 60, damageMult: 1.5, radiusMult: 1.3 },
  },

  // OPENER. Forge on the ground: a fused mouthful that burns and keeps burning where it fell — arx's burn word laid by a sword, for its Combust readers.
  {
    id: 'slagfall',
    name: 'Slagfall',
    desc: 'Point the maw; it spits a mouthful of forge onto the spot you picked. The spot keeps burning a while after, and anything that reads burn has its mark.',
    color: '#ff8a3c',
    code: 'Sq',
    cooldownTicks: 220, // 11 s
    shape: 'ground_aoe',
    damage: 9,
    range: 8,
    radius: 1.8,
    fuseTicks: 14,
    status: { status: 'burn', power: 1, durationTicks: 70 },
    role: 'opener',
    tag: 'burn',
    aftermath: { fieldTicks: 48, everyTicks: 16, damage: 1, status: { status: 'burn', power: 1, durationTicks: 40 } },
  },

  // PAYOFF. Shatter down the line: the visiting bolt after a chill lands harder on every throat it reaches.
  {
    id: 'sky_splits',
    name: 'The Sky Splits',
    desc: 'The gap in the blade opens, and the bolt goes visiting down the line. Loosed after a chill it lands harder on every throat it reaches.',
    color: '#8fa2c4',
    code: 'Sz',
    cooldownTicks: 160, // 8 s
    shape: 'chain_zap',
    damage: 6,
    range: 6,
    radius: 3.0,
    chainTargets: 4,
    status: { status: 'shock', power: 1, durationTicks: 70 },
    role: 'payoff',
    follow: { after: 'chill', windowTicks: 60, damageMult: 1.3 },
  },

  // OPENER. The verse that closes on a loosed shaft: after a bow's loose the bite lands harder, and the venom it leaves is a sneak payoff's to spend.
  {
    id: 'green_verse',
    name: 'Green Verse',
    desc: 'The song closes the distance in one bar; the bite is the rest of the verse. Sung after a loosed shaft it bites harder, and what it leaves is venom for any hand that reads it.',
    color: '#6faa74',
    code: 'Gv',
    cooldownTicks: 175, // 8.75 s
    shape: 'dash_strike',
    damage: 5,
    dashTiles: 5.0,
    status: { status: 'venom', power: 1, durationTicks: 100 },
    role: 'opener',
    tag: 'venom',
    follow: { after: 'loose', windowTicks: 60, damageMult: 1.4 },
  },

  // PAYOFF. Court on the called-out: convened after a taunt or a stagger it burns wider and harder.
  {
    id: 'sun_court',
    name: 'Sun Court',
    desc: 'Court convenes wherever you stand; everyone else is dismissed, burning. Convened after a taunt or a stagger it reaches wider and lands harder.',
    color: '#e8c04c',
    code: 'Sc',
    cooldownTicks: 190, // 9.5 s
    castFreezeTicks: 6,
    shape: 'nova',
    damage: 9,
    radius: 2.2,
    knockback: 2.6,
    status: { status: 'burn', power: 1, durationTicks: 40 },
    role: 'payoff',
    follow: { after: ['taunt', 'stagger'], windowTicks: 60, damageMult: 1.3, radiusMult: 1.3 },
  },

  // OPENER. The shelf's root, casted like the school's: the air stops, and so does everything in it — the Headsman and the polearm line readers spend it.
  {
    id: 'still_air',
    name: 'Still Air',
    desc: 'Hold the blade still until the air stops moving an arm\'s length around. So does everything in it, for a breath and a half, and a rooted neck is a headsman\'s.',
    color: '#a9c8e4',
    code: 'Si',
    cooldownTicks: 180, // 9 s: 28t of root against 300t of cycle is under the tenth
    castTicks: 16, // 0.8 s held still: warns 16t for a 28t hold
    shape: 'nova',
    damage: 8,
    radius: 2.2,
    status: { status: 'root', power: 1, durationTicks: 28 },
    role: 'opener',
    tag: 'root',
  },

  // ----------------------------------------- rogue's-roster weapon arts
  // OPENER. The vein found: venom that goes in twice as deep on an exposed body — a sneak's word read by a knife any hand can hold.
  {
    id: 'serpents_kiss',
    name: "Serpent's Kiss",
    desc: 'The wave finds the vein and leaves something living in it. On an exposed body the venom goes in twice as deep, and any hand that reads venom can spend it.',
    color: '#8a9a4a',
    code: 'Ss',
    cooldownTicks: 190, // 9.5 s
    shape: 'melee_arc',
    damage: 5,
    range: 1.8,
    arc: 0.9,
    status: { status: 'venom', power: 1, durationTicks: 110 },
    role: 'opener',
    tag: 'venom',
    follow: { after: 'expose', windowTicks: 60, status: { status: 'venom', power: 2, durationTicks: 80 } },
  },

  // PAYOFF. One perfect puncture on a marked spot: after a brand or an expose the sting lands half again.
  {
    id: 'stinger',
    name: 'Stinger',
    desc: 'One wingbeat forward, one perfect puncture. On a branded or exposed body it lands half again.',
    color: '#e8b64c',
    code: 'Sg',
    cooldownTicks: 110, // 5.5 s
    shape: 'dash_strike',
    damage: 5,
    dashTiles: 4.0,
    status: { status: 'bleed', power: 1, durationTicks: 60 },
    role: 'payoff',
    follow: { after: ['brand', 'expose'], windowTicks: 60, damageMult: 1.5 },
  },

  // OPENER. The first frost reads the fire: chill laid on a burning body is Thermal Shock, and the snap lands half again after a burn.
  {
    id: 'cold_snap',
    name: 'Cold Snap',
    desc: 'The first frost happens all at once, an arm\'s length around. Snapped after a burn it lands half again, and the cold it leaves is a spark reader\'s mark.',
    color: '#b8d8e8',
    code: 'Cn',
    cooldownTicks: 150, // 7.5 s
    castFreezeTicks: 4,
    shape: 'nova',
    damage: 5,
    radius: 1.8,
    status: { status: 'chill', power: 1, durationTicks: 90 },
    role: 'opener',
    tag: 'chill',
    follow: { after: 'burn', windowTicks: 60, damageMult: 1.5 },
  },

  // PAYOFF. The dart that reads a brand: thrown at a bow's mark it lands half again, finds marrow in the failing, and a kill gives it back.
  {
    id: 'bone_needle',
    name: 'Bone Needle',
    desc: 'The dead lend a dart that remembers where marrow lives. Thrown at a branded body it lands half again; the failing take it harder, and a kill returns it.',
    color: '#e2dcc8',
    code: 'Bn',
    cooldownTicks: 130, // 6.5 s
    shape: 'projectile_fan',
    damage: 7,
    range: 9,
    projectiles: 1,
    projectileSpeed: 18,
    executeBelow: { frac: 0.4, mult: 1.6 }, // it finds the marrow of the failing
    role: 'payoff',
    follow: { after: 'brand', windowTicks: 60, damageMult: 1.5 },
    onKill: { refundTicks: 40 },
  },

  // PAYOFF. The bite out of the dark: after a vanish the fang lands half again and keeps what it draws.
  {
    id: 'shadow_fang',
    name: 'Shadow Fang',
    desc: 'The dark takes one long step, bites, and keeps what it draws. Out of a vanish it bites half again.',
    color: '#4a4058',
    code: 'Sw',
    cooldownTicks: 150, // 7.5 s
    shape: 'dash_strike',
    damage: 7,
    dashTiles: 7.2,
    drainFrac: 0.25, // the bite feeds the biter
    role: 'payoff',
    follow: { after: 'vanish', windowTicks: 60, damageMult: 1.5 },
  },

  // ANSWER. The tithe called on open wounds: after a rend or a venom the collection comes back sooner.
  {
    id: 'crimson_tithe',
    name: 'Crimson Tithe',
    desc: 'For four seconds, every wound you open pays you back. Called on a rend or a venom already open, the tithe is sooner yours again.',
    color: '#6a3a44',
    code: 'Ct',
    cooldownTicks: 240, // 12 s
    shape: 'self_buff',
    damage: 0,
    self: { meleeLifesteal: 0.5, durationTicks: 80 },
    role: 'answer',
    follow: { after: ['rend', 'venom'], windowTicks: 60, refundTicks: 60 },
  },

  // PAYOFF. The fire poured into the hollow: after an arx hollow or a chill the pale sweep lands half again.
  {
    id: 'pale_flame',
    name: 'Pale Flame',
    desc: 'A sweep of fire that never warmed anything in its life. Poured into a hollow, or over a chill, it lands half again and leaves the cold behind.',
    color: '#c8dce8',
    code: 'Pl',
    cooldownTicks: 150, // 7.5 s
    shape: 'melee_arc',
    damage: 6,
    range: 1.9,
    arc: 1.0,
    status: { status: 'chill', power: 1, durationTicks: 90 },
    role: 'payoff',
    follow: { after: ['hollow', 'chill'], windowTicks: 60, damageMult: 1.5 },
  },

  // PAYOFF. The wire down the line: after a crack or a polearm's line the current lands harder and the hook is sooner back.
  {
    id: 'spark_lash',
    name: 'Spark Lash',
    desc: 'The hook grounds a live wire into whoever stands closest. Run down a cracked guard or a polearm\'s line it lands harder and comes back to hand sooner.',
    color: '#7a88b8',
    code: 'Sl',
    cooldownTicks: 140, // 7 s
    shape: 'chain_zap',
    damage: 6,
    range: 5,
    radius: 2.6,
    chainTargets: 2,
    status: { status: 'shock', power: 1, durationTicks: 60 },
    role: 'payoff',
    follow: { after: ['sunder', 'line'], windowTicks: 60, damageMult: 1.4, refundTicks: 30 },
  },

  // PAYOFF. Regicide favors the called-out and the dulled: after a taunt or a weaken the bane lands harder, and a kill gives the charge back.
  {
    id: 'kings_bane',
    name: "King's Bane",
    desc: 'Cross the room the way rumor does, and land the way history does. On a taunted or weakened body it lands harder; the faltering take it hard, and a kill returns it.',
    color: '#c9a23c',
    code: 'Kb',
    cooldownTicks: 200, // 10 s
    shape: 'dash_strike',
    damage: 9,
    dashTiles: 6.0,
    executeBelow: { frac: 0.3, mult: 1.5 }, // regicide favors a faltering crown
    status: { status: 'bleed', power: 1, durationTicks: 80 },
    role: 'payoff',
    follow: { after: ['taunt', 'weaken'], windowTicks: 60, damageMult: 1.3 },
    onKill: { refundTicks: 80 },
  },

  // PAYOFF. The shelf's finisher and the signature's third press: on a rooted, staggered or weakened body the word is final, and a kill returns it.
  {
    id: 'last_word',
    name: 'Last Word',
    desc: 'Step in, say it once, and the conversation is over. The rooted, the staggered and the weary hear it loudest; the failing take it hardest; a kill returns it.',
    color: '#f0f0f4',
    code: 'Lw',
    cooldownTicks: 210, // 10.5 s
    shape: 'dash_strike',
    damage: 14,
    dashTiles: 5.2,
    executeBelow: { frac: 0.35, mult: 1.8 }, // the finisher: wounded foes take it hard
    role: 'payoff',
    follow: { after: ['root', 'stagger', 'weaken'], windowTicks: 60, damageMult: 1.2 },
    onKill: { refundTicks: 80 },
  },

  // ------------------------------------- the ten crowns, knife arts
  // SUSTAIN. The garden held closed: petals every beat while you stand in the bloom, venom on each, and at mastery the last petal is the whole hedge.
  {
    id: 'garden_close',
    name: 'The Garden Closes',
    desc: 'Stand in the bloom and let the petals fall, beat after beat, every one an edge with venom on it. Any hand that reads venom can spend what the garden leaves.',
    color: '#5f5478',
    code: 'Gc',
    cooldownTicks: 172, // 8.6 s
    channelTicks: 48, // 2.4 s held, three falls of petals
    pulseEveryTicks: 16,
    shape: 'nova',
    damage: 2,
    radius: 1.8,
    status: { status: 'venom', power: 1, durationTicks: 110 },
    role: 'sustain',
    tag: 'venom',
  },

  // PAYOFF. The rook between the hands: after a left or a right the dive lands harder — the twin weave's link from a knife any hand can hold.
  {
    id: 'beak_first',
    name: 'Beak First',
    desc: 'The rook takes the short way to the purse. Through. Dived after a left or a right hand it lands harder.',
    color: '#3c4048',
    code: 'Bf',
    cooldownTicks: 120, // 6 s
    shape: 'dash_strike',
    damage: 5,
    dashTiles: 4.4,
    status: { status: 'bleed', power: 1, durationTicks: 70 },
    role: 'payoff',
    follow: { after: ['left', 'right'], windowTicks: 60, damageMult: 1.4 },
  },

  // ANSWER. The grave-light as the guard: lifesteal that opens the riposte word for the school's payoffs.
  {
    id: 'pale_lantern',
    name: 'Pale Lantern',
    desc: 'The grave-light comes up for five seconds, and what it shows on, it keeps a little of. Lighting it opens your riposte.',
    color: '#b8e8a8',
    code: 'Pn',
    cooldownTicks: 240, // 12 s
    shape: 'self_buff',
    damage: 0,
    self: { meleeLifesteal: 0.3, durationTicks: 100 },
    role: 'answer',
    tag: 'riposte',
  },
];

export const ONEHAND_SECRET_RANKS: Record<string, Steps> = {
  // ------------------------------------------------ onehand, the blades
  crescent_sweep: [
    { note: 'The crescent cuts deeper.', damage: 7 },
    { note: 'The sweep reaches a step wider.', radius: 2.1 },
    {
      note: 'THE OPEN ROUND: the wound refuses to close, and a kill on the sweep gives more back.',
      status: { status: 'bleed', power: 2, durationTicks: 70 },
      onKill: { refundTicks: 60 },
    },
  ],
  lunge: [
    { note: 'The point arrives harder.', damage: 9 },
    { note: 'The step carries you farther, sooner.', dashTiles: 7.6, cooldownTicks: 150 },
    {
      note: 'THE PINNED POINT: on a crack or a hook the lunge also gives two seconds back to the hand.',
      follow: { after: ['sunder', 'hook'], windowTicks: 60, damageMult: 1.4, refundTicks: 40 },
    },
  ],
  serpents_kiss: [
    { note: 'The fang bites deeper.', damage: 6 },
    { note: 'The coil strikes a hand wider.', arc: 1.1, range: 2.0 },
    {
      note: 'THE PATIENT VENOM: the venom learns patience; on an exposed body it lives longer still.',
      status: { status: 'venom', power: 1, durationTicks: 130 },
      follow: { after: 'expose', windowTicks: 60, status: { status: 'venom', power: 2, durationTicks: 100 } },
    },
  ],
  shadowstep: [
    { note: 'The dark hits harder on arrival.', damage: 7 },
    { note: 'The step through shadow lengthens.', dashTiles: 6.8 },
    {
      note: 'THE UNSEEN STEP: ready before the light returns; out of a vanish it gives time back too.',
      cooldownTicks: 120,
      follow: { after: 'vanish', windowTicks: 60, damageMult: 1.5, refundTicks: 30 },
    },
  ],
  beak_first: [
    { note: 'The beak drives deeper.', damage: 6 },
    { note: 'The dive comes from farther out.', dashTiles: 5.2 },
    {
      note: 'THE THIRD HAND: what the rook opens keeps bleeding; after either hand it lands half again.',
      status: { status: 'bleed', power: 1, durationTicks: 110 },
      follow: { after: ['left', 'right'], windowTicks: 60, damageMult: 1.5 },
    },
  ],
  bone_needle: [
    { note: 'The needle bites harder.', damage: 8 },
    { note: 'The throw carries farther.', range: 11 },
    {
      note: 'THE PROMISED MARROW: more of the failing are found, and a kill gives more back.',
      executeBelow: { frac: 0.4, mult: 1.8 },
      onKill: { refundTicks: 60 },
    },
  ],
  drag_under: [
    { note: 'The pull lands heavier.', damage: 7 },
    { note: 'The undertow reaches wider.', arc: 1.6 },
    {
      note: 'THE DEEP UNDERTOW: over fire the wave lands half again, and the cold takes a longer hold.',
      damage: 8,
      vs: { status: 'burn', mult: 1.5 },
      status: { status: 'chill', power: 1, durationTicks: 110 },
    },
  ],
  garden_close: [
    { note: 'Every petal cuts deeper.', damage: 3 },
    { note: 'The garden closes a step wider.', radius: 2.0 },
    {
      note: 'THE WHOLE HEDGE: the last petal falls at twice the weight; the bloom seeds a slower dying.',
      finaleMult: 2.0,
      status: { status: 'venom', power: 1, durationTicks: 130 },
    },
  ],
  quicksilver: [
    { note: 'The hand needs less asking.', cooldownTicks: 112 },
    { note: 'The hand blurs a reach farther.', range: 2.2 },
    {
      note: 'THE QUICK HAND: a fourth cut hides inside the third; a landed link quickens you longer.',
      hits: 4,
      follow: {
        after: ['riposte', 'left', 'right'],
        windowTicks: 60,
        damageMult: 1.4,
        self: { selfStatus: { ...QUICKEN_STACK, durationTicks: 160 }, durationTicks: 1 },
      },
    },
  ],
  riptide: [
    { note: 'The tide hits heavier.', damage: 8 },
    { note: 'The rush carries you farther.', dashTiles: 6.4 },
    {
      note: 'THE LONG EBB: what the tide takes it keeps cold, and the frost wake lies longer.',
      status: { status: 'chill', power: 1, durationTicks: 100 },
      aftermath: { fieldTicks: 64, everyTicks: 16, damage: 1, radius: 1.4, status: { status: 'chill', power: 1, durationTicks: 60 } },
    },
  ],
  shockwave: [
    { note: 'The slam lands heavier.', damage: 12 },
    { note: 'The wave breaks a step wider, and sooner.', radius: 2.6, cooldownTicks: 170 },
    {
      note: 'THE RINGING GROUND: a longer throw, and a kill on the slam returns it.',
      knockback: 3.2,
      onKill: { refundTicks: 60 },
    },
  ],
  spoken_light: [
    { note: 'The word lands brighter.', damage: 9 },
    { note: 'The light carries a step farther.', radius: 2.2 },
    {
      note: 'THE ANSWERED WORD: what it names, it moves — and after a rally the word gives time back.',
      knockback: 2.6,
      follow: { after: 'rally', windowTicks: 60, damageMult: 1.5, radiusMult: 1.3, refundTicks: 40 },
    },
  ],
  stinger: [
    { note: 'The sting drives deeper.', damage: 6 },
    { note: 'The wingbeat carries from farther out.', dashTiles: 4.8 },
    {
      note: 'THE LEFT BARB: the barb stays in the wound, and on a marked body the sting is sooner back.',
      status: { status: 'bleed', power: 1, durationTicks: 100 },
      follow: { after: ['brand', 'expose'], windowTicks: 60, damageMult: 1.5, refundTicks: 30 },
    },
  ],
  sundering_chop: [
    { note: 'The chop falls heavier.', damage: 11 },
    { note: 'The swing opens wider from a shorter raise.', arc: 1.0, castTicks: 12 },
    {
      note: 'THE SPLIT GUARD: what it sunders it scatters, and the crack goes deeper.',
      knockback: 2.4,
      status: { status: 'sunder', power: 20, durationTicks: 60 },
    },
  ],
  thorn_lash: [
    { note: 'The thorns bite deeper.', damage: 8 },
    { note: 'The lash cracks a hand longer.', range: 2.4 },
    {
      note: 'THE GROWN BRIAR: the briar leaves more of itself, and the barbed ground lasts longer.',
      status: { status: 'bleed', power: 1, durationTicks: 110 },
      aftermath: { fieldTicks: 64, everyTicks: 16, damage: 1, radius: 1.4, status: { status: 'bleed', power: 1, durationTicks: 60 } },
    },
  ],
  cold_snap: [
    { note: 'The snap bites harder.', damage: 6 },
    { note: 'The frost rings wider.', radius: 2.0 },
    {
      note: 'THE KILLING FROST: the cold holds until it is done with you; after a burn it bites harder.',
      status: { status: 'chill', power: 1, durationTicks: 120 },
      follow: { after: 'burn', windowTicks: 60, damageMult: 1.6 },
    },
  ],
  crimson_tithe: [
    { note: 'The tithe collects a richer share.', self: { meleeLifesteal: 0.6, durationTicks: 80 } },
    { note: 'The collection runs longer.', self: { meleeLifesteal: 0.6, durationTicks: 100 } },
    {
      note: 'THE CALLED DEBT: called on an open wound, the tithe gives four seconds back.',
      follow: { after: ['rend', 'venom'], windowTicks: 60, refundTicks: 80 },
    },
  ],
  green_verse: [
    { note: 'The verse strikes truer.', damage: 6 },
    { note: 'The serpent line runs farther.', dashTiles: 5.8 },
    {
      note: 'THE LAST STANZA: the slowest poison, and sung after a loose it bites half again.',
      status: { status: 'venom', power: 1, durationTicks: 130 },
      follow: { after: 'loose', windowTicks: 60, damageMult: 1.5 },
    },
  ],
  pale_flame: [
    { note: 'The pale fire cuts deeper.', damage: 7 },
    { note: 'The flame licks a hand wider.', arc: 1.2 },
    {
      note: 'THE COLD BURN: it burns cold, and it burns to the bone.',
      damage: 8,
      status: { status: 'chill', power: 1, durationTicks: 120 },
    },
  ],
  pale_lantern: [
    { note: 'The lantern gathers more of what falls.', self: { meleeLifesteal: 0.4, durationTicks: 100 } },
    { note: 'The light holds longer.', self: { meleeLifesteal: 0.4, durationTicks: 125 } },
    { note: 'THE KEPT LIGHT: the lantern relights sooner.', cooldownTicks: 210 },
  ],
  reapers_arc: [
    { note: 'The scythe falls heavier.', damage: 4 },
    { note: 'The harvest row grows wider.', arc: 1.8 },
    {
      note: 'THE TITHE: the last sweep lands at twice the weight; the reaping leaves nothing to seed.',
      finaleMult: 2.0,
      status: { status: 'bleed', power: 1, durationTicks: 100 },
    },
  ],
  shadow_fang: [
    { note: 'The fang strikes deeper.', damage: 8 },
    { note: 'The pounce covers more dark.', dashTiles: 8.0 },
    {
      note: 'THE DEEP DRAUGHT: it drinks deeper from the wound, and out of a vanish it is sooner back.',
      drainFrac: 0.35,
      follow: { after: 'vanish', windowTicks: 60, damageMult: 1.5, refundTicks: 30 },
    },
  ],
  sky_splits: [
    { note: 'The bolt lands harder.', damage: 7 },
    { note: 'The split leaps a body farther.', radius: 3.4 },
    {
      note: 'THE FIFTH THROAT: a fifth throat hears the thunder; after a chill it lands harder still.',
      chainTargets: 5,
      follow: { after: 'chill', windowTicks: 60, damageMult: 1.4 },
    },
  ],
  slagfall: [
    { note: 'The slag falls heavier.', damage: 10 },
    { note: 'The melt spreads wider.', radius: 2.0 },
    {
      note: 'THE STANDING MELT: barely a warning, and the forge on the ground burns hotter and longer.',
      fuseTicks: 10,
      aftermath: { fieldTicks: 64, everyTicks: 16, damage: 2, status: { status: 'burn', power: 1, durationTicks: 60 } },
    },
  ],
  spark_lash: [
    { note: 'The spark bites harder.', damage: 7 },
    { note: 'The lash arcs a reach farther.', radius: 3.0 },
    {
      note: 'THE THIRD THROAT: a third throat takes the current; down a line the hook is sooner back.',
      chainTargets: 3,
      follow: { after: ['sunder', 'line'], windowTicks: 60, damageMult: 1.5, refundTicks: 40 },
    },
  ],
  storm_brand: [
    { note: 'The brand strikes deeper.', damage: 8 },
    { note: 'The storm reaches farther between throats.', radius: 3.4 },
    {
      note: 'THE FOURTH BODY: a fourth body joins the circuit; a kill on the bolt returns more of it.',
      chainTargets: 4,
      onKill: { refundTicks: 70 },
    },
  ],
  winters_edge: [
    { note: 'The edge bites colder and deeper.', damage: 8 },
    { note: 'The cut sweeps a hand wider.', arc: 1.2 },
    {
      note: 'THE KEPT WINTER: winter keeps whatever the edge touches; a kill returns the edge at once.',
      status: { status: 'chill', power: 1, durationTicks: 130 },
      onKill: { refundTicks: 80 },
    },
  ],
  kept_ground: [
    { note: 'The kept ring bites deeper.', damage: 4 },
    { note: 'The ground you keep grows a stride wider.', radius: 3.0 },
    {
      note: 'THE HELD DOOR: the last beat bites half again; the kept ground stands longer and harder.',
      finaleMult: 1.5,
      aftermath: { fieldTicks: 80, everyTicks: 16, damage: 1, radius: 3.0, self: { armor: 4, durationTicks: 18 } },
    },
  ],
  cinder_arc: [
    { note: 'The cinders cut deeper.', damage: 9 },
    { note: 'The arc sweeps wider.', arc: 1.3 },
    {
      note: 'THE UNGUTTERED EMBER: the embers refuse to gutter; through the cold it lands harder.',
      status: { status: 'burn', power: 1, durationTicks: 100 },
      follow: { after: ['chill', 'stagger'], windowTicks: 60, damageMult: 1.6 },
    },
  ],
  kings_bane: [
    { note: 'The bane strikes deeper.', damage: 10 },
    { note: 'The charge runs a stride farther.', dashTiles: 6.8 },
    {
      note: 'THE COMMON END: crowned or common, the low are finished alike; a kill returns the charge.',
      executeBelow: { frac: 0.35, mult: 1.7 },
      onKill: { refundTicks: 100 },
    },
  ],
  kings_decree: [
    { note: 'The decree lands heavier.', damage: 10 },
    { note: 'The proclamation carries wider.', radius: 2.8 },
    {
      note: 'THE STANDING ORDER: none may stand where the word falls; after a rally it comes sooner.',
      knockback: 3.8,
      follow: { after: 'rally', windowTicks: 60, knockbackMult: 1.5, refundTicks: 40 },
    },
  ],
  last_word: [
    { note: 'The word cuts deeper.', damage: 15 },
    { note: 'It crosses the room to be heard.', dashTiles: 6.0 },
    {
      note: 'THE FINAL WORD: against the failing it is final, and a kill gives the whole word back.',
      executeBelow: { frac: 0.4, mult: 2.0 },
      onKill: { refundTicks: 100 },
    },
  ],
  red_harvest: [
    { note: 'Every edge cuts deeper.', damage: 4 },
    { note: 'The field of the reaping widens.', radius: 2.2 },
    {
      note: 'THE FOURTH ROW: a fourth turn of the edges, and every row bleeds longer.',
      pulses: 4,
      status: { status: 'bleed', power: 1, durationTicks: 110 },
    },
  ],
  still_air: [
    { note: 'The stillness lands heavier.', damage: 9 },
    { note: 'The hush spreads wider.', radius: 2.4 },
    {
      note: 'THE STILLED AIR: the air stays cold where it stopped, and nothing walks out of it quickly.',
      aftermath: { fieldTicks: 48, everyTicks: 16, damage: 1, radius: 2.4, status: { status: 'chill', power: 1, durationTicks: 40 } },
    },
  ],
  sun_court: [
    { note: 'The court burns brighter.', damage: 10 },
    { note: 'The audience chamber widens.', radius: 2.4 },
    {
      note: 'THE SENTENCE: the sentence of the sun is exile; on the called-out it lands harder still.',
      knockback: 3.2,
      follow: { after: ['taunt', 'stagger'], windowTicks: 60, damageMult: 1.4, radiusMult: 1.3 },
    },
  ],
  starfall_strike: [
    { note: 'The star falls heavier.', damage: 13 },
    { note: 'The crater opens wider.', radius: 2.3 },
    {
      note: 'THE BURNING CRATER: less warning, a deeper crack, and the crater burns longer after.',
      fuseTicks: 12,
      status: { status: 'sunder', power: 20, durationTicks: 60 },
      aftermath: { fieldTicks: 80, everyTicks: 16, damage: 2, status: { status: 'burn', power: 1, durationTicks: 60 } },
    },
  ],
  sunburst: [
    { note: 'The burst sears deeper.', damage: 10 },
    { note: 'The dawn breaks wider.', radius: 2.6 },
    {
      note: 'THE KEPT DAWN: what the light finds keeps burning; on a marked ring it lands half again.',
      status: { status: 'burn', power: 2, durationTicks: 60 },
      follow: { after: ['chill', 'brand'], windowTicks: 60, damageMult: 1.5 },
    },
  ],
  vow_unbroken: [
    { note: 'The vow returns a greater share.', self: { meleeLifesteal: 0.45, durationTicks: 120 } },
    { note: 'The oath holds longer.', self: { meleeLifesteal: 0.45, durationTicks: 145 } },
    {
      note: 'THE KEPT OATH: the keeper is never long without it, and behind a wall it is sooner still.',
      cooldownTicks: 230,
      follow: { after: 'wall', windowTicks: 60, refundTicks: 100 },
    },
  ],
};
