/**
 * THE ARCHERY SCHOOL — its twenty rung arts (and its unwritten page) with
 * their honing ladders, one file per school (THE MASTERED HAND,
 * techniques v3).
 *
 * THE PATIENT EYE (Phase 2 rebuild, 2026-09-05): the archer does not
 * mash. She BRANDS a body from range (the sunder page is the school's
 * mark; tag `brand`), she PLANTS the ground (snares, fire, standing
 * shafts; tag `plant`), she LOOSES a quick shaft on the move (tag
 * `loose`), and then she reads what she left: the payoffs draw on a
 * branded body, the volleys fall on a planted patch, the channels
 * pick up the loosed note. Signature: Hawk's Hour brands the ring ->
 * Twin Strike inside the window, both shafts through the branded line.
 */
import type { AbilityDef, TechniqueDef } from '@arx/shared';

/**
 * THE REGISTER, per school: player-wielded wave-one pages
 * (root/stagger/weaken/quicken/mend/stonehide) this school's arts lay,
 * by art id → the exact page list (follow statuses, aftermath pages
 * and self pages count). statusWave.test.ts merges every school's
 * licenses; an unlisted page is refused; every hold is priced by the
 * player HOLD BUDGET in masteredHand.test.ts.
 *
 * Archery's three licenses, each a casted or fused press:
 * - snare_shot lays ROOT (fused 20t, lock 30t, 30/(220+120) = 8.8%);
 * - skyfall_shot lays STAGGER (fused 16t, lock 14t, 14/(180+56) = 5.9%);
 * - gloamshaft lays WEAKEN (cast 24t, 12% under the 15 clamp).
 */
export const ARCHERY_LICENSES: Record<string, string[]> = {
  snare_shot: ['root'],
  skyfall_shot: ['stagger'],
  gloamshaft: ['weaken'],
};

