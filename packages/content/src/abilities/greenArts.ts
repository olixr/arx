/**
 * THE GREEN ARTS — the farming school: the land mends, wards and hurries.
 * One shelf of the ability catalog (foundations F6.2) — entries moved
 * verbatim from abilities.ts; the hub spreads every shelf into the one
 * registry, so ids and behavior are untouched.
 */
import type { AbilityDef } from '@arx/shared';

export const GREEN_ART_DEFS: AbilityDef[] = [
  // ------------------------------------------- the green arts
  // THE GREEN ARTS (farming v2 Phase 6): the second non-combat
  // technique school. All damage 0 forever — farming never joins
  // COMBAT_STYLES or the half-echo; the land mends, wards, and
  // hurries, and that is the whole of its argument.
  {
    id: 'sowers_step',
    name: "Sower's Step",
    desc: 'The field-path stride. For a dozen breaths the furrows carry you.',
    color: '#79a355',
    code: 'Ss',
    cooldownTicks: 600, // 30 s
    shape: 'self_buff',
    damage: 0,
    self: { speedMult: 1.12, durationTicks: 240 },
  },
  {
    id: 'gardeners_mend',
    name: "Gardener's Mend",
    desc: 'Kneel a moment among growing things. The green gives some of itself back.',
    color: '#7ac46a',
    code: 'Gm',
    cooldownTicks: 800, // 40 s
    castFreezeTicks: 20,
    shape: 'self_buff',
    damage: 0,
    self: { heal: 12, durationTicks: 20 },
  },
  {
    id: 'earthen_brace',
    name: 'Earthen Brace',
    desc: 'Set your feet like a fencepost. The ground holds you up a while.',
    color: '#8a6a45',
    code: 'Eb',
    cooldownTicks: 700, // 35 s
    shape: 'self_buff',
    damage: 0,
    self: { shieldHp: 14, durationTicks: 240 },
  },
  {
    id: 'hearthkeepers_calm',
    name: "Hearthkeeper's Calm",
    desc: 'Carry the yard\'s quiet with you. Blows land softer on a settled heart.',
    color: '#c9a86a',
    code: 'Hk',
    cooldownTicks: 900, // 45 s
    shape: 'self_buff',
    damage: 0,
    self: { armor: 4, durationTicks: 300 },
  },
  {
    id: 'quickening_touch',
    name: 'Quickening Touch',
    desc: 'Lay a hand over a growing crop and lend it a season\'s patience at once.',
    color: '#e8c04c',
    code: 'Qt',
    cooldownTicks: 1200, // 60 s
    shape: 'ground_aoe',
    damage: 0,
    radius: 0.8,
    range: 4,
  },
];
