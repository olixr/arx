/**
 * THE WILD AT HEEL — beastcraft arts, the pet voices, and the leashed gaze.
 * One shelf of the ability catalog (foundations F6.2) — entries moved
 * verbatim from abilities.ts; the hub spreads every shelf into the one
 * registry, so ids and behavior are untouched.
 */
import type { AbilityDef } from '@arx/shared';

export const BEASTCRAFT_DEFS: AbilityDef[] = [
  // -------------------------------- beastcraft arts (THE WILD ANSWERS
  // THE CALL, docs/beastcraft-arts-plan.md): the keeper's school joins
  // the technique pool. The tame is a survival channel, not a strike —
  // damage 0, whiff-0 untouched, the ceremony rail does the rest.
  {
    id: 'gentle_the_wild',
    name: 'Gentle the Wild',
    desc: 'Call a wild beast and stand your ground. Survive its answer, and it walks home at your heel.',
    color: '#9fd39a', // the collar's bond-green ink
    code: 'Gw',
    cooldownTicks: 200, // 10 s — a broken asking is not spammed away
    shape: 'tame',
    damage: 0, // pure working: the beast is won, never worn
    range: 5,
    channelTicks: 200, // 10 s whole; a craven mark answers in half
  },

  // THE KEEPER'S TONGUE — the nine words beside the asking. Every one
  // is a working, never a strike (damage 0 forever, the school trains
  // through tames and care alone); the wild-facing words act only on
  // wild beasts, the companion words need the companion, and every
  // refusal speaks before a cooldown is paid.
  {
    id: 'soothe_the_wild',
    name: 'Soothe the Wild',
    desc: 'Still one wild heart. The fight leaves it, and its eyes stay down a while.',
    color: '#b8dcc0', // pale sage, the breath let out
    code: 'So',
    cooldownTicks: 300,
    shape: 'becalm',
    damage: 0,
    range: 5,
    becalmTicks: 200, // 10 s of lowered eyes
  },
  {
    id: 'come_to_heel',
    name: 'Come to Heel',
    desc: 'A whistle the friend always hears. However far the road, it arrives at your side.',
    color: '#8fc7a4', // heel-green, the road folded shut
    code: 'Ch',
    cooldownTicks: 200,
    shape: 'pet_command',
    command: 'heel',
    damage: 0,
  },
  {
    id: 'point_the_fang',
    name: 'Point the Fang',
    desc: 'Point once. Your companion breaks for the mark, and the mark forgets you entirely.',
    color: '#d98a5a', // fang amber, blood warmed not spilled
    code: 'Pf',
    cooldownTicks: 200,
    shape: 'pet_command',
    command: 'fang',
    damage: 0,
    range: 7,
  },
  {
    id: 'keepers_balm',
    name: "Keeper's Balm",
    desc: 'A poultice thrown true. The friend is mended without breaking stride.',
    color: '#a8d978', // crushed-herb green
    code: 'Kb',
    cooldownTicks: 400,
    shape: 'pet_command',
    command: 'mend',
    damage: 0,
    range: 8,
    petHealFrac: 0.3,
  },
  {
    id: 'strewn_bait',
    name: 'Strewn Bait',
    desc: 'Scatter a table on the ground. The wild at rest comes to nose it.',
    color: '#c4a35a', // grain and drippings
    code: 'Sb',
    cooldownTicks: 500,
    shape: 'summon',
    damage: 0,
    range: 6,
    summon: { kind: 'bait', durationTicks: 300, radius: 6, power: 0 },
  },
  {
    id: 'the_quiet_walk',
    name: 'The Quiet Walk',
    desc: 'Walk as the wild walks. No beast marks you until the quiet ends, or you break it.',
    color: '#9ab8a0', // dawn mist through pines
    code: 'Qw',
    cooldownTicks: 600,
    shape: 'self_buff',
    damage: 0,
    self: { beastTruce: true, durationTicks: 400 },
  },
  {
    id: 'blood_of_the_pack',
    name: 'Blood of the Pack',
    desc: 'One howl, shared. The friend fights quicker and harder while the blood is up.',
    color: '#c46a4a', // pack russet
    code: 'Bp',
    cooldownTicks: 600,
    shape: 'pet_command',
    command: 'surge',
    damage: 0,
    petSurge: { dmgMult: 1.3, speedMult: 1.15, durationTicks: 240 },
  },
  {
    id: 'the_keepers_cry',
    name: "The Keeper's Cry",
    desc: 'The cry a fallen friend hears anywhere near. It stands where it lies, shaky but yours.',
    color: '#e8d8a0', // pale horn gold
    code: 'Kc',
    cooldownTicks: 1200, // a minute — the clutch word is not a habit
    shape: 'pet_command',
    command: 'rise',
    damage: 0,
    range: 10,
    petHealFrac: 0.35, // the fraction the friend STANDS at
  },
  {
    id: 'voice_of_the_wild',
    name: 'Voice of the Wild',
    desc: 'Speak the whole tongue at once. The wild stills, and your friend answers first.',
    color: '#7ac4a0', // deep wildsong green
    code: 'Vw',
    cooldownTicks: 1200,
    castFreezeTicks: 8, // the head goes back; the world waits a beat
    shape: 'wild_howl',
    damage: 0,
    radius: 7,
    becalmTicks: 160,
    petHealFrac: 0.25,
    petSurge: { dmgMult: 1.3, speedMult: 1.15, durationTicks: 200 },
  },

  // ---------------------------- THE FANG FINDS ITS VOICE (docs/
  // pet-arts-plan.md): the companion's own actives. These are the
  // PET'S words, never the keeper's — no TECHNIQUES rung ever seats
  // one. Pacing (cooldown, windup, range bands) lives on the
  // PetArtDef in petArts.ts, the kit law verbatim; every def here
  // ships cooldownTicks 0. Self-shaped arts speak the pet fields the
  // keeper's balm minted (petGuard/petHealFrac/petCleanse/petSurge),
  // aimed at the caster itself. Damage dies price against the
  // species' own basic; anything above it wears a windup >= 10 on
  // its PetArtDef — the telegraph premium, pet edition.

  // THE SKITTERKIN's words.
  {
    id: 'nip_and_dart',
    name: 'Nip and Dart',
    desc: 'In, one quick bite, and out before the answer comes.',
    color: '#b8a888',
    code: 'Nd',
    cooldownTicks: 0, // pet pacing lives on the PetArtDef, not the ability
    shape: 'dash_strike',
    damage: 1,
    dashTiles: 4.4,
  },
  {
    id: 'plague_gnaw',
    name: 'Plague Gnaw',
    desc: 'The rat sets its teeth and worries the wound until it goes green.',
    color: '#a0c050',
    code: 'Pg',
    cooldownTicks: 0, // pet pacing lives on the PetArtDef, not the ability
    shape: 'melee_arc',
    damage: 2,
    range: 1.6,
    arc: 0.7,
    status: { status: 'venom', power: 2, durationTicks: 80 },
  },
  {
    id: 'the_rats_hour',
    name: "The Rat's Hour",
    desc: 'Every gutter has one hour when the rat is king. This is it.',
    color: '#8fa050',
    code: 'Rh',
    cooldownTicks: 0, // pet pacing lives on the PetArtDef, not the ability
    shape: 'flurry',
    damage: 2,
    range: 1.7,
    arc: 0.8,
    hits: 4,
    pulseEveryTicks: 5,
    status: { status: 'venom', power: 1, durationTicks: 60 },
  },
  {
    id: 'echo_shriek',
    name: 'Echo Shriek',
    desc: 'A cry pitched where ears give up. The air itself flinches twice.',
    color: '#9a8ec4',
    code: 'Es',
    cooldownTicks: 0, // pet pacing lives on the PetArtDef, not the ability
    shape: 'pulse_nova',
    damage: 2,
    radius: 1.8,
    pulses: 2,
    pulseEveryTicks: 12,
    status: { status: 'chill', power: 1, durationTicks: 50 },
  },
  {
    id: 'the_dark_descent',
    name: 'The Dark Descent',
    desc: 'The bat folds its wings and becomes a falling knife.',
    color: '#6a5a8c',
    code: 'Dd',
    cooldownTicks: 0, // pet pacing lives on the PetArtDef, not the ability
    shape: 'dash_strike',
    damage: 4,
    dashTiles: 6.4,
    status: { status: 'bleed', power: 1, durationTicks: 70 },
  },

  // THE SHELLBACKS' words.
  {
    id: 'set_the_shell',
    name: 'Set the Shell',
    desc: 'It plants, tucks, and becomes ground. Ground does not bleed.',
    color: '#8a92a0',
    code: 'Ss',
    cooldownTicks: 0, // pet pacing lives on the PetArtDef, not the ability
    shape: 'self_buff',
    damage: 0,
    petGuard: { armor: 8, durationTicks: 300 },
  },
  {
    id: 'clatter_challenge',
    name: 'Clatter Challenge',
    desc: 'Shell on shell, loud as a dropped kettle. Everything looks.',
    color: '#c9b45e',
    code: 'Cc',
    cooldownTicks: 0, // pet pacing lives on the PetArtDef, not the ability
    shape: 'nova',
    damage: 0, // the noise barely lands — the TURNING is the payload
    radius: 3.0,
    tauntRadius: 3.0,
  },
  {
    id: 'horn_toss',
    name: 'Horn Toss',
    desc: 'The beetle gets its horn under the problem and files it skyward.',
    color: '#7a8a6a',
    code: 'Ht',
    cooldownTicks: 0, // pet pacing lives on the PetArtDef, not the ability
    shape: 'melee_arc',
    damage: 4,
    range: 2.0,
    arc: 0.9,
    knockback: 2.0,
  },
  {
    id: 'tide_grip',
    name: 'Tide Grip',
    desc: 'The claw closes like low tide: slow, cold, and certain.',
    color: '#5a9aa8',
    code: 'Tg',
    cooldownTicks: 0, // pet pacing lives on the PetArtDef, not the ability
    shape: 'melee_arc',
    damage: 2,
    range: 1.7,
    arc: 0.7,
    status: { status: 'chill', power: 2, durationTicks: 60 },
  },
  {
    id: 'the_undertow',
    name: 'The Undertow',
    desc: 'Three cold pulls in a row. Legs remember the sea and obey it.',
    color: '#3d7a8c',
    code: 'Ut',
    cooldownTicks: 0, // pet pacing lives on the PetArtDef, not the ability
    shape: 'pulse_nova',
    damage: 2,
    radius: 2.2,
    pulses: 3,
    pulseEveryTicks: 10,
    status: { status: 'chill', power: 2, durationTicks: 50 },
  },
  {
    id: 'the_standing_stone',
    name: 'The Standing Stone',
    desc: 'The turtle stops being an animal and starts being geography.',
    color: '#8a9282',
    code: 'St',
    cooldownTicks: 0, // pet pacing lives on the PetArtDef, not the ability
    shape: 'nova',
    damage: 0, // the stillness is the payload: eyes turn, shell holds
    radius: 3.6,
    tauntRadius: 3.6,
    petGuard: { armor: 12, durationTicks: 200 },
  },
  {
    id: 'riptide_claw',
    name: 'Riptide Claw',
    desc: 'The great claw falls like a harbor gate. What it hits stays hit.',
    color: '#4a8a9c',
    code: 'Rc',
    cooldownTicks: 0, // pet pacing lives on the PetArtDef, not the ability
    shape: 'melee_arc',
    damage: 8,
    range: 2.0,
    arc: 0.8,
    status: { status: 'chill', power: 1, durationTicks: 60 },
  },
  {
    id: 'the_kings_pincer',
    name: "The King's Pincer",
    desc: 'On a mark already cold, the claw closes the argument entirely.',
    color: '#c46a52',
    code: 'Kp',
    cooldownTicks: 0, // pet pacing lives on the PetArtDef, not the ability
    shape: 'melee_arc',
    damage: 7,
    range: 2.0,
    arc: 0.7,
    vs: { status: 'chill', mult: 1.6 },
  },

  // THE TUSKERS' words.
  {
    id: 'gore_charge',
    name: 'Gore Charge',
    desc: 'Head down, tusks first, apologies never.',
    color: '#a4744b',
    code: 'Gc',
    cooldownTicks: 0, // pet pacing lives on the PetArtDef, not the ability
    shape: 'dash_strike',
    damage: 4,
    dashTiles: 7.2,
    travel: 'charge',
    knockback: 2.0,
  },
  {
    id: 'tusk_sweep',
    name: 'Tusk Sweep',
    desc: 'A short, mean crescent at shin height.',
    color: '#b08a5e',
    code: 'Tw',
    cooldownTicks: 0, // pet pacing lives on the PetArtDef, not the ability
    shape: 'melee_arc',
    damage: 2,
    range: 1.9,
    arc: 1.1,
  },
  {
    id: 'mud_wallow',
    name: 'Mud Wallow',
    desc: 'It drops, rolls, and stands up newer. Mud fixes what mud knows.',
    color: '#8a6f4a',
    code: 'Mw',
    cooldownTicks: 0, // pet pacing lives on the PetArtDef, not the ability
    shape: 'self_buff',
    damage: 0,
    petCleanse: true,
    petHealFrac: 0.2,
  },
  {
    id: 'the_long_furrow',
    name: 'The Long Furrow',
    desc: 'The old razorback leaps, lands, and plows the field with everyone in it.',
    color: '#8c5a3a',
    code: 'Lf',
    cooldownTicks: 0, // pet pacing lives on the PetArtDef, not the ability
    shape: 'leap_slam',
    damage: 7,
    dashTiles: 8.0,
    radius: 2.2,
    knockback: 2.2,
  },

  // THE CANIDS' words.
  {
    id: 'worry_the_wound',
    name: 'Worry the Wound',
    desc: 'The pack rule: never open a second door while the first still bleeds.',
    color: '#c46a4a',
    code: 'Ww',
    cooldownTicks: 0, // pet pacing lives on the PetArtDef, not the ability
    shape: 'melee_arc',
    damage: 4,
    range: 1.8,
    arc: 0.7,
    vs: { status: 'bleed', mult: 1.6 },
  },
  {
    id: 'hamstring',
    name: 'Hamstring',
    desc: 'One bite, placed where running lives.',
    color: '#7a9ab8',
    code: 'Hs',
    cooldownTicks: 0, // pet pacing lives on the PetArtDef, not the ability
    shape: 'melee_arc',
    damage: 4,
    range: 1.8,
    arc: 0.7,
    status: { status: 'chill', power: 2, durationTicks: 50 },
  },
  {
    id: 'the_first_howl',
    name: 'The First Howl',
    desc: 'The young howl the dire wolves taught. Its own blood answers.',
    color: '#d98a5a',
    code: 'Fh',
    cooldownTicks: 0, // pet pacing lives on the PetArtDef, not the ability
    shape: 'self_buff',
    damage: 0,
    petSurge: { dmgMult: 1.35, speedMult: 1.2, durationTicks: 200 },
  },
  {
    id: 'winters_jaw',
    name: "Winter's Jaw",
    desc: 'The worg bites the way the north bites: wide, and it keeps.',
    color: '#8ac4e8',
    code: 'Wj',
    cooldownTicks: 0, // pet pacing lives on the PetArtDef, not the ability
    shape: 'melee_arc',
    damage: 5,
    range: 1.9,
    arc: 1.0,
    status: { status: 'chill', power: 1, durationTicks: 70 },
  },
  {
    id: 'the_cowing_snarl',
    name: 'The Cowing Snarl',
    desc: 'The war-hound remembers giving orders. Lesser wild hearts remember taking them.',
    color: '#9ab0c4',
    code: 'Cs',
    cooldownTicks: 0, // pet pacing lives on the PetArtDef, not the ability
    shape: 'nova',
    damage: 0, // the order is the payload — wild hearts nearby go still
    radius: 3.2,
    becalmTicks: 120,
  },

  // THE CATS' words.
  {
    id: 'raking_flurry',
    name: 'Raking Flurry',
    desc: 'Four paws, all of them opinions, all of them sharp.',
    color: '#c9a45e',
    code: 'Rk',
    cooldownTicks: 0, // pet pacing lives on the PetArtDef, not the ability
    shape: 'flurry',
    damage: 3,
    range: 1.7,
    arc: 0.8,
    hits: 3,
    pulseEveryTicks: 5,
    status: { status: 'bleed', power: 1, durationTicks: 60 },
  },
  // THE RED SKULK's one word. The fox does not brawl: it rises on its
  // hind legs over the mark, folds, and comes down nose first — the
  // mousing dive it uses on voles under snow, aimed at something that
  // can argue. Narrow radius on purpose: this is a needle, not a slam.
  {
    id: 'the_mousing_dive',
    name: 'The Mousing Dive',
    desc: 'It rises on its hind legs, folds, and comes down nose first.',
    color: '#c4712e',
    code: 'Md',
    cooldownTicks: 0, // pet pacing lives on the PetArtDef, not the ability
    shape: 'leap_slam',
    damage: 6,
    dashTiles: 5.5,
    radius: 1.3,
    status: { status: 'bleed', power: 2, durationTicks: 60 },
  },

  {
    id: 'the_winter_stalk',
    name: 'The Winter Stalk',
    desc: 'Three bounds, each landing colder than the last.',
    color: '#a8c8d8',
    code: 'Wk',
    cooldownTicks: 0, // pet pacing lives on the PetArtDef, not the ability
    shape: 'dash_strike',
    damage: 6,
    dashTiles: 6.8,
    status: { status: 'chill', power: 1, durationTicks: 60 },
  },

  // THE BEAR's words.
  {
    id: 'maul',
    name: 'Maul',
    desc: 'The whole arm, the whole argument.',
    color: '#8c6a4a',
    code: 'Ml',
    cooldownTicks: 0, // pet pacing lives on the PetArtDef, not the ability
    shape: 'melee_arc',
    damage: 8,
    range: 2.1,
    arc: 1.0,
    status: { status: 'bleed', power: 2, durationTicks: 80 },
  },
  {
    id: 'the_charge',
    name: 'The Charge',
    desc: 'A wall, arriving.',
    color: '#a4845e',
    code: 'Tc',
    cooldownTicks: 0, // pet pacing lives on the PetArtDef, not the ability
    shape: 'dash_strike',
    damage: 5,
    dashTiles: 7.2,
    travel: 'charge',
    knockback: 2.2,
  },
  {
    id: 'stand_tall',
    name: 'Stand Tall',
    desc: 'The bear stands to its whole height and the fight reconsiders its plans.',
    color: '#c9a45e',
    code: 'Sl',
    cooldownTicks: 0, // pet pacing lives on the PetArtDef, not the ability
    shape: 'nova',
    damage: 0, // the standing is the payload: every eye comes up
    radius: 3.4,
    tauntRadius: 3.4,
    petGuard: { armor: 8, durationTicks: 240 },
  },

  // THE GREAT OWL's words.
  {
    id: 'talon_stoop',
    name: 'Talon Stoop',
    desc: 'From the high line, silence with claws on the end of it.',
    color: '#d8d4c8',
    code: 'To',
    cooldownTicks: 0, // pet pacing lives on the PetArtDef, not the ability
    shape: 'dash_strike',
    damage: 6,
    dashTiles: 8.0,
  },
  {
    id: 'hushing_wing',
    name: 'Hushing Wing',
    desc: 'Two slow beats, and the air forgets how to be warm.',
    color: '#8ac4e8',
    code: 'Hw',
    cooldownTicks: 0, // pet pacing lives on the PetArtDef, not the ability
    shape: 'pulse_nova',
    damage: 3,
    radius: 2.2,
    pulses: 2,
    pulseEveryTicks: 12,
    status: { status: 'chill', power: 1, durationTicks: 60 },
  },
  {
    id: 'preen',
    name: 'Preen',
    desc: 'Feather by feather, the owl puts itself back in order.',
    color: '#e8e0d0',
    code: 'Pr',
    cooldownTicks: 0, // pet pacing lives on the PetArtDef, not the ability
    shape: 'self_buff',
    damage: 0,
    petCleanse: true,
    petHealFrac: 0.12,
  },
  {
    id: 'the_white_hush',
    name: 'The White Hush',
    desc: 'The owl spreads both wings once, and winter files in under them.',
    color: '#c8dce8',
    code: 'Wh',
    cooldownTicks: 0, // pet pacing lives on the PetArtDef, not the ability
    shape: 'ground_field',
    damage: 0, // the cold is the payload — the field slows all it holds
    range: 0,
    radius: 2.6,
    fieldTicks: 90,
    pulseEveryTicks: 15,
    status: { status: 'chill', power: 2, durationTicks: 50 },
  },

  // THE ADDER's words.
  {
    id: 'venom_spit',
    name: 'Venom Spit',
    desc: 'The adder spends its bite at a distance and lets the venom walk the rest.',
    color: '#a0c050',
    code: 'Vs',
    cooldownTicks: 0, // pet pacing lives on the PetArtDef, not the ability
    shape: 'projectile_fan',
    damage: 2,
    projectiles: 1,
    spreadArc: 0,
    projectileSpeed: 9,
    range: 7,
    element: 'verdant',
    status: { status: 'venom', power: 1, durationTicks: 80 },
  },
  {
    id: 'coiled_strike',
    name: 'Coiled Strike',
    desc: 'The whole spring, spent in one straight line.',
    color: '#8fa050',
    code: 'Ck',
    cooldownTicks: 0, // pet pacing lives on the PetArtDef, not the ability
    shape: 'dash_strike',
    damage: 4,
    dashTiles: 5.2,
    status: { status: 'venom', power: 1, durationTicks: 60 },
  },
  {
    id: 'shed_skin',
    name: 'Shed Skin',
    desc: 'It leaves the hurt behind with the old skin and comes out patient.',
    color: '#c8c8a0',
    code: 'Sk',
    cooldownTicks: 0, // pet pacing lives on the PetArtDef, not the ability
    shape: 'self_buff',
    damage: 0,
    petCleanse: true,
    petHealFrac: 0.1,
  },
  {
    id: 'the_long_fang',
    name: 'The Long Fang',
    desc: 'On a mark already green, the second dose is the deep one.',
    color: '#6a9a42',
    code: 'Lg',
    cooldownTicks: 0, // pet pacing lives on the PetArtDef, not the ability
    shape: 'melee_arc',
    damage: 5,
    range: 1.7,
    arc: 0.6,
    vs: { status: 'venom', mult: 2.0 },
  },

  // THE WEAVER's words (web_snare is the wild art itself, reused whole).
  {
    id: 'pale_silk',
    name: 'Pale Silk',
    desc: 'The weaver wraps itself in its own work. Blades ask the silk first.',
    color: '#e8e8e0',
    code: 'Ps',
    cooldownTicks: 0, // pet pacing lives on the PetArtDef, not the ability
    shape: 'self_buff',
    damage: 0,
    petGuard: { armor: 6, durationTicks: 240 },
  },
  {
    id: 'the_venom_lattice',
    name: 'The Venom Lattice',
    desc: 'A woven floor of green threads. Every strand knows where you are.',
    color: '#7ac46a',
    code: 'Vl',
    cooldownTicks: 0, // pet pacing lives on the PetArtDef, not the ability
    shape: 'ground_field',
    damage: 2,
    range: 0,
    radius: 2.4,
    fieldTicks: 90,
    pulseEveryTicks: 15,
    status: { status: 'venom', power: 1, durationTicks: 60 },
  },
  // ---- THE STONE COURT AT HEEL (THE GAZE TAKES THE LEASH, user
  // mandate 2026-08-17): the basilisk family's own companion words.
  // The gaze stays the species — at heel it is shorter, narrower,
  // and ledger-budgeted, but it is still the same unblinking look.
  {
    id: 'tail_sweep',
    name: 'Tail Sweep',
    desc: 'The great tail comes around like a felled tree changing its mind. Everything at knee height regrets standing there.',
    color: '#6b6a52',
    code: 'Tw',
    cooldownTicks: 0, // pet pacing lives on the PetArtDef, not the ability
    shape: 'nova',
    damage: 6,
    radius: 2.1,
    knockback: 1.5,
  },
  {
    id: 'graven_mantle',
    name: 'Graven Mantle',
    desc: 'The basilisk turns its gaze inward the way its elders taught. The hide answers by becoming a wall.',
    color: '#8f8a76',
    code: 'Gm',
    cooldownTicks: 0, // pet pacing lives on the PetArtDef, not the ability
    shape: 'self_buff',
    damage: 0,
    // THE SELF-PAGE DOOR at heel: a licensed stonehide applier
    // (statusWave register) — the elder's mantle, learned young.
    self: { selfStatus: { status: 'stonehide', power: 0, durationTicks: 300 }, durationTicks: 1 },
  },
  {
    id: 'the_drowning_mire',
    name: 'The Drowning Mire',
    desc: 'The fen basilisk brings the marsh along. The ground forgets it was ever dry, and the rot remembers every ankle.',
    color: '#5c6b3e',
    code: 'Dm',
    cooldownTicks: 0, // pet pacing lives on the PetArtDef, not the ability
    shape: 'ground_field',
    damage: 3,
    range: 0,
    radius: 2.2,
    fieldTicks: 160,
    pulseEveryTicks: 20,
    status: { status: 'venom', power: 1, durationTicks: 60 },
  },
  {
    id: 'the_graven_gaze',
    name: 'The Graven Gaze',
    desc: 'The pale eyes stop blinking, and whatever they rest on remembers being rock. Stone boots, and the jaws close the argument.',
    color: '#b9d18c',
    code: 'Gz',
    cooldownTicks: 0, // pet pacing lives on the PetArtDef, not the ability
    shape: 'melee_arc',
    // The petrification GRAZES here too — the hold is the argument.
    damage: 2,
    range: 4,
    arc: 0.55,
    // THE STONE TAKES HOLD, at heel: a licensed root applier
    // (statusWave register), shorter than the wild gaze and priced by
    // the pet-side HOLD BUDGET pin (statusLedger).
    status: { status: 'root', power: 0, durationTicks: 30 },
  },
];