export const ARCHERY_ARTS: AbilityDef[] = [
  // Rung 5, ANSWER. The disengage every archer learns first; the shaft she looses on the way out leaves `loose` for Stringsong and Harrier to pick up.
  {
    id: 'tumble_shot',
    name: 'Tumble Shot',
    desc: 'Roll back from your aim and loose one shaft as you go. The loosed shot opens Stringsong and Harrier.',
    color: '#8a9a5a',
    code: 'Ts',
    cooldownTicks: 160, // 8 s
    shape: 'dash_strike',
    damage: 7,
    dashTiles: -5.2, // away from the aim — the disengage tool
    projectiles: 1,
    projectileSpeed: 16,
    range: 12,
    role: 'answer',
    tag: 'loose',
  },

  // Rung 10, PAYOFF. The full draw: a casted piercing shaft that hits twice as hard inside the brand window; the level-15 player's first combo with Longshot.
  {
    id: 'kingshot',
    name: 'Kingshot',
    desc: 'Draw until the bow remembers the forest. Loosed on a branded body the shaft strikes half again as hard and the whole lane kneels.',
    color: '#7a9a4a',
    code: 'Kg',
    cooldownTicks: 200, // 10 s
    castTicks: 22, // 1.1 s wound, 0.88 s planted
    shape: 'projectile_fan',
    damage: 13,
    range: 18,
    projectiles: 1,
    projectileSpeed: 22,
    pierce: true,
    role: 'payoff',
    follow: { after: 'brand', windowTicks: 60, damageMult: 1.6 },
  },

  // Rung 15, OPENER. The first brand: one long piercing arrow that leaves the sunder mark on everything down its line, and hands the draw back on a kill.
  {
    id: 'longshot',
    name: 'Longshot',
    desc: 'One arrow down one line, and every body on it wears the brand. Kingshot, Twin Strike and Ricochet read the brand.',
    color: '#7a9a5a',
    code: 'Lo',
    cooldownTicks: 170, // 8.5 s
    shape: 'projectile_fan',
    damage: 8,
    range: 18,
    projectiles: 1,
    projectileSpeed: 20,
    pierce: true,
    status: { status: 'sunder', power: 12, durationTicks: 80 },
    role: 'opener',
    tag: 'brand',
    onKill: { refundTicks: 40 },
  },

  // Rung 20, SUSTAIN. The string held to a note: three beats of shafts, the last one loosed at double weight; started on a loosed shot the whole song lands harder.
  {
    id: 'stringsong',
    name: 'Stringsong',
    desc: 'Hold the note and the bow sings it, a shaft on every beat and the last one heavier. Sung after a loosed shot, every beat lands harder.',
    color: '#9ab86a',
    code: 'Sn',
    cooldownTicks: 160, // 8 s
    channelTicks: 48, // three beats of the string
    pulseEveryTicks: 16,
    shape: 'projectile_fan',
    damage: 4,
    range: 14,
    projectiles: 1,
    projectileSpeed: 18,
    element: 'storm',
    role: 'sustain',
    finaleMult: 1.5,
    follow: { after: 'loose', windowTicks: 60, damageMult: 1.3 },
  },

  // Rung 25, PAYOFF. The sky falls where the archer has already been: on a branded body or a planted patch the rain lands heavier and wider.
  {
    id: 'rain_of_arrows',
    name: 'Rain of Arrows',
    desc: 'Darken the sky over a patch of ground, then it lands. Called down on a branded or planted patch it falls heavier and wider.',
    color: '#6b8a5a',
    code: 'Ra',
    cooldownTicks: 190, // 9.5 s
    shape: 'ground_aoe',
    damage: 9,
    range: 12,
    radius: 2.0,
    fuseTicks: 18,
    role: 'payoff',
    follow: { after: ['brand', 'plant'], windowTicks: 60, damageMult: 1.5, radiusMult: 1.3 },
  },

  // Rung 30, OPENER. The signature setup: a casted ring that brands everything standing in it; Twin Strike inside the window is the school's three-press signature.
  {
    id: 'hawks_hour',
    name: "Hawk's Hour",
    desc: 'Mark the field the way the hawk does. Everything standing in the ring wears the brand, and Twin Strike loosed inside the hour goes through them all.',
    color: '#c8a44a',
    code: 'Hh',
    cooldownTicks: 200, // 10 s
    castTicks: 22,
    shape: 'ground_aoe',
    damage: 12,
    range: 13,
    radius: 2.2,
    fuseTicks: 14,
    status: { status: 'sunder', power: 15, durationTicks: 80 },
    role: 'opener',
    tag: 'brand',
  },

  // Rung 35, ANSWER. The snare reforged from a trap prop into a fused, licensed ROOT: the arrow plants a snare that holds the patch for a breath and a half, and Rain, Storm and Crowsong fall on the caught.
  {
    id: 'snare_shot',
    name: 'Snare Shot',
    desc: 'Loose a snare instead of an arrow. It lands, it closes, and whatever stands there is held to the ground. Rain of Arrows and the volleys fall harder on the planted patch.',
    color: '#a08a4a',
    code: 'Ss',
    cooldownTicks: 220, // 11 s
    shape: 'ground_aoe',
    damage: 2, // a snare, not a strike: utility by the model's own line
    range: 10,
    radius: 1.8,
    fuseTicks: 20,
    status: { status: 'root', power: 1, durationTicks: 30 },
    role: 'answer',
    tag: 'plant',
  },

  // Rung 40, SUSTAIN. The cold line held: a chill beam with a finale, and run down a planted patch the caught take it harder.
  {
    id: 'winterflight',
    name: 'Winterflight',
    desc: 'Loose down one cold line and keep loosing. The caught walk slow, the last breath cuts deepest, and a planted patch takes it harder.',
    color: '#8ac4e0',
    code: 'Wf',
    cooldownTicks: 170, // 8.5 s
    channelTicks: 48,
    pulseEveryTicks: 16,
    shape: 'beam',
    damage: 4,
    range: 9,
    width: 0.6,
    status: { status: 'chill', power: 1, durationTicks: 40 },
    role: 'sustain',
    finaleMult: 1.5,
    follow: { after: 'plant', windowTicks: 60, damageMult: 1.3 },
  },

  // Rung 45, PAYOFF. The carom reads the brand: loosed at a branded body it hits half again and comes back to the seat sooner.
  {
    id: 'ricochet',
    name: 'Ricochet',
    desc: 'An arrow that changes its mind in the air, twice. Loosed at a branded body it strikes half again and the draw comes back sooner.',
    color: '#8a7a4a',
    code: 'Rc',
    cooldownTicks: 180, // 9 s
    shape: 'chain_zap',
    damage: 7,
    range: 12,
    radius: 3.5,
    chainTargets: 2,
    role: 'payoff',
    follow: { after: 'brand', windowTicks: 60, damageMult: 1.5, refundTicks: 40 },
  },

  // Rung 50, OPENER. The fireball that leaves fire: two campfire shafts arc down on a patch and the ground burns after them, a planted zone for the volleys.
  {
    id: 'emberhead',
    name: 'Emberhead',
    desc: 'Two shafts tipped at the campfire arc down on a patch. They finish burning where they land, and the ground burns on after them.',
    color: '#e08a4a',
    code: 'Ed',
    cooldownTicks: 210, // 10.5 s
    castTicks: 20,
    shape: 'ground_aoe',
    damage: 8,
    range: 15,
    radius: 1.6,
    fuseTicks: 12,
    status: { status: 'burn', power: 1, durationTicks: 60 },
    aftermath: { fieldTicks: 64, everyTicks: 16, damage: 2, status: { status: 'burn', power: 1, durationTicks: 40 } },
    role: 'opener',
    tag: 'plant',
  },

  // Rung 54, PAYOFF. The signature's second press: inside the brand window both shafts hit half again and the seat refunds; the brand is spent on the line.
  {
    id: 'twin_strike',
    name: 'Twin Strike',
    desc: 'Two heavy shafts loosed as one, punching through the line. Loosed inside the brand both strike half again and the draw comes straight back.',
    color: '#5a7a4a',
    code: 'Tw',
    cooldownTicks: 190, // 9.5 s
    shape: 'projectile_fan',
    damage: 8,
    range: 16,
    projectiles: 2,
    spreadArc: 0.12,
    projectileSpeed: 18,
    pierce: true,
    role: 'payoff',
    follow: { after: 'brand', windowTicks: 60, damageMult: 1.5, refundTicks: 40 },
  },

  // Rung 58, SUSTAIN. The shuttle that stitches foe to foe, held to a finale; started on a branded body every thread pulls harder.
  {
    id: 'skyloom',
    name: 'Skyloom',
    desc: 'Set the shuttle flying and hold it. The thread stitches foe to foe, pulls hardest on the last pass, and pulls harder still off a branded body.',
    color: '#6b9a7a',
    code: 'Sy',
    cooldownTicks: 200, // 10 s
    channelTicks: 48,
    pulseEveryTicks: 16,
    shape: 'chain_zap',
    damage: 4,
    range: 12,
    radius: 3.5,
    chainTargets: 2,
    role: 'sustain',
    finaleMult: 1.5,
    follow: { after: 'brand', windowTicks: 60, damageMult: 1.3 },
  },

  // Rung 62, ANSWER. The distance-buying blow: a fused drop that shoves the crowd back and staggers it (licensed) so the archer can reset her range.
  {
    id: 'skyfall_shot',
    name: 'Skyfall Shot',
    desc: 'Loose it at the clouds and count to two. It lands like a dropped stone, throws the crowd back and leaves them reeling long enough to find your range again.',
    color: '#6b8a6a',
    code: 'Sk',
    cooldownTicks: 180, // 9 s
    shape: 'ground_aoe',
    damage: 9,
    range: 13,
    radius: 1.8,
    fuseTicks: 16,
    knockback: 1.2,
    status: { status: 'stagger', power: 1, durationTicks: 14 },
    role: 'answer',
  },

  // Rung 66, OPENER. The dark brand: a casted line that weakens every arm it passes (licensed) and leaves a pool of gloam where it flew.
  {
    id: 'gloamshaft',
    name: 'Gloamshaft',
    desc: 'Draw in the last light and loose after it. Every arm on the line is weakened and branded, and the gloam pools where the shaft passed.',
    color: '#5a5a78',
    code: 'Gf',
    cooldownTicks: 210, // 10.5 s
    castTicks: 24,
    shape: 'beam',
    damage: 13,
    range: 12,
    width: 0.55,
    status: { status: 'weaken', power: 12, durationTicks: 60 },
    aftermath: { fieldTicks: 48, everyTicks: 16, damage: 2, radius: 1.4 },
    role: 'opener',
    tag: 'brand',
    onKill: { refundTicks: 40 },
  },

  // Rung 70, PAYOFF. The ghost arrow comes home red: loosed through a branded or planted patch it strikes half again out and back.
  {
    id: 'phantom_flight',
    name: 'Phantom Flight',
    desc: 'An arrow that flies out pale and comes home red. Loosed through a branded body or a planted patch it bites half again both ways.',
    color: '#9aa8b8',
    code: 'Pf',
    cooldownTicks: 200, // 10 s
    shape: 'projectile_fan',
    damage: 7,
    range: 11,
    projectiles: 1,
    projectileSpeed: 15,
    pierce: true,
    returns: true,
    role: 'payoff',
    follow: { after: ['brand', 'plant'], windowTicks: 60, damageMult: 1.5 },
  },

  // Rung 74, SUSTAIN. The circling wing: four passes out and back, the last at double weight; picked up off a loosed shot every pass takes more.
  {
    id: 'harrier',
    name: 'Harrier',
    desc: 'The wing that circles back. Every pass takes its due twice, the last pass takes it double, and a loosed shot sets the wing hungrier.',
    color: '#a8946a',
    code: 'Hr',
    cooldownTicks: 220, // 11 s
    channelTicks: 64, // four passes of the wing
    pulseEveryTicks: 16,
    shape: 'projectile_fan',
    damage: 3,
    range: 10,
    projectiles: 1,
    projectileSpeed: 15,
    returns: true,
    role: 'sustain',
    finaleMult: 2,
    follow: { after: 'loose', windowTicks: 60, damageMult: 1.3 },
  },

  // Rung 78, PAYOFF. The staked volley reads the ground: called down on a branded or planted patch the sky falls heavier and wider, and the last volley falls double.
  {
    id: 'storm_of_shafts',
    name: 'Storm of Shafts',
    desc: 'Blacken a patch of sky and keep it black, arrows on a schedule and the last volley thickest. Called over a branded or planted patch it falls heavier and wider.',
    color: '#8ab4c8',
    code: 'Zh',
    cooldownTicks: 240, // 12 s
    channelTicks: 64,
    pulseEveryTicks: 16,
    shape: 'ground_aoe',
    damage: 3,
    range: 12,
    radius: 2.2,
    fuseTicks: 12,
    role: 'payoff',
    finaleMult: 1.5,
    follow: { after: ['brand', 'plant'], windowTicks: 60, damageMult: 1.5, radiusMult: 1.3 },
  },

  // Rung 82, OPENER. Noon planted on the ground: a long draw that lands burning and leaves a court of fire behind it for the volleys to read.
  {
    id: 'zenith',
    name: 'Zenith',
    desc: 'Loose at the highest point of the sky. It comes down as noon, sets the court alight, and the fire stays planted for the volleys that follow.',
    color: '#e8c874',
    code: 'Zn',
    cooldownTicks: 230, // 11.5 s
    castTicks: 26,
    shape: 'ground_aoe',
    damage: 12,
    range: 15,
    radius: 2.2,
    fuseTicks: 12,
    status: { status: 'burn', power: 1, durationTicks: 60 },
    aftermath: { fieldTicks: 64, everyTicks: 16, damage: 2, status: { status: 'burn', power: 1, durationTicks: 40 } },
    role: 'opener',
    tag: 'plant',
  },

  // Rung 86, SUSTAIN. The flock called down on a planted patch: a bleeding volley held to a finale, hungrier over ground the archer already planted.
  {
    id: 'crowsong',
    name: 'Crowsong',
    desc: 'Call the dark flock down on a field and keep calling. They open every body they touch, feed hardest on the last call, and feed harder still on a planted patch.',
    color: '#4a4458',
    code: 'Cw',
    cooldownTicks: 240, // 12 s
    channelTicks: 64,
    pulseEveryTicks: 16,
    shape: 'ground_aoe',
    damage: 3,
    range: 13,
    radius: 2.2,
    fuseTicks: 10,
    status: { status: 'bleed', power: 1, durationTicks: 40 },
    role: 'sustain',
    finaleMult: 1.5,
    follow: { after: 'plant', windowTicks: 60, damageMult: 1.3 },
  },

  // Rung 90, CROWN. Three acts in one press: a drawn storm of seekers that reads every word the school leaves, brands every throat it finds, and gives the draw back on a kill.
  {
    id: 'arrow_tempest',
    name: 'Arrow Tempest',
    desc: 'Draw the whole storm and loose it, five seekers each picking its own throat. It reads brand, plant and loose alike, brands everything it finds, and a kill gives the storm back.',
    color: '#5a7a8a',
    code: 'At',
    cooldownTicks: 260, // 13 s
    castTicks: 20,
    shape: 'projectile_fan',
    damage: 5,
    range: 10,
    projectiles: 5,
    spreadArc: 1.2,
    projectileSpeed: 15,
    homing: 5.0,
    element: 'storm', // storm-wreathed seekers — the school the eye reads
    status: { status: 'sunder', power: 15, durationTicks: 60 },
    role: 'crown',
    follow: { after: ['brand', 'plant', 'loose'], windowTicks: 60, damageMult: 1.4 },
    onKill: { refundTicks: 60 },
  },

  // The unwritten page, ANSWER. The wall-top spread that shoves the line back and leaves the loosed word for the channels.
  {
    id: 'warden_volley',
    name: "Warden's Volley",
    desc: 'The answer from the wall: a spread of shafts that says no further and throws them back. Loosed over a planted patch it hits harder, and the loosed volley opens Stringsong and Harrier.',
    color: '#8a9a78',
    code: 'Wv',
    cooldownTicks: 200, // 10 s
    shape: 'projectile_fan',
    damage: 6,
    range: 11,
    projectiles: 4,
    spreadArc: 0.9,
    projectileSpeed: 15,
    knockback: 1.2,
    role: 'answer',
    tag: 'loose',
    follow: { after: 'plant', windowTicks: 60, damageMult: 1.3 },
  },
];

