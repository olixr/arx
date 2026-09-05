/**
 * THE SNEAK SCHOOL — its twenty rung arts (and its unwritten page) with
 * their honing ladders, one file per school (THE MASTERED HAND,
 * techniques v3). Moved verbatim from techniqueArts/breaths/ladders and
 * techniqueLadder; the school waves rewrite the arts here.
 */
import type { AbilityDef, TechniqueDef } from '@arx/shared';

/**
 * THE REGISTER, per school: player-wielded wave-one pages
 * (root/stagger/weaken/quicken/mend/stonehide) this school's arts lay,
 * by art id → the exact page list (follow statuses, aftermath pages
 * and self pages count). statusWave.test.ts merges every school's
 * licenses; an unlisted page is refused; every hold is priced by the
 * player HOLD BUDGET in masteredHand.test.ts.
 */
export const SNEAK_LICENSES: Record<string, string[]> = {};

export const SNEAK_ARTS: AbilityDef[] = [
  // The rogue's ladder: unlocked by the sneak skill — the payoff of
  // the shadow grind, slottable from any hand (THE FREE HAND).
  {
    id: 'rend',
    name: 'Rend',
    desc: 'Tear the wound wide — a shallow cut that bleeds like a deep one.',
    color: '#8a3040',
    code: 'Rz',
    cooldownTicks: 150, // 7.5 s
    shape: 'melee_arc',
    damage: 4,
    range: 1.9,
    arc: 0.9,
    status: { status: 'bleed', power: 2, durationTicks: 120 },
  },

  {
    id: 'smoke_bomb',
    name: 'Smoke Bomb',
    desc: 'Drop the room into choking gray. Everything caught gropes at half speed.',
    color: '#8a8794',
    code: 'Sz',
    cooldownTicks: 240, // 12 s
    shape: 'nova',
    damage: 2,
    radius: 2.4,
    status: { status: 'chill', power: 1, durationTicks: 100 },
  },

  {
    id: 'envenom',
    name: 'Envenom',
    desc: 'Oil the edge. For eight seconds, every cut you land carries venom.',
    color: '#a0c050',
    code: 'Ev',
    cooldownTicks: 320, // 16 s
    shape: 'self_buff',
    damage: 0,
    self: { onHitStatus: { status: 'venom', power: 1, durationTicks: 80 }, durationTicks: 160 },
  },

  {
    id: 'night_fangs',
    name: 'Night Fangs',
    desc: 'Three thrown fangs of dark that pick their own throats to find.',
    color: '#4a4058',
    code: 'Nf',
    cooldownTicks: 220, // 11 s
    shape: 'projectile_fan',
    damage: 5,
    range: 10,
    projectiles: 3,
    spreadArc: 0.7,
    projectileSpeed: 15,
    homing: 6.0,
    element: 'void',
    status: { status: 'bleed', power: 1, durationTicks: 60 },
  },

  // --------------------- THE SECOND BREATH — the sneak breath arts
  {
    id: 'opened_vein',
    name: 'Opened Vein',
    desc: 'The breath before the artery. Let it out slow and it never stops.',
    color: '#9a3040',
    code: 'Vn',
    cooldownTicks: 220, // 11 s
    castTicks: 18,
    shape: 'melee_arc',
    damage: 9,
    range: 2.0,
    arc: 0.9,
    status: { status: 'bleed', power: 2, durationTicks: 100 },
  },

  {
    id: 'threadwork',
    name: 'Threadwork',
    desc: 'Hold still and sew. The needle passes through the same place three times.',
    color: '#7a6a8a',
    code: 'Tk',
    cooldownTicks: 190, // 9.5 s
    channelTicks: 48,
    pulseEveryTicks: 16,
    shape: 'melee_arc',
    damage: 4,
    range: 2.0,
    arc: 0.8,
    status: { status: 'bleed', power: 1, durationTicks: 40 },
  },

  {
    id: 'nightshade_kiss',
    name: 'Nightshade Kiss',
    desc: 'A dart steeped a week in the garden nobody plants twice. One kiss is plenty.',
    color: '#8aa050',
    code: 'Nk',
    cooldownTicks: 230, // 11.5 s
    castTicks: 20,
    shape: 'projectile_fan',
    damage: 8,
    range: 9,
    projectiles: 1,
    projectileSpeed: 16,
    status: { status: 'venom', power: 1, durationTicks: 80 },
  },

  {
    id: 'quiet_knife',
    name: 'The Quiet Knife',
    desc: 'A line of hush laid down the corridor. Everything on it opens.',
    color: '#6a6480',
    code: 'Qk',
    cooldownTicks: 180, // 9 s
    channelTicks: 48,
    pulseEveryTicks: 16,
    shape: 'beam',
    damage: 4,
    range: 7,
    width: 0.5,
    status: { status: 'bleed', power: 1, durationTicks: 40 },
  },

  {
    id: 'redwork',
    name: 'Redwork',
    desc: 'The slow inhale, then the room blooms red around you. Craftwork, of a kind.',
    color: '#a84048',
    code: 'Rd',
    cooldownTicks: 220, // 11 s
    castTicks: 22,
    shape: 'nova',
    damage: 10,
    radius: 2.3,
    status: { status: 'bleed', power: 1, durationTicks: 60 },
  },

  {
    id: 'gallows_thread',
    name: 'Gallows Thread',
    desc: 'The noose passes down the line, one neck at a time. Hold the knot.',
    color: '#5a5468',
    code: 'Gh',
    cooldownTicks: 220, // 11 s
    channelTicks: 48,
    pulseEveryTicks: 16,
    shape: 'chain_zap',
    damage: 4,
    range: 9,
    radius: 3.0,
    chainTargets: 2,
    status: { status: 'venom', power: 1, durationTicks: 40 },
  },

  {
    id: 'widows_draw',
    name: "Widow's Draw",
    desc: 'A fan of steeped needles, dealt like cards. Everyone at the table loses.',
    color: '#b0b47a',
    code: 'Wd',
    cooldownTicks: 230, // 11.5 s
    castTicks: 22,
    shape: 'projectile_fan',
    damage: 7,
    range: 10,
    projectiles: 3,
    spreadArc: 0.5,
    projectileSpeed: 15,
    element: 'verdant',
    status: { status: 'venom', power: 1, durationTicks: 60 },
  },

  {
    id: 'bloodletting',
    name: 'Bloodletting',
    desc: 'The old surgery, held to its rhythm. What they lose is yours to keep.',
    color: '#8a2a34',
    code: 'Bt',
    cooldownTicks: 220, // 11 s
    channelTicks: 64,
    pulseEveryTicks: 16,
    shape: 'melee_arc',
    damage: 4,
    range: 2.1,
    arc: 1.0,
    drainFrac: 0.15,
    status: { status: 'bleed', power: 1, durationTicks: 40 },
  },

  {
    id: 'lights_out',
    name: 'Lights Out',
    desc: 'Pinch the wick of a whole room. The dark arrives before the knife does.',
    color: '#3a3450',
    code: 'Lx',
    cooldownTicks: 220, // 11 s
    castTicks: 24,
    shape: 'ground_aoe',
    damage: 14,
    range: 10,
    radius: 2.0,
    fuseTicks: 10,
    status: { status: 'chill', power: 1, durationTicks: 50 },
  },

  {
    id: 'red_hour',
    name: 'The Red Hour',
    desc: 'The hour where every second cuts. Stand in the middle of it and count.',
    color: '#c4384a',
    code: 'Rh',
    cooldownTicks: 260, // 13 s
    channelTicks: 64,
    pulseEveryTicks: 16,
    shape: 'nova',
    damage: 4,
    radius: 2.0,
    status: { status: 'bleed', power: 1, durationTicks: 40 },
  },

  // ------------------------------------ THE OPEN LADDER — new sneak arts
  {
    id: 'ghost_step',
    name: 'Ghost Step',
    desc: 'Walk through them like a rumor — the cut arrives before you do.',
    color: '#8a7fae',
    code: 'Gt',
    cooldownTicks: 170, // 8.5 s
    shape: 'dash_strike',
    damage: 7,
    dashTiles: 6.8,
    status: { status: 'bleed', power: 1, durationTicks: 40 },
  },

  {
    id: 'caltrops',
    name: 'Caltrops',
    desc: 'Sow the floor with iron teeth; whoever crosses, pays.',
    color: '#7a7468',
    code: 'Ca',
    cooldownTicks: 240, // 12 s
    shape: 'ground_field',
    damage: 3,
    range: 7,
    radius: 1.8,
    fieldTicks: 140,
    pulseEveryTicks: 16,
    status: { status: 'bleed', power: 1, durationTicks: 40 },
  },

  {
    id: 'fan_of_knives',
    name: 'Fan of Knives',
    desc: 'Every direction at once, every edge yours.',
    color: '#a8a4b8',
    code: 'Fk',
    cooldownTicks: 200, // 10 s
    shape: 'nova',
    damage: 6,
    radius: 2.2,
    status: { status: 'bleed', power: 1, durationTicks: 60 },
  },

  {
    id: 'feint_double',
    name: 'Feint Double',
    desc: 'Leave a lie standing where you were.',
    color: '#8a8494',
    code: 'Fd',
    cooldownTicks: 300, // 15 s
    shape: 'summon',
    damage: 0,
    summon: { kind: 'decoy', durationTicks: 140, radius: 5, power: 0 },
  },

  {
    id: 'exposing_strike',
    name: 'Exposing Strike',
    desc: 'Find the seam in them and make it official.',
    color: '#9a6a8a',
    code: 'Ex',
    cooldownTicks: 170, // 8.5 s
    shape: 'melee_arc',
    damage: 8,
    range: 2.0,
    arc: 0.9,
    executeBelow: { frac: 0.35, mult: 1.8 },
  },

  {
    id: 'thousand_cuts',
    name: 'Thousand Cuts',
    desc: 'Stop counting. Start cutting.',
    color: '#c4b8d8',
    code: 'Tc',
    cooldownTicks: 220, // 11 s
    shape: 'flurry',
    damage: 3,
    range: 2.0,
    arc: 0.9,
    hits: 5,
    pulseEveryTicks: 4,
    status: { status: 'bleed', power: 1, durationTicks: 40 },
  },

  {
    id: 'whisper_fang',
    name: 'Whisper Fang',
    desc: 'One fang, spoken softly. It finds the throat that was named.',
    color: '#6a5a88',
    code: 'Wf',
    cooldownTicks: 190, // 9.5 s
    shape: 'projectile_fan',
    damage: 9,
    range: 12,
    projectiles: 1,
    projectileSpeed: 16,
    homing: 7.0,
    element: 'void',
    status: { status: 'bleed', power: 1, durationTicks: 60 },
  },
];

