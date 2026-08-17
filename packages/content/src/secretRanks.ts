/**
 * RANKS FOR THE SHELF — the secret arts' honed steps.
 *
 * THE HONED-ART LAW, paid for every secret seat: Rank II sharpens
 * numbers, Rank III adds a beat of utility, Rank IV is the signature
 * flourish. A mastered secret ranks on its ANCHOR clock (anchor +15 /
 * +30 / +45), so the arts a hand fought to keep grow beside the
 * ladder instead of dulling behind it. An unmastered loan still casts
 * at Rank I — the borrowed motion is correct but not yet yours.
 *
 * Balance contracts (secretArts.test.ts): steps touch HONABLE fields
 * only, never degrade a damage art, and the Rank IV shelf must land
 * inside the school's RANK IV rung envelope — the shelf hones WITH
 * the ladder, never over it. THE PAYOFF BRACKET FOR THE SHELF caps
 * every honed rank against the at-level line fighter. Notes are
 * player-facing bench copy (VOICE; no dashes).
 */
import type { RankStep } from '@arx/shared';

type Steps = readonly [RankStep, RankStep, RankStep];

export const SECRET_RANKS: Record<string, Steps> = {
  // ------------------------------------------------ onehand, the blades
  crescent_sweep: [
    { note: 'The crescent cuts deeper.', damage: 7 },
    { note: 'The sweep reaches a step wider.', radius: 2.1 },
    { note: 'The wound it opens refuses to close.', status: { status: 'bleed', power: 1, durationTicks: 110 } },
  ],
  lunge: [
    { note: 'The point arrives harder.', damage: 9 },
    { note: 'The step carries you farther.', dashTiles: 7.6 },
    { note: 'What the point opens, the road finishes.', status: { status: 'bleed', power: 2, durationTicks: 70 } },
  ],
  serpents_kiss: [
    { note: 'The fang bites deeper.', damage: 6 },
    { note: 'The coil strikes a hand wider.', arc: 1.1, range: 2.0 },
    { note: 'The venom learns patience.', status: { status: 'venom', power: 1, durationTicks: 130 } },
  ],
  shadowstep: [
    { note: 'The dark hits harder on arrival.', damage: 7 },
    { note: 'The step through shadow lengthens.', dashTiles: 6.8 },
    { note: 'The knife is ready again before the light returns.', cooldownTicks: 120 },
  ],
  beak_first: [
    { note: 'The beak drives deeper.', damage: 6 },
    { note: 'The dive comes from farther out.', dashTiles: 5.2 },
    { note: 'What the rook opens keeps bleeding.', status: { status: 'bleed', power: 1, durationTicks: 110 } },
  ],
  bone_needle: [
    { note: 'The needle bites harder.', damage: 8 },
    { note: 'The throw carries farther.', range: 11 },
    { note: 'Marrow remembers where it was promised.', executeBelow: { frac: 0.4, mult: 1.8 } },
  ],
  drag_under: [
    { note: 'The pull lands heavier.', damage: 7 },
    { note: 'The undertow reaches wider.', arc: 1.6 },
    { note: 'The cold takes a deeper hold of what it caught.', damage: 8, status: { status: 'chill', power: 1, durationTicks: 110 } },
  ],
  garden_close: [
    { note: 'Every petal cuts deeper.', damage: 6 },
    { note: 'The garden closes a step wider.', radius: 2.0 },
    { note: 'The bloom seeds a slower dying.', status: { status: 'venom', power: 1, durationTicks: 130 } },
  ],
  quicksilver: [
    { note: 'The hand needs less asking.', cooldownTicks: 112 },
    { note: 'The hand blurs a reach farther.', range: 2.2 },
    { note: 'A fourth cut hides inside the third.', hits: 4 },
  ],
  riptide: [
    { note: 'The tide hits heavier.', damage: 8 },
    { note: 'The rush carries you farther.', dashTiles: 6.4 },
    { note: 'What the tide takes, it keeps cold.', status: { status: 'chill', power: 1, durationTicks: 100 } },
  ],
  shockwave: [
    { note: 'The slam lands heavier.', damage: 12 },
    { note: 'The wave breaks a step wider.', radius: 2.6 },
    { note: 'The ground answers with a longer throw.', knockback: 3.2 },
  ],
  spoken_light: [
    { note: 'The word lands brighter.', damage: 9 },
    { note: 'The light carries a step farther.', radius: 2.2 },
    { note: 'What it names, it moves.', knockback: 2.6 },
  ],
  stinger: [
    { note: 'The sting drives deeper.', damage: 6 },
    { note: 'The dart of a step grows quicker.', cooldownTicks: 100 },
    { note: 'The barb stays in the wound.', status: { status: 'bleed', power: 1, durationTicks: 100 } },
  ],
  sundering_chop: [
    { note: 'The chop falls heavier.', damage: 11 },
    { note: 'The swing opens wider.', arc: 1.0 },
    { note: 'What it sunders, it scatters.', knockback: 2.4 },
  ],
  thorn_lash: [
    { note: 'The thorns bite deeper.', damage: 8 },
    { note: 'The lash cracks a hand longer.', range: 2.4 },
    { note: 'The briar leaves more of itself behind.', status: { status: 'bleed', power: 2, durationTicks: 90 } },
  ],
  cold_snap: [
    { note: 'The snap bites harder.', damage: 6 },
    { note: 'The frost rings wider.', radius: 2.0 },
    { note: 'The cold holds until it is done with you.', status: { status: 'chill', power: 1, durationTicks: 120 } },
  ],
  crimson_tithe: [
    { note: 'The tithe collects a richer share.', self: { meleeLifesteal: 0.6, durationTicks: 80 } },
    { note: 'The collection runs longer.', self: { meleeLifesteal: 0.6, durationTicks: 100 } },
    { note: 'The debt is called sooner.', cooldownTicks: 210 },
  ],
  green_verse: [
    { note: 'The verse strikes truer.', damage: 6 },
    { note: 'The serpent line runs farther.', dashTiles: 5.8 },
    { note: 'The last stanza is the slowest poison.', status: { status: 'venom', power: 1, durationTicks: 130 } },
  ],
  pale_flame: [
    { note: 'The pale fire cuts deeper.', damage: 7 },
    { note: 'The flame licks a hand wider.', arc: 1.2 },
    { note: 'It burns cold, and it burns to the bone.', damage: 8, status: { status: 'chill', power: 1, durationTicks: 120 } },
  ],
  pale_lantern: [
    { note: 'The lantern gathers more of what falls.', self: { meleeLifesteal: 0.4, durationTicks: 100 } },
    { note: 'The light holds longer.', self: { meleeLifesteal: 0.4, durationTicks: 125 } },
    { note: 'The lantern relights sooner.', cooldownTicks: 210 },
  ],
  reapers_arc: [
    { note: 'The scythe falls heavier.', damage: 9 },
    { note: 'The harvest row grows wider.', arc: 1.8 },
    { note: 'The reaping leaves nothing to seed.', status: { status: 'bleed', power: 2, durationTicks: 80 } },
  ],
  shadow_fang: [
    { note: 'The fang strikes deeper.', damage: 8 },
    { note: 'The pounce covers more dark.', dashTiles: 8.0 },
    { note: 'It drinks deeper from the wound.', drainFrac: 0.35 },
  ],
  sky_splits: [
    { note: 'The bolt lands harder.', damage: 7 },
    { note: 'The split leaps a body farther.', radius: 3.4 },
    { note: 'A fifth throat hears the thunder.', chainTargets: 5 },
  ],
  slagfall: [
    { note: 'The slag falls heavier.', damage: 10 },
    { note: 'The melt spreads wider.', radius: 2.0 },
    { note: 'The fall comes with barely a warning.', fuseTicks: 10 },
  ],
  spark_lash: [
    { note: 'The spark bites harder.', damage: 7 },
    { note: 'The lash arcs a reach farther.', radius: 3.0 },
    { note: 'A third throat takes the current.', chainTargets: 3 },
  ],
  storm_brand: [
    { note: 'The brand strikes deeper.', damage: 8 },
    { note: 'The storm reaches farther between throats.', radius: 3.4 },
    { note: 'A fourth body joins the circuit.', chainTargets: 4 },
  ],
  winters_edge: [
    { note: 'The edge bites colder and deeper.', damage: 8 },
    { note: 'The cut sweeps a hand wider.', arc: 1.2 },
    { note: 'Winter keeps whatever the edge touches.', status: { status: 'chill', power: 1, durationTicks: 130 } },
  ],
  kept_ground: [
    { note: 'The kept ring bites deeper.', damage: 4 },
    { note: 'The ground you keep grows a stride wider.', radius: 3.0 },
    { note: 'The watch strikes on a faster bell.', pulseEveryTicks: 12 },
  ],
  cinder_arc: [
    { note: 'The cinders cut deeper.', damage: 9 },
    { note: 'The arc sweeps wider.', arc: 1.3 },
    { note: 'The embers refuse to gutter.', status: { status: 'burn', power: 1, durationTicks: 100 } },
  ],
  kings_bane: [
    { note: 'The bane strikes deeper.', damage: 10 },
    { note: 'The charge runs a stride farther.', dashTiles: 6.8 },
    { note: 'Crowned or common, the low are finished alike.', executeBelow: { frac: 0.35, mult: 1.7 } },
  ],
  kings_decree: [
    { note: 'The decree lands heavier.', damage: 10 },
    { note: 'The proclamation carries wider.', radius: 2.8 },
    { note: 'None may stand where the word falls.', knockback: 3.8 },
  ],
  last_word: [
    { note: 'The word cuts deeper.', damage: 15 },
    { note: 'It crosses the room to be heard.', dashTiles: 6.0 },
    { note: 'Against the failing, it is final.', executeBelow: { frac: 0.4, mult: 2.0 } },
  ],
  red_harvest: [
    { note: 'The harvest cuts deeper.', damage: 9 },
    { note: 'The field of the reaping widens.', radius: 2.2 },
    { note: 'Every row bleeds together.', status: { status: 'bleed', power: 2, durationTicks: 90 } },
  ],
  still_air: [
    { note: 'The stillness lands heavier.', damage: 9 },
    { note: 'The hush spreads wider.', radius: 2.4 },
    { note: 'Nothing moves until the air allows it.', status: { status: 'chill', power: 2, durationTicks: 120 } },
  ],
  sun_court: [
    { note: 'The court burns brighter.', damage: 10 },
    { note: 'The audience chamber widens.', radius: 2.4 },
    { note: 'The sentence of the sun is exile.', knockback: 3.2 },
  ],
  starfall_strike: [
    { note: 'The star falls heavier.', damage: 13 },
    { note: 'The crater opens wider.', radius: 2.3 },
    { note: 'The sky gives less warning.', fuseTicks: 12 },
  ],
  sunburst: [
    { note: 'The burst sears deeper.', damage: 10 },
    { note: 'The dawn breaks wider.', radius: 2.6 },
    { note: 'What the light finds, it keeps burning.', status: { status: 'burn', power: 2, durationTicks: 60 } },
  ],
  vow_unbroken: [
    { note: 'The vow returns a greater share.', self: { meleeLifesteal: 0.45, durationTicks: 120 } },
    { note: 'The oath holds longer.', self: { meleeLifesteal: 0.45, durationTicks: 145 } },
    { note: 'The keeper is never long without it.', cooldownTicks: 230 },
  ],

  // ------------------------------------------- twohand, the great steel
  colossus_arc: [
    { note: 'The arc falls heavier.', damage: 13 },
    { note: 'The swing owns a wider circle.', arc: 2.9 },
    { note: 'What the colossus strikes, it removes, and the arm is ready again.', knockback: 2.2, cooldownTicks: 175 },
  ],
  hewers_wheel: [
    { note: 'The wheel bites deeper.', damage: 11 },
    { note: 'The turn sweeps fully round.', arc: 3.4 },
    { note: 'The hewing leaves the timber weeping.', status: { status: 'bleed', power: 2, durationTicks: 50 } },
  ],
  reavers_due: [
    { note: 'The due is collected heavier.', damage: 11 },
    { note: 'The reach of the reaving grows.', range: 3.0 },
    { note: 'What is owed is thrown from the hall, and collected again soon.', knockback: 3.2, cooldownTicks: 160 },
  ],
  mournfield: [
    { note: 'The mourning bites deeper.', damage: 4 },
    { note: 'The field of grief spreads wider.', radius: 2.6 },
    { note: 'The grieving runs longer, and cuts deeper.', fieldTicks: 140, damage: 5 },
  ],
  ash_harvest: [
    { note: 'The harvest cuts deeper.', damage: 12 },
    { note: 'The burning row grows wider.', arc: 2.7 },
    { note: 'The ash keeps its heat.', status: { status: 'burn', power: 2, durationTicks: 70 } },
  ],
  barrow_bite: [
    { note: 'The bite closes harder.', damage: 11 },
    { note: 'The maw opens wider.', arc: 2.3 },
    { note: 'The barrow does not let go.', status: { status: 'bleed', power: 2, durationTicks: 80 } },
  ],
  quakefall: [
    { note: 'The fall lands heavier.', damage: 15 },
    { note: 'The fracture spreads wider.', radius: 2.6 },
    { note: 'The earth gives no notice at all.', fuseTicks: 6 },
  ],
  road_opens: [
    { note: 'The toll is taken heavier.', damage: 12 },
    { note: 'The road claims a wider verge.', arc: 2.6 },
    { note: 'Whatever stood in the way is a milestone now.', knockback: 3.8, cooldownTicks: 175 },
  ],
  standing_stone: [
    { note: 'The stone stands longer.', summon: { kind: 'decoy', durationTicks: 220, radius: 6, power: 0 } },
    { note: 'The stone speaks over a wider field.', summon: { kind: 'decoy', durationTicks: 220, radius: 7, power: 0 } },
    { note: 'The ground knows the stone now, and raises it sooner.', cooldownTicks: 320 },
  ],
  crowns_word: [
    { note: 'Each word lands heavier.', damage: 9 },
    { note: 'The argument carries wider.', radius: 2.7 },
    { note: 'The crown speaks a third time.', pulses: 3 },
  ],
  glacier_sunder: [
    { note: 'The sunder drives deeper.', damage: 13 },
    { note: 'The crevasse opens wider.', radius: 2.5 },
    { note: 'The glacier calves without warning.', fuseTicks: 5 },
  ],
  marsh_light: [
    { note: 'The light draws blood now.', damage: 5 },
    { note: 'The fen glow spreads wider.', radius: 2.5 },
    { note: 'The marsh keeps its guests a breath longer.', fieldTicks: 128 },
  ],
  thunder_fell: [
    { note: 'The fell strikes heavier.', damage: 13 },
    { note: 'The thunderhead spreads wider.', radius: 2.4 },
    { note: 'The bolt outruns its own warning.', fuseTicks: 5 },
  ],
  white_heat: [
    { note: 'The heat works faster through the arms.', self: { speedMult: 1.16, onHitStatus: { status: 'burn', power: 1, durationTicks: 60 }, durationTicks: 150 } },
    { note: 'The forge holds its temper longer.', self: { speedMult: 1.16, onHitStatus: { status: 'burn', power: 1, durationTicks: 60 }, durationTicks: 180 } },
    { note: 'Every blow off the anvil brands deeper.', self: { speedMult: 1.16, onHitStatus: { status: 'burn', power: 2, durationTicks: 60 }, durationTicks: 180 } },
  ],
  winters_hunger: [
    { note: 'The hunger drives the arms faster.', self: { speedMult: 1.14, onHitStatus: { status: 'bleed', power: 1, durationTicks: 70 }, durationTicks: 150 } },
    { note: 'The appetite lasts longer.', self: { speedMult: 1.14, onHitStatus: { status: 'bleed', power: 1, durationTicks: 70 }, durationTicks: 180 } },
    { note: 'Every bite tears wider.', self: { speedMult: 1.14, onHitStatus: { status: 'bleed', power: 2, durationTicks: 70 }, durationTicks: 180 } },
  ],
  open_seam: [
    { note: 'The seam splits deeper.', damage: 6 },
    { note: 'The tear runs wider.', radius: 2.4 },
    { note: 'The seam stays open longer, and cuts to the quick.', fieldTicks: 112, damage: 7 },
  ],
  pale_crescent: [
    { note: 'The crescent falls heavier.', damage: 12 },
    { note: 'The moon path sweeps wider.', arc: 2.8 },
    { note: 'Moonlight lies cold on the wound, and the moon rises sooner.', status: { status: 'chill', power: 2, durationTicks: 70 }, cooldownTicks: 200 },
  ],
  last_argument: [
    { note: 'The argument lands heavier.', damage: 17 },
    { note: 'It admits no one outside its reach.', range: 3.3, arc: 3.0 },
    { note: 'The conclusion clears the room, and brooks little rebuttal.', knockback: 3.0, cooldownTicks: 230 },
  ],
  horizon_fall: [
    { note: 'The fall lands heavier.', damage: 15 },
    { note: 'The horizon breaks wider.', radius: 2.7 },
    { note: 'Where it lands, the world makes room, and the sky reloads.', knockback: 3.2, cooldownTicks: 300 },
  ],
  riftfall: [
    { note: 'The rift bites deeper.', damage: 16 },
    { note: 'The tear opens wider.', radius: 2.6 },
    { note: 'The far side arrives early, and often.', fuseTicks: 5, cooldownTicks: 280 },
  ],
  last_toll: [
    { note: 'Each toll rings heavier.', damage: 11 },
    { note: 'The bell is heard wider.', radius: 2.8 },
    { note: 'The final toll throws the room, and rings in the bones.', knockback: 2.5, status: { status: 'shock', power: 1, durationTicks: 80 } },
  ],

  // --------------------------------------------- archery, the flights
  volley: [
    { note: 'Every shaft bites deeper.', damage: 7 },
    { note: 'The spread holds tighter.', spreadArc: 0.45 },
    { note: 'A sixth shaft joins the flight.', projectiles: 6 },
  ],
  wakewood: [
    { note: 'The thorns rake deeper.', damage: 5 },
    { note: 'The rooting ground spreads wider.', radius: 2.2 },
    { note: 'The wood wakes one growth longer.', fieldTicks: 106 },
  ],
  broadhead: [
    { note: 'The head cuts a wider channel.', damage: 11 },
    { note: 'The draw settles quicker.', cooldownTicks: 155 },
    { note: 'The wound it leaves stays open.', status: { status: 'bleed', power: 2, durationTicks: 80 } },
  ],
  glasshail: [
    { note: 'Each shard bites deeper.', damage: 6 },
    { note: 'The hail holds a tighter pattern.', spreadArc: 0.65 },
    { note: 'A seventh shard rides the gust.', projectiles: 7 },
  ],
  larkshot: [
    { note: 'The lark strikes brighter.', damage: 11 },
    { note: 'The song cuts a wider line.', width: 0.7 },
    { note: 'Dawn holds the burn longer.', status: { status: 'burn', power: 1, durationTicks: 70 } },
  ],
  charfall: [
    { note: 'The char falls heavier.', damage: 12 },
    { note: 'The burn ground spreads wider.', radius: 2.4 },
    { note: 'The bough drops without a rustle.', fuseTicks: 11 },
  ],
  piercing_bolt: [
    { note: 'The bolt drives deeper.', damage: 13 },
    { note: 'The shot carries farther.', range: 20 },
    { note: 'It leaves through the third rank.', projectileSpeed: 30, cooldownTicks: 160 },
  ],
  stormskip: [
    { note: 'The skip strikes harder.', damage: 8 },
    { note: 'The storm leaps farther between marks.', radius: 3.4 },
    { note: 'A fifth mark takes the arc.', chainTargets: 5 },
  ],
  thorn_fan: [
    { note: 'Every thorn bites deeper.', damage: 6 },
    { note: 'The fan holds a tighter spread.', spreadArc: 0.5 },
    { note: 'A sixth thorn joins the fan.', projectiles: 6 },
  ],
  wingbeat: [
    { note: 'The beat strikes harder.', damage: 6 },
    { note: 'The wings ready again sooner.', cooldownTicks: 105 },
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
    { note: 'The string sounds a fourth measure.', pulses: 4 },
  ],
  verdant_burst: [
    { note: 'The burst cuts deeper.', damage: 10 },
    { note: 'The greening spreads wider.', radius: 2.2 },
    { note: 'The heartwood bursts almost at once.', fuseTicks: 10 },
  ],
  hoarfrost: [
    { note: 'The frost bites deeper.', damage: 7 },
    { note: 'The rime rings wider.', radius: 2.8 },
    { note: 'The cold does not consider letting go, and gathers again quickly.', status: { status: 'chill', power: 1, durationTicks: 120 }, cooldownTicks: 160 },
  ],
  nightweft: [
    { note: 'The weft cuts deeper.', damage: 9 },
    { note: 'The loom gathers from wider.', radius: 2.8 },
    { note: 'The threads pull harder, and the loom never rests.', knockback: -2.1, cooldownTicks: 170 },
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
    { note: 'Each star burns deeper.', damage: 7 },
    { note: 'The constellation holds its shape.', spreadArc: 0.75 },
    { note: 'An eighth star falls with the rest.', projectiles: 8 },
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
    { note: 'The rend cuts deeper.', damage: 15 },
    { note: 'The tear opens wider.', width: 0.65 },
    { note: 'The sky closes slowly, and hurts the whole while.', status: { status: 'shock', power: 1, durationTicks: 80 } },
  ],
  windsong: [
    { note: 'The song strikes deeper.', damage: 14 },
    { note: 'The verse carries farther.', range: 21 },
    { note: 'The refrain returns sooner.', cooldownTicks: 160 },
  ],

  // ------------------------------------------------- arx, the voices
  arcane_ring: [
    { note: 'The ring strikes harder.', damage: 7 },
    { note: 'The circle draws wider.', radius: 2.4 },
    { note: 'The ring casts its answer sooner.', cooldownTicks: 108 },
  ],
  frost_nova: [
    { note: 'The frost bites deeper.', damage: 6 },
    { note: 'The freeze rings wider.', radius: 2.9 },
    { note: 'The cold holds longer, and returns before the thaw.', status: { status: 'chill', power: 1, durationTicks: 110 }, cooldownTicks: 132 },
  ],
  day_breaks: [
    { note: 'The dawn cuts brighter.', damage: 11 },
    { note: 'The first light falls wider.', width: 0.72 },
    { note: 'Morning holds the burn longer.', status: { status: 'burn', power: 1, durationTicks: 70 } },
  ],
  fireburst: [
    { note: 'The burst burns hotter.', damage: 11 },
    { note: 'The blossom of fire opens wider.', radius: 2.0 },
    { note: 'The burst gives almost no breath of warning.', fuseTicks: 10 },
  ],
  overgrowth: [
    { note: 'The briars rake deeper.', damage: 5 },
    { note: 'The growth claims more ground.', radius: 2.5 },
    { note: 'The thicket lives one season longer.', fieldTicks: 126 },
  ],
  wild_root: [
    { note: 'The roots strike deeper.', damage: 5 },
    { note: 'The wild ground spreads wider.', radius: 2.3 },
    { note: 'The roots hold one heartbeat longer.', fieldTicks: 105 },
  ],
  wisp_flare: [
    { note: 'Each wisp burns brighter.', damage: 5 },
    { note: 'The dance holds a tighter ring.', spreadArc: 0.4 },
    { note: 'A fourth wisp joins the returning dance.', projectiles: 4 },
  ],
  grave_chill: [
    { note: 'The chill bites deeper.', damage: 7 },
    { note: 'The grave cold reaches wider.', radius: 2.6 },
    { note: 'What the grave touches, it keeps still.', status: { status: 'chill', power: 1, durationTicks: 110 } },
  ],
  moonfall: [
    { note: 'The moon falls heavier.', damage: 10 },
    { note: 'The silver ground spreads wider.', radius: 2.4 },
    { note: 'Moonlight arrives without asking.', fuseTicks: 11 },
  ],
  gloom_burst: [
    { note: 'The gloom cuts deeper.', damage: 5 },
    { note: 'The dark pools wider.', radius: 2.2 },
    { note: 'The gloom outstays the light.', fieldTicks: 128 },
  ],
  hearth_flare: [
    { note: 'The hearth roars hotter.', damage: 7 },
    { note: 'The warmth is felt wider.', radius: 2.3 },
    { note: 'The sparks land where they are least wanted.', status: { status: 'burn', power: 2, durationTicks: 60 } },
  ],
  shearwind: [
    { note: 'The wind cuts deeper.', damage: 8 },
    { note: 'The gale blows a ring wider.', radius: 2.9 },
    { note: 'What the wind takes, it throws.', knockback: 3.8 },
  ],
  the_molt: [
    { note: 'Each feather burns deeper.', damage: 5 },
    { note: 'The molt seeks its marks more surely.', projectileSpeed: 24 },
    { note: 'A sixth feather leaves the quill.', projectiles: 6 },
  ],
  venom_lash: [
    { note: 'The lash bites deeper.', damage: 7 },
    { note: 'The twin fangs strike as one.', spreadArc: 0.18 },
    { note: 'The venom settles in for the night.', status: { status: 'venom', power: 1, durationTicks: 120 } },
  ],
  vigil: [
    { note: 'The flame closes more with every beat.', self: { heal: 4, durationTicks: 20 } },
    { note: 'The candle is relit sooner.', cooldownTicks: 340 },
    { note: 'The watch holds a fifth beat.', channelTicks: 80 },
  ],
  axiom: [
    { note: 'The proof lands heavier.', damage: 7 },
    { note: 'The theorem holds wider.', radius: 2.4 },
    { note: 'The conclusion states itself a fourth time.', pulses: 4 },
  ],
  cinderstorm: [
    { note: 'The storm burns hotter.', damage: 9 },
    { note: 'The cinders ride a wider wind.', radius: 2.6 },
    { note: 'The storm leaves its fire behind.', status: { status: 'burn', power: 1, durationTicks: 110 } },
  ],
  galvanic_arc: [
    { note: 'The arc strikes harder.', damage: 8 },
    { note: 'The current leaps farther.', radius: 3.4 },
    { note: 'A fourth body closes the circuit.', chainTargets: 4 },
  ],
  glaciate: [
    { note: 'The ice bites deeper.', damage: 8 },
    { note: 'The glacier front spreads wider.', radius: 3.0 },
    { note: 'The freeze holds until spring.', status: { status: 'chill', power: 2, durationTicks: 110 } },
  ],
  hollowing: [
    { note: 'The hollow bites deeper.', damage: 6 },
    { note: 'The emptiness spreads wider.', radius: 2.6 },
    { note: 'The hollow pulls harder, and opens again sooner.', knockback: -1.8, cooldownTicks: 205 },
  ],
  red_toll: [
    { note: 'The toll collects heavier.', damage: 8 },
    { note: 'The collection reaches farther.', radius: 3.4 },
    { note: 'It drinks deeper from every debtor.', drainFrac: 0.5 },
  ],
  rune_echo: [
    { note: 'The echo lands heavier.', damage: 6 },
    { note: 'The rune sounds wider.', radius: 2.4 },
    { note: 'The echo answers a fourth time.', pulses: 4 },
  ],
  shatterfrost: [
    { note: 'The shatter cuts deeper.', damage: 11 },
    { note: 'The shards fly wider.', radius: 2.8 },
    { note: 'The frost bites through to the marrow.', status: { status: 'chill', power: 2, durationTicks: 80 } },
  ],
  undertow: [
    { note: 'The tow drags heavier.', damage: 10 },
    { note: 'The current claims more water.', radius: 2.4 },
    { note: 'The deep pulls with both hands.', knockback: -2.2 },
  ],
  crownstorm: [
    { note: 'The storm strikes harder.', damage: 9 },
    { note: 'The court of lightning widens.', radius: 3.5 },
    { note: 'A sixth subject kneels to the crown.', chainTargets: 6 },
  ],
  eye_of_the_storm: [
    { note: 'The eye watches heavier weather.', damage: 6 },
    { note: 'The stormwall stands wider.', radius: 2.7 },
    { note: 'The wall widens further, and the lightning stays in the skin.', radius: 2.9, status: { status: 'shock', power: 1, durationTicks: 80 } },
  ],
  magma_orb: [
    { note: 'The orb burns hotter.', damage: 14 },
    { note: 'The melt flies farther.', range: 14 },
    { note: 'What it passes through, it sets alight.', status: { status: 'burn', power: 2, durationTicks: 80 } },
  ],
  marrow_pulse: [
    { note: 'The pulse strikes deeper.', damage: 6 },
    { note: 'The bone song carries wider.', radius: 2.5 },
    { note: 'The marrow answers a fourth beat.', pulses: 4 },
  ],
  perihelion: [
    { note: 'The near sun burns hotter.', damage: 13 },
    { note: 'The corona spreads wider.', radius: 2.5 },
    { note: 'The orbit closes faster than the eye, and comes round again.', fuseTicks: 12, cooldownTicks: 200 },
  ],
  solar_lance: [
    { note: 'The lance burns brighter.', damage: 13 },
    { note: 'The beam cuts a wider line.', width: 0.72 },
    { note: 'The sunlight does not stop burning.', status: { status: 'burn', power: 2, durationTicks: 60 } },
  ],
  red_thread: [
    { note: 'The thread winds thicker.', damage: 5 },
    { note: 'More of what leaves them arrives with you.', drainFrac: 0.65 },
    { note: 'The spool takes a fourth turn.', channelTicks: 64 },
  ],
  red_eclipse: [
    { note: 'The eclipse cuts deeper.', damage: 13 },
    { note: 'The red shadow falls wider.', radius: 2.6 },
    { note: 'The moon drinks deeper of what it wounds.', drainFrac: 0.45 },
  ],
  stormlash: [
    { note: 'The lash strikes harder.', damage: 10 },
    { note: 'The storm reaches farther between throats.', radius: 3.6 },
    { note: 'A fifth throat takes the lash.', chainTargets: 5 },
  ],
  void_rift: [
    { note: 'The rift bites deeper.', damage: 6 },
    { note: 'The tear in things opens wider.', radius: 2.9 },
    { note: 'The far dark pulls with real intent, and seldom closes.', knockback: -2.0, cooldownTicks: 215 },
  ],
  realm_rend: [
    { note: 'The rend cuts deeper.', damage: 16 },
    { note: 'The wound in the world opens wider.', width: 0.78 },
    { note: 'The realm remembers being torn.', status: { status: 'shock', power: 2, durationTicks: 70 } },
  ],

  // --------------------------------------------- polearm, the hafts
  reaching_thrust: [
    { note: 'The point lands heavier.', damage: 10 },
    { note: 'The reach lengthens and the hand asks again sooner.', range: 3.9, cooldownTicks: 140 },
    { note: 'The full extension becomes the whole argument.', damage: 11 },
  ],
  reapers_turn: [
    { note: 'The wheel cuts deeper.', damage: 11 },
    { note: 'The turn opens wider and shoves harder.', arc: 2.7, knockback: 1.8 },
    { note: 'The row lies down, and the next row is soon.', damage: 12, cooldownTicks: 160 },
  ],
  skullhook: [
    { note: 'The hook bites deeper.', damage: 10 },
    { note: 'The drag comes harder, and the cold stays in the collar.', knockback: -2.6, status: { status: 'chill', power: 1, durationTicks: 60 } },
    { note: 'What the hook claims, it keeps claiming.', damage: 11, cooldownTicks: 170 },
  ],
  couched_charge: [
    { note: 'The arrival lands heavier.', damage: 12 },
    { note: 'The road runs longer and opens sooner.', dashTiles: 8.0, cooldownTicks: 170 },
    { note: 'The horizon signs the charge by name.', damage: 13, knockback: 2.4 },
  ],
};
