/**
 * THE WILD'S OWN ARTS — npc specials and the enemy-art voices, tide, species kits, brine crowns, the legion, golems and ogres.
 * One shelf of the ability catalog (foundations F6.2) — entries moved
 * verbatim from abilities.ts; the hub spreads every shelf into the one
 * registry, so ids and behavior are untouched.
 */
import type { AbilityDef } from '@arx/shared';

export const NPC_ART_DEFS: AbilityDef[] = [
  // ----------------------------------------------------- npc specials
  {
    id: 'ground_slam',
    name: 'Ground Slam',
    desc: 'The champion raises its blade and brings the floor up with it.',
    color: '#e8e2d0',
    code: 'Gs',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'ground_aoe',
    damage: 6,
    range: 0, // centered on the target's position when cast
    radius: 2.2,
    fuseTicks: 24, // generous 1.2 s telegraph — dodgeable on reaction
    knockback: 2.0,
  },
  {
    id: 'rallying_howl',
    name: 'Rallying Howl',
    desc: 'The matriarch throws her head back — dread roots your legs, and the pack answers.',
    color: '#9aa2b8',
    code: 'Rh',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'nova',
    damage: 2, // the howl itself barely bruises — the PACK is the payload
    radius: 2.6,
    // Dread runs cold: slowed legs while every wolf in earshot closes.
    status: { status: 'chill', power: 1, durationTicks: 50 },
  },
  {
    id: 'ravening_cackle',
    name: 'Ravening Cackle',
    desc: 'The packlord throws back its head and laughs the blood cold. Legs slow. The warband answers.',
    color: '#c9a44a',
    code: 'Rc',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'nova',
    damage: 2, // the laugh barely bruises — the WARBAND is the payload
    radius: 2.6,
    // The same cold dread as the howl, in an uglier register.
    status: { status: 'chill', power: 1, durationTicks: 50 },
  },
  {
    id: 'hushing_screech',
    name: 'Hushing Screech',
    desc: 'The elder owl spreads its wings and screams the wood silent. Cold roots your legs, and the parliament drops off its boughs.',
    color: '#b8c4d8',
    code: 'Hs',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'nova',
    damage: 2, // the scream barely bruises — the PARLIAMENT is the payload
    radius: 2.6,
    // The hush runs cold: rooted legs while every owl in earshot stoops.
    status: { status: 'chill', power: 1, durationTicks: 50 },
  },
  {
    id: 'vixens_scream',
    name: "Vixen's Scream",
    desc: 'The matriarch screams the night open. Blood runs cold, and the skulk comes silent through the hedges.',
    color: '#d97a35',
    code: 'Vs',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'nova',
    damage: 2, // the scream barely bruises — the SKULK is the payload
    radius: 2.6,
    // The same cold dread as the howl, keener and thinner.
    status: { status: 'chill', power: 1, durationTicks: 50 },
  },

  // -------------------- THE VOICES (enemy arts, docs/enemy-arts-plan.md
  // Phase 3): the bestiary's kit abilities. Every entry keeps
  // cooldownTicks 0 (pacing lives on the NpcDef) and buys any die
  // above its wielder's basic with warning time — THE TELEGRAPH
  // PREMIUM is contract-tested in content.test.ts.
  {
    id: 'goblin_firebolt',
    name: 'Firebolt',
    desc: 'The firecaller draws breath and spits a gobbet of camp-fire that clings where it lands.',
    color: '#ff9a44',
    code: 'Fb',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'projectile_fan',
    damage: 3,
    projectiles: 1,
    projectileSpeed: 10,
    range: 9,
    // THE FLIGHT VOICE: the gobbet flies as the mastered ember brand
    // (arx elemental flight — fire tongues, wake, honest fizzle on
    // impact), never a wooden shaft.
    element: 'ember',
    status: { status: 'burn', power: 1, durationTicks: 60 },
  },
  {
    id: 'cinder_ring',
    name: 'Cinder Ring',
    desc: 'The firecaller marks the ground under your running feet, and the mark catches.',
    color: '#c43a18',
    code: 'Cr',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'ground_aoe',
    damage: 4,
    range: 0, // staked where the caster's aim law puts it
    radius: 1.8,
    fuseTicks: 20, // a full second to leave the mark
    status: { status: 'burn', power: 1, durationTicks: 80 },
  },
  {
    id: 'gloom_spittle',
    name: 'Gloom Spittle',
    desc: 'Three ropes of green bile, spat wide — the spread is the point.',
    color: '#a0c050',
    code: 'Gt',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'projectile_fan',
    damage: 2,
    projectiles: 3,
    spreadArc: 0.5,
    projectileSpeed: 9,
    range: 8,
    // THE FLIGHT VOICE: bile ropes fly verdant-green (arx elemental
    // flight), never as arrows.
    element: 'verdant',
    status: { status: 'venom', power: 1, durationTicks: 80 },
  },
  {
    id: 'miasma_ring',
    name: 'Miasma Ring',
    desc: 'The gloomcaller seeds the ground and a green haze stands up out of it. Standing in it is the mistake.',
    color: '#7ac46a',
    code: 'Mr',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'ground_field',
    damage: 2,
    range: 0,
    radius: 2.0,
    fieldTicks: 90,
    pulseEveryTicks: 15,
    status: { status: 'venom', power: 1, durationTicks: 60 },
  },
  {
    id: 'bone_volley',
    name: 'Bone Volley',
    desc: 'A fan of sharpened splinters, rattled loose and loosed.',
    color: '#d8d4c8',
    code: 'Bv',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'projectile_fan',
    damage: 3,
    projectiles: 4,
    spreadArc: 0.7,
    projectileSpeed: 10,
    range: 9,
  },
  {
    id: 'grave_mist',
    name: 'Grave Mist',
    desc: 'Cold rises off the ground like the door of a tomb swinging open. Legs slow in it.',
    color: '#8ac4e8',
    code: 'Gm',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'ground_field',
    damage: 2,
    range: 0,
    radius: 2.2,
    fieldTicks: 80,
    pulseEveryTicks: 20,
    status: { status: 'chill', power: 2, durationTicks: 40 },
  },
  {
    id: 'raise_the_fallen',
    name: 'Raise the Fallen',
    desc: 'The chanter speaks a name the ground remembers, and the ground answers.',
    color: '#b8c4d8',
    code: 'Rf',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'summon',
    damage: 0,
    // THE RAISING LANE: real bestiary bodies, capped alive, born into
    // the chanter's fight (docs/enemy-arts-plan.md LAW 1).
    summonNpc: { npc: 'skeleton', count: 2, capAlive: 2, levelDelta: -6 },
  },
  {
    id: 'web_snare',
    name: 'Web Snare',
    desc: 'Silk across your line of retreat. It costs nothing but your speed — which is everything.',
    color: '#e8e8e0',
    code: 'Ws',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'ground_field',
    damage: 0, // the snare never bites — the SLOW is the payload
    range: 0,
    radius: 1.6,
    fieldTicks: 70,
    pulseEveryTicks: 10,
    status: { status: 'chill', power: 2, durationTicks: 45 },
  },
  {
    id: 'reaping_sweep',
    name: 'Reaping Sweep',
    desc: 'The reaver sets its feet and swings through everything in front of it. The set feet are your warning.',
    color: '#c9a44a',
    code: 'Rs',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'melee_arc',
    damage: 5,
    range: 2.3,
    arc: 1.3, // a wide crescent — behind the reaver is the safe ground
    status: { status: 'bleed', power: 1, durationTicks: 60 },
  },
  {
    id: 'rattling_volley',
    name: 'Rattling Volley',
    desc: 'The archer nocks a fistful at once. None fly true. All fly.',
    color: '#d8d4c8',
    code: 'Rv',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'projectile_fan',
    damage: 2,
    projectiles: 5,
    spreadArc: 0.9,
    projectileSpeed: 10,
    range: 8,
  },
  {
    id: 'gnawed_mending',
    name: 'Gnawed Mending',
    desc: 'The troll stops fighting and starts knitting. Every heartbeat you allow it undoes one of yours.',
    color: '#7ac46a',
    code: 'Gn',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'self_buff',
    damage: 0,
    // A quarter of the body back — interrupt the breath or fight it twice.
    self: { healFrac: 0.28, durationTicks: 1 },
  },
  // ------------------------------------------------ THE AUTHORED TIDE
  // (statusBook Phase 5): eight crowns, eight pages — every boss owns
  // ONE wave-one state as identity. Self boons walk the caster's own
  // apply door (selfStatus), so the bit rides the wire and the whole
  // visible layer answers; player-facing holds obey FAIR HANDS at the
  // page (root clamps at the door, stagger is the ONE player-stagger
  // signature in the game, per the green-light).
  {
    id: 'tyrants_frenzy',
    name: 'Burning Frenzy',
    desc: 'The tyrant drinks its own fire. Each bellow quickens the next blow.',
    color: '#ffd76a',
    code: 'Bf',
    cooldownTicks: 0,
    shape: 'self_buff',
    damage: 0,
    self: { selfStatus: { status: 'quicken', power: 0, durationTicks: 240 }, durationTicks: 1 },
  },
  {
    id: 'gravecold_pall',
    name: 'Gravecold Pall',
    desc: 'The crypt air settles on your arms. Every blow you land is heavier to lift and lighter to feel.',
    color: '#8a6a9a',
    code: 'Gp',
    cooldownTicks: 0,
    shape: 'nova',
    damage: 2,
    radius: 3.2,
    status: { status: 'weaken', power: 12, durationTicks: 120 },
  },
  {
    id: 'barrow_knit',
    name: 'Barrow Knit',
    desc: 'The mound takes its lord back and gives him out again, whole. Break the knitting or fight him twice.',
    color: '#7ad0a0',
    code: 'Bk',
    cooldownTicks: 0,
    shape: 'self_buff',
    damage: 0,
    self: { selfStatus: { status: 'mend', power: 6, durationTicks: 160 }, durationTicks: 1 },
  },
  {
    id: 'tide_grasp',
    name: 'Tide Grasp',
    desc: 'The water closes over your boots and hardens. Cut your way loose or wait for the tide to change its mind.',
    color: '#a8814f',
    code: 'Tg',
    cooldownTicks: 0,
    shape: 'ground_aoe',
    damage: 3,
    radius: 2.2,
    range: 6,
    // The telegraph law: the tide gathers where it will close — FAIR
    // HANDS starts before the root even lands.
    fuseTicks: 18,
    status: { status: 'root', power: 0, durationTicks: 40 },
  },
  {
    id: 'barnacle_plate',
    name: 'Barnacle Plate',
    desc: 'The deep maw armors itself in its own reef, coat over coat.',
    color: '#98a4b0',
    code: 'Bp',
    cooldownTicks: 0,
    shape: 'self_buff',
    damage: 0,
    self: { selfStatus: { status: 'stonehide', power: 0, durationTicks: 400 }, durationTicks: 1 },
  },
  {
    id: 'matriarchs_howl',
    name: 'Unmanning Howl',
    desc: 'The matriarch names you prey, and your arms believe her.',
    color: '#8a6a9a',
    code: 'Uh',
    cooldownTicks: 0,
    shape: 'nova',
    damage: 2,
    radius: 3.5,
    status: { status: 'weaken', power: 10, durationTicks: 100 },
  },
  {
    id: 'oldfangs_blood',
    name: 'Old Blood Rising',
    desc: 'The oldfang remembers being young. Its jaws start arriving earlier than they should.',
    color: '#ffd76a',
    code: 'Ob',
    cooldownTicks: 0,
    shape: 'self_buff',
    damage: 0,
    self: { selfStatus: { status: 'quicken', power: 0, durationTicks: 240 }, durationTicks: 1 },
  },
  {
    id: 'anvil_toll',
    name: 'The Anvil Tolls',
    desc: 'The golem strikes the ground like a struck bell, and for one ringing breath your body forgets its orders.',
    color: '#dcd8f0',
    code: 'At',
    cooldownTicks: 0,
    shape: 'nova',
    damage: 6,
    radius: 2.6,
    knockback: 1.2,
    status: { status: 'stagger', power: 0, durationTicks: 14 },
  },
  {
    id: 'marrow_chill',
    name: 'Marrow Chill',
    desc: 'The champion plants its blade and the cold of the crypt walks out of it in a ring.',
    color: '#b8c4d8',
    code: 'Mc',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'nova',
    damage: 4,
    radius: 2.4,
    status: { status: 'chill', power: 1, durationTicks: 60 },
  },
  {
    id: 'rending_lunge',
    name: 'Rending Lunge',
    desc: 'The packlord drops low and comes through you, jaws first.',
    color: '#c9a44a',
    code: 'Rl',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'dash_strike',
    damage: 5,
    dashTiles: 5,
    status: { status: 'bleed', power: 2, durationTicks: 70 },
  },
  // ------------------------------------------------------------------
  // THE BROTHERHOOD (docs/boss-system-plan.md, the wolf crown): the
  // old wolf's three words — the hamstring that slows you, the call
  // that is spoken FROM DISTANCE (the lope carries him away first),
  // and the flat silent return. Together they are one sentence:
  // harry, break, call, come back through you.
  // ------------------------------------------------------------------
  {
    id: 'hamstring_bite',
    name: 'Hamstring Bite',
    desc: 'He goes low, under everything, for the tendon above the heel. You will keep standing — just not quickly.',
    color: '#8f96a8',
    code: 'Hb',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'melee_arc',
    damage: 3,
    range: 1.6,
    arc: 0.9,
    // THE SLOW: heavier cold than any howl — the whole point of the bite.
    status: { status: 'chill', power: 2, durationTicks: 80 },
  },
  {
    id: 'call_the_brotherhood',
    name: 'Call the Brotherhood',
    desc: 'He breaks away, sets his feet on ground he trusts, and calls. The answer comes on four legs, from every shadow at once.',
    color: '#8a94b8',
    code: 'Cb',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'summon',
    damage: 0,
    // THE BROTHERHOOD LANE: real wolves, capped alive, born into his
    // fight — and scaled to HIS spawned level, so the pack grows with
    // the court that holds him.
    summonNpc: { npc: 'wolf', count: 2, capAlive: 3, levelDelta: -4 },
  },
  {
    id: 'throat_lunge',
    name: 'Throat Lunge',
    desc: 'The return of the wolf that ran: flat, silent, and straight through where you stand.',
    color: '#b8bfd4',
    code: 'Tl',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'dash_strike',
    damage: 5,
    dashTiles: 7,
    travel: 'charge',
    status: { status: 'bleed', power: 2, durationTicks: 80 },
  },
  // ------------------------------------------------------------------
  // THE COURT'S HOUND (the fey wolf): three words from the estate
  // that never thawed. The ring is seeded where you are GOING, the
  // veil is the cold bursting off a crowded hound, and the step is
  // the legend itself — the hound comes apart into glimmer and
  // arrives already through you. One sentence: fence, shove, close.
  // ------------------------------------------------------------------
  {
    id: 'faerie_ring',
    name: 'Faerie Ring',
    desc: 'Pale toadstool-light stakes a circle under your running feet. Every old story agrees on what happens to those who stand in one.',
    color: '#9ff0d8',
    code: 'Fr',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'ground_field',
    damage: 2, // the ring barely bites — the CAUGHT are the payload
    range: 0,
    radius: 2.0,
    fieldTicks: 90,
    pulseEveryTicks: 15,
    // The court's cold climbs from the circle floor — legs go slow
    // and the hound's next word finds you standing still.
    status: { status: 'chill', power: 2, durationTicks: 50 },
  },
  {
    id: 'gloaming_veil',
    name: 'Gloaming Veil',
    desc: 'The hound stands still and the dusk arrives early, all at once, shoving cold through everyone who crowded it.',
    color: '#8a7fb0',
    code: 'Gv',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'nova',
    damage: 3,
    radius: 2.2,
    knockback: 1.2, // the veil MAKES the space the step will use
    status: { status: 'chill', power: 1, durationTicks: 60 },
  },
  {
    id: 'glimmer_step',
    name: 'Glimmer Step',
    desc: 'The hound comes apart into cold light and arrives already past you, jaws first. The bite is real. The wolf, briefly, was not.',
    color: '#b8ecdc',
    code: 'Gs',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'dash_strike',
    damage: 8,
    dashTiles: 8,
    // The court's jaws tear AND chill — the wound that keeps you
    // slow enough to be wounded again.
    status: { status: 'bleed', power: 2, durationTicks: 80 },
  },
  {
    id: 'shrilling_dart',
    name: 'Shrilling Dart',
    desc: 'The bat folds and comes through you on a scream.',
    color: '#8a7458',
    code: 'Sd',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'dash_strike',
    damage: 1, // the wound is small — the WOUND KEEPS PAYING
    dashTiles: 3.6,
    status: { status: 'bleed', power: 1, durationTicks: 50 },
  },

  // ------------------------------ THE TIDE'S RAMPART (the giant crab):
  // the shore bastion's two words. The grip is the whole animal spoken
  // once — announced long, paid at the telegraph premium, and what it
  // closes on is held cold. The jet is the reach it should not have:
  // the sea thrown flat, a lance of cold brine that flies on the frost
  // brand and finds where you were going, not where you are.
  {
    id: 'breakwater_grip',
    name: 'Breakwater Grip',
    desc: 'The great claw swings wide open and hangs there, a long bad promise. Then the harbor closes.',
    color: '#6d8577',
    code: 'Bg',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'melee_arc',
    damage: 9,
    range: 1.7,
    // A narrow crescent dead ahead of the crusher — flank it or wear it.
    arc: 0.9,
    // THE HOLD: no shove, no throw. The grip's whole argument is that
    // you stop leaving.
    status: { status: 'chill', power: 2, durationTicks: 90 },
  },
  {
    id: 'brine_jet',
    name: 'Brine Jet',
    desc: 'The mouthparts fold back and the sea comes out of it, flat and hard and colder than the sea has any right to be.',
    color: '#7ab0b8',
    code: 'Bj',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'projectile_fan',
    damage: 5,
    projectiles: 1,
    projectileSpeed: 11,
    range: 8,
    // THE FLIGHT VOICE: the jet flies as the frost brand — cold water
    // at pressure IS winter with intent, never a wooden shaft.
    element: 'frost',
    status: { status: 'chill', power: 1, durationTicks: 50 },
  },
  // ---- THE STONE COURT (the basilisks): six-legged dracolisk kin.
  // The gaze is the species — everything else is teeth.
  {
    id: 'stone_gaze',
    name: 'Stone Gaze',
    desc: 'The pale-green eyes stop blinking, and the ground under you remembers being rock. Move, or be part of the landscape.',
    color: '#b9d18c',
    code: 'Sg',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'ground_aoe',
    // The petrification GRAZES — the hold is the argument, the bite
    // that follows is the sentence.
    damage: 4,
    radius: 1.4,
    range: 6,
    // FAIR HANDS: the gaze gathers where it will fall — the licensed
    // hold warns longer than half its lock before it lands (ledger law).
    fuseTicks: 16,
    // THE STONE TAKES HOLD: a licensed root applier (statusWave
    // register) — stone in the boots, snapped by honest damage.
    status: { status: 'root', power: 0, durationTicks: 36 },
  },
  {
    id: 'mire_spit',
    name: 'Mire Spit',
    desc: 'The fen basilisk coughs up the swamp itself — a rope of green rot that clings where it lands.',
    color: '#7a8b4f',
    code: 'Mi',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'projectile_fan',
    damage: 6,
    projectiles: 1,
    projectileSpeed: 10,
    range: 7,
    // THE FLIGHT VOICE: fen rot flies as the verdant brand — living
    // corruption with intent, never a wooden shaft.
    element: 'verdant',
    status: { status: 'venom', power: 1, durationTicks: 90 },
  },
  {
    id: 'stone_mantle',
    name: 'Stone Mantle',
    desc: 'The elder turns its own gaze inward. The hide answers the way hides answer that look — by becoming a wall.',
    color: '#8f8a76',
    code: 'Sm',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'self_buff',
    damage: 0,
    // THE SELF-PAGE DOOR: a licensed stonehide applier (statusWave
    // register) — the elder armors in its own petrification.
    self: { selfStatus: { status: 'stonehide', power: 0, durationTicks: 360 }, durationTicks: 1 },
  },

  // ------------------------------------ THE SKRAL (docs/skral-plan.md):
  // the brine-folk's three words. The tidecaller speaks two — the lash
  // thrown flat off the wrist and the undertow staked where your feet
  // are headed — and the deepking speaks the third: the croak that is
  // not a spell at all, just the whole shoal's name said once, loudly.
  {
    id: 'tide_lash',
    name: 'Tide Lash',
    desc: 'The tidecaller snaps its wrist and a rope of brine cracks across the bank, cold as the deep it came from.',
    color: '#6fa8a0',
    code: 'Tl',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'projectile_fan',
    damage: 4,
    projectiles: 1,
    projectileSpeed: 11,
    range: 8,
    // Cold water at pressure IS winter with intent (the crab's law).
    element: 'frost',
    status: { status: 'chill', power: 1, durationTicks: 40 },
  },
  {
    id: 'riptide_ring',
    name: 'Riptide Ring',
    desc: 'The tidecaller marks a ring of ground, and the ground remembers it used to be riverbed. Do not be standing in the memory.',
    color: '#54889c',
    code: 'Rr',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'ground_aoe',
    damage: 5,
    range: 0, // staked where the caster's aim law puts it
    radius: 2.2,
    fuseTicks: 22,
    // THE UNDERTOW: no shove — the water's argument is that you slow.
    status: { status: 'chill', power: 2, durationTicks: 50 },
  },
  {
    id: 'shoal_call',
    name: 'Shoal-Call',
    desc: "The deepking fills its throat and croaks the shoal's one word. The bank answers.",
    color: '#7c9c8a',
    code: 'Sc',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'ground_aoe',
    damage: 4,
    range: 0,
    radius: 3.2,
    fuseTicks: 18,
    // The croak grips like cold water down the spine.
    status: { status: 'chill', power: 1, durationTicks: 40 },
  },

  // --------------------- THE BRINE CROWNS (docs/boss-system-plan.md):
  // the skral bosses' eight words — the tidelord's four spoken FROM
  // the oldest pool (the tide fights for the king), and the deepmaw's
  // four spoken by appetite alone. Every word is water remembering
  // something: the flood it owes, the pressure it keeps, the spears
  // it feeds, and what the gullet never gave back.
  {
    id: 'drowning_surge',
    name: 'Drowning Surge',
    desc: 'The tidelord lifts a palm and the ground ahead of your next step remembers the flood. The water stands, and stays, and argues.',
    color: '#4a7ea0',
    code: 'Ds',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'ground_field',
    // The flood is an ARGUMENT, not a blow: low tick, long stay —
    // the field's job is to own the lane the fight wanted.
    damage: 2,
    range: 0,
    radius: 2.6,
    fieldTicks: 90,
    pulseEveryTicks: 20,
    // Deep water holds ankles: the heaviest chill in the dialect.
    status: { status: 'chill', power: 2, durationTicks: 50 },
  },
  {
    id: 'abyssal_jet',
    name: 'Abyssal Jet',
    desc: 'The tidelord plants the trident and the deep comes up THROUGH it — a bar of black water at pressure, straight and flat and cold as the trench it left.',
    color: '#3a6a8c',
    code: 'Aj',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'beam',
    // Die 10 on the basic 7 rides the 1.5x telegraph lane (14t wind).
    damage: 10,
    range: 9,
    width: 0.6,
    // Trench water IS winter with intent (the family's flight law).
    element: 'frost',
    status: { status: 'chill', power: 1, durationTicks: 50 },
  },
  {
    id: 'court_of_spears',
    name: 'Court of Spears',
    desc: 'The tidelord croaks a name older than the weir, and harpooners stand up out of water that held no one. The court was always here. It was waiting to be needed.',
    color: '#6a8ea8',
    code: 'Cq',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'summon',
    damage: 0,
    // THE RANGED COURT: every other crown's adds come for your throat;
    // the tidelord's court STANDS OFF and throws — the fight problem
    // is the ring of spears, not the pile of teeth. Scaled to the
    // caster's spawned level (the brotherhood lane), capped alive.
    summonNpc: { npc: 'skral_harpooner', count: 2, capAlive: 4, levelDelta: -5 },
  },
  {
    id: 'kingspool_geyser',
    name: 'Kingspool Geyser',
    desc: 'Stand too near the king and the pool itself objects — the water under your feet goes UP, and again, and again.',
    color: '#7ab8c4',
    code: 'Kg',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'pulse_nova',
    // Three honest waves off the king's own feet: the anti-crowd
    // answer that punishes standing IN the throne.
    damage: 6,
    radius: 2.4,
    pulses: 3,
    pulseEveryTicks: 10,
    status: { status: 'chill', power: 1, durationTicks: 40 },
  },
  {
    id: 'shallows_rush',
    name: 'Shallows Rush',
    desc: 'The deepmaw drops flat as an eel and comes THROUGH you on a sheet of its own bow-wave. The water arrives a heartbeat before the meat does.',
    color: '#7e9a8c',
    code: 'Sw',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'dash_strike',
    damage: 7,
    dashTiles: 6.5,
    travel: 'charge',
    status: { status: 'chill', power: 1, durationTicks: 40 },
  },
  {
    id: 'gullet_snap',
    name: 'Gullet Snap',
    desc: 'The jaw unhinges past what a skull should allow and closes like a weir gate. Whatever armor was in the way is in the way no longer.',
    color: '#9ab0a0',
    code: 'Gs',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'melee_arc',
    // Die 9 on the basic 6: the 1.5x lane, bought with a 14t wind.
    damage: 9,
    // THE CRACKED SHELL: the game's one amplifier mark — the bite
    // ruins your guard and everything after hits a tenth harder.
    status: { status: 'sunder', power: 10, durationTicks: 80 },
  },
  {
    id: 'gorge_spray',
    name: 'Gorge Spray',
    desc: 'It heaves, and the fan of half-kept brine that follows is nothing the tide will take credit for. What the gullet keeps, rots.',
    color: '#8a9a5c',
    code: 'Gy',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'projectile_fan',
    damage: 5,
    projectiles: 5,
    spreadArc: 1.0,
    projectileSpeed: 9,
    range: 6,
    // The one venom in the dialect — swallowed water goes bad.
    status: { status: 'venom', power: 1, durationTicks: 60 },
  },
  {
    id: 'breaching_crash',
    name: 'Breaching Crash',
    desc: 'The deepmaw goes UNDER — a long beat of standing water and a wake you can read — and then the bank where you stood is a crater wearing spray.',
    color: '#647e6e',
    code: 'Bc',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'leap_slam',
    // Die 12 on the basic 6: the full 2.5x premium, bought with the
    // longest wind any skral draws (24t — the whole bank reads it).
    damage: 12,
    dashTiles: 7,
    radius: 2.3,
    knockback: 1.8,
    status: { status: 'chill', power: 1, durationTicks: 40 },
  },

  // ------------------------- THE LEGION (docs/hobgoblin-plan.md): the
  // hobgoblins' three words, all spoken in iron and flame. The
  // warcaster speaks two — the brand thrown flat and hard, and the
  // forge-ring staked where your feet are headed — and the warlord
  // speaks the third: the horn, which is not a spell at all, just an
  // ORDER, and the legion is drilled to obey it.
  {
    id: 'iron_brand',
    name: 'Iron Brand',
    desc: 'The warcaster draws a bar of white-hot iron out of the empty air and hurls it flat. What it touches, it marks.',
    color: '#e08a3c',
    code: 'Ib',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'projectile_fan',
    // Die 4 at a 12-tick wind: the telegraph premium's 1.5x lane over
    // the warcaster's basic 3 — the burn is the real bill.
    damage: 4,
    projectiles: 1,
    projectileSpeed: 12,
    range: 8,
    // Forge-iron flies as the ember brand — heat with a shape to it.
    element: 'ember',
    status: { status: 'burn', power: 1, durationTicks: 40 },
  },
  {
    id: 'forge_ring',
    name: 'Forge-Ring',
    desc: 'The warcaster stakes a smith\'s circle on the ground and the earth inside it remembers the furnace.',
    color: '#c25c2e',
    code: 'Fr',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'ground_aoe',
    damage: 5,
    range: 0,
    radius: 2.2,
    fuseTicks: 22,
    element: 'ember',
    status: { status: 'burn', power: 1, durationTicks: 50 },
  },
  {
    id: 'warlord_horn',
    name: 'Warlord\'s Horn',
    desc: 'The warlord sounds the horn once. It is not a request, and the legion does not treat it as one.',
    color: '#b08a3e',
    code: 'Wh',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'ground_aoe',
    damage: 4,
    range: 0,
    radius: 3.2,
    fuseTicks: 16,
  },

  // -------------------------------- THE EARTH STANDS UP (golem arts,
  // docs/golems-plan.md): four constructs, and every big die bought at
  // the telegraph premium off a slow heavy basic. A golem's art is
  // always announced; the fight it teaches is spacing.
  {
    id: 'hillstone_throw',
    name: 'Hillstone Throw',
    desc: 'The golem tears a stone from its own shoulder and puts it through the air. Watch it come.',
    color: '#8a8164',
    code: 'Hw',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'projectile_fan',
    damage: 10,
    projectiles: 1,
    // The slowest flight in the game. The dodge IS the read: you can
    // watch the whole arc and simply not be under it.
    projectileSpeed: 6,
    range: 9,
    element: 'stone',
    splashRadius: 1.2,
  },
  {
    id: 'quarry_ring',
    name: 'Quarry Ring',
    desc: 'The golem strikes the ground, and the ground stands up around you.',
    color: '#9a8f72',
    code: 'Qr',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'ground_aoe',
    damage: 9,
    range: 0, // staked where the caster's aim law puts it
    radius: 2.4,
    fuseTicks: 20,
    knockback: 1.5,
  },
  {
    id: 'anvil_fall',
    name: 'Anvil Fall',
    desc: 'Both fists over its head, held a long breath. Where they land, the floor rings like a struck anvil.',
    color: '#aab2c0',
    code: 'Av',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'ground_aoe',
    // The biggest telegraphed die below the boss tier, and the most
    // warning: 22t of raised fists plus the fuse.
    damage: 16,
    range: 0,
    radius: 2.0,
    fuseTicks: 18,
    knockback: 2.5,
  },
  {
    id: 'drawn_bolt',
    name: 'Drawn Bolt',
    desc: 'The golem leans, the joints hiss, and it comes through you shoulder first.',
    color: '#c8b06a',
    code: 'Dw',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'dash_strike',
    damage: 10,
    dashTiles: 8, // the orbit-breaker — circling feet meet the shoulder
    travel: 'charge',
  },
  {
    id: 'slag_gobbet',
    name: 'Slag Gobbet',
    desc: 'A fistful of its own melt, lobbed burning. It clings where it lands.',
    color: '#ff7a2e',
    code: 'Sb',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'projectile_fan',
    damage: 11,
    projectiles: 1,
    projectileSpeed: 7,
    range: 9,
    element: 'ember',
    splashRadius: 1.0,
    status: { status: 'burn', power: 1, durationTicks: 70 },
  },
  {
    id: 'vent_ring',
    name: 'Vent Ring',
    desc: 'The golem stakes the ground under your running feet, and the ground learns to breathe fire.',
    color: '#d84c1e',
    code: 'Vt',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'ground_aoe',
    damage: 12,
    range: 0,
    radius: 2.0,
    fuseTicks: 22, // a long fuse — the vents hiss before they speak
    status: { status: 'burn', power: 1, durationTicks: 80 },
  },
  {
    id: 'crust_burst',
    name: 'Crust Burst',
    desc: 'The shell cannot hold the furnace forever. Once a fight, it stops trying.',
    color: '#ffb03a',
    code: 'Cu',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'nova',
    damage: 15,
    radius: 2.6,
    knockback: 1.5,
    status: { status: 'burn', power: 1, durationTicks: 60 },
  },
  {
    id: 'calving_volley',
    name: 'Calving Volley',
    desc: 'Three shards shear off the golem and fly. Winter travels in straight lines.',
    color: '#9ad4e8',
    code: 'Cy',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'projectile_fan',
    damage: 9,
    projectiles: 3,
    spreadArc: 0.5,
    projectileSpeed: 8,
    range: 9,
    element: 'frost',
    status: { status: 'chill', power: 1, durationTicks: 50 },
  },
  {
    id: 'winters_floor',
    name: "Winter's Floor",
    desc: 'The golem breathes out and marks the ground ahead of you. The mark freezes over.',
    color: '#7ab8d8',
    code: 'Wt',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'ground_aoe',
    damage: 14,
    range: 0,
    radius: 2.2,
    fuseTicks: 24, // the longest golem fuse — the pane grows slowly shut
    status: { status: 'chill', power: 2, durationTicks: 80 },
  },

  // -------------------------------- THE HILL COMES DOWN (ogre arts,
  // docs/ogres-plan.md): the giant-kin's whole vocabulary is WEIGHT.
  // Every big die announced long and loud off the slow heavy basic —
  // an ogre never surprises you; it simply keeps being an ogre at you.
  {
    id: 'skull_toll',
    name: 'Skull Toll',
    desc: 'The club goes up in both hands and stays up a long, bad moment. Where it lands, the ground rings.',
    color: '#b3985e',
    code: 'Sk',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'ground_aoe',
    // The family's biggest word, priced at the full premium: sixteen
    // ticks of raised club plus the fuse. You were told.
    damage: 17,
    range: 0,
    radius: 1.7,
    fuseTicks: 16,
    knockback: 2,
  },
  {
    id: 'ogre_tantrum',
    name: 'Tantrum',
    desc: 'Past its patience, an ogre stops aiming. Fists, club, elbows — everything, everywhere, until nothing near it stands.',
    color: '#a4552e',
    code: 'Tt',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'flurry',
    // Each blow is only the basic — the tantrum's threat is that
    // there are THREE of them and no thought behind any of it.
    damage: 7,
    hits: 3,
    pulseEveryTicks: 6, // heavy blows land on a giant's clock, not a duelist's
    range: 2.5,
    arc: 1.1,
    knockback: 1,
  },
  {
    id: 'millstone_toss',
    name: 'Millstone Toss',
    desc: 'Two hands, three staggering steps, and a hundredweight of quarried wheel in the air. It keeps rolling.',
    color: '#8f8672',
    code: 'Mt',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'projectile_fan',
    damage: 14,
    projectiles: 1,
    // Slow, flat, and enormous — the whole arc is legible; the splash
    // is the lesson about ALMOST dodging.
    projectileSpeed: 7,
    range: 10,
    element: 'stone',
    splashRadius: 1.4,
  },
  {
    id: 'gravel_rake',
    name: 'Gravel Rake',
    desc: 'A fistful of the road itself, thrown flat. The scatter punishes the sideways answer.',
    color: '#9a8a68',
    code: 'Gv',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'projectile_fan',
    damage: 6,
    projectiles: 3,
    spreadArc: 0.55,
    projectileSpeed: 9,
    range: 8,
    element: 'stone',
  },
  {
    id: 'hill_bellow',
    name: 'Hill Bellow',
    desc: 'The great gut fills like a bellows, and what comes out lays the grass down flat — and you with it.',
    color: '#7e7f74',
    code: 'Hb',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'nova',
    damage: 12,
    radius: 3.2,
    // The knockback IS the art: the bellow is a spacing argument, and
    // an ogre wins every spacing argument it is allowed to finish.
    knockback: 2,
  },
  {
    id: 'shaken_stones',
    name: 'Shaken Stones',
    desc: 'The bellow does not stop at the grass. Overhead, the hillside lets go — where you are going to be.',
    color: '#8a8164',
    code: 'Sn',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'ground_aoe',
    damage: 10,
    range: 0, // staked where the caster's aim law puts it
    radius: 2.2,
    fuseTicks: 18,
  },
  {
    id: 'haunch_gnaw',
    name: 'Haunch Gnaw',
    desc: 'Wounded deep, an ogre remembers supper: a mutton haunch off the belt, gnawed to the bone mid-fight.',
    color: '#a4763e',
    code: 'Hg',
    cooldownTicks: 0, // NPC pacing lives on the NpcDef, not the ability
    shape: 'self_buff',
    damage: 0,
    // A third of the great body back, unless the meal is broken —
    // the long loud chew is the interrupt lesson, giant-sized.
    self: { healFrac: 0.3, durationTicks: 1 },
  },
];