export const SNEAK_LADDER: TechniqueDef[] = [
  {
    ability: 'rend',
    style: 'sneak',
    unlockLevel: 5,
    ranks: [
      { note: 'The first cut earns its keep.', damage: 5 },
      { note: 'A wider tear, oftener.', cooldownTicks: 140, arc: 1.05 },
      { note: 'The faltering are finished.', executeBelow: { frac: 0.25, mult: 1.6 } },
    ],
  },
  {
    ability: 'opened_vein',
    style: 'sneak',
    unlockLevel: 10,
    ranks: [
      { note: 'The cut sits deeper.', damage: 11 },
      { note: 'The vein gives more freely.', status: { status: 'bleed', power: 3, durationTicks: 100 } },
      { note: 'What they lose finds its way to you.', cooldownTicks: 200, drainFrac: 0.15 },
    ],
  },
  {
    ability: 'ghost_step',
    style: 'sneak',
    unlockLevel: 15,
    ranks: [
      { note: 'The passing cut means it.', damage: 9 },
      { note: 'A longer walk, told oftener.', dashTiles: 8.4, cooldownTicks: 150 },
      {
        note: 'You pass; the wound stays.',
        status: { status: 'bleed', power: 2, durationTicks: 60 },
      },
    ],
  },
  {
    ability: 'threadwork',
    style: 'sneak',
    unlockLevel: 20,
    ranks: [
      { note: 'The needle bites harder.', damage: 5 },
      { note: 'The seam takes a fourth pass.', channelTicks: 64 },
      { note: 'The thread pulls red behind it.', cooldownTicks: 180, status: { status: 'bleed', power: 1, durationTicks: 60 } },
    ],
  },
  {
    ability: 'smoke_bomb',
    style: 'sneak',
    unlockLevel: 25,
    ranks: [
      { note: 'The gray reaches farther.', radius: 2.8 },
      {
        note: 'The choke lingers.',
        status: { status: 'chill', power: 1, durationTicks: 130 },
      },
      { note: 'A whole room, lost in gray.', radius: 3.2, cooldownTicks: 220 },
    ],
  },
  {
    ability: 'nightshade_kiss',
    style: 'sneak',
    unlockLevel: 30,
    ranks: [
      { note: 'The dart strikes truer.', damage: 10 },
      { note: 'The garden steeps stronger.', status: { status: 'venom', power: 2, durationTicks: 80 } },
      { note: 'The kiss asks again sooner.', cooldownTicks: 210 },
    ],
  },
  {
    ability: 'caltrops',
    style: 'sneak',
    unlockLevel: 35,
    ranks: [
      { note: 'The teeth bite deeper.', damage: 4 },
      { note: 'More iron, sown wider, waiting longer.', radius: 2.2, fieldTicks: 160 },
      {
        note: 'Rusted barbs — the crossing is never forgotten.',
        damage: 5,
        status: { status: 'bleed', power: 2, durationTicks: 40 },
      },
    ],
  },
  {
    ability: 'quiet_knife',
    style: 'sneak',
    unlockLevel: 40,
    ranks: [
      { note: 'The hush cuts deeper.', damage: 5 },
      { note: 'The line holds a fourth breath.', channelTicks: 64 },
      { note: 'The quiet arrives sooner each time.', cooldownTicks: 170 },
    ],
  },
  {
    ability: 'fan_of_knives',
    style: 'sneak',
    unlockLevel: 45,
    ranks: [
      { note: 'Every edge asks for more.', damage: 8 },
      { note: 'The fan opens wider, oftener.', radius: 2.6, cooldownTicks: 180 },
      {
        note: 'Every edge leaves its signature.',
        damage: 9,
        status: { status: 'bleed', power: 2, durationTicks: 60 },
      },
    ],
  },
  {
    ability: 'redwork',
    style: 'sneak',
    unlockLevel: 50,
    ranks: [
      { note: 'The bloom cuts deeper.', damage: 12 },
      { note: 'The red reaches the far walls.', radius: 2.6, cooldownTicks: 200 },
      { note: 'The craft pays its maker.', damage: 13, cooldownTicks: 190, drainFrac: 0.12 },
    ],
  },
  {
    ability: 'envenom',
    style: 'sneak',
    unlockLevel: 54,
    ranks: [
      {
        note: 'The oil holds for ten seconds.',
        self: {
          onHitStatus: { status: 'venom', power: 1, durationTicks: 80 },
          durationTicks: 200,
        },
      },
      { note: 'The vial refills sooner.', cooldownTicks: 280 },
      {
        note: 'A crueler brew.',
        self: {
          onHitStatus: { status: 'venom', power: 2, durationTicks: 80 },
          durationTicks: 200,
        },
      },
    ],
  },
  {
    ability: 'gallows_thread',
    style: 'sneak',
    unlockLevel: 58,
    ranks: [
      { note: 'The knot draws venom deeper.', status: { status: 'venom', power: 1, durationTicks: 56 } },
      { note: 'The rope asks again sooner.', cooldownTicks: 200 },
      { note: 'The noose takes a third neck.', chainTargets: 3 },
    ],
  },
  {
    ability: 'feint_double',
    style: 'sneak',
    unlockLevel: 62,
    ranks: [
      {
        note: 'The lie stands longer.',
        summon: { kind: 'decoy', durationTicks: 200, radius: 5, power: 0 },
      },
      { note: 'You can afford to lie oftener.', cooldownTicks: 260 },
      {
        note: 'A lie good enough to gather a crowd.',
        summon: { kind: 'decoy', durationTicks: 240, radius: 7, power: 0 },
      },
    ],
  },
  {
    ability: 'widows_draw',
    style: 'sneak',
    unlockLevel: 66,
    ranks: [
      { note: 'The needles bite harder.', damage: 8 },
      { note: 'The steeping runs deeper.', status: { status: 'venom', power: 1, durationTicks: 80 } },
      { note: 'The needles learn her patience, and seek.', cooldownTicks: 210, homing: 4 },
    ],
  },
  {
    ability: 'exposing_strike',
    style: 'sneak',
    unlockLevel: 70,
    ranks: [
      { note: 'The seam opens wider.', damage: 10 },
      { note: 'You find it faster.', cooldownTicks: 150 },
      { note: 'What is open, ends.', damage: 11, executeBelow: { frac: 0.4, mult: 2.2 } },
    ],
  },
  {
    ability: 'bloodletting',
    style: 'sneak',
    unlockLevel: 74,
    ranks: [
      { note: 'The surgery cuts deeper.', damage: 5 },
      { note: 'The rhythm quickens.', cooldownTicks: 200 },
      { note: 'The taking is thorough now.', drainFrac: 0.25 },
    ],
  },
  {
    ability: 'night_fangs',
    style: 'sneak',
    unlockLevel: 78,
    ranks: [
      { note: 'Sharper fangs.', damage: 6 },
      { note: 'A fourth fang joins the hunt.', projectiles: 4 },
      {
        note: 'The bites stay open.',
        status: { status: 'bleed', power: 2, durationTicks: 60 },
      },
    ],
  },
  {
    ability: 'lights_out',
    style: 'sneak',
    unlockLevel: 82,
    ranks: [
      { note: 'The dark lands heavier.', damage: 16 },
      { note: 'The room grows, and the cold stays longer.', radius: 2.4, status: { status: 'chill', power: 1, durationTicks: 70 } },
      { note: 'The wick pinches quicker.', damage: 17, cooldownTicks: 200, castTicks: 22 },
    ],
  },
  {
    ability: 'red_hour',
    style: 'sneak',
    unlockLevel: 86,
    ranks: [
      { note: 'Every second cuts deeper.', damage: 5 },
      { note: 'The hour fills a wider room.', radius: 2.3 },
      { note: 'The clock runs hungrier.', cooldownTicks: 240, status: { status: 'bleed', power: 1, durationTicks: 50 } },
    ],
  },
  {
    ability: 'thousand_cuts',
    style: 'sneak',
    unlockLevel: 90,
    ranks: [
      { note: 'Each cut counts double.', damage: 4 },
      { note: 'A sixth beat in the drumroll.', hits: 6, cooldownTicks: 200 },
      {
        note: 'Count them later.',
        status: { status: 'bleed', power: 2, durationTicks: 40 },
      },
    ],
  },
  {
    ability: 'whisper_fang',
    style: 'sneak',
    unlockLevel: 0,
    hidden: { anchorLevel: 30 },
    ranks: [
      { note: 'The whisper cuts deeper.', damage: 11 },
      { note: 'The name is spoken sooner.', cooldownTicks: 170 },
      {
        note: 'The whisper keeps talking after it lands.',
        status: { status: 'bleed', power: 2, durationTicks: 80 },
      },
    ],
  },
];
