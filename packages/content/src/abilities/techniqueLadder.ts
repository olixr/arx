/**
 * THE TECHNIQUE LADDERS — every rung of every school, as pure data
 * (foundations F6.2; moved verbatim from abilities.ts).
 */
import type { TechniqueDef } from '@arx/shared';

export const TECHNIQUE_LADDER_DEFS: TechniqueDef[] = [
  // THE GREEN ARTS ladder — rungs 5..75 on the farming skill.
  {
    ability: 'sowers_step',
    style: 'farming',
    unlockLevel: 5,
    ranks: [
      { note: 'The stride holds longer.', self: { speedMult: 1.12, durationTicks: 320 } },
      { note: 'The furrows carry you quicker.', self: { speedMult: 1.16, durationTicks: 320 } },
      { note: 'The path barely feels your weight.', cooldownTicks: 480 },
    ],
  },
  {
    ability: 'gardeners_mend',
    style: 'farming',
    unlockLevel: 15,
    ranks: [
      { note: 'The green gives more of itself.', self: { heal: 16, durationTicks: 20 } },
      { note: 'The kneel comes easier.', cooldownTicks: 640 },
      { note: 'The mend runs deep.', self: { heal: 22, durationTicks: 20 } },
    ],
  },
  {
    ability: 'earthen_brace',
    style: 'farming',
    unlockLevel: 30,
    ranks: [
      { note: 'The ground holds harder.', self: { shieldHp: 18, durationTicks: 240 } },
      { note: 'The stance sets quicker.', cooldownTicks: 560 },
      { note: 'Fencepost, then foundation.', self: { shieldHp: 24, durationTicks: 300 } },
    ],
  },
  {
    ability: 'hearthkeepers_calm',
    style: 'farming',
    unlockLevel: 50,
    ranks: [
      { note: 'The quiet settles deeper.', self: { armor: 5, durationTicks: 300 } },
      { note: 'The calm keeps longer.', self: { armor: 5, durationTicks: 400 } },
      { note: 'The yard walks with you whole.', self: { armor: 6, durationTicks: 400 } },
    ],
  },
  {
    ability: 'quickening_touch',
    style: 'farming',
    unlockLevel: 75,
    ranks: [
      { note: 'The touch reaches further.', range: 5.5 },
      { note: 'The hand asks less often.', cooldownTicks: 900 },
      { note: 'A master gardener\'s season in a breath.', cooldownTicks: 700 },
    ],
  },
  {
    ability: 'heavy_slam',
    style: 'onehand',
    unlockLevel: 5,
    ranks: [
      { note: 'The blow lands heavier, and sooner.', damage: 12, cooldownTicks: 160 },
      {
        note: 'The swing opens wider; the follow-through frees your feet.',
        arc: 1.35,
        knockback: 3.4,
        castFreezeTicks: 4,
      },
      {
        note: 'The earth rings — struck foes reel.',
        status: { status: 'shock', power: 1, durationTicks: 40 },
      },
    ],
  },
  {
    ability: 'ember_edge',
    style: 'onehand',
    unlockLevel: 10,
    ranks: [
      { note: 'The edge bites deeper.', damage: 10 },
      {
        note: 'The fire keeps its grip longer.',
        status: { status: 'burn', power: 1, durationTicks: 80 },
      },
      { note: 'The kindling catches quicker, and oftener.', cooldownTicks: 160, castTicks: 16 },
    ],
  },
  {
    ability: 'bull_rush',
    style: 'onehand',
    unlockLevel: 15,
    ranks: [
      { note: 'The shoulder hits harder.', damage: 10 },
      { note: 'A longer charge, sooner ready.', dashTiles: 8.4, cooldownTicks: 150 },
      { note: 'Nothing stands where you arrive.', damage: 11, knockback: 3.2 },
    ],
  },
  {
    ability: 'millwork',
    style: 'onehand',
    unlockLevel: 20,
    ranks: [
      { note: 'Every pass grinds harder.', damage: 5 },
      { note: 'The wheel turns a fourth time.', channelTicks: 64 },
      { note: 'The stone is ready again sooner.', cooldownTicks: 180 },
    ],
  },
  {
    ability: 'whirlwind',
    style: 'onehand',
    unlockLevel: 25,
    ranks: [
      { note: 'Each cut bites deeper.', damage: 5 },
      { note: 'The blade reaches a step farther.', radius: 2.1 },
      { note: 'The storm turns a fourth time.', pulses: 4 },
    ],
  },
  {
    ability: 'levinstroke',
    style: 'onehand',
    unlockLevel: 30,
    ranks: [
      { note: 'The stroke lands heavier.', damage: 13 },
      {
        note: 'The charge clings longer to what it strikes.',
        status: { status: 'shock', power: 1, durationTicks: 80 },
      },
      { note: 'The levin leaps from a shorter wind.', castTicks: 14, cooldownTicks: 170 },
    ],
  },
  {
    ability: 'warcry',
    style: 'onehand',
    unlockLevel: 35,
    ranks: [
      {
        note: 'The shout holds more of the blow.',
        self: { shieldHp: 8, speedMult: 1.1, durationTicks: 120 },
      },
      { note: 'Your voice recovers faster.', cooldownTicks: 240 },
      {
        note: 'The war hears you, and hurries.',
        self: { shieldHp: 8, speedMult: 1.15, durationTicks: 140 },
      },
    ],
  },
  {
    ability: 'red_ledger',
    style: 'onehand',
    unlockLevel: 40,
    ranks: [
      { note: 'The toll rises.', damage: 5 },
      { note: 'More of the red comes home to you.', drainFrac: 0.5, cooldownTicks: 200 },
      { note: 'The account stays open a fourth beat.', channelTicks: 64 },
    ],
  },
  {
    ability: 'steel_wave',
    style: 'onehand',
    unlockLevel: 45,
    ranks: [
      { note: 'The edges bite deeper.', damage: 8 },
      { note: 'The wave rolls out oftener.', cooldownTicks: 160 },
      { note: 'A fourth blade joins the wave.', projectiles: 4, spreadArc: 0.6 },
    ],
  },
  {
    ability: 'cold_iron',
    style: 'onehand',
    unlockLevel: 50,
    ranks: [
      { note: 'The frost bites deeper.', damage: 12 },
      {
        note: 'Winter spreads wider and holds longer.',
        radius: 2.3,
        status: { status: 'chill', power: 1, durationTicks: 100 },
      },
      { note: 'The iron goes in quicker, and colder.', damage: 13, cooldownTicks: 190, castTicks: 20 },
    ],
  },
  {
    ability: 'bloodlust',
    style: 'onehand',
    unlockLevel: 54,
    ranks: [
      {
        note: 'The red joy holds for eight seconds.',
        self: { meleeLifesteal: 0.4, durationTicks: 160 },
      },
      {
        note: 'Every wound feeds you more.',
        self: { meleeLifesteal: 0.55, durationTicks: 160 },
      },
      {
        note: 'The hunger quickens your stride.',
        self: { meleeLifesteal: 0.55, speedMult: 1.12, durationTicks: 160 },
      },
    ],
  },
  {
    ability: 'frostwork',
    style: 'onehand',
    unlockLevel: 58,
    ranks: [
      { note: 'Each beat etches deeper.', damage: 4 },
      {
        note: 'The pattern reaches farther and grips longer.',
        radius: 2.5,
        status: { status: 'chill', power: 1, durationTicks: 80 },
      },
      { note: 'The work is ready again sooner.', cooldownTicks: 220 },
    ],
  },
  {
    ability: 'stagger_stomp',
    style: 'onehand',
    unlockLevel: 62,
    ranks: [
      { note: 'The heel falls heavier.', damage: 9 },
      { note: 'The floor passes it farther.', radius: 2.4, cooldownTicks: 180 },
      {
        note: 'The ring of it holds them reeling.',
        damage: 10,
        knockback: 2.2,
        status: { status: 'shock', power: 1, durationTicks: 60 },
      },
    ],
  },
  {
    ability: 'first_light',
    style: 'onehand',
    unlockLevel: 66,
    ranks: [
      { note: 'You arrive harder.', damage: 14 },
      { note: 'The doorway opens farther off.', dashTiles: 9.0, cooldownTicks: 190 },
      { note: 'First light breaks from a shorter gather.', damage: 16, castTicks: 16 },
    ],
  },
  {
    ability: 'headsman_stroke',
    style: 'onehand',
    unlockLevel: 70,
    ranks: [
      { note: 'The arc lands heavier.', damage: 14 },
      { note: 'The stroke returns to the shoulder sooner.', cooldownTicks: 170 },
      { note: 'The verdict widens.', executeBelow: { frac: 0.35, mult: 2.0 } },
    ],
  },
  {
    ability: 'live_iron',
    style: 'onehand',
    unlockLevel: 74,
    ranks: [
      { note: 'The current bites deeper.', damage: 4 },
      { note: 'A fourth throat joins the circuit.', chainTargets: 4 },
      {
        note: 'The charge clings longer, and the iron rests less.',
        cooldownTicks: 230,
        status: { status: 'shock', power: 1, durationTicks: 90 },
      },
    ],
  },
  {
    ability: 'earthbreaker',
    style: 'onehand',
    unlockLevel: 78,
    ranks: [
      { note: 'You land heavier.', damage: 13 },
      { note: 'The leap carries farther; the verdict spreads wider.', dashTiles: 11.0, radius: 2.5 },
      { note: 'The mountain falls oftener, and harder.', cooldownTicks: 190, knockback: 3.0 },
    ],
  },
  {
    ability: 'gloomfall',
    style: 'onehand',
    unlockLevel: 82,
    ranks: [
      { note: 'The dark falls heavier.', damage: 15 },
      {
        note: 'Night spreads wider and drags at more heels.',
        radius: 2.7,
        status: { status: 'chill', power: 1, durationTicks: 80 },
      },
      { note: 'The gloom gathers quicker, and deeper.', damage: 16, castTicks: 22, cooldownTicks: 220 },
    ],
  },
  {
    ability: 'noonfall',
    style: 'onehand',
    unlockLevel: 86,
    ranks: [
      { note: 'The light hammers harder.', damage: 5 },
      { note: 'Noon is sooner recalled.', cooldownTicks: 250 },
      { note: 'The ring widens, and the sun asks less.', radius: 2.5, cooldownTicks: 240 },
    ],
  },
  {
    ability: 'warlords_descent',
    style: 'onehand',
    unlockLevel: 90,
    ranks: [
      { note: 'You land heavier still.', damage: 14 },
      { note: 'The banner spreads wider, oftener.', radius: 2.6, cooldownTicks: 220 },
      {
        note: 'The war answers its lord — shield and stride.',
        knockback: 2.6,
        self: { shieldHp: 8, speedMult: 1.18, durationTicks: 120 },
      },
    ],
  },
  {
    ability: 'tumble_shot',
    style: 'archery',
    unlockLevel: 5,
    ranks: [
      { note: 'The parting arrow means it.', damage: 9 },
      { note: 'A longer roll, ready again sooner.', cooldownTicks: 140, dashTiles: -6.4 },
      { note: 'Two shafts, loosed mid-tumble.', projectiles: 2, spreadArc: 0.1 },
    ],
  },
  {
    ability: 'kingshot',
    style: 'archery',
    unlockLevel: 10,
    ranks: [
      { note: 'The draw grows heavier still.', damage: 18 },
      { note: 'The shaft carries further and faster.', range: 21, projectileSpeed: 24 },
      { note: 'The king takes the whole lane sooner.', damage: 20, cooldownTicks: 180, castTicks: 18 },
    ],
  },
  {
    ability: 'longshot',
    style: 'archery',
    unlockLevel: 15,
    ranks: [
      { note: 'The line lands heavier.', damage: 11 },
      { note: 'The draw comes back to you sooner.', cooldownTicks: 150 },
      { note: 'The line it draws does not bend, or end kindly.', damage: 13 },
    ],
  },
  {
    ability: 'stringsong',
    style: 'archery',
    unlockLevel: 20,
    ranks: [
      { note: 'The note lands harder.', damage: 5 },
      { note: 'The song holds a fourth beat.', channelTicks: 64 },
      { note: 'The arrows learn the tune and follow it home.', cooldownTicks: 150, homing: 5 },
    ],
  },
  {
    ability: 'rain_of_arrows',
    style: 'archery',
    unlockLevel: 25,
    ranks: [
      { note: 'The sky falls harder.', damage: 11 },
      { note: 'A wider patch of ruin, called sooner.', cooldownTicks: 190, radius: 2.4 },
      {
        note: 'Barbed heads — the wounds keep raining.',
        status: { status: 'bleed', power: 1, durationTicks: 60 },
      },
    ],
  },
  {
    ability: 'hawks_hour',
    style: 'archery',
    unlockLevel: 30,
    ranks: [
      { note: 'The stoop strikes deeper.', damage: 17 },
      { note: 'The hour claims a wider field.', radius: 2.6, range: 15 },
      { note: 'What the hawk marks is opened to everyone.', cooldownTicks: 180, status: { status: 'sunder', power: 12, durationTicks: 60 } },
    ],
  },
  {
    ability: 'snare_shot',
    style: 'archery',
    unlockLevel: 35,
    ranks: [
      {
        note: 'The snare waits longer.',
        summon: { kind: 'snare_trap', durationTicks: 700, radius: 1.2, power: 1 },
      },
      { note: 'Another trap rides in the quiver sooner.', cooldownTicks: 220 },
      {
        note: 'It bites colder and reaches wider.',
        summon: { kind: 'snare_trap', durationTicks: 700, radius: 1.6, power: 2 },
      },
    ],
  },
  {
    ability: 'winterflight',
    style: 'archery',
    unlockLevel: 40,
    ranks: [
      { note: 'The wind cuts keener.', damage: 5 },
      { note: 'The cold clings longer and the line runs wider.', width: 0.8, status: { status: 'chill', power: 1, durationTicks: 60 } },
      { note: 'The flight holds a fourth breath.', channelTicks: 64, cooldownTicks: 170 },
    ],
  },
  {
    ability: 'ricochet',
    style: 'archery',
    unlockLevel: 45,
    ranks: [
      { note: 'Each carom means it more.', damage: 9 },
      { note: 'A third change of mind.', chainTargets: 3 },
      { note: 'No wall ends the argument.', damage: 10, cooldownTicks: 150 },
    ],
  },
  {
    ability: 'emberhead',
    style: 'archery',
    unlockLevel: 50,
    ranks: [
      { note: 'The heads burn hotter.', damage: 10 },
      { note: 'The fire keeps its grip longer.', range: 16, status: { status: 'burn', power: 1, durationTicks: 80 } },
      { note: 'The pair loose quicker and land harder.', damage: 11, cooldownTicks: 190, castTicks: 20 },
    ],
  },
  {
    ability: 'twin_strike',
    style: 'archery',
    unlockLevel: 54,
    ranks: [
      { note: 'Heavier shafts.', damage: 11 },
      { note: 'The pair returns to your hand sooner.', cooldownTicks: 170 },
      { note: 'Two arguments, one conclusion — heavier.', damage: 12 },
    ],
  },
  {
    ability: 'skyloom',
    style: 'archery',
    unlockLevel: 58,
    ranks: [
      { note: 'The shuttle strikes harder.', damage: 5 },
      { note: 'The thread reaches further.', range: 14, cooldownTicks: 190 },
      { note: 'The loom takes a third thread.', chainTargets: 3 },
    ],
  },
  {
    ability: 'skyfall_shot',
    style: 'archery',
    unlockLevel: 62,
    ranks: [
      { note: 'It falls heavier.', damage: 14 },
      { note: 'A wider shadow, called sooner.', radius: 2.2, cooldownTicks: 200 },
      {
        note: 'It lands barbed.',
        status: { status: 'bleed', power: 1, durationTicks: 60 },
      },
    ],
  },
  {
    ability: 'gloamshaft',
    style: 'archery',
    unlockLevel: 66,
    ranks: [
      { note: 'The dark line bites deeper.', damage: 21 },
      { note: 'The gloam runs longer and wider.', range: 15, width: 0.75 },
      { note: 'The last light leaves quicker, and harder.', damage: 24, cooldownTicks: 190, castTicks: 20 },
    ],
  },
  {
    ability: 'phantom_flight',
    style: 'archery',
    unlockLevel: 70,
    ranks: [
      { note: 'The ghost cuts deeper.', damage: 10 },
      { note: 'It haunts you oftener.', cooldownTicks: 180 },
      {
        note: 'It comes home red, and leaves red behind.',
        damage: 11,
        status: { status: 'bleed', power: 1, durationTicks: 40 },
      },
    ],
  },
  {
    ability: 'harrier',
    style: 'archery',
    unlockLevel: 74,
    ranks: [
      { note: 'The wing strikes harder.', damage: 4 },
      { note: 'The circuit runs longer and faster.', range: 12, projectileSpeed: 17 },
      { note: 'The wing opens what it passes.', cooldownTicks: 210, status: { status: 'bleed', power: 1, durationTicks: 40 } },
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
        note: 'The schedule tightens, and the caught walk slow.',
        pulseEveryTicks: 13,
        status: { status: 'chill', power: 1, durationTicks: 40 },
      },
    ],
  },
  {
    ability: 'zenith',
    style: 'archery',
    unlockLevel: 82,
    ranks: [
      { note: 'Noon lands heavier.', damage: 17 },
      { note: 'The light claims a wider court.', radius: 2.6 },
      { note: 'The sun stays to see it finished.', damage: 18, cooldownTicks: 210, status: { status: 'burn', power: 1, durationTicks: 80 } },
    ],
  },
  {
    ability: 'crowsong',
    style: 'archery',
    unlockLevel: 86,
    ranks: [
      { note: 'The flock feeds harder.', damage: 4 },
      { note: 'The song calls a wider field.', radius: 2.6 },
      { note: 'The crows remember, and come back hungrier.', cooldownTicks: 220, status: { status: 'bleed', power: 1, durationTicks: 60 } },
    ],
  },
  {
    ability: 'arrow_tempest',
    style: 'archery',
    unlockLevel: 90,
    ranks: [
      { note: 'Each shaft asks for more.', damage: 6 },
      { note: 'The storm gathers again sooner.', cooldownTicks: 220 },
      { note: 'A sixth shaft joins the storm.', projectiles: 6 },
    ],
  },
  {
    ability: 'arc_bolt',
    style: 'arx',
    unlockLevel: 5,
    ranks: [
      { note: 'A hotter crack.', damage: 8 },
      { note: 'The sky reloads faster.', cooldownTicks: 140 },
      {
        note: 'One more throat to leap to, and the charge lingers.',
        chainTargets: 4,
        status: { status: 'shock', power: 1, durationTicks: 90 },
      },
    ],
  },
  {
    ability: 'wickfire',
    style: 'arx',
    unlockLevel: 10,
    ranks: [
      { note: 'The flame flies heavier.', damage: 12 },
      {
        note: 'What it lights stays lit longer.',
        status: { status: 'burn', power: 1, durationTicks: 80 },
      },
      { note: 'The wick takes faster, and the hand learns the toss.', cooldownTicks: 170, castTicks: 16 },
    ],
  },
  {
    ability: 'frost_lance',
    style: 'arx',
    unlockLevel: 15,
    ranks: [
      { note: 'The cold line lands harder.', damage: 10 },
      { note: 'Winter answers sooner.', cooldownTicks: 160 },
      {
        note: 'Winter holds the line.',
        damage: 13,
        status: { status: 'chill', power: 1, durationTicks: 100 },
      },
    ],
  },
  {
    ability: 'rime_river',
    style: 'arx',
    unlockLevel: 20,
    ranks: [
      { note: 'The river runs deeper.', damage: 5 },
      { note: 'The river reaches farther downhill.', range: 12.5 },
      {
        note: 'The cold outstays the pour.',
        cooldownTicks: 180,
        status: { status: 'chill', power: 1, durationTicks: 90 },
      },
    ],
  },
  {
    ability: 'blink',
    style: 'arx',
    unlockLevel: 25,
    ranks: [
      { note: 'A longer stride between places.', dashTiles: 9.2 },
      { note: 'The door opens oftener.', cooldownTicks: 170 },
      { note: 'Distance stops being an argument.', dashTiles: 10.8, cooldownTicks: 150 },
    ],
  },
  {
    ability: 'windshear',
    style: 'arx',
    unlockLevel: 30,
    ranks: [
      { note: 'The gale leans harder.', damage: 13 },
      { note: 'The whole field bows away from you.', radius: 3.0, knockback: 2.6 },
      { note: 'The sky refills sooner.', cooldownTicks: 180, castTicks: 18 },
    ],
  },
  {
    ability: 'ward_shell',
    style: 'arx',
    unlockLevel: 35,
    ranks: [
      { note: 'The shell thickens.', self: { shieldHp: 14, durationTicks: 160 } },
      { note: 'The light gathers again sooner.', cooldownTicks: 280 },
      { note: 'A shell that outlasts the storm.', self: { shieldHp: 18, durationTicks: 200 } },
    ],
  },
  {
    ability: 'stonerise',
    style: 'arx',
    unlockLevel: 40,
    ranks: [
      { note: 'The rows rise sharper.', damage: 5 },
      { note: 'A wider quarry answers.', radius: 2.4 },
      { note: 'The ground stands up angrier, oftener.', cooldownTicks: 200, knockback: 1.6 },
    ],
  },
  {
    ability: 'ember_fan',
    style: 'arx',
    unlockLevel: 45,
    ranks: [
      { note: 'Each finger burns hotter.', damage: 7 },
      { note: 'A fourth finger opens.', projectiles: 4 },
      {
        note: 'Every tongue leaves a lasting hunger.',
        status: { status: 'burn', power: 2, durationTicks: 60 },
      },
    ],
  },
  {
    ability: 'geyser',
    style: 'arx',
    unlockLevel: 50,
    ranks: [
      { note: 'The deep water rises harder.', damage: 14 },
      { note: 'The well mouth widens.', radius: 2.4, knockback: 2.2 },
      { note: 'The deep answers the first knock.', cooldownTicks: 200, castTicks: 20 },
    ],
  },
  {
    ability: 'meteor_shard',
    style: 'arx',
    unlockLevel: 54,
    ranks: [
      { note: 'A heavier shard.', damage: 15 },
      { note: 'The burn spreads wider.', radius: 2.6 },
      {
        note: 'It keeps burning after it lands.',
        status: { status: 'burn', power: 2, durationTicks: 60 },
      },
    ],
  },
  {
    ability: 'anvil_sky',
    style: 'arx',
    unlockLevel: 58,
    ranks: [
      { note: 'The hammer falls heavier.', damage: 4 },
      { note: 'The anvil widens.', radius: 2.8 },
      {
        note: 'The forge keeps longer hours, and the charge clings.',
        cooldownTicks: 220,
        status: { status: 'shock', power: 1, durationTicks: 80 },
      },
    ],
  },
  {
    ability: 'stormcall',
    style: 'arx',
    unlockLevel: 62,
    ranks: [
      { note: 'Each strike asks for more.', damage: 6 },
      { note: 'The appointment runs long, and wide.', radius: 2.6, fieldTicks: 120 },
      { note: 'The sky keeps the appointment.', cooldownTicks: 220 },
    ],
  },
  {
    ability: 'hollowcall',
    style: 'arx',
    unlockLevel: 66,
    ranks: [
      { note: 'The nothing bites deeper.', damage: 14 },
      { note: 'The invitation reaches farther.', radius: 2.6, knockback: -2.4 },
      { note: 'The hollow opens quicker, and closes on more.', cooldownTicks: 210, castTicks: 22, damage: 15 },
    ],
  },
  {
    ability: 'mirror_image',
    style: 'arx',
    unlockLevel: 70,
    ranks: [
      {
        note: 'The lie stands longer.',
        summon: { kind: 'decoy', durationTicks: 220, radius: 5, power: 0 },
      },
      { note: 'You can step aside oftener.', cooldownTicks: 280 },
      {
        note: 'The double walks farther from the truth.',
        summon: { kind: 'decoy', durationTicks: 260, radius: 7, power: 0 },
      },
    ],
  },
  {
    ability: 'burning_glass',
    style: 'arx',
    unlockLevel: 74,
    ranks: [
      { note: 'The line burns finer and hotter.', damage: 5 },
      {
        note: 'What it crosses keeps smoldering.',
        status: { status: 'burn', power: 1, durationTicks: 60 },
      },
      { note: 'The lens steadies sooner.', cooldownTicks: 200 },
    ],
  },
  {
    ability: 'maelstrom',
    style: 'arx',
    unlockLevel: 78,
    ranks: [
      { note: 'The drain pulls a deeper draught.', damage: 4 },
      { note: 'The eye widens.', radius: 3.0 },
      {
        note: 'The drain pulls the whole sea, and nothing swims out.',
        damage: 5,
        knockback: -2.6,
        status: { status: 'chill', power: 1, durationTicks: 100 },
      },
    ],
  },
  {
    ability: 'moonrise',
    style: 'arx',
    unlockLevel: 82,
    ranks: [
      { note: 'A heavier moon.', damage: 15 },
      {
        note: 'The silver reaches farther, and the slow runs longer.',
        radius: 2.8,
        status: { status: 'chill', power: 1, durationTicks: 80 },
      },
      { note: 'The moon answers the first call.', cooldownTicks: 220, castTicks: 24 },
    ],
  },
  {
    ability: 'cometfall',
    style: 'arx',
    unlockLevel: 86,
    ranks: [
      { note: 'Heavier stones from farther away.', damage: 5 },
      { note: 'The sky opens wider.', radius: 2.6 },
      { note: 'The visitors arrive closer together.', cooldownTicks: 240, pulseEveryTicks: 14 },
    ],
  },
  {
    ability: 'daybreak',
    style: 'arx',
    unlockLevel: 90,
    ranks: [
      { note: 'Noon weighs more.', damage: 17 },
      { note: 'A wider noon, delivered oftener.', radius: 2.8, cooldownTicks: 260 },
      {
        note: 'Noon arrives where you point, and stays to burn.',
        damage: 20,
        status: { status: 'burn', power: 1, durationTicks: 80 },
      },
    ],
  },
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

  // --------------------------- THE SHIELD SKILL — the wall's rungs
  {
    ability: 'shield_bash',
    style: 'shield',
    unlockLevel: 5,
    ranks: [
      { note: 'The face lands heavier.', damage: 11 },
      { note: 'The jolt of it holds them a beat longer.', status: { status: 'shock', power: 1, durationTicks: 45 } },
      { note: 'The wall swings last — and once.', damage: 12, knockback: 2.6 },
    ],
  },
  {
    ability: 'iron_toll',
    style: 'shield',
    unlockLevel: 10,
    ranks: [
      { note: 'The bell rings harder.', damage: 11 },
      { note: 'The toll carries further, and throws.', radius: 2.6, knockback: 1.4 },
      { note: 'The bell answers sooner, and the ring holds.', damage: 12, cooldownTicks: 170, castTicks: 18, status: { status: 'shock', power: 1, durationTicks: 40 } },
    ],
  },
  {
    ability: 'set_the_wall',
    style: 'shield',
    unlockLevel: 15,
    ranks: [
      { note: 'The stance sets deeper.', self: { armor: 11, durationTicks: 160 } },
      { note: 'A skin of iron over the iron.', self: { armor: 11, shieldHp: 6, durationTicks: 160 } },
      { note: 'While the wall stands, so do you.', self: { armor: 14, shieldHp: 8, durationTicks: 180 } },
    ],
  },
  {
    ability: 'grindstone',
    style: 'shield',
    unlockLevel: 20,
    ranks: [
      { note: 'The rim grinds harder.', damage: 5 },
      { note: 'The stone turns a fourth time.', channelTicks: 64 },
      { note: 'The curls come off deeper.', cooldownTicks: 190, status: { status: 'sunder', power: 15, durationTicks: 60 } },
    ],
  },
  {
    ability: 'shield_rush',
    style: 'shield',
    unlockLevel: 25,
    ranks: [
      { note: 'The drive hits harder.', damage: 10 },
      { note: 'A longer road, sooner open.', dashTiles: 8.8, cooldownTicks: 170 },
      { note: 'They stagger cold from your road.', knockback: 3.4, status: { status: 'chill', power: 1, durationTicks: 40 } },
    ],
  },
  {
    ability: 'doorfall',
    style: 'shield',
    unlockLevel: 30,
    ranks: [
      { note: 'The door lands heavier.', damage: 14 },
      { note: 'The frame is wider than they thought.', radius: 2.3, knockback: 1.8 },
      { note: 'The hinge learns to swing again sooner.', damage: 15, cooldownTicks: 190, castTicks: 20 },
    ],
  },
  {
    ability: 'draw_iron',
    style: 'shield',
    unlockLevel: 35,
    ranks: [
      { note: 'The shout carries farther.', radius: 4.0, tauntRadius: 4.0, cooldownTicks: 300 },
      { note: 'Iron answers those who answer.', radius: 4.0, tauntRadius: 4.0, cooldownTicks: 300, self: { armor: 6, durationTicks: 80 } },
      { note: 'The whole yard hears its name.', radius: 5.0, tauntRadius: 5.0, cooldownTicks: 300, self: { armor: 8, durationTicks: 100 } },
    ],
  },
  {
    ability: 'held_gate',
    style: 'shield',
    unlockLevel: 40,
    ranks: [
      { note: 'The gate bites colder.', damage: 5 },
      { note: 'The cold holds them longer and the line runs wider.', width: 0.9, status: { status: 'chill', power: 1, durationTicks: 60 } },
      { note: 'The gate holds a fourth breath.', channelTicks: 64, cooldownTicks: 180 },
    ],
  },
  {
    ability: 'shield_roof',
    style: 'shield',
    unlockLevel: 45,
    ranks: [
      { note: 'The roof bears more weather.', self: { shieldHp: 22, speedMult: 0.85, durationTicks: 160 } },
      { note: 'The weight learns your shoulders.', self: { shieldHp: 22, speedMult: 0.95, durationTicks: 160 } },
      { note: 'Let it rain.', self: { shieldHp: 30, speedMult: 0.95, durationTicks: 180 } },
    ],
  },
  {
    ability: 'sunbrass',
    style: 'shield',
    unlockLevel: 50,
    ranks: [
      { note: 'The brass burns brighter.', damage: 11 },
      { note: 'Noon reaches the whole yard.', radius: 2.9, status: { status: 'burn', power: 1, durationTicks: 60 } },
      { note: 'The sun comes back around sooner.', damage: 12, cooldownTicks: 210 },
    ],
  },
  {
    ability: 'turned_blow',
    style: 'shield',
    unlockLevel: 54,
    ranks: [
      { note: 'More of the blow goes home.', self: { reflectFrac: 0.45, durationTicks: 120 } },
      { note: 'The angle hardens the arm that holds it.', self: { reflectFrac: 0.45, armor: 4, durationTicks: 120 } },
      { note: 'The wall keeps nothing that was sent to it.', self: { reflectFrac: 0.6, armor: 4, durationTicks: 140 } },
    ],
  },
  {
    ability: 'millwall',
    style: 'shield',
    unlockLevel: 58,
    ranks: [
      { note: 'The wheel strikes harder.', damage: 5 },
      { note: 'The wall turns wider.', radius: 2.4 },
      { note: 'The water is thrown well back.', knockback: 1.2, cooldownTicks: 230 },
    ],
  },
  {
    ability: 'rampart_break',
    style: 'shield',
    unlockLevel: 62,
    ranks: [
      { note: 'The rim bites deeper ground.', damage: 15 },
      { note: 'The break spreads wider, oftener.', radius: 2.6, cooldownTicks: 200 },
      { note: 'The yard breaks with them.', damage: 16, knockback: 2.4 },
    ],
  },
  {
    ability: 'anchorfall',
    style: 'shield',
    unlockLevel: 66,
    ranks: [
      { note: 'The anchor lands heavier.', damage: 13 },
      { note: 'The parted sea reaches further, colder.', radius: 2.6, status: { status: 'chill', power: 1, durationTicks: 70 } },
      { note: 'The anchor is raised again sooner.', damage: 14, cooldownTicks: 230 },
    ],
  },
  {
    ability: 'wheel_of_iron',
    style: 'shield',
    unlockLevel: 70,
    ranks: [
      { note: 'The wheel spins heavier.', damage: 11 },
      { note: 'A longer arc out, a shorter wait after.', range: 11, cooldownTicks: 190 },
      { note: 'The rim rings them senseless.', knockback: 2.2, status: { status: 'shock', power: 1, durationTicks: 30 } },
    ],
  },
  {
    ability: 'patient_wall',
    style: 'shield',
    unlockLevel: 74,
    ranks: [
      { note: 'The advance lands heavier.', damage: 5 },
      { note: 'The wall reaches wider.', arc: 1.7 },
      { note: 'Patience moves them after all.', knockback: 0.9, cooldownTicks: 210 },
    ],
  },
  {
    ability: 'hold_the_line',
    style: 'shield',
    unlockLevel: 78,
    ranks: [
      { note: 'The line argues harder.', damage: 6 },
      { note: 'The ground holds it longer.', fieldTicks: 180 },
      { note: 'This far. The ground itself agrees.', damage: 7, radius: 2.8, status: { status: 'chill', power: 1, durationTicks: 40 } },
    ],
  },
  {
    ability: 'standing_sun',
    style: 'shield',
    unlockLevel: 82,
    ranks: [
      { note: 'The standard burns brighter.', damage: 15 },
      { note: 'The day holds a wider ground.', radius: 2.8 },
      { note: 'The light is planted quicker.', damage: 16, cooldownTicks: 220, castTicks: 24 },
    ],
  },
  {
    ability: 'winterhold',
    style: 'shield',
    unlockLevel: 86,
    ranks: [
      { note: 'The keep bites colder.', damage: 5 },
      { note: 'The court freezes wider.', radius: 2.7 },
      { note: 'Winter keeps them longer.', cooldownTicks: 250, status: { status: 'chill', power: 1, durationTicks: 80 } },
    ],
  },
  {
    ability: 'unbroken',
    style: 'shield',
    unlockLevel: 90,
    ranks: [
      { note: 'The stand holds more.', self: { armor: 14, shieldHp: 26, reflectFrac: 0.45, durationTicks: 160 } },
      { note: 'The stand knits the arm that keeps it.', self: { armor: 14, shieldHp: 26, reflectFrac: 0.45, heal: 6, durationTicks: 160 } },
      { note: 'Unbroken keeps its word.', self: { armor: 16, shieldHp: 32, reflectFrac: 0.5, heal: 10, durationTicks: 180 } },
    ],
  },

  // -------------------------- THE GREAT SCHOOL — the colossus's rungs
  {
    ability: 'wide_swath',
    style: 'twohand',
    unlockLevel: 5,
    ranks: [
      { note: 'The stroke lands heavier.', damage: 12 },
      { note: 'A wider horizon, a shorter wait.', arc: 2.8, cooldownTicks: 160 },
      { note: 'The front rank leaves the field.', damage: 14, cooldownTicks: 155, knockback: 1.8 },
    ],
  },
  {
    ability: 'fell_timber',
    style: 'twohand',
    unlockLevel: 10,
    ranks: [
      { note: 'The timber lands heavier.', damage: 14 },
      { note: 'The splinters draw blood.', status: { status: 'bleed', power: 1, durationTicks: 60 } },
      { note: 'The axe is loose again sooner, and throws.', damage: 15, knockback: 1.8, cooldownTicks: 170, castTicks: 18 },
    ],
  },
  {
    ability: 'haft_check',
    style: 'twohand',
    unlockLevel: 15,
    ranks: [
      { note: 'The shove learns its manners last.', knockback: 3.0 },
      { note: 'The jolt holds them a beat longer.', status: { status: 'shock', power: 1, durationTicks: 50 } },
      { note: 'Room enough for the whole next swing.', knockback: 3.4, status: { status: 'shock', power: 1, durationTicks: 60 } },
    ],
  },
  {
    ability: 'quarry_work',
    style: 'twohand',
    unlockLevel: 20,
    ranks: [
      { note: 'The seam splits deeper.', damage: 6 },
      { note: 'The quarry takes a fourth swing.', channelTicks: 64 },
      { note: 'The stone comes apart at the grain.', status: { status: 'sunder', power: 14, durationTicks: 60 } },
    ],
  },
  {
    ability: 'iron_pendulum',
    style: 'twohand',
    unlockLevel: 25,
    ranks: [
      { note: 'The pendulum swings heavier.', damage: 10 },
      { note: 'The second swing comes sooner.', pulseEveryTicks: 6, cooldownTicks: 190 },
      { note: 'Back and forth until the yard is quiet.', damage: 11, knockback: 1.4 },
    ],
  },
  {
    ability: 'forgefall',
    style: 'twohand',
    unlockLevel: 30,
    ranks: [
      { note: 'The hammer lands heavier.', damage: 14 },
      { note: 'The glow spreads further, and lingers.', radius: 2.6, status: { status: 'burn', power: 1, durationTicks: 60 } },
      { note: 'The forge fires again sooner.', damage: 15, cooldownTicks: 230 },
    ],
  },
  {
    ability: 'fault_line',
    style: 'twohand',
    unlockLevel: 35,
    ranks: [
      { note: 'The ground breaks deeper.', damage: 15 },
      { note: 'The crack runs wider.', radius: 2.4, cooldownTicks: 200 },
      { note: 'Nobody keeps their feet on a fault.', damage: 16, knockback: 1.8 },
    ],
  },
  {
    ability: 'wheelbreaker',
    style: 'twohand',
    unlockLevel: 40,
    ranks: [
      { note: 'The ram drives harder.', damage: 6 },
      { note: 'The lane holds a fourth breath.', channelTicks: 64 },
      { note: 'The wheels break the further way back.', knockback: 0.9, status: { status: 'shock', power: 1, durationTicks: 40 } },
    ],
  },
  {
    ability: 'colossus_stance',
    style: 'twohand',
    unlockLevel: 45,
    ranks: [
      { note: 'The wounds you leave open wider.', self: { speedMult: 1.1, onHitStatus: { status: 'bleed', power: 2, durationTicks: 60 }, durationTicks: 160 } },
      { note: 'The stride lengthens with the temper.', self: { speedMult: 1.18, onHitStatus: { status: 'bleed', power: 2, durationTicks: 60 }, durationTicks: 160 } },
      { note: 'Too big to argue with. Most stop trying.', self: { speedMult: 1.18, onHitStatus: { status: 'bleed', power: 2, durationTicks: 80 }, durationTicks: 200 } },
    ],
  },
  {
    ability: 'gravedigger',
    style: 'twohand',
    unlockLevel: 50,
    ranks: [
      { note: 'The grave takes more.', damage: 16 },
      { note: 'The pull deepens and the pit widens.', radius: 2.4, knockback: -1.4 },
      { note: 'The digging is quicker now.', damage: 18, cooldownTicks: 220 },
    ],
  },
  {
    ability: 'skysunder',
    style: 'twohand',
    unlockLevel: 54,
    ranks: [
      { note: 'The verdict lands heavier.', damage: 17 },
      { note: 'A longer leap, a shorter wait.', dashTiles: 12.0, cooldownTicks: 240 },
      { note: 'The landing empties its own crater.', damage: 18, radius: 2.6, knockback: 2.2 },
    ],
  },
  {
    ability: 'ore_song',
    style: 'twohand',
    unlockLevel: 58,
    ranks: [
      { note: 'The song strikes harder.', damage: 6 },
      { note: 'The ring carries wider.', radius: 2.7 },
      { note: 'The seam sings back sooner.', cooldownTicks: 250 },
    ],
  },
  {
    ability: 'executioners_arc',
    style: 'twohand',
    unlockLevel: 62,
    ranks: [
      { note: 'The stroke bites deeper.', damage: 14 },
      { note: 'It reads the sentence earlier.', executeBelow: { frac: 0.4, mult: 2.0 } },
      { note: 'Sentences end mid-word.', damage: 15, executeBelow: { frac: 0.4, mult: 2.4 } },
    ],
  },
  {
    ability: 'skyweight',
    style: 'twohand',
    unlockLevel: 66,
    ranks: [
      { note: 'The sky lands heavier.', damage: 10 },
      { note: 'The weight falls a third time.', pulses: 3 },
      { note: 'The whole horizon comes down.', radius: 2.6, cooldownTicks: 245 },
    ],
  },
  {
    ability: 'avalanche',
    style: 'twohand',
    unlockLevel: 70,
    ranks: [
      { note: 'Every blow falls heavier.', damage: 9 },
      { note: 'The slide starts sooner, ends sooner.', pulseEveryTicks: 7, cooldownTicks: 240 },
      { note: 'The mountain finishes what it starts.', damage: 10, knockback: 1.6 },
    ],
  },
  {
    ability: 'long_lever',
    style: 'twohand',
    unlockLevel: 74,
    ranks: [
      { note: 'The lever bears harder.', damage: 5 },
      { note: 'The reach runs longer and wider.', range: 10, width: 0.9 },
      { note: 'The world moves after all.', knockback: 0.9, cooldownTicks: 200 },
    ],
  },
  {
    ability: 'breaker_charge',
    style: 'twohand',
    unlockLevel: 78,
    ranks: [
      { note: 'The shoulder hits harder.', damage: 15 },
      { note: 'A longer road, sooner open.', dashTiles: 10.0, cooldownTicks: 200 },
      { note: 'Through is the only direction left.', damage: 16, knockback: 3.2 },
    ],
  },
  {
    ability: 'sunhammer',
    style: 'twohand',
    unlockLevel: 82,
    ranks: [
      { note: 'The noon swings heavier.', damage: 16 },
      { note: 'The arc takes the whole sky.', arc: 2, knockback: 1.5 },
      { note: 'The heat stays in the iron.', damage: 17, cooldownTicks: 220, status: { status: 'burn', power: 2, durationTicks: 60 } },
    ],
  },
  {
    ability: 'worlds_rim',
    style: 'twohand',
    unlockLevel: 86,
    ranks: [
      { note: 'The rim grinds deeper.', damage: 5 },
      { note: 'The far edge reaches wider.', radius: 2.7 },
      { note: 'The cold of the rim settles in.', cooldownTicks: 240, status: { status: 'chill', power: 1, durationTicks: 70 } },
    ],
  },
  {
    ability: 'titans_verdict',
    style: 'twohand',
    unlockLevel: 90,
    ranks: [
      { note: 'The rings strike heavier.', damage: 11 },
      { note: 'The rings come quicker, and shove.', damage: 11, radius: 2.7, pulseEveryTicks: 9, knockback: 2.0 },
      { note: 'The verdict stands. The earth signs it.', damage: 12, radius: 3.0, pulseEveryTicks: 9, knockback: 2.4 },
    ],
  },

  // --------------------------- THE TWIN SCHOOL — the paired rungs
  {
    ability: 'twin_cut',
    style: 'dualwield',
    unlockLevel: 5,
    ranks: [
      { note: 'Both hands land heavier.', damage: 9 },
      { note: 'The sentence repeats sooner.', cooldownTicks: 140 },
      { note: 'The pair leaves crossed wounds.', status: { status: 'bleed', power: 1, durationTicks: 40 } },
    ],
  },
  {
    ability: 'two_bells',
    style: 'dualwield',
    unlockLevel: 10,
    ranks: [
      { note: 'The bells ring harder.', damage: 12 },
      { note: 'The peal carries wider, and holds.', arc: 1.2, status: { status: 'shock', power: 1, durationTicks: 45 } },
      { note: 'The carillon answers at once.', damage: 14, cooldownTicks: 140, castTicks: 16 },
    ],
  },
  {
    ability: 'heron_step',
    style: 'dualwield',
    unlockLevel: 15,
    ranks: [
      { note: 'The pass cuts deeper.', damage: 11 },
      { note: 'A longer stride through them.', dashTiles: 8.4, cooldownTicks: 160 },
      { note: 'Both edges collect on the way past.', damage: 12, status: { status: 'bleed', power: 2, durationTicks: 50 } },
    ],
  },
  {
    ability: 'ribbonwork',
    style: 'dualwield',
    unlockLevel: 20,
    ranks: [
      { note: 'The ribbons cut deeper.', damage: 6 },
      { note: 'The crossing takes a fourth pass.', channelTicks: 64 },
      { note: 'The red runs freely now.', cooldownTicks: 200, status: { status: 'bleed', power: 1, durationTicks: 60 } },
    ],
  },
  {
    ability: 'crossed_throw',
    style: 'dualwield',
    unlockLevel: 25,
    ranks: [
      { note: 'Each knife argues harder.', damage: 7 },
      { note: 'Thrown oftener, bitten deeper.', damage: 8, cooldownTicks: 150 },
      { note: 'They remember your hands, and come home.', returns: true, cooldownTicks: 170 },
    ],
  },
  {
    ability: 'twin_moons',
    style: 'dualwield',
    unlockLevel: 30,
    ranks: [
      { note: 'The moons strike harder.', damage: 7 },
      { note: 'The orbit runs longer and faster.', range: 11, projectileSpeed: 18 },
      { note: 'Both moons come home full.', damage: 9, cooldownTicks: 190 },
    ],
  },
  {
    ability: 'mirrored_hand',
    style: 'dualwield',
    unlockLevel: 35,
    ranks: [
      { note: 'The mirror holds longer.', self: { offhandWeight: 0.75, durationTicks: 200 } },
      { note: 'The reflection sharpens.', self: { offhandWeight: 0.9, durationTicks: 200 } },
      { note: 'For a while, the two hands are one.', self: { offhandWeight: 1.0, durationTicks: 220 } },
    ],
  },
  {
    ability: 'silver_reel',
    style: 'dualwield',
    unlockLevel: 40,
    ranks: [
      { note: 'The reel cuts harder.', damage: 6 },
      { note: 'The reel winds a fourth turn.', channelTicks: 64 },
      { note: 'The circle widens, and the cold keeps.', radius: 2.2, cooldownTicks: 220, status: { status: 'chill', power: 1, durationTicks: 60 } },
    ],
  },
  {
    ability: 'turning_reel',
    style: 'dualwield',
    unlockLevel: 45,
    ranks: [
      { note: 'The turn cuts deeper.', damage: 12 },
      { note: 'A wider round, called oftener.', radius: 2.5, cooldownTicks: 150 },
      { note: 'The reel rings them where they stand.', damage: 13, status: { status: 'shock', power: 1, durationTicks: 30 } },
    ],
  },
  {
    ability: 'matched_flame',
    style: 'dualwield',
    unlockLevel: 50,
    ranks: [
      { note: 'The flames strike harder.', damage: 7 },
      { note: 'The burning lingers and the reach grows.', range: 2.3, status: { status: 'burn', power: 1, durationTicks: 50 } },
      { note: 'A fourth strike joins the burst.', hits: 4, cooldownTicks: 200 },
    ],
  },
  {
    ability: 'red_ribbons',
    style: 'dualwield',
    unlockLevel: 54,
    ranks: [
      {
        note: 'The ribbons run redder.',
        self: { speedMult: 1.08, onHitStatus: { status: 'bleed', power: 2, durationTicks: 60 }, durationTicks: 160 },
      },
      {
        note: 'The weave quickens.',
        self: { speedMult: 1.12, onHitStatus: { status: 'bleed', power: 2, durationTicks: 60 }, durationTicks: 180 },
      },
      {
        note: 'Dance long enough and they wear the whole spool.',
        self: { speedMult: 1.12, onHitStatus: { status: 'bleed', power: 2, durationTicks: 80 }, durationTicks: 200 },
      },
    ],
  },
  {
    ability: 'stormstitch',
    style: 'dualwield',
    unlockLevel: 58,
    ranks: [
      { note: 'The seam strikes harder.', damage: 6 },
      { note: 'The stitch holds them longer.', status: { status: 'shock', power: 1, durationTicks: 40 } },
      { note: 'The seam takes a third foe.', chainTargets: 3 },
    ],
  },
  {
    ability: 'swallows_dive',
    style: 'dualwield',
    unlockLevel: 62,
    ranks: [
      { note: 'The landing bites deeper.', damage: 14 },
      { note: 'A longer flight, a shorter wait.', dashTiles: 11.0, cooldownTicks: 210 },
      { note: 'The landing scatters the ring they made.', damage: 16, radius: 2.1, knockback: 1.8 },
    ],
  },
  {
    ability: 'mirrorfall',
    style: 'dualwield',
    unlockLevel: 66,
    ranks: [
      { note: 'The landing strikes harder.', damage: 13 },
      { note: 'The mirror spreads wider, colder.', radius: 2.2, status: { status: 'chill', power: 1, durationTicks: 50 } },
      { note: 'Both of you fall again sooner.', damage: 15, cooldownTicks: 210 },
    ],
  },
  {
    ability: 'the_shears',
    style: 'dualwield',
    unlockLevel: 70,
    ranks: [
      { note: 'The blades close harder.', damage: 13 },
      { note: 'They read the thread earlier.', executeBelow: { frac: 0.35, mult: 2.2 }, cooldownTicks: 190 },
      { note: 'Most things were thread all along.', damage: 14, executeBelow: { frac: 0.35, mult: 2.6 } },
    ],
  },
  {
    ability: 'the_weave',
    style: 'dualwield',
    unlockLevel: 74,
    ranks: [
      { note: 'The threads pull tighter.', damage: 6 },
      { note: 'The loom reaches wider.', arc: 1.6, range: 2.4 },
      { note: 'The weft runs red.', cooldownTicks: 190, status: { status: 'bleed', power: 1, durationTicks: 40 } },
    ],
  },
  {
    ability: 'storm_of_two',
    style: 'dualwield',
    unlockLevel: 78,
    ranks: [
      { note: 'Each ring lands heavier.', damage: 7 },
      { note: 'A fourth ring joins the round.', pulses: 4, cooldownTicks: 260 },
      { note: 'The storm widens its round.', damage: 8, radius: 2.1 },
    ],
  },
  {
    ability: 'first_and_last',
    style: 'dualwield',
    unlockLevel: 82,
    ranks: [
      { note: 'The first cut opens wider.', damage: 14 },
      { note: 'The door closes harder on the failing.', executeBelow: { frac: 0.35, mult: 2.2 } },
      { note: 'First and last arrive together.', damage: 15, cooldownTicks: 180, castTicks: 22 },
    ],
  },
  {
    ability: 'hummingbird',
    style: 'dualwield',
    unlockLevel: 86,
    ranks: [
      { note: 'The visits land harder.', damage: 4 },
      { note: 'The flower is further than it looks.', range: 10, projectileSpeed: 18 },
      { note: 'A third wing joins the blur.', projectiles: 3 },
    ],
  },
  {
    ability: 'hundred_hands',
    style: 'dualwield',
    unlockLevel: 90,
    ranks: [
      { note: 'Every hand hits harder.', damage: 6 },
      { note: 'The breath shortens.', cooldownTicks: 280, pulseEveryTicks: 4 },
      { note: 'A sixth hand joins the count.', hits: 6 },
    ],
  },

  // --------------------- THE VETERAN'S SCHOOL — the combat ladder
  {
    ability: 'first_blood',
    style: 'combat',
    unlockLevel: 5,
    ranks: [
      { note: 'The first one lands harder.', damage: 10 },
      {
        note: 'The wound stays open longer.',
        damage: 11,
        status: { status: 'bleed', power: 1, durationTicks: 70 },
      },
      {
        note: 'First blood wakes your feet.',
        damage: 12,
        status: { status: 'bleed', power: 1, durationTicks: 70 },
        self: { speedMult: 1.06, durationTicks: 60 },
      },
    ],
  },
  {
    ability: 'measured_blow',
    style: 'combat',
    unlockLevel: 10,
    ranks: [
      { note: 'The measure lands heavier.', damage: 13 },
      { note: 'The seam is read before the strike.', status: { status: 'sunder', power: 12, durationTicks: 60 } },
      { note: 'Measured once now. Landed just the same.', damage: 14, cooldownTicks: 150, castTicks: 16 },
    ],
  },
  {
    ability: 'shoulder_check',
    style: 'combat',
    unlockLevel: 15,
    ranks: [
      { note: 'More weight behind the shoulder.', damage: 11 },
      { note: 'A longer run at them.', damage: 12, dashTiles: 7.2 },
      {
        note: 'They stop being where they stood.',
        damage: 13,
        dashTiles: 7.2,
        knockback: 2.0,
        status: { status: 'shock', power: 1, durationTicks: 40 },
      },
    ],
  },
  {
    ability: 'drumbeat',
    style: 'combat',
    unlockLevel: 20,
    ranks: [
      { note: 'The drum strikes harder.', damage: 6 },
      { note: 'The cadence holds a fourth bar.', channelTicks: 64 },
      { note: 'The line is driven back to the beat.', radius: 2.3, knockback: 0.9 },
    ],
  },
  {
    ability: 'war_shout',
    style: 'combat',
    unlockLevel: 25,
    ranks: [
      { note: 'Louder, and it hurts more.', damage: 11 },
      { note: 'The yard hears it further out.', damage: 11, radius: 2.7 },
      {
        note: 'The shout holds them a beat longer.',
        damage: 12,
        radius: 2.7,
        status: { status: 'shock', power: 1, durationTicks: 40 },
      },
    ],
  },
  {
    ability: 'thrown_iron',
    style: 'combat',
    unlockLevel: 30,
    ranks: [
      { note: 'The iron lands harder.', damage: 13 },
      { note: 'The throw carries further.', range: 11, projectileSpeed: 16 },
      { note: 'Both hands throw now.', projectiles: 2, spreadArc: 0.15, cooldownTicks: 160, castTicks: 18 },
    ],
  },
  {
    ability: 'second_breath',
    style: 'combat',
    unlockLevel: 35,
    ranks: [
      { note: 'A deeper pull of air.', self: { heal: 14, speedMult: 1.1, durationTicks: 100 } },
      { note: 'The legs get their share.', self: { heal: 16, speedMult: 1.12, durationTicks: 100 } },
      {
        note: 'The breath steadies the arm too.',
        self: { heal: 18, speedMult: 1.12, armor: 2, durationTicks: 120 },
      },
    ],
  },
  {
    ability: 'ironbreath',
    style: 'combat',
    unlockLevel: 40,
    ranks: [
      { note: 'The breath bites colder.', damage: 6 },
      { note: 'The cold keeps them longer and the lane runs wider.', width: 0.8, status: { status: 'chill', power: 1, durationTicks: 60 } },
      { note: 'The exhale holds a fourth count.', channelTicks: 64, cooldownTicks: 200 },
    ],
  },
  {
    ability: 'loose_iron',
    style: 'combat',
    unlockLevel: 45,
    ranks: [
      { note: 'Heavier iron in the hand.', damage: 6 },
      { note: 'A fourth thing finds your fingers.', projectiles: 4 },
      {
        note: 'Rough edges. Everything you throw bites.',
        status: { status: 'bleed', power: 1, durationTicks: 42 },
      },
    ],
  },
  {
    ability: 'fifth_road',
    style: 'combat',
    unlockLevel: 50,
    ranks: [
      { note: 'The road hits harder.', damage: 14 },
      { note: 'The fifth road runs further.', dashTiles: 11.0 },
      { note: 'The toll is taken quicker.', damage: 15, cooldownTicks: 200 },
    ],
  },
  {
    ability: 'hold_fast',
    style: 'combat',
    unlockLevel: 54,
    ranks: [
      { note: 'The stance sets deeper.', self: { armor: 5, shieldHp: 10, durationTicks: 140 } },
      { note: 'Held longer.', self: { armor: 5, shieldHp: 12, durationTicks: 160 } },
      {
        note: 'What breaks on you, breaks back.',
        self: { armor: 6, shieldHp: 14, reflectFrac: 0.1, durationTicks: 160 },
      },
    ],
  },
  {
    ability: 'old_thunder',
    style: 'combat',
    unlockLevel: 58,
    ranks: [
      { note: 'The thunder lands harder.', damage: 5 },
      { note: 'The storm reaches wider, and holds.', arc: 1.5, status: { status: 'shock', power: 1, durationTicks: 40 } },
      { note: 'The old storm comes back sooner.', cooldownTicks: 190 },
    ],
  },
  {
    ability: 'break_the_line',
    style: 'combat',
    unlockLevel: 62,
    ranks: [
      { note: 'More of you arrives at once.', damage: 15 },
      { note: 'The line bends further back.', damage: 16, knockback: 2.2 },
      {
        note: 'Broken lines stay broken a while.',
        damage: 18,
        knockback: 2.2,
        status: { status: 'chill', power: 1, durationTicks: 40 },
      },
    ],
  },
  {
    ability: 'gathered_breath',
    style: 'combat',
    unlockLevel: 66,
    ranks: [
      { note: 'The breath lands heavier.', damage: 14 },
      { note: 'The burst takes the whole square.', radius: 2.9, knockback: 1.3 },
      { note: 'Gathered quicker. Loosed just as whole.', damage: 15, cooldownTicks: 190, castTicks: 22 },
    ],
  },
  {
    ability: 'the_opening',
    style: 'combat',
    unlockLevel: 70,
    ranks: [
      { note: 'The answer arrives heavier.', damage: 15 },
      { note: 'Sharper eyes, sharper price.', damage: 16 },
      { note: 'A failing guard is an open door.', damage: 16, executeBelow: { frac: 0.3, mult: 2.3 } },
    ],
  },
  {
    ability: 'long_watch',
    style: 'combat',
    unlockLevel: 74,
    ranks: [
      { note: 'The watch strikes harder.', damage: 5 },
      { note: 'The ground covered grows.', radius: 2.5 },
      { note: 'The cold certainty settles on them.', cooldownTicks: 230, status: { status: 'chill', power: 1, durationTicks: 50 } },
    ],
  },
  {
    ability: 'no_quarter',
    style: 'combat',
    unlockLevel: 78,
    ranks: [
      { note: 'You keep more of what you take.', drainFrac: 0.3 },
      { note: 'Each refusal lands harder.', damage: 6, drainFrac: 0.3 },
      { note: 'The fight feeds you as fast as it costs them.', damage: 6, drainFrac: 0.4 },
    ],
  },
  {
    ability: 'scarworn',
    style: 'combat',
    unlockLevel: 82,
    ranks: [
      { note: 'The receipts collect deeper.', damage: 15 },
      { note: 'The taking is thorough.', drainFrac: 0.3 },
      { note: 'The scars answer at once.', damage: 16, cooldownTicks: 180, castTicks: 22 },
    ],
  },
  {
    ability: 'last_lesson',
    style: 'combat',
    unlockLevel: 86,
    ranks: [
      { note: 'The lesson lands harder.', damage: 5 },
      { note: 'The stunned silence holds the room.', status: { status: 'shock', power: 1, durationTicks: 30 } },
      { note: 'A third student is called on.', chainTargets: 3 },
    ],
  },
  {
    ability: 'the_long_fight',
    style: 'combat',
    unlockLevel: 90,
    ranks: [
      { note: 'Each wave lands heavier.', damage: 8 },
      { note: 'The fight widens around you.', damage: 8, radius: 2.4 },
      { note: 'It ends the way it always ends. You, standing.', damage: 9, radius: 2.4 },
    ],
  },

  // -------------------- THE REACHING SCHOOL — the polearm rungs
  {
    ability: 'lunging_skewer',
    style: 'polearm',
    unlockLevel: 5,
    ranks: [
      { note: 'The point lands heavier.', damage: 10 },
      { note: 'The reach lengthens; the lunge asks less.', range: 3.7, cooldownTicks: 120 },
      { note: 'The argument ends sooner every time.', damage: 11, cooldownTicks: 115 },
    ],
  },
  {
    ability: 'haft_strike',
    style: 'polearm',
    unlockLevel: 10,
    ranks: [
      { note: 'The shove carries them farther.', knockback: 3.0, cooldownTicks: 110 },
      { note: 'The jolt hangs in their knees.', damage: 5, status: { status: 'chill', power: 1, durationTicks: 60 } },
      { note: 'Room made, and made quickly.', knockback: 3.4, cooldownTicks: 100 },
    ],
  },
  {
    ability: 'hooking_reap',
    style: 'polearm',
    unlockLevel: 15,
    ranks: [
      { note: 'The bite behind the hook deepens.', damage: 8 },
      { note: 'The drag is longer and colder.', knockback: -2.5, status: { status: 'chill', power: 1, durationTicks: 60 } },
      { note: 'Whatever the hook finds, it keeps.', damage: 9, cooldownTicks: 150 },
    ],
  },
  {
    ability: 'vaulting_step',
    style: 'polearm',
    unlockLevel: 20,
    ranks: [
      { note: 'The vault carries farther, sooner.', dashTiles: 8.0, cooldownTicks: 150 },
      { note: 'You land meaning it.', damage: 8 },
      { note: 'The haft barely touches the ground.', damage: 10, dashTiles: 9.0, cooldownTicks: 130 },
    ],
  },
  {
    ability: 'perfect_thrust',
    style: 'polearm',
    unlockLevel: 25,
    ranks: [
      { note: 'The line lands heavier.', damage: 16 },
      { note: 'The breath draws shorter.', castTicks: 16, cooldownTicks: 160 },
      { note: 'One line, and the world agrees with it.', damage: 18 },
    ],
  },
  {
    ability: 'flurry_of_points',
    style: 'polearm',
    unlockLevel: 30,
    ranks: [
      { note: 'Every point bites deeper.', damage: 5 },
      { note: 'The rain holds a fourth beat.', channelTicks: 64 },
      { note: 'The lane clears sooner for the next storm.', cooldownTicks: 170 },
    ],
  },
  {
    ability: 'crescent_reap',
    style: 'polearm',
    unlockLevel: 35,
    ranks: [
      { note: 'The crescent lands heavier.', damage: 11 },
      { note: 'The moon opens wider, oftener.', arc: 2.5, cooldownTicks: 160 },
      { note: 'The stroke clears the whole field row.', damage: 13, knockback: 1.8, cooldownTicks: 150 },
    ],
  },
  {
    ability: 'impaling_drive',
    style: 'polearm',
    unlockLevel: 40,
    ranks: [
      { note: 'The drive lands heavier.', damage: 15 },
      { note: 'The line is drawn quicker.', castTicks: 20, cooldownTicks: 160 },
      { note: 'The corridor widens; the lesson is general.', damage: 17, width: 0.7 },
    ],
  },
  {
    ability: 'wall_of_points',
    style: 'polearm',
    unlockLevel: 45,
    ranks: [
      { note: 'Every picket bites deeper.', damage: 5 },
      { note: 'The cold of the wall settles in.', status: { status: 'chill', power: 1, durationTicks: 50 }, cooldownTicks: 190 },
      { note: 'Nothing crosses. Nothing ever did.', damage: 6 },
    ],
  },
  {
    ability: 'knights_charge',
    style: 'polearm',
    unlockLevel: 50,
    ranks: [
      { note: 'The arrival lands heavier.', damage: 15 },
      { note: 'The road runs longer, and opens sooner.', dashTiles: 11.0, cooldownTicks: 180 },
      { note: 'The charge answers only to the horizon.', damage: 16, knockback: 3.0 },
    ],
  },
  {
    ability: 'rampart_breaker',
    style: 'polearm',
    unlockLevel: 54,
    ranks: [
      { note: 'The breach opens wider.', damage: 16 },
      { note: 'The crack runs deeper and holds longer.', status: { status: 'sunder', power: 15, durationTicks: 80 } },
      { note: 'Ramparts learn their place.', damage: 17, cooldownTicks: 180 },
    ],
  },
  {
    ability: 'serpents_tongue',
    style: 'polearm',
    unlockLevel: 58,
    ranks: [
      { note: 'The tongue takes more each taste.', damage: 7 },
      { note: 'The serpent rests less.', cooldownTicks: 180 },
      { note: 'It flickers faster than the eye votes.', damage: 8 },
    ],
  },
  {
    ability: 'skydriver_fall',
    style: 'polearm',
    unlockLevel: 62,
    ranks: [
      { note: 'The fall lands heavier.', damage: 14 },
      { note: 'The crater spreads wider, sooner.', radius: 1.8, cooldownTicks: 190 },
      { note: 'The landing scatters whatever survives it.', damage: 15, knockback: 1.5 },
    ],
  },
  {
    ability: 'banner_advance',
    style: 'polearm',
    unlockLevel: 66,
    ranks: [
      { note: 'The banner holds the line longer.', self: { speedMult: 1.15, armor: 5, durationTicks: 140 } },
      { note: 'The call comes sooner.', cooldownTicks: 280 },
      { note: 'The whole line moves as one body.', self: { speedMult: 1.2, armor: 6, shieldHp: 10, durationTicks: 160 } },
    ],
  },
  {
    ability: 'moulinet_guard',
    style: 'polearm',
    unlockLevel: 70,
    ranks: [
      { note: 'Every turn of the wheel bites deeper.', damage: 5 },
      { note: 'The wheel spins wider and shoves.', radius: 2.0, knockback: 0.6 },
      { note: 'The guard is ready again sooner.', cooldownTicks: 170 },
    ],
  },
  {
    ability: 'stormpoint',
    style: 'polearm',
    unlockLevel: 74,
    ranks: [
      { note: 'The called strike lands heavier.', damage: 20 },
      { note: 'The charge clings longer; the sky asks less.', status: { status: 'shock', power: 1, durationTicks: 60 }, cooldownTicks: 200 },
      { note: 'The storm knows the point by name.', damage: 22 },
    ],
  },
  {
    ability: 'gatebreaker',
    style: 'polearm',
    unlockLevel: 78,
    ranks: [
      { note: 'The blow lands heavier.', damage: 14 },
      { note: 'It reads the lean earlier.', executeBelow: { frac: 0.35, mult: 2.0 } },
      { note: 'Gates fall on the first knock.', damage: 15, cooldownTicks: 180 },
    ],
  },
  {
    ability: 'sweeping_gyre',
    style: 'polearm',
    unlockLevel: 82,
    ranks: [
      { note: 'The circle lands heavier.', damage: 11 },
      { note: 'The gyre reaches wider, oftener.', radius: 2.5, cooldownTicks: 180 },
      { note: 'One turn, and the yard is yours.', damage: 12, knockback: 2.0 },
    ],
  },
  {
    ability: 'hold_the_line_polearm',
    style: 'polearm',
    unlockLevel: 86,
    ranks: [
      { note: 'Every beat of the stand bites deeper.', damage: 5 },
      { note: 'The cold at the line holds them longer.', status: { status: 'chill', power: 1, durationTicks: 80 }, cooldownTicks: 200 },
      { note: 'The line was never really in question.', damage: 6 },
    ],
  },
  {
    ability: 'sundering_lance',
    style: 'polearm',
    unlockLevel: 90,
    ranks: [
      { note: 'The run lands heavier.', damage: 17 },
      { note: 'The road runs longer and opens sooner.', dashTiles: 14.0, cooldownTicks: 200 },
      { note: 'The crown of the school, at full gallop.', damage: 19, knockback: 3.2 },
    ],
  },

  // ------------------------- THE UNWRITTEN PAGE — deed-earned seats
  {
    ability: 'riftwalker_step',
    style: 'arx',
    unlockLevel: 0,
    hidden: { anchorLevel: 30 },
    ranks: [
      { note: 'You carry more of the far side back.', damage: 10 },
      { note: 'The step lengthens; the rift stays open longer for you.', dashTiles: 10.4, cooldownTicks: 170 },
      {
        note: 'The static of the crossing clings to everything you pass.',
        damage: 11,
        status: { status: 'shock', power: 1, durationTicks: 80 },
      },
    ],
  },
  {
    ability: 'oathbound_edge',
    style: 'onehand',
    unlockLevel: 0,
    hidden: { anchorLevel: 30 },
    ranks: [
      { note: 'The oath weighs more.', damage: 13 },
      { note: 'The vow opens wider, oftener.', arc: 1.4, cooldownTicks: 180 },
      { note: 'The oath repays in full.', drainFrac: 0.3 },
    ],
  },
  {
    ability: 'warden_volley',
    style: 'archery',
    unlockLevel: 0,
    hidden: { anchorLevel: 30 },
    ranks: [
      { note: 'Each shaft means the NO harder.', damage: 7 },
      { note: 'A fifth shaft joins the answer.', projectiles: 5 },
      { note: 'The wall holds; they do not.', damage: 9, knockback: 2.0, cooldownTicks: 180 },
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
  {
    ability: 'champions_wall',
    style: 'shield',
    unlockLevel: 0,
    hidden: { anchorLevel: 30 },
    ranks: [
      { note: 'The wall rings louder.', damage: 7 },
      { note: 'A fourth ring answers the third.', pulses: 4 },
      { note: 'The dare carries to the back of the yard.', tauntRadius: 5.0, knockback: 2.0 },
    ],
  },
  {
    ability: 'giantsfall',
    style: 'twohand',
    unlockLevel: 0,
    hidden: { anchorLevel: 30 },
    ranks: [
      { note: 'The memory swings heavier.', damage: 19 },
      { note: 'It reaches the tall ones sooner.', range: 3.1, cooldownTicks: 220 },
      { note: 'Everything falls the same height in the end.', damage: 21, knockback: 2.6 },
    ],
  },
  {
    ability: 'two_answers',
    style: 'dualwield',
    unlockLevel: 0,
    hidden: { anchorLevel: 30 },
    ranks: [
      { note: 'Both answers weigh more.', damage: 10 },
      { note: 'Spoken sooner.', damage: 11, cooldownTicks: 200 },
      { note: 'What the second answer takes, you keep.', damage: 12, drainFrac: 0.25 },
    ],
  },
  {
    ability: 'four_roads',
    style: 'combat',
    unlockLevel: 0,
    hidden: { anchorLevel: 30 },
    ranks: [
      { note: 'Each road adds its weight.', damage: 12 },
      { note: 'The circle widens to fit four schools.', damage: 13, radius: 2.5 },
      {
        note: 'All four roads, walked at once.',
        damage: 15,
        radius: 2.5,
        self: { speedMult: 1.14, armor: 2, durationTicks: 100 },
      },
    ],
  },
  // THE NEW VOICES (THE DRAWN BREATH Phase 4): the first channeled
  // pages — deed-earned, like every page before them.
  {
    ability: 'whirling_ruin',
    style: 'twohand',
    unlockLevel: 0,
    hidden: { anchorLevel: 38 },
    ranks: [
      { note: 'Each turn of the steel asks for more.', damage: 4 },
      { note: 'The wheel spins up sooner between rests.', cooldownTicks: 240 },
      { note: 'The storm refuses to sit down.', channelTicks: 70 },
    ],
  },
  {
    ability: 'winters_fall',
    style: 'arx',
    unlockLevel: 0,
    hidden: { anchorLevel: 38 },
    ranks: [
      { note: 'Heavier ice, asked for by name.', damage: 5 },
      { note: 'A wider patch of sky agrees.', radius: 2.6 },
      {
        note: 'The fall quickens, and the cold outstays it.',
        pulseEveryTicks: 13,
        status: { status: 'chill', power: 1, durationTicks: 80 },
      },
    ],
  },

  // ------------------------- beastcraft, the keeper's ladder (THE
  // KEEPER'S TONGUE): the fourth citizenship of style at the full
  // ten-rung standard. Four words spoken to the wild itself, five
  // through the companion, and the asking at its shipped seat.
  {
    ability: 'soothe_the_wild',
    style: 'beastcraft',
    unlockLevel: 5,
    ranks: [
      { note: 'The calm holds longer, and the word returns sooner.', becalmTicks: 300, cooldownTicks: 240 },
      { note: 'The word carries further.', range: 6.5 },
      { note: 'The calm spreads to beasts standing beside the mark.', radius: 2 },
    ],
  },
  {
    ability: 'gentle_the_wild',
    style: 'beastcraft',
    unlockLevel: 10,
    ranks: [
      { note: 'The call carries further, and the hand recovers sooner.', range: 6.5, cooldownTicks: 160 },
      { note: 'The asking grows shorter.', channelTicks: 170 },
      { note: 'The wild answers a familiar hand almost at once.', channelTicks: 140 },
    ],
  },
  {
    ability: 'come_to_heel',
    style: 'beastcraft',
    unlockLevel: 15,
    ranks: [
      { note: 'The whistle is always on your lips.', cooldownTicks: 120 },
      { note: 'The friend arrives a little mended.', petHealFrac: 0.1 },
      {
        note: 'It arrives with its blood up, ready for whatever called it.',
        petSurge: { dmgMult: 1.15, speedMult: 1.1, durationTicks: 100 },
      },
    ],
  },
  {
    ability: 'point_the_fang',
    style: 'beastcraft',
    unlockLevel: 20,
    ranks: [
      { note: 'The point reaches further, and comes back sooner.', range: 9, cooldownTicks: 160 },
      {
        note: 'The first bite after the point lands deep.',
        petSurge: { dmgMult: 1.5, speedMult: 1, durationTicks: 60 },
      },
      { note: 'The dare carries: foes beside the mark turn on the friend too.', radius: 2 },
    ],
  },
  {
    ability: 'keepers_balm',
    style: 'beastcraft',
    unlockLevel: 30,
    ranks: [
      { note: 'The poultice is packed thicker.', petHealFrac: 0.45, cooldownTicks: 320 },
      { note: 'The balm sheds whatever rides the friend.', petCleanse: true },
      {
        note: 'It mends near whole, and the hide stays tough a while.',
        petHealFrac: 0.6,
        petGuard: { armor: 6, durationTicks: 200 },
      },
    ],
  },
  {
    ability: 'strewn_bait',
    style: 'beastcraft',
    unlockLevel: 40,
    ranks: [
      { note: 'A wider table, laid longer.', summon: { kind: 'bait', durationTicks: 400, radius: 8, power: 0 } },
      { note: 'The hand scatters it sooner.', cooldownTicks: 380 },
      {
        note: 'The table calms its guests while they eat.',
        summon: { kind: 'bait', durationTicks: 400, radius: 8, power: 1 },
      },
    ],
  },
  {
    ability: 'the_quiet_walk',
    style: 'beastcraft',
    unlockLevel: 50,
    ranks: [
      { note: 'The quiet holds longer.', self: { beastTruce: true, durationTicks: 600 } },
      { note: 'The walk begins again sooner.', cooldownTicks: 460 },
      {
        note: 'The wild parts: beasts ease aside as you pass.',
        self: { beastTruce: true, beastPart: 1.5, durationTicks: 600 },
      },
    ],
  },
  {
    ability: 'blood_of_the_pack',
    style: 'beastcraft',
    unlockLevel: 60,
    ranks: [
      { note: 'The howl runs hotter.', petSurge: { dmgMult: 1.4, speedMult: 1.15, durationTicks: 240 } },
      { note: 'The blood stays up longer.', petSurge: { dmgMult: 1.4, speedMult: 1.15, durationTicks: 300 } },
      {
        note: 'The whole temper: its teeth carry their full wild weight, and its blows shove.',
        petSurge: { dmgMult: 1.4, speedMult: 1.15, durationTicks: 300, temper: true },
      },
    ],
  },
  {
    ability: 'the_keepers_cry',
    style: 'beastcraft',
    unlockLevel: 75,
    ranks: [
      { note: 'The friend stands with more of itself.', petHealFrac: 0.5 },
      { note: 'The cry returns to you sooner.', cooldownTicks: 900 },
      {
        note: 'It rises angry, hide tough and teeth quick.',
        petSurge: { dmgMult: 1.3, speedMult: 1.15, durationTicks: 160 },
        petGuard: { armor: 6, durationTicks: 160 },
      },
    ],
  },
  {
    ability: 'voice_of_the_wild',
    style: 'beastcraft',
    unlockLevel: 90,
    ranks: [
      { note: 'The voice carries further.', radius: 9 },
      { note: 'The awe holds longer, and the friend is mended deeper.', becalmTicks: 240, petHealFrac: 0.35 },
      { note: 'The wild answers: the ghost pack runs the rim of the ring.', becalmTicks: 320 },
    ],
  },
];
