/**
 * THE ARX SECRET SHELF — the staff-taught arts and their honed ranks
 * (THE MASTERED HAND, Phase 3: THE SECRET SHELF). Seats and anchors
 * stay in secretArts.ts (THE ANCHOR RULER is not this file's to move).
 *
 * The shelf's law: a secret is THE CROSS-SCHOOL SPICE. A staff teaches
 * it to any hand, so every art here speaks arx's grammar — one spark
 * laid, a second spark that detonates it, ground that stays, a note
 * with a finale — but READS the other schools' words: the archer's
 * brand and planted snare, the duelist's stagger and riposte, the
 * shield's wall and taunt, the sneak's exposed seam and venom, the
 * twin blades' left and right, the veteran's rally, the spear's line
 * and hook, the giant's quake and crack. And it LEAVES words the
 * ladder reads: burn for Frost Lance, chill for Arc Bolt, shock for
 * Geyser, hollow for Cometfall — and, outward, the reeling word
 * (Shearwind's stagger) and the held word (Wildroot's root) for the
 * other schools' payoffs.
 *
 * Every art carries a role, one relationship at least, and three
 * honed steps: II sharpens, III is a beat of utility, IV the signature.
 * THE SECRET BAND is tuned cooldown-first, damage second.
 */
import type { AbilityDef, RankStep } from '@arx/shared';

type Steps = readonly [RankStep, RankStep, RankStep];

/**
 * THE REGISTER, per shelf (see schools/onehand.ts): wave-one pages the
 * shelf lays, by art id. Three licenses, every one under the player
 * HOLD BUDGET (a hold ≤ a tenth of the cycle, warned at least half):
 * - wild_root: a CASTED, FUSED root (lock 30 t, cd ≥ 220 t + 120 t
 *   immunity → 8.8%; warn 16 + 14 = 30 t ≥ 15).
 * - shearwind: a CASTED stagger on the ring (lock 14 t, cd ≥ 140 t +
 *   56 t immunity → 7.1%; warn 10–12 t ≥ 7).
 * - vigil: mend, on the caster only (a boon through the self door).
 */
export const ARX_SECRET_LICENSES: Record<string, string[]> = {
  wild_root: ['root'],
  shearwind: ['stagger'],
  vigil: ['mend'],
};

