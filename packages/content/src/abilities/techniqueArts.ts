/**
 * THE TECHNIQUE ARTS — the actives the technique ladders grant.
 * One shelf of the ability catalog (foundations F6.2) — entries moved
 * verbatim from abilities.ts; the hub spreads every shelf into the one
 * registry, so ids and behavior are untouched.
 */
import type { AbilityDef } from '@arx/shared';

export const TECHNIQUE_ART_DEFS: AbilityDef[] = [
  // ------------------------------------------------------- techniques
  // Learned actives (R): unlocked by combat skill levels, freely
  // swappable — the visible payoff of the skill grind.
  {
    id: 'heavy_slam',
    name: 'Heavy Slam',
    desc: 'An overhead blow that cracks the ground and hurls enemies back.',
    color: '#b8865a',
    code: 'Hs',
    cooldownTicks: 170, // 8.5 s
    castFreezeTicks: 6,
    shape: 'melee_arc',
    damage: 10,
    range: 2.2,
    arc: 1.1,
    knockback: 2.8,
  },
  {
    id: 'whirlwind',
    name: 'Whirlwind',
    desc: 'Become the blade — three spinning cuts while you keep moving.',
    color: '#d9a05a',
    code: 'Ww',
    cooldownTicks: 240, // 12 s
    shape: 'pulse_nova',
    damage: 4,
    radius: 1.8,
    pulses: 3,
    pulseEveryTicks: 8,
    knockback: 0.8,
  },
  {
    id: 'bloodlust',
    name: 'Bloodlust',
    desc: 'For six seconds, every wound your blade deals feeds you.',
    color: '#c4372a',
    code: 'Bl',
    cooldownTicks: 280, // 14 s
    shape: 'self_buff',
    damage: 0,
    self: { meleeLifesteal: 0.4, durationTicks: 120 },
  },
  {
    id: 'tumble_shot',
    name: 'Tumble Shot',
    desc: 'Roll away from your aim and loose an arrow mid-tumble.',
    color: '#8a9a5a',
    code: 'Ts',
    cooldownTicks: 160, // 8 s
    shape: 'dash_strike',
    damage: 7,
    dashTiles: -5.2, // away from the aim — the disengage tool
    projectiles: 1, // ...and the arrow flies at whatever you fled
    projectileSpeed: 16,
    range: 12,
  },
  {
    id: 'rain_of_arrows',
    name: 'Rain of Arrows',
    desc: 'Darken the sky over a patch of ground — then it lands.',
    color: '#6b8a5a',
    code: 'Ra',
    cooldownTicks: 220, // 11 s
    shape: 'ground_aoe',
    damage: 9,
    range: 12,
    radius: 2.0,
    fuseTicks: 18,
  },
  {
    id: 'twin_strike',
    name: 'Twin Strike',
    desc: 'Two heavy shafts, loosed as one, punching through the line.',
    color: '#5a7a4a',
    code: 'Tw',
    cooldownTicks: 180, // 9 s
    shape: 'projectile_fan',
    damage: 10,
    range: 16,
    projectiles: 2,
    spreadArc: 0.12,
    projectileSpeed: 18,
    pierce: true,
  },
  {
    id: 'arc_bolt',
    name: 'Arc Bolt',
    desc: 'A crack of lightning that leaps from foe to foe.',
    color: '#e8e06a',
    code: 'Ab',
    cooldownTicks: 160, // 8 s
    shape: 'chain_zap',
    damage: 7,
    range: 12,
    radius: 3.0,
    chainTargets: 3,
    status: { status: 'shock', power: 1, durationTicks: 70 },
  },
  {
    id: 'blink',
    name: 'Blink',
    desc: 'Step between places — arrive before your enemies notice.',
    color: '#b49af0',
    code: 'Bk',
    cooldownTicks: 200, // 10 s
    shape: 'dash_strike',
    damage: 0,
    dashTiles: 7.6,
    travel: 'blink',
  },
  {
    id: 'meteor_shard',
    name: 'Meteor Shard',
    desc: 'Call a burning shard down on your mark.',
    color: '#e85a3c',
    code: 'Ms',
    cooldownTicks: 260, // 13 s
    shape: 'ground_aoe',
    damage: 13,
    range: 12,
    radius: 2.2,
    fuseTicks: 20,
    knockback: 1.6,
    status: { status: 'burn', power: 1, durationTicks: 60 },
  },
  {
    id: 'earthbreaker',
    name: 'Earthbreaker',
    desc: 'Leap to your mark and land like a verdict — the ground concedes.',
    color: '#a4744b',
    code: 'Ek',
    cooldownTicks: 220, // 11 s
    shape: 'leap_slam',
    damage: 11,
    dashTiles: 9.0,
    radius: 2.2,
    knockback: 2.4,
  },
  {
    id: 'storm_of_shafts',
    name: 'Storm of Shafts',
    desc: 'Blacken a patch of sky and keep it black — arrows on a schedule.',
    color: '#8ab4c8',
    code: 'Zh',
    cooldownTicks: 260, // 13 s
    // THE HELD NOTE (Phase 4b): the stand-in barrage finally STANDS —
    // the sky stays black only while the archer holds the note. The
    // fire-and-forget field retires; the volley is a staked channel.
    channelTicks: 64,
    pulseEveryTicks: 16,
    shape: 'ground_aoe',
    damage: 3,
    range: 12,
    radius: 2.2,
    fuseTicks: 12,
  },
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
  {
    id: 'maelstrom',
    name: 'Maelstrom',
    desc: 'Hold the sea open on dry land — everything caught walks the drain.',
    color: '#6aa0c8',
    code: 'Mm',
    cooldownTicks: 260, // 13 s
    // THE HELD NOTE's pilot: the vortex is HELD open — 2.4s planted,
    // one drag of the drain per beat, staked where the ring released.
    channelTicks: 48,
    pulseEveryTicks: 16,
    shape: 'ground_aoe',
    damage: 3,
    range: 12,
    radius: 2.6,
    fuseTicks: 16,
    knockback: -2.2, // the drain: a hard drag into the eye, every beat
    status: { status: 'chill', power: 1, durationTicks: 80 },
  },
];