export const ARCHERY_LADDER: TechniqueDef[] = [
  {
    ability: 'tumble_shot',
    style: 'archery',
    unlockLevel: 5,
    ranks: [
      { note: 'The parting arrow means it.', damage: 9 },
      { note: 'A longer roll, ready again sooner.', cooldownTicks: 140, dashTiles: -6.4 },
      { note: 'Two shafts loosed mid-tumble, and the string already singing.', projectiles: 2, spreadArc: 0.1 },
    ],
  },
  {
    ability: 'kingshot',
    style: 'archery',
    unlockLevel: 10,
    ranks: [
      { note: 'The shaft carries further and faster.', range: 21, projectileSpeed: 24 },
      { note: 'The draw grows heavier, and a fallen king hands it back.', damage: 14, onKill: { refundTicks: 40 } },
      { note: 'The king kneels in his own time: the brand waits a full four seconds.', castTicks: 20, follow: { after: 'brand', windowTicks: 80, damageMult: 1.6 } },
    ],
  },
  {
    ability: 'longshot',
    style: 'archery',
    unlockLevel: 15,
    ranks: [
      { note: 'The line lands heavier.', damage: 9 },
      { note: 'The brand cuts deeper and the draw comes back sooner.', cooldownTicks: 150, status: { status: 'sunder', power: 15, durationTicks: 80 } },
      { note: 'A kill on the line hands the whole draw back.', damage: 10, onKill: { refundTicks: 60 } },
    ],
  },
  {
    ability: 'stringsong',
    style: 'archery',
    unlockLevel: 20,
    ranks: [
      { note: 'The note lands harder.', damage: 5 },
      { note: 'The song carries further, and the last note rings double.', range: 16, finaleMult: 2 },
      { note: 'The arrows learn the tune and follow it home.', homing: 5 },
    ],
  },
  {
    ability: 'rain_of_arrows',
    style: 'archery',
    unlockLevel: 25,
    ranks: [
      { note: 'The sky falls harder.', damage: 11 },
      { note: 'A wider patch of ruin.', radius: 2.4 },
      {
        note: 'Barbed heads: the wounds keep raining.',
        status: { status: 'bleed', power: 1, durationTicks: 60 },
      },
    ],
  },
  {
    ability: 'hawks_hour',
    style: 'archery',
    unlockLevel: 30,
    ranks: [
      { note: 'The stoop strikes deeper.', damage: 14 },
      { note: 'The hour claims a wider field.', radius: 2.6, range: 15 },
      { note: 'What the hawk marks is opened to everyone, and stays open.', cooldownTicks: 190, status: { status: 'sunder', power: 20, durationTicks: 100 } },
    ],
  },
  {
    ability: 'snare_shot',
    style: 'archery',
    unlockLevel: 35,
    ranks: [
      { note: 'The snare closes wider.', radius: 2.2 },
      { note: 'Another snare rides in the quiver sooner.', cooldownTicks: 200 },
      {
        note: 'Frost on the cord: the ground stays cold after the snare lets go.',
        aftermath: { fieldTicks: 48, everyTicks: 16, damage: 1, status: { status: 'chill', power: 1, durationTicks: 40 } },
      },
    ],
  },
  {
    ability: 'winterflight',
    style: 'archery',
    unlockLevel: 40,
    ranks: [
      { note: 'The cold line runs longer.', range: 11 },
      { note: 'The cold clings longer and the line runs wider.', width: 0.8, status: { status: 'chill', power: 1, durationTicks: 60 } },
      { note: 'The last breath of winter: the finale cuts double.', finaleMult: 2 },
    ],
  },
  {
    ability: 'ricochet',
    style: 'archery',
    unlockLevel: 45,
    ranks: [
      { note: 'Each carom means it more.', damage: 8 },
      { note: 'A third change of mind.', chainTargets: 3 },
      { note: 'The brand waits longer for the carom, and it lands harder.', damage: 9, follow: { after: 'brand', windowTicks: 80, damageMult: 1.5, refundTicks: 40 } },
    ],
  },
  {
    ability: 'emberhead',
    style: 'archery',
    unlockLevel: 50,
    ranks: [
      { note: 'The heads burn hotter.', damage: 10 },
      { note: 'The fire keeps its grip longer.', range: 16, status: { status: 'burn', power: 1, durationTicks: 80 } },
      {
        note: 'The ground burns wider and longer after the pair lands.',
        aftermath: { fieldTicks: 80, everyTicks: 16, damage: 2, radius: 2.0, status: { status: 'burn', power: 1, durationTicks: 40 } },
      },
    ],
  },
  {
    ability: 'twin_strike',
    style: 'archery',
    unlockLevel: 54,
    ranks: [
      { note: 'Heavier shafts.', damage: 9 },
      { note: 'The pair carries further.', range: 18 },
      { note: 'Two arguments, one conclusion: the brand waits a full four seconds for the pair.', follow: { after: 'brand', windowTicks: 80, damageMult: 1.5, refundTicks: 40 } },
    ],
  },
  {
    ability: 'skyloom',
    style: 'archery',
    unlockLevel: 58,
    ranks: [
      { note: 'The thread reaches further.', range: 14 },
      { note: 'The shuttle comes back to the hand sooner.', cooldownTicks: 190 },
      { note: 'The loom takes a third thread.', chainTargets: 3 },
    ],
  },
  {
    ability: 'skyfall_shot',
    style: 'archery',
    unlockLevel: 62,
    ranks: [
      { note: 'It falls heavier.', damage: 11 },
      { note: 'A wider shadow, called sooner.', radius: 2.2, cooldownTicks: 175 },
      { note: 'The stone lands and the whole crowd goes over.', damage: 12, knockback: 2.0 },
    ],
  },
  {
    ability: 'gloamshaft',
    style: 'archery',
    unlockLevel: 66,
    ranks: [
      { note: 'The dark line bites deeper.', damage: 15 },
      { note: 'The gloam runs longer and wider.', range: 15, width: 0.75 },
      { note: 'The last light leaves quicker, and the dusk pools deeper where it passed.', damage: 18, cooldownTicks: 190, castTicks: 20, aftermath: { fieldTicks: 64, everyTicks: 16, damage: 2, radius: 1.6 } },
    ],
  },
  {
    ability: 'phantom_flight',
    style: 'archery',
    unlockLevel: 70,
    ranks: [
      { note: 'The ghost flies further.', range: 13 },
      { note: 'It haunts you oftener.', cooldownTicks: 180 },
      {
        note: 'It comes home red, and leaves red behind.',
        damage: 8,
        status: { status: 'bleed', power: 1, durationTicks: 40 },
      },
    ],
  },
  {
    ability: 'harrier',
    style: 'archery',
    unlockLevel: 74,
    ranks: [
      { note: 'The circuit runs longer and faster.', range: 12, projectileSpeed: 17 },
      { note: 'The wing opens what it passes.', status: { status: 'bleed', power: 1, durationTicks: 40 } },
      { note: 'The wing comes round again sooner.', cooldownTicks: 210 },
    ],
  },
  {
    ability: 'storm_of_shafts',
    style: 'archery',
    unlockLevel: 78,
    ranks: [
      { note: 'Every falling shaft bites harder.', damage: 4 },
      { note: 'The patch grows.', radius: 2.6 },
      {
        note: 'The last volley falls double, and the caught walk slow.',
        finaleMult: 2,
        status: { status: 'chill', power: 1, durationTicks: 40 },
      },
    ],
  },
  {
    ability: 'zenith',
    style: 'archery',
    unlockLevel: 82,
    ranks: [
      { note: 'Noon lands heavier.', damage: 14 },
      { note: 'The light claims a wider court.', radius: 2.6 },
      { note: 'The sun stays to see it finished: the court burns longer.', aftermath: { fieldTicks: 80, everyTicks: 16, damage: 2, status: { status: 'burn', power: 1, durationTicks: 40 } } },
    ],
  },
  {
    ability: 'crowsong',
    style: 'archery',
    unlockLevel: 86,
    ranks: [
      { note: 'The flock feeds harder.', damage: 4 },
      { note: 'The song calls a wider field.', radius: 2.6 },
      { note: 'The crows remember and come back hungrier: the last call feeds double.', finaleMult: 2, status: { status: 'bleed', power: 1, durationTicks: 60 } },
    ],
  },
  {
    ability: 'arrow_tempest',
    style: 'archery',
    unlockLevel: 90,
    ranks: [
      { note: 'The storm reaches further out.', range: 12 },
      { note: 'The seekers fly faster.', projectileSpeed: 17 },
      { note: 'A sixth shaft joins the storm.', projectiles: 6 },
    ],
  },
  {
    ability: 'warden_volley',
    style: 'archery',
    unlockLevel: 0,
    hidden: { anchorLevel: 30 },
    ranks: [
      { note: 'Each shaft means the no harder.', damage: 7 },
      { note: 'A fifth shaft joins the answer.', projectiles: 5 },
      { note: 'The wall holds; they do not.', damage: 9, knockback: 2.0, cooldownTicks: 170 },
    ],
  },
];