export const ARX_SECRET_ARTS: AbilityDef[] = [
  // ------------------------------------------------ the first staves
  // OPENER: the cheapest chill in the game, and it leaves a sheet of ice under the ring
  // — the level-1 hand's first word for Arc Bolt to shatter.
  {
    id: 'frost_nova',
    name: 'Frost Nova',
    desc: 'A ring of biting cold. Everything it touches slows, and the ground under them keeps the frost a while. Lightning on the chilled is Shatter.',
    color: '#8ac4e8',
    code: 'Fn',
    cooldownTicks: 150, // 7.5 s
    castFreezeTicks: 5,
    shape: 'nova',
    damage: 4,
    radius: 2.6,
    status: { status: 'chill', power: 1, durationTicks: 80 },
    role: 'opener',
    tag: 'chill',
    aftermath: { fieldTicks: 48, everyTicks: 16, damage: 1, status: { status: 'chill', power: 1, durationTicks: 30 } },
  },

  // PAYOFF: the fused blast reads the archer's BRAND — the fire knows where the mark is
  // and lands half again on it — and leaves fire standing where it bloomed.
  {
    id: 'fireburst',
    name: 'Fireburst',
    desc: 'Call down a delayed blast of flame where you aim, and the fire stays on the ground after. On a branded body the blast finds the mark and burns half again.',
    color: '#e8763c',
    code: 'Fb',
    cooldownTicks: 230, // 11.5 s
    shape: 'ground_aoe',
    damage: 10,
    range: 12,
    radius: 1.8,
    fuseTicks: 16,
    status: { status: 'burn', power: 1, durationTicks: 60 },
    role: 'payoff',
    tag: 'burn',
    follow: { after: 'brand', windowTicks: 60, damageMult: 1.5 },
    aftermath: { fieldTicks: 48, everyTicks: 16, damage: 2, status: { status: 'burn', power: 1, durationTicks: 40 } },
  },

  // ANSWER: the panic ring. Thrown off a STAGGERED body or from behind the shield's
  // WALL it shoves twice as hard and the seat gives part of itself back — the scholar
  // steps out of the melee the other hand made.
  {
    id: 'arcane_ring',
    name: 'Arcane Ring',
    desc: "A ring of raw Arx snaps outward from the staff's heel and throws the yard back. Snap it after a stagger or from behind a wall and it throws them twice as far, and comes back sooner.",
    color: '#b49af0',
    code: 'Ar',
    cooldownTicks: 132, // 6.6 s
    castFreezeTicks: 4,
    shape: 'nova',
    damage: 5,
    radius: 2.2,
    knockback: 0.8,
    role: 'answer',
    follow: { after: ['stagger', 'wall'], windowTicks: 60, knockbackMult: 2, refundTicks: 40 },
  },

  // SUSTAIN: the returning wisps; loosed right after the archer's LOOSE they ride the
  // shaft's line out and back and bite harder both ways.
  {
    id: 'wisp_flare',
    name: 'Wisp Flare',
    desc: 'Release the wisp in three, and everything they pass, they pass twice — out and home. Loose them on the heels of an arrow and they follow it harder.',
    color: '#efe8c0',
    code: 'Wf',
    cooldownTicks: 140, // 7 s
    shape: 'projectile_fan',
    damage: 4,
    range: 9,
    projectiles: 3,
    spreadArc: 0.5,
    projectileSpeed: 13,
    returns: true,
    role: 'sustain',
    follow: { after: 'loose', windowTicks: 60, damageMult: 1.4 },
  },

  // ANSWER: THE HELD GROUND on the shelf. The hearth roars up and STAYS: a warm circle
  // that burns whoever steps in it and plates whoever stands in it — the caster's.
  {
    id: 'hearth_flare',
    name: 'Hearth Flare',
    desc: 'The hearth roars up and throws them off you, then stays lit on the floor. Stand in your own hearth and it keeps you; step out and the warmth stays behind.',
    color: '#e8944a',
    code: 'Hf',
    cooldownTicks: 170, // 8.5 s
    castFreezeTicks: 4,
    shape: 'nova',
    damage: 6,
    radius: 2.0,
    knockback: 1.4,
    status: { status: 'burn', power: 1, durationTicks: 60 },
    role: 'answer',
    tag: 'burn',
    aftermath: {
      fieldTicks: 64,
      everyTicks: 16,
      damage: 1,
      radius: 2.0,
      status: { status: 'burn', power: 1, durationTicks: 40 },
      self: { armor: 2, shieldHp: 4, durationTicks: 18 },
    },
  },

  // OPENER: the pull-blast chills the drowned and leaves a RIPTIDE — ground that keeps
  // dragging toward the center after the blast — so the second spark lands on a bunched yard.
  {
    id: 'undertow',
    name: 'Undertow',
    desc: 'The ground remembers being seabed and everything near is dragged under, cold. The current keeps pulling after the wave breaks. Bring fire or lightning to the bunched and chilled.',
    color: '#6aa0c8',
    code: 'Ut',
    cooldownTicks: 170, // 8.5 s
    shape: 'ground_aoe',
    damage: 9,
    range: 12,
    radius: 2.2,
    fuseTicks: 14,
    knockback: -1.6,
    status: { status: 'chill', power: 1, durationTicks: 90 },
    role: 'opener',
    tag: 'chill',
    aftermath: { fieldTicks: 48, everyTicks: 16, damage: 1, knockback: -0.6, status: { status: 'chill', power: 1, durationTicks: 30 } },
    onKill: { refundTicks: 40 },
  },

  // PAYOFF: the promised bolt reads the CRACK — a sundered body (the giant's, the
  // duelist's word) takes the lightning through the break, and the break is spent.
  {
    id: 'stormlash',
    name: 'Stormlash',
    desc: 'Call the bolt you were promised. It brings friends, leaping throat to throat. A body already cracked open takes it through the crack, and the crack is spent.',
    color: '#e8e06a',
    code: 'Sm',
    cooldownTicks: 200, // 10 s
    shape: 'chain_zap',
    damage: 9,
    range: 12,
    radius: 3.2,
    chainTargets: 4,
    status: { status: 'shock', power: 1, durationTicks: 70 },
    role: 'payoff',
    tag: 'shock',
    vs: { status: 'sunder', mult: 1.4, consume: true },
  },

  // OPENER: the emberstone exhales a burn on the whole ring and leaves cinders on the
  // floor; exhaled on the veteran's RALLY it burns hotter.
  {
    id: 'cinderstorm',
    name: 'Cinderstorm',
    desc: 'The emberstone exhales a whirl of burning cinders around you, and the cinders stay on the floor. Breathe it out on a rally and it burns hotter. Cold on the burning is Thermal Shock.',
    color: '#e8683c',
    code: 'Ci',
    cooldownTicks: 220, // 11 s
    castFreezeTicks: 5,
    shape: 'nova',
    damage: 8,
    radius: 2.4,
    status: { status: 'burn', power: 1, durationTicks: 70 },
    role: 'opener',
    tag: 'burn',
    follow: { after: 'rally', windowTicks: 60, damageMult: 1.3 },
    aftermath: { fieldTicks: 48, everyTicks: 16, damage: 2, status: { status: 'burn', power: 1, durationTicks: 40 } },
  },

  // OPENER: the deep cold, and the glacier front stays as ice on the ground; breathed
  // from behind the shield's WALL the front grows wider and bites.
  {
    id: 'glaciate',
    name: 'Glaciate',
    desc: 'One breath of the deep cold. Everything near slows to glacier speed and the ground stays iced. Breathe it from behind a wall and the glacier grows wider.',
    color: '#9ad0ec',
    code: 'Gl',
    cooldownTicks: 160, // 8 s
    castFreezeTicks: 5,
    shape: 'nova',
    damage: 7,
    radius: 2.8,
    status: { status: 'chill', power: 2, durationTicks: 90 },
    role: 'opener',
    tag: 'chill',
    follow: { after: 'wall', windowTicks: 60, damageMult: 1.2, radiusMult: 1.3 },
    aftermath: { fieldTicks: 64, everyTicks: 16, damage: 1, status: { status: 'chill', power: 1, durationTicks: 30 } },
  },

  // PAYOFF: the arc runs the LINE the spear drew (or the chilled road arx laid) and
  // strikes half again down it — Shatter on the frozen, the circuit on the formation.
  {
    id: 'galvanic_arc',
    name: 'Galvanic Arc',
    desc: 'The stormpearl discharges, a live arc that leaps down the line. Run it down a chilled road or the line a spear just set and it strikes half again.',
    color: '#e8e29a',
    code: 'Ga',
    cooldownTicks: 150, // 7.5 s
    shape: 'chain_zap',
    damage: 7,
    range: 11,
    radius: 3.0,
    chainTargets: 3,
    status: { status: 'shock', power: 1, durationTicks: 60 },
    role: 'payoff',
    tag: 'shock',
    follow: { after: ['chill', 'line'], windowTicks: 60, damageMult: 1.5 },
  },

  // SUSTAIN: the briar field grows from the archer's PLANTED snare — the snare did the
  // holding, so the thicket grown over it costs the hand less (a refund, not a heavier
  // rake: five rakes on a level-6 hand already brush the payoff cap).
  {
    id: 'overgrowth',
    name: 'Overgrowth',
    desc: 'Briars erupt where you point and keep growing, raking and slowing what they hold. Grow them over a planted snare and the thicket is ready to grow again sooner.',
    color: '#7ac46a',
    code: 'Og',
    cooldownTicks: 200, // 10 s
    shape: 'ground_field',
    damage: 4,
    range: 12,
    radius: 2.2,
    fieldTicks: 100,
    pulseEveryTicks: 18,
    status: { status: 'chill', power: 1, durationTicks: 60 },
    role: 'sustain',
    tag: 'chill',
    follow: { after: 'plant', windowTicks: 60, refundTicks: 60 },
  },

  // OPENER: the cold of the deep earth finds the seam the sneak EXPOSED and rises through
  // it half again; a death inside it gives the seat back.
  {
    id: 'grave_chill',
    name: 'Grave Chill',
    desc: 'The cold of the deep earth rises through the living and slows them. Through an exposed seam it rises half again, and a death in the cold gives the seat back.',
    color: '#8a9484',
    code: 'Gv',
    cooldownTicks: 150, // 7.5 s
    castFreezeTicks: 4,
    shape: 'nova',
    damage: 6,
    radius: 2.4,
    status: { status: 'chill', power: 1, durationTicks: 80 },
    role: 'opener',
    tag: 'chill',
    follow: { after: 'expose', windowTicks: 60, damageMult: 1.5 },
    onKill: { refundTicks: 40 },
  },

  // SUSTAIN: the blight blooms in a bleeding field; planted on the sneak's VENOM or
  // EXPOSED seam it blooms harder, and every envenomed body in it takes more.
  {
    id: 'gloom_burst',
    name: 'Gloom Burst',
    desc: 'Plant the blight where they stand and let it bloom, season after season, opening wounds. It feeds on venom: envenomed bodies bleed harder, and planted on a poisoned or exposed foe it blooms deeper.',
    color: '#9a6ab8',
    code: 'Hb',
    cooldownTicks: 220, // 11 s
    shape: 'ground_field',
    damage: 4,
    range: 12,
    radius: 1.9,
    fieldTicks: 110,
    pulseEveryTicks: 18,
    status: { status: 'bleed', power: 1, durationTicks: 60 },
    role: 'sustain',
    follow: { after: ['venom', 'expose'], windowTicks: 60, damageMult: 1.3 },
    vs: { status: 'venom', mult: 1.3 },
  },

  // OPENER: the serpents leave the sneak's own word in the air — an arx hand that opens
  // a vein for Thousand Cuts to read. A kill in the spit gives the seat back.
  {
    id: 'venom_lash',
    name: 'Venom Lash',
    desc: 'Both serpents spit at once. Professional courtesy. What they bite is envenomed, and the sneak\'s payoffs read that word as their own.',
    color: '#a0c050',
    code: 'Vl',
    cooldownTicks: 160, // 8 s
    shape: 'projectile_fan',
    damage: 6,
    range: 13,
    projectiles: 2,
    spreadArc: 0.24,
    projectileSpeed: 15,
    status: { status: 'venom', power: 1, durationTicks: 90 },
    role: 'opener',
    tag: 'venom',
    onKill: { refundTicks: 40 },
  },

  // PAYOFF: the slow globe rolls heavier over ground the giant QUAKED or a body he
  // SUNDERED, and leaves a pool of melt where it stops.
  {
    id: 'magma_orb',
    name: 'Magma Orb',
    desc: 'A slow globe of liquid rock that does not stop for anyone and leaves a pool of melt where it lands. Rolled over quaked ground or a cracked body it lands heavier.',
    color: '#e85a2c',
    code: 'Mg',
    cooldownTicks: 270, // 13.5 s
    shape: 'projectile_fan',
    damage: 13,
    range: 12,
    projectiles: 1,
    projectileSpeed: 9,
    pierce: true,
    status: { status: 'burn', power: 1, durationTicks: 80 },
    role: 'payoff',
    tag: 'burn',
    follow: { after: ['quake', 'sunder'], windowTicks: 60, damageMult: 1.4 },
    aftermath: { fieldTicks: 48, everyTicks: 16, damage: 2, radius: 1.4, status: { status: 'burn', power: 1, durationTicks: 40 } },
  },

  // PAYOFF: the Shatter nova. Bitten down on a SHOCKED body (arx) or a STAGGERED one
  // (the four melee schools' word) the glacier grinds half again.
  {
    id: 'shatterfrost',
    name: 'Shatterfrost',
    desc: 'The glacier bites down. What it grips, it grinds. Bite a charged or a staggered body and the grinding is half again.',
    color: '#b0d8e8',
    code: 'Sf',
    cooldownTicks: 170, // 8.5 s
    castFreezeTicks: 5,
    shape: 'nova',
    damage: 10,
    radius: 2.6,
    status: { status: 'chill', power: 1, durationTicks: 80 },
    role: 'payoff',
    tag: 'chill',
    follow: { after: ['shock', 'stagger'], windowTicks: 60, damageMult: 1.5 },
  },

  // PAYOFF: a DRAWN spear of noon (the scholar's cadence on the shelf) that finds the
  // archer's BRAND and burns the line it crossed.
  {
    id: 'solar_lance',
    name: 'Solar Lance',
    desc: 'Gather the noon and throw it through everything at once. The line it crosses keeps burning, and thrown at a branded body it lands far harder.',
    color: '#ffd98a',
    code: 'So',
    cooldownTicks: 220, // 11 s
    castTicks: 20,
    shape: 'beam',
    damage: 12,
    range: 14,
    width: 0.6,
    status: { status: 'burn', power: 1, durationTicks: 60 },
    role: 'payoff',
    tag: 'burn',
    follow: { after: 'brand', windowTicks: 80, damageMult: 1.6 },
    aftermath: { fieldTicks: 48, everyTicks: 16, damage: 2, radius: 1.4, status: { status: 'burn', power: 1, durationTicks: 40 } },
  },

  // SUSTAIN: the runes repeat; spoken on the twin blades' LEFT or RIGHT they keep the
  // weave's rhythm and every repetition lands louder.
  {
    id: 'rune_echo',
    name: 'Rune Echo',
    desc: 'The runes light in order. Then again, louder. Speak them on the beat of a left or right hand and every echo lands harder.',
    color: '#b0a0d8',
    code: 'Re',
    cooldownTicks: 200, // 10 s
    shape: 'pulse_nova',
    damage: 5,
    radius: 2.2,
    pulses: 3,
    pulseEveryTicks: 10,
    role: 'sustain',
    follow: { after: ['left', 'right'], windowTicks: 60, damageMult: 1.3 },
  },

  // SUSTAIN: the grave-light drinks from an open wound — bleeding bodies (the twin
  // blades', the sneak's) take the waves harder; every wave chills.
  {
    id: 'marrow_pulse',
    name: 'Marrow Pulse',
    desc: 'The ribcage lantern tolls, and waves of grave-light roll outward, chilling. The light feeds on open wounds: bleeding bodies take every wave harder.',
    color: '#d8d2be',
    code: 'Mp',
    cooldownTicks: 210, // 10.5 s
    shape: 'pulse_nova',
    damage: 5,
    radius: 2.3,
    pulses: 3,
    pulseEveryTicks: 10,
    status: { status: 'chill', power: 1, durationTicks: 60 },
    role: 'sustain',
    tag: 'chill',
    vs: { status: 'bleed', mult: 1.4 },
  },

  // SUSTAIN: the rift IS a hollow — it leaves the word for Cometfall — and opened on a
  // HOOKED or ROOTED yard (the spear's, the duelist's) it inhales harder.
  {
    id: 'void_rift',
    name: 'Void Rift',
    desc: 'Open a window to the place with no windows. It inhales, and keeps inhaling. Open it on a hooked or rooted yard and it takes bigger breaths. The far sky reads the hollow.',
    color: '#5a4a8a',
    code: 'Vr',
    cooldownTicks: 240, // 12 s
    shape: 'ground_field',
    damage: 5,
    range: 13,
    radius: 2.6,
    fieldTicks: 100,
    pulseEveryTicks: 16,
    knockback: -1.4,
    role: 'sustain',
    tag: 'hollow',
    follow: { after: ['hook', 'root'], windowTicks: 60, damageMult: 1.4 },
  },

  // SUSTAIN: the held storm — the shelf's channel: stand at the center and the weather
  // walks four beats around you, the last beat the thunderclap. Leaves shock.
  {
    id: 'eye_of_the_storm',
    name: 'Eye of the Storm',
    desc: 'Stand still at the center and the weather does the walking. Every beat the wall strikes the ring and leaves it charged; hold to the last beat and the thunder lands.',
    color: '#c8d0e8',
    code: 'Ey',
    cooldownTicks: 260, // 13 s
    channelTicks: 48,
    pulseEveryTicks: 12,
    shape: 'nova',
    damage: 4,
    radius: 2.5,
    element: 'storm',
    status: { status: 'shock', power: 1, durationTicks: 50 },
    role: 'sustain',
    tag: 'shock',
    finaleMult: 2.5,
  },

  // PAYOFF: the blood moon drinks what it wounds and drinks DEEPER from a body already
  // bleeding — the twin blades' and the sneak's wound, spent in one red beat.
  {
    id: 'red_eclipse',
    name: 'Red Eclipse',
    desc: 'For one heartbeat the moon is close, and it drinks what it wounds. On a body already bleeding it drinks the wound dry and hits harder for it.',
    color: '#c84a5a',
    code: 'Rd',
    cooldownTicks: 215, // 10.75 s
    castFreezeTicks: 6,
    shape: 'nova',
    damage: 12,
    radius: 2.4,
    drainFrac: 0.35,
    status: { status: 'bleed', power: 1, durationTicks: 90 },
    role: 'payoff',
    vs: { status: 'bleed', mult: 1.4, consume: true },
  },

  // CROWN: the legendary, drawn. Any spark in the air tears the seam wider; the seam
  // stays open and crackling after; a death in it reopens the seat.
  {
    id: 'realm_rend',
    name: 'Realm Rend',
    desc: 'Draw the splinter back and put it where it came from, through everything in between. The seam stays torn and crackling after. Tear it through a sparked yard and it opens half again wider.',
    color: '#9ae8de',
    code: 'Rr',
    cooldownTicks: 220, // 11 s
    castTicks: 24,
    shape: 'beam',
    damage: 15,
    range: 16,
    width: 0.65,
    status: { status: 'shock', power: 1, durationTicks: 70 },
    role: 'crown',
    tag: 'shock',
    follow: { after: ['burn', 'chill', 'shock'], windowTicks: 80, damageMult: 1.5 },
    aftermath: { fieldTicks: 64, everyTicks: 16, damage: 2, radius: 1.6, status: { status: 'shock', power: 1, durationTicks: 40 } },
    onKill: { refundTicks: 80 },
  },

  // ------------------------------------- the ten voices, staff arts
  // OPENER: the licensed root. A casted, fused ground that grabs the ankles and holds
  // a breath and a half, then stays forest — chilling briars after the grip. Leaves the
  // spear's own word (root) for Perfect Thrust and the duelist's Headsman to read.
  {
    id: 'wild_root',
    name: 'Wildroot',
    desc: 'Ask the ground to remember being forest. Roots take every ankle where you point and hold them a breath; the briars stay and slow them after. Spears and headsmen read a rooted body.',
    color: '#7a9a4a',
    code: 'Wl',
    cooldownTicks: 220, // 11 s
    castTicks: 16,
    shape: 'ground_aoe',
    damage: 8,
    range: 11,
    radius: 2.0,
    fuseTicks: 14,
    status: { status: 'root', power: 1, durationTicks: 30 },
    role: 'opener',
    tag: 'root',
    aftermath: { fieldTicks: 64, everyTicks: 16, damage: 1, status: { status: 'chill', power: 1, durationTicks: 30 } },
    onKill: { refundTicks: 40 },
  },

  // PAYOFF: dawn drawn, in a line. Broken on a CHILLED road it is Thermal Shock; broken
  // on a sneak stepping out of VANISH it finds the hidden. The line stays lit.
  {
    id: 'day_breaks',
    name: 'The Day Breaks',
    desc: 'Gather the dawn and deliver it early, in a straight line, to everyone at once. The line stays lit. Break it on the chilled, or on someone just out of the dark, and it breaks harder.',
    color: '#ffd98a',
    code: 'Db',
    cooldownTicks: 180, // 9 s
    castTicks: 16,
    shape: 'beam',
    damage: 10,
    range: 13,
    width: 0.6,
    status: { status: 'burn', power: 1, durationTicks: 50 },
    role: 'payoff',
    tag: 'burn',
    follow: { after: ['chill', 'vanish'], windowTicks: 80, damageMult: 1.5 },
    aftermath: { fieldTicks: 48, everyTicks: 16, damage: 1, radius: 1.4, status: { status: 'burn', power: 1, durationTicks: 30 } },
  },

  // OPENER: the borrowed moon chills the spot and leaves its silver on the ground; a
  // death under it gives the seat back. Leaves chill for Arc Bolt and Galvanic Arc.
  {
    id: 'moonfall',
    name: 'Moonfall',
    desc: 'Borrow the moon and return it to the spot you were pointing at. Everything there slows, and the silver stays on the ground after. Lightning on the silver is Shatter.',
    color: '#bcd8f0',
    code: 'Mf',
    cooldownTicks: 190, // 9.5 s
    shape: 'ground_aoe',
    damage: 9,
    range: 11,
    radius: 2.1,
    fuseTicks: 16,
    status: { status: 'chill', power: 1, durationTicks: 90 },
    role: 'opener',
    tag: 'chill',
    aftermath: { fieldTicks: 64, everyTicks: 16, damage: 1, status: { status: 'chill', power: 1, durationTicks: 30 } },
    onKill: { refundTicks: 40 },
  },

  // ANSWER: the licensed stagger. A short cast, then the coil lets go: the ring is thrown
  // and REELS — and the reeling word is the one the duelist, the shield, the giant and
  // the veteran all read. An arx hand that sets up the melee schools.
  {
    id: 'shearwind',
    name: 'Shearwind',
    desc: 'The spindle winds, then lets one coil loose. The crowd is thrown back and left reeling for a moment, and every school that reads a staggered body reads this one.',
    color: '#d8e8f0',
    code: 'Sw',
    cooldownTicks: 160, // 8 s
    castTicks: 12,
    shape: 'nova',
    damage: 7,
    radius: 2.6,
    knockback: 3.2,
    element: 'gale',
    status: { status: 'stagger', power: 1, durationTicks: 14 },
    role: 'answer',
    tag: 'stagger',
  },

  // PAYOFF: five feathers that know an address — an EXPOSED seam or a BRANDED body — and
  // burn harder for knowing it.
  {
    id: 'the_molt',
    name: 'The Molt',
    desc: 'The fan sheds five feathers. Every one of them knows an address. Give them an exposed or a branded body and they arrive burning harder.',
    color: '#ff9a5a',
    code: 'Tm',
    cooldownTicks: 210, // 10.5 s
    shape: 'projectile_fan',
    damage: 4,
    range: 12,
    projectiles: 5,
    spreadArc: 0.9,
    projectileSpeed: 14,
    homing: 3.0,
    element: 'ember',
    status: { status: 'burn', power: 1, durationTicks: 60 },
    role: 'payoff',
    tag: 'burn',
    follow: { after: ['expose', 'brand'], windowTicks: 60, damageMult: 1.4 },
  },

  // SUSTAIN: the hungry dark leaves the word hollow for Cometfall; opened on ground the
  // giant QUAKED it swallows harder.
  {
    id: 'hollowing',
    name: 'Hollowing',
    desc: 'Open the hungry dark at their feet and let it do the inviting; it pulls, and keeps pulling. Open it in quaked ground and it swallows harder. The far sky reads the hollow.',
    color: '#9a8ad8',
    code: 'Hl',
    cooldownTicks: 230, // 11.5 s
    shape: 'ground_field',
    damage: 5,
    range: 12,
    radius: 2.3,
    fieldTicks: 100,
    pulseEveryTicks: 16,
    knockback: -1.2,
    role: 'sustain',
    tag: 'hollow',
    follow: { after: 'quake', windowTicks: 60, damageMult: 1.3 },
  },

  // PAYOFF: the cup goes down the line; passed after the twin blades' REND it collects
  // heavier from every debtor and feeds the taker.
  {
    id: 'red_toll',
    name: 'Red Toll',
    desc: 'The cup goes down the line and everyone pays into it, and what they pay comes to you. Pass it after a rending cut and every debtor pays more.',
    color: '#e84a5a',
    code: 'Rt',
    cooldownTicks: 190, // 9.5 s
    shape: 'chain_zap',
    damage: 7,
    range: 10,
    radius: 3.0,
    chainTargets: 3,
    drainFrac: 0.4,
    status: { status: 'bleed', power: 1, durationTicks: 70 },
    role: 'payoff',
    follow: { after: 'rend', windowTicks: 60, damageMult: 1.4 },
  },

  // SUSTAIN: the proof stated three times; stated on the veteran's RALLY the room
  // accepts it harder.
  {
    id: 'axiom',
    name: 'Axiom',
    desc: 'State the obvious, three times, until the room accepts it. State it on a rally and the room accepts it faster.',
    color: '#c8b8f0',
    code: 'Ax',
    cooldownTicks: 200, // 10 s
    shape: 'pulse_nova',
    damage: 6,
    radius: 2.2,
    pulses: 3,
    pulseEveryTicks: 9,
    role: 'sustain',
    follow: { after: 'rally', windowTicks: 60, damageMult: 1.3 },
  },

  // OPENER: the comet's closest pass, DRAWN (the scholar's cast), burning the ring and
  // leaving its tail on the ground; a death in the tail gives the seat back.
  {
    id: 'perihelion',
    name: 'Perihelion',
    desc: 'Call the comet to its closest pass. Closest, this once, means here: the ring burns, is thrown, and the tail stays burning on the ground. Follow with cold or lightning.',
    color: '#9ae8de',
    code: 'Ph',
    cooldownTicks: 240, // 12 s
    castTicks: 20,
    shape: 'ground_aoe',
    damage: 12,
    range: 12,
    radius: 2.3,
    fuseTicks: 18,
    knockback: 1.6,
    status: { status: 'burn', power: 1, durationTicks: 60 },
    role: 'opener',
    tag: 'burn',
    aftermath: { fieldTicks: 64, everyTicks: 16, damage: 2, status: { status: 'burn', power: 1, durationTicks: 40 } },
    onKill: { refundTicks: 60 },
  },

  // PAYOFF: the crown holds court; every head the shield's TAUNT presented kneels harder.
  {
    id: 'crownstorm',
    name: 'Crownstorm',
    desc: 'The crown holds court. Every head in the line is presented and charged. Hold it after a taunt and every presented head kneels half again harder.',
    color: '#fff0a0',
    code: 'Cw',
    cooldownTicks: 210, // 10.5 s
    shape: 'chain_zap',
    damage: 8,
    range: 11,
    radius: 3.2,
    chainTargets: 5,
    status: { status: 'shock', power: 1, durationTicks: 70 },
    role: 'payoff',
    tag: 'shock',
    follow: { after: 'taunt', windowTicks: 60, damageMult: 1.5 },
  },

  // SUSTAIN: the leech link, a PULLING beam — the thread reels them in as it winds — with
  // the spool's last turn as the finale; from a bleeding body it winds faster.
  {
    id: 'red_thread',
    name: 'Red Thread',
    desc: 'Spool their blood onto the spindle and reel them in with it. The thread only winds while you hold still; the last turn takes the most, and a bleeding body gives it up faster.',
    color: '#c4372a',
    code: 'Rd',
    cooldownTicks: 220, // 11 s
    shape: 'beam',
    damage: 4,
    range: 9,
    width: 0.5,
    element: 'blood',
    channelTicks: 48,
    pulseEveryTicks: 16,
    knockback: -0.5,
    drainFrac: 0.5,
    role: 'sustain',
    finaleMult: 2,
    vs: { status: 'bleed', mult: 1.3 },
  },

  // ANSWER: the held mend, a licensed self-page — the candle keeps knitting after the
  // watch; kept behind the shield's WALL the candle armors the keeper too.
  {
    id: 'vigil',
    name: 'Vigil',
    desc: 'Keep the candle. Each held beat the flame closes a wound on your watch, and it goes on knitting after. Keep it behind a raised wall and the light armors you.',
    color: '#e8d8a0',
    code: 'Vi',
    cooldownTicks: 400, // 20 s
    shape: 'self_buff',
    damage: 0,
    channelTicks: 64,
    pulseEveryTicks: 16,
    self: { heal: 3, durationTicks: 20, selfStatus: { status: 'mend', power: 1, durationTicks: 60 } },
    role: 'answer',
    follow: { after: 'wall', windowTicks: 60, self: { armor: 3, durationTicks: 80 } },
  },
];

export const ARX_SECRET_RANKS: Record<string, Steps> = {
  frost_nova: [
    { note: 'The frost bites deeper.', damage: 6 },
    {
      note: 'The ice sheet outlasts the ring.',
      aftermath: { fieldTicks: 64, everyTicks: 16, damage: 1, status: { status: 'chill', power: 1, durationTicks: 30 } },
    },
    {
      note: 'The still ring: the cold holds until the thaw, and returns before it.',
      cooldownTicks: 132,
      status: { status: 'chill', power: 1, durationTicks: 110 },
    },
  ],
  fireburst: [
    { note: 'The burst burns hotter.', damage: 11 },
    { note: 'The blossom opens wider, with almost no warning.', radius: 2.0, fuseTicks: 10 },
    {
      note: "The marksman's fire: on a branded body it lands near twice over, and the fire stays.",
      follow: { after: 'brand', windowTicks: 60, damageMult: 1.7 },
      aftermath: { fieldTicks: 64, everyTicks: 16, damage: 2, status: { status: 'burn', power: 1, durationTicks: 40 } },
    },
  ],
  arcane_ring: [
    { note: 'The ring strikes harder.', damage: 7 },
    { note: 'The ring throws farther.', knockback: 1.4 },
    {
      note: 'The open door: the ring answers sooner, and a stagger or a wall buys most of it back.',
      cooldownTicks: 108,
      follow: { after: ['stagger', 'wall'], windowTicks: 60, knockbackMult: 2, refundTicks: 60 },
    },
  ],
  wisp_flare: [
    { note: 'Each wisp burns brighter.', damage: 5 },
    { note: 'The wisps range farther and return sooner.', range: 11, cooldownTicks: 126 },
    { note: 'A fourth wisp joins the returning dance.', projectiles: 4 },
  ],
  hearth_flare: [
    { note: 'The hearth roars hotter.', damage: 7 },
    {
      note: 'The hearth stays lit longer and keeps you better.',
      aftermath: {
        fieldTicks: 80,
        everyTicks: 16,
        damage: 1,
        radius: 2.0,
        status: { status: 'burn', power: 1, durationTicks: 40 },
        self: { armor: 3, shieldHp: 6, durationTicks: 18 },
      },
    },
    {
      note: 'The banked fire: the hearth relights sooner, and keeps its keeper better still.',
      cooldownTicks: 150,
      aftermath: {
        fieldTicks: 80,
        everyTicks: 16,
        damage: 1,
        radius: 2.0,
        status: { status: 'burn', power: 1, durationTicks: 40 },
        self: { armor: 4, shieldHp: 8, durationTicks: 18 },
      },
    },
  ],
  undertow: [
    { note: 'The tow drags heavier.', damage: 10 },
    { note: 'The current claims more water and pulls harder.', radius: 2.4, knockback: -2.0 },
    {
      note: 'The riptide: the deep pulls with both hands and outlasts the wave; a drowning reopens it.',
      knockback: -2.4,
      aftermath: { fieldTicks: 64, everyTicks: 16, damage: 1, knockback: -1.0, status: { status: 'chill', power: 1, durationTicks: 30 } },
      onKill: { refundTicks: 60 },
    },
  ],
  stormlash: [
    { note: 'The lash strikes harder.', damage: 10 },
    { note: 'The storm reaches farther between throats, and sooner.', radius: 3.6, cooldownTicks: 190 },
    { note: 'A fifth throat takes the lash.', chainTargets: 5 },
  ],
  cinderstorm: [
    { note: 'The storm burns hotter.', damage: 9 },
    {
      note: 'The cinders stay on the floor longer.',
      aftermath: { fieldTicks: 64, everyTicks: 16, damage: 2, status: { status: 'burn', power: 1, durationTicks: 40 } },
    },
    {
      note: 'The long exhale: the burn outlasts the storm, and on a rally it burns half again.',
      status: { status: 'burn', power: 1, durationTicks: 110 },
      follow: { after: 'rally', windowTicks: 60, damageMult: 1.5 },
    },
  ],
  glaciate: [
    { note: 'The ice bites deeper.', damage: 8 },
    { note: 'The deep cold is breathed again sooner.', cooldownTicks: 150 },
    {
      note: 'The long winter: the freeze holds until spring, and the ice sheet outlasts it.',
      status: { status: 'chill', power: 2, durationTicks: 110 },
      aftermath: { fieldTicks: 80, everyTicks: 16, damage: 1, status: { status: 'chill', power: 1, durationTicks: 30 } },
    },
  ],
  galvanic_arc: [
    { note: 'The arc strikes harder.', damage: 8 },
    { note: 'The pearl recharges sooner.', cooldownTicks: 140 },
    { note: 'A fourth body closes the circuit.', chainTargets: 4 },
  ],
  overgrowth: [
    { note: 'The briars rake deeper.', damage: 5 },
    { note: 'The thicket lives one season longer.', fieldTicks: 126 },
    {
      note: "The trapper's hedge: the slow holds; over a planted snare it regrows in half the time.",
      status: { status: 'chill', power: 1, durationTicks: 80 },
      follow: { after: 'plant', windowTicks: 60, refundTicks: 100 },
    },
  ],
  grave_chill: [
    { note: 'The chill bites deeper.', damage: 7 },
    { note: 'The grave cold reaches wider, and a death gives more back.', radius: 2.6, onKill: { refundTicks: 60 } },
    {
      note: 'The opened grave: what it touches it keeps still; through a seam it rises twice over.',
      status: { status: 'chill', power: 1, durationTicks: 110 },
      follow: { after: 'expose', windowTicks: 60, damageMult: 1.7 },
    },
  ],
  gloom_burst: [
    { note: 'The gloom cuts deeper.', damage: 5 },
    { note: 'The gloom outstays the light.', fieldTicks: 128 },
    {
      note: 'The black bloom: the wounds open wider, and on a poisoned foe it blooms half again.',
      status: { status: 'bleed', power: 2, durationTicks: 60 },
      follow: { after: ['venom', 'expose'], windowTicks: 60, damageMult: 1.5 },
    },
  ],
  venom_lash: [
    { note: 'The lash bites deeper.', damage: 7 },
    { note: 'The twin fangs strike as one.', spreadArc: 0.18 },
    {
      note: 'The long bite: the venom settles in for the night, and a death in it gives the seat back.',
      status: { status: 'venom', power: 1, durationTicks: 120 },
      onKill: { refundTicks: 80 },
    },
  ],
  magma_orb: [
    { note: 'The orb burns hotter.', damage: 14 },
    { note: 'The melt flies farther, and the stone reloads sooner.', range: 14, cooldownTicks: 260 },
    {
      note: 'The slow fire: over broken ground it lands heavier still, and the pool outlasts the orb.',
      follow: { after: ['quake', 'sunder'], windowTicks: 60, damageMult: 1.6 },
      aftermath: { fieldTicks: 64, everyTicks: 16, damage: 2, radius: 1.4, status: { status: 'burn', power: 1, durationTicks: 40 } },
    },
  ],
  shatterfrost: [
    { note: 'The shatter cuts deeper.', damage: 11 },
    { note: 'The glacier bites again sooner.', cooldownTicks: 160 },
    {
      note: 'The marrow bite: frost to the bone; a charged or reeling body breaks near twice over.',
      status: { status: 'chill', power: 2, durationTicks: 80 },
      follow: { after: ['shock', 'stagger'], windowTicks: 60, damageMult: 1.7 },
    },
  ],
  solar_lance: [
    { note: 'The lance burns brighter.', damage: 13 },
    { note: 'The beam cuts a wider line and the noon gathers quicker.', width: 0.72, castTicks: 16 },
    {
      note: 'The standing noon: the sunlight does not stop burning, and the lit line outlasts it.',
      status: { status: 'burn', power: 1, durationTicks: 80 },
      aftermath: { fieldTicks: 64, everyTicks: 16, damage: 2, radius: 1.4, status: { status: 'burn', power: 1, durationTicks: 40 } },
    },
  ],
  rune_echo: [
    { note: 'The echo lands heavier.', damage: 6 },
    { note: 'The rune sounds wider.', radius: 2.4 },
    { note: 'The echo answers a fourth time.', pulses: 4 },
  ],
  marrow_pulse: [
    { note: 'The pulse strikes deeper.', damage: 6 },
    { note: 'The bone song carries wider.', radius: 2.5 },
    { note: 'The fourth toll: the marrow answers a fourth beat, for a longer breath between.', pulses: 4, cooldownTicks: 230 },
  ],
  void_rift: [
    { note: 'The rift bites deeper.', damage: 6 },
    { note: 'The tear opens wider and inhales harder.', radius: 2.9, knockback: -1.8 },
    {
      note: 'The far dark: it pulls with real intent, seldom closes, and stays open a breath longer.',
      knockback: -2.0,
      cooldownTicks: 215,
      fieldTicks: 116,
    },
  ],
  eye_of_the_storm: [
    { note: 'The eye watches heavier weather.', damage: 5 },
    {
      note: 'The stormwall stands wider, and the lightning stays in the skin.',
      radius: 2.7,
      status: { status: 'shock', power: 1, durationTicks: 80 },
    },
    { note: 'The thunderclap: the last beat lands three times over, for a longer calm after.', finaleMult: 3, cooldownTicks: 280 },
  ],
  red_eclipse: [
    { note: 'The eclipse cuts deeper.', damage: 13 },
    { note: 'The moon drinks deeper of what it wounds.', drainFrac: 0.45 },
    {
      note: 'The red shadow falls wider, and drinks an open wound near dry.',
      radius: 2.6,
      vs: { status: 'bleed', mult: 1.6, consume: true },
    },
  ],
  realm_rend: [
    { note: 'The rend cuts deeper.', damage: 16 },
    { note: 'The wound in the world opens wider, and the splinter draws quicker.', width: 0.78, castTicks: 20 },
    {
      note: 'The realm remembers the tear: the seam crackles longer; a sparked yard tears wider.',
      status: { status: 'shock', power: 2, durationTicks: 70 },
      follow: { after: ['burn', 'chill', 'shock'], windowTicks: 80, damageMult: 1.6 },
      aftermath: { fieldTicks: 80, everyTicks: 16, damage: 3, radius: 1.6, status: { status: 'shock', power: 1, durationTicks: 40 } },
    },
  ],
  wild_root: [
    { note: 'The roots strike deeper.', damage: 10 },
    {
      note: 'The wild ground spreads wider and the briars stay longer.',
      radius: 2.3,
      aftermath: { fieldTicks: 80, everyTicks: 16, damage: 1, status: { status: 'chill', power: 1, durationTicks: 30 } },
    },
    {
      note: 'The old forest: the briars rake harder after the grip; a death among them reopens it.',
      aftermath: { fieldTicks: 80, everyTicks: 16, damage: 2, status: { status: 'chill', power: 1, durationTicks: 40 } },
      onKill: { refundTicks: 80 },
    },
  ],
  day_breaks: [
    { note: 'The dawn cuts brighter.', damage: 11 },
    { note: 'The first light falls wider and comes quicker.', width: 0.72, castTicks: 12 },
    {
      note: 'The long morning: the burn holds, and the lit line stays and burns.',
      status: { status: 'burn', power: 1, durationTicks: 70 },
      aftermath: { fieldTicks: 64, everyTicks: 16, damage: 2, radius: 1.4, status: { status: 'burn', power: 1, durationTicks: 40 } },
    },
  ],
  moonfall: [
    { note: 'The moon falls heavier.', damage: 10 },
    { note: 'Moonlight arrives without asking, and wider.', fuseTicks: 11, radius: 2.4 },
    {
      note: 'The long silver: the frost sheet outlasts the moon, and a death under it gives more back.',
      aftermath: { fieldTicks: 100, everyTicks: 16, damage: 1, status: { status: 'chill', power: 1, durationTicks: 30 } },
      onKill: { refundTicks: 60 },
    },
  ],
  shearwind: [
    { note: 'The wind cuts deeper.', damage: 8 },
    { note: 'The gale blows a ring wider, and what it takes, it throws.', radius: 2.9, knockback: 3.8 },
    { note: 'The quick coil: the spindle winds faster and lets go sooner.', castTicks: 10, cooldownTicks: 140 },
  ],
  the_molt: [
    { note: 'Each feather burns deeper.', damage: 5 },
    { note: 'The molt seeks its marks more surely, and from farther.', projectileSpeed: 24, range: 13 },
    { note: 'A sixth feather leaves the quill, and the fan takes a breath to regrow.', projectiles: 6, cooldownTicks: 230 },
  ],
  hollowing: [
    { note: 'The hollow bites deeper.', damage: 6 },
    { note: 'The emptiness spreads wider and pulls harder.', radius: 2.6, knockback: -1.8 },
    {
      note: 'The hungry dark: it opens again sooner, and in quaked ground it swallows half again.',
      cooldownTicks: 205,
      follow: { after: 'quake', windowTicks: 60, damageMult: 1.5 },
    },
  ],
  red_toll: [
    { note: 'The toll collects heavier.', damage: 8 },
    { note: 'The collection reaches farther and drinks deeper from every debtor.', radius: 3.4, drainFrac: 0.5 },
    { note: 'A fourth debtor pays into the cup.', chainTargets: 4 },
  ],
  axiom: [
    { note: 'The proof lands heavier.', damage: 7 },
    { note: 'The theorem holds wider.', radius: 2.4 },
    { note: 'The conclusion states itself a fourth time, and takes a breath before the next proof.', pulses: 4, cooldownTicks: 230 },
  ],
  perihelion: [
    { note: 'The near sun burns hotter.', damage: 13 },
    { note: 'The corona spreads wider and the pass closes faster than the eye.', radius: 2.5, fuseTicks: 12 },
    {
      note: 'The long tail: the comet is called quicker, comes round sooner, and its tail burns longer.',
      castTicks: 16,
      cooldownTicks: 220,
      aftermath: { fieldTicks: 80, everyTicks: 16, damage: 2, status: { status: 'burn', power: 1, durationTicks: 40 } },
    },
  ],
  crownstorm: [
    { note: 'The storm strikes harder.', damage: 9 },
    { note: 'The court of lightning widens and convenes sooner.', radius: 3.5, cooldownTicks: 200 },
    { note: 'A sixth subject kneels to the crown.', chainTargets: 6 },
  ],
  red_thread: [
    { note: 'The thread winds thicker.', damage: 5 },
    { note: 'More of what leaves them arrives with you.', drainFrac: 0.65 },
    { note: 'The fourth turn: the spool takes one more, and the last winds harder.', channelTicks: 64 },
  ],
  vigil: [
    {
      note: 'The flame closes more with every beat.',
      self: { heal: 4, durationTicks: 20, selfStatus: { status: 'mend', power: 1, durationTicks: 60 } },
    },
    { note: 'The candle is relit sooner.', cooldownTicks: 340 },
    {
      note: 'The long watch: a fifth beat, and the knitting after runs deeper.',
      channelTicks: 80,
      self: { heal: 4, durationTicks: 20, selfStatus: { status: 'mend', power: 2, durationTicks: 60 } },
    },
  ],
};
