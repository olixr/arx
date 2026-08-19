import type { Shot, StageStep } from './types.js';

/**
 * THE SLATE — every reel the front page draws from.
 *
 * Written as storyboard cards, because that is what they are. Each one
 * names a place, a body, a foe and a camera; the director performs it
 * against the live game and the lane tapes what comes out.
 *
 * House rules, learned the hard way:
 *
 *  · SPAWN, THEN WALK OFF. `/spawnmob` puts foes at your elbow. Stage
 *    them, walk six tiles away, and let them charge into frame on the
 *    first second of the take. A fight that is already touching when
 *    the tape rolls has no first act.
 *  · THE PRE-ROLL PAYS THE BUCKET. Dev chat refills at one per second;
 *    every `cmd` in `stage` costs 1.15 s of nobody's time. Beats that
 *    fire commands mid-take spend from a burst of four — the take
 *    report names anything that had to wait.
 *  · ARRIVE ALREADY MOVING. Frame one should never be a body standing
 *    still deciding what to do. Either the camera is moving or the
 *    world is.
 *  · CUT ON THE HIT. The push-in and the shake belong on the frame the
 *    blow lands, not a beat after it.
 */

/** A masterwork body, worn once and reused by every blade shot. */
const PLATE: StageStep[] = [
  { k: 'equip', item: 'kingsmane_platebody' },
  { k: 'equip', item: 'kingsmane_helm' },
  { k: 'equip', item: 'kingsmane_greaves' },
  { k: 'equip', item: 'kingsmane_gauntlets' },
  { k: 'equip', item: 'kingsmane_sabatons' },
];

/** The adept's weave. */
const ROBES: StageStep[] = [
  { k: 'equip', item: 'aetherion_robe' },
  { k: 'equip', item: 'aetherion_cowl' },
  { k: 'equip', item: 'aetherion_skirts' },
  { k: 'equip', item: 'aetherion_wraps' },
  { k: 'equip', item: 'aetherion_slippers' },
];

export const SHOTS: Shot[] = [
  // ────────────────────────────────────────────────── THE CROWN
  //
  // The open meadow north of Dawnmead — fresh ground, no landmark to
  // share the frame, and a flame-tyrant walking in out of the dusk with
  // its own banner dropping over the top of it.
  {
    id: 'the-crown',
    title: 'The world crowns its foes',
    caption:
      'Eight crowned bosses hold ground out there. Each has its phases, its summons, and a wind-up you can read — if you keep your nerve.',
    pillar: 'crown',
    cast: 'blade',
    seconds: 12,
    hud: 'drama',
    hero: true,
    poster: 3.2,
    stage: [
      // THE SEVEN STONES, and the crown gets them FIRST — clean ground
      // for the boss, and the cut that follows inherits a battlefield
      // instead of a lawn. (Silverfall's gate was tried and rejected:
      // stage a fight inside a defended town and the watch joins in,
      // the camera's foe-picker finds a guard, and the boss never gets
      // to be the subject.)
      { k: 'cmd', text: '/time 19.2' },
      { k: 'at', x: -84, y: 54 },
      ...PLATE,
      { k: 'equip', item: 'mountains_end' },
      { k: 'wait', ms: 3200 },
      { k: 'cmd', text: '/spawnmob goblin_flame_tyrant 1' },
      { k: 'cmd', text: '/spawnmob goblin_champion 4' },
      { k: 'walk', x: -93, y: 62 },
      { k: 'wait', ms: 700 },
    ],
    beats: [
      // Open on the crown itself, not on us. The banner is dropping.
      { at: 0, do: { k: 'cam', move: { k: 'followFoe', pick: 'biggest', zoom: 1.9 } } },
      { at: 0, do: { k: 'handheld', amount: 0.3 } },
      { at: 0, do: { k: 'faceFoe', pick: 'biggest' } },
      { at: 300, do: { k: 'backOff', pick: 'biggest', speed: 0.5 } },
      { at: 1700, do: { k: 'move', x: 0, y: 0 } },
      { at: 2600, do: { k: 'cam', move: { k: 'followFoe', pick: 'biggest', zoom: 2.2 } } },
      { at: 3200, do: { k: 'mark', name: 'poster' } },
      { at: 3300, do: { k: 'closeOn', pick: 'biggest', within: 2.2 } },
      { at: 3600, do: { k: 'press', btn: 'attack', ms: 1100 } },
      { at: 3700, do: { k: 'shake', amount: 1.8 } },
      { at: 4900, do: { k: 'press', btn: 'art', ms: 260 } },
      { at: 5400, do: { k: 'shake', amount: 3.4 } },
      { at: 5400, do: { k: 'pulse', amount: 0.07 } },
      // Round the crown — the fight is a dance, so the camera dances.
      { at: 5900, do: { k: 'backOff', pick: 'biggest', speed: 0.9 } },
      { at: 6900, do: { k: 'closeOn', pick: 'biggest', within: 2.2 } },
      { at: 7400, do: { k: 'press', btn: 'attack', ms: 1600 } },
      { at: 9300, do: { k: 'cam', move: { k: 'followFoe', pick: 'biggest', zoom: 2.5 } } },
      { at: 9400, do: { k: 'press', btn: 'attack', ms: 1400 } },
      { at: 10900, do: { k: 'handheld', amount: 0.15 } },
      { at: 11000, do: { k: 'cam', move: { k: 'zoom', to: 2.0, ms: 1000 } } },
    ],
  },

  // ────────────────────────────────────────────────── THE CUT
  //
  // Dawnmead's seven standing stones, an hour before dark. Six
  // hobgoblin juggernauts come out of the north and the ring becomes
  // an arena. Open ground, a landmark that reads at a glance, and the
  // wood held back at the edge of frame.
  {
    id: 'the-cut',
    title: 'The cut lives in the world',
    caption:
      'Six hobgoblin juggernauts come down on the standing stones. Every swing is a real body swinging real steel — no canned animation, no sprite sheet.',
    pillar: 'combat',
    cast: 'blade',
    seconds: 11,
    hud: 'drama',
    hero: true,
    poster: 4.4,
    stage: [
      { k: 'cmd', text: '/time 18.5' },
      { k: 'at', x: -84, y: 54 },
      ...PLATE,
      { k: 'equip', item: 'mountains_end' },
      { k: 'equip', item: 'storm_coil' },
      // Long enough for the Place Herald to have said its piece — a
      // title card halfway through a fight is somebody else's trailer.
      { k: 'wait', ms: 3200 },
      // SIX AND TWO. Eleven live bodies with kits cost 25 ms a frame on
      // this machine; eight cost 16. The plate reads exactly the same.
      { k: 'cmd', text: '/spawnmob hobgoblin_juggernaut 6' },
      { k: 'cmd', text: '/spawnmob ogre_champion 2' },
      // Off the mark, so the pack has road to cover and arrives moving.
      { k: 'walk', x: -93, y: 62 },
      { k: 'wait', ms: 500 },
    ],
    beats: [
      { at: 0, do: { k: 'cam', move: { k: 'followFoe', pick: 'nearest', zoom: 2.05 } } },
      { at: 0, do: { k: 'handheld', amount: 0.45 } },
      { at: 0, do: { k: 'closeOn', pick: 'nearest', within: 2.0 } },
      { at: 1400, do: { k: 'press', btn: 'attack', ms: 900 } },
      { at: 1500, do: { k: 'shake', amount: 1.4 } },
      { at: 2400, do: { k: 'press', btn: 'attack', ms: 900 } },
      { at: 2500, do: { k: 'pulse', amount: 0.03 } },
      // The Art: Horizon Fall. Pull in hard as it winds up.
      { at: 3200, do: { k: 'cam', move: { k: 'followFoe', pick: 'nearest', zoom: 2.45 } } },
      { at: 3400, do: { k: 'press', btn: 'art', ms: 260 } },
      { at: 3900, do: { k: 'shake', amount: 3.2 } },
      { at: 3900, do: { k: 'pulse', amount: 0.06 } },
      { at: 4400, do: { k: 'mark', name: 'poster' } },
      // Give ground, then take it back — a fighter who never moves
      // reads as a target dummy.
      { at: 4800, do: { k: 'backOff', speed: 0.85 } },
      { at: 5700, do: { k: 'closeOn', within: 1.8 } },
      { at: 6000, do: { k: 'press', btn: 'attack', ms: 1100 } },
      // The relic answers: the storm coil.
      { at: 7200, do: { k: 'press', btn: 'relic', ms: 200 } },
      { at: 7400, do: { k: 'cam', move: { k: 'followFoe', pick: 'nearest', zoom: 2.2 } } },
      { at: 7600, do: { k: 'shake', amount: 2.2 } },
      { at: 8100, do: { k: 'press', btn: 'attack', ms: 1500 } },
      { at: 9600, do: { k: 'handheld', amount: 0.25 } },
      { at: 9700, do: { k: 'cam', move: { k: 'zoom', to: 1.85, ms: 1300 } } },
    ],
  },

  // ────────────────────────────────────────────────── THE ARTS
  //
  // Amberford's south field after dark: the town wall behind, the
  // lamps on, and an adept holding six Old Crown kingsmen off with a
  // staff. Night is the arcana's hour — every cast lights the ground.
  {
    id: 'the-arts',
    title: 'Three hundred and nine arts',
    caption:
      'No classes. Twenty-four skills climb by doing, and the deepest arts live in the weapons that teach them. Every sigil is live geometry.',
    pillar: 'arcana',
    cast: 'adept',
    seconds: 11,
    hud: 'drama',
    hero: true,
    poster: 5.4,
    stage: [
      // THE WEST GLADE, outside Dawnmead's hedges. A plain grass edge
      // by day; at night, with a caster throwing light across it, the
      // field is not the subject — the light is, and nothing competes
      // with it. And nothing here belongs to a town: stage a fight
      // inside the walls and the WATCH kills your foes off-camera in
      // the first two seconds. (Amberford's south field, then the
      // village green itself. Twice learned, once written down.)
      { k: 'cmd', text: '/time 21.4' },
      { k: 'at', x: -140, y: 10 },
      ...ROBES,
      { k: 'equip', item: 'skythrone' },
      { k: 'equip', item: 'sigil_fallen_champion' },
      // THE AEGIS STONE. An adept fights in cloth and a level-48 Old
      // Crown kingsman hits like one: four of them put the body on the
      // respawn stone twice before this line existed.
      { k: 'equip', item: 'aegis_stone' },
      { k: 'wait', ms: 3200 },
      // OGRES, not kingsmen: slower, bigger, and they read at this
      // zoom — and they do not delete a robe in three swings.
      { k: 'cmd', text: '/spawnmob ogre 5' },
      { k: 'walk', x: -148, y: 2 },
      { k: 'wait', ms: 600 },
    ],
    beats: [
      { at: 0, do: { k: 'cam', move: { k: 'followFoe', pick: 'nearest', zoom: 1.95 } } },
      { at: 0, do: { k: 'handheld', amount: 0.3 } },
      { at: 0, do: { k: 'closeOn', within: 4.5 } },
      // Ward first, then work.
      { at: 200, do: { k: 'press', btn: 'relic', ms: 200 } },
      { at: 600, do: { k: 'press', btn: 'attack', ms: 1400 } },
      { at: 2000, do: { k: 'press', btn: 'sigil', ms: 220 } },
      { at: 2600, do: { k: 'shake', amount: 2.0 } },
      { at: 2700, do: { k: 'cam', move: { k: 'followFoe', pick: 'nearest', zoom: 2.3 } } },
      { at: 3400, do: { k: 'backOff', speed: 0.8 } },
      { at: 4300, do: { k: 'closeOn', within: 5 } },
      // Crownstorm: the staff's own art.
      { at: 4700, do: { k: 'press', btn: 'art', ms: 260 } },
      { at: 5300, do: { k: 'shake', amount: 3.6 } },
      { at: 5300, do: { k: 'pulse', amount: 0.06 } },
      { at: 5400, do: { k: 'mark', name: 'poster' } },
      { at: 6200, do: { k: 'press', btn: 'attack', ms: 1800 } },
      { at: 8200, do: { k: 'press', btn: 'sigil', ms: 220 } },
      { at: 8800, do: { k: 'shake', amount: 1.6 } },
      { at: 9200, do: { k: 'cam', move: { k: 'zoom', to: 1.85, ms: 1600 } } },
      { at: 9400, do: { k: 'press', btn: 'attack', ms: 1400 } },
    ],
  },

  // ────────────────────────────────────────────────── THE ROAD
  //
  // The last mile into Amberford at golden hour, from the saddle. A
  // ride needs a destination in frame or it is just scenery going past:
  // the town wall arrives at second seven.
  {
    id: 'the-road',
    title: 'One long road north',
    caption:
      'Eight hand-built towns on one road, and the country between them comes in eleven grades. Past the authored miles, the wilderness keeps going.',
    pillar: 'road',
    cast: 'blade',
    seconds: 12,
    hud: 'clean',
    hero: true,
    loop: true,
    poster: 7.5,
    stage: [
      { k: 'cmd', text: '/time 17.6' },
      { k: 'at', x: 520, y: -30 },
      ...PLATE,
      { k: 'equip', item: 'mountains_end' },
      { k: 'cmd', text: '/mount courser_bay' },
      { k: 'wait', ms: 1600 },
    ],
    beats: [
      { at: 0, do: { k: 'cam', move: { k: 'follow', zoom: 1.62, lead: 3.0 } } },
      { at: 0, do: { k: 'handheld', amount: 0.14 } },
      { at: 0, do: { k: 'aim', rad: 1.5708 } },
      { at: 0, do: { k: 'move', x: 0.1, y: 1 } },
      { at: 4200, do: { k: 'move', x: -0.15, y: 1 } },
      { at: 7500, do: { k: 'mark', name: 'poster' } },
      { at: 8200, do: { k: 'cam', move: { k: 'follow', zoom: 1.5, lead: 3.4 } } },
      { at: 9000, do: { k: 'move', x: 0.12, y: 1 } },
    ],
  },

  // ────────────────────────────────────────────── THE TENDED EARTH
  //
  // Dawnmead's field rows at breakfast time. The other half of the
  // game, and the half a trailer usually forgets: a body walking its
  // own furrows and pulling the crop up by hand.
  {
    id: 'the-tended-earth',
    title: 'The tended earth',
    caption:
      'Twenty-three crops, livestock that learn your hands, and eighty buildable pieces that persist in the shared world. What you raise stays raised.',
    pillar: 'homestead',
    cast: 'steader',
    seconds: 11,
    hud: 'clean',
    poster: 6.5,
    stage: [
      { k: 'cmd', text: '/time 8.6' },
      // Stand IN the rows, not on the headland: a farm reel is about
      // the crop, and the crop is a foot tall.
      { k: 'at', x: -47, y: -47 },
      // The field answers the clock: bring every row to its harvest so
      // the plate is a working farm, not a mud rectangle.
      { k: 'cmd', text: '/grow' },
      { k: 'wait', ms: 2600 },
    ],
    beats: [
      { at: 0, do: { k: 'cam', move: { k: 'follow', zoom: 2.15, lead: 1.2 } } },
      { at: 0, do: { k: 'handheld', amount: 0.14 } },
      { at: 0, do: { k: 'aim', rad: 0.35 } },
      { at: 200, do: { k: 'move', x: 0.62, y: 0.2 } },
      { at: 2600, do: { k: 'move', x: 0, y: 0 } },
      // Pull the row up by hand — the verb the whole skill is made of.
      { at: 2900, do: { k: 'use', x: -42, y: -45 } },
      { at: 3600, do: { k: 'use', x: -41, y: -45 } },
      { at: 4300, do: { k: 'move', x: 0.5, y: 0.35 } },
      { at: 6000, do: { k: 'move', x: 0, y: 0 } },
      { at: 6300, do: { k: 'use', x: -38, y: -43 } },
      { at: 6500, do: { k: 'mark', name: 'poster' } },
      { at: 7200, do: { k: 'move', x: 0.6, y: -0.15 } },
      { at: 9600, do: { k: 'move', x: 0, y: 0 } },
      { at: 9700, do: { k: 'cam', move: { k: 'zoom', to: 2.45, ms: 1300 } } },
    ],
  },

  // ────────────────────────────────────────────────── THE TOWN
  {
    id: 'the-town',
    title: 'Eight towns that keep their day',
    caption:
      'A hundred and eighty-eight voiced characters keep their own hours — the smith at the anvil, the watch on its round, the market when the market is open.',
    pillar: 'town',
    cast: 'steader',
    seconds: 11,
    hud: 'drama',
    poster: 5.5,
    stage: [
      { k: 'cmd', text: '/time 11.2' },
      { k: 'at', x: -58, y: 38 },
      { k: 'wait', ms: 2600 },
    ],
    beats: [
      { at: 0, do: { k: 'cam', move: { k: 'follow', zoom: 1.6, lead: 1.6 } } },
      { at: 0, do: { k: 'handheld', amount: 0.16 } },
      { at: 0, do: { k: 'aim', rad: 0 } },
      { at: 200, do: { k: 'move', x: 0.62, y: 0.12 } },
      { at: 4200, do: { k: 'move', x: 0.4, y: 0.5 } },
      { at: 5500, do: { k: 'mark', name: 'poster' } },
      { at: 7000, do: { k: 'move', x: 0.6, y: 0 } },
      { at: 9600, do: { k: 'move', x: 0, y: 0 } },
      { at: 9700, do: { k: 'cam', move: { k: 'zoom', to: 1.95, ms: 1200 } } },
    ],
  },

  // ────────────────────────────────────────────── THE WILD AT HEEL
  //
  // The hedged clearing south of Dawnmead, with a dire wolf at heel and
  // a gnoll pack coming through the gap in the hedge.
  {
    id: 'the-wild-at-heel',
    title: 'The wild at heel',
    caption:
      'Sixteen species will walk beside you once your beastcraft earns them. A companion fights at your side and levels through its own deeds.',
    pillar: 'wild',
    cast: 'blade',
    seconds: 10,
    hud: 'drama',
    poster: 5.5,
    stage: [
      { k: 'cmd', text: '/time 16.8' },
      { k: 'at', x: -30, y: 86 },
      ...PLATE,
      { k: 'equip', item: 'mountains_end' },
      { k: 'cmd', text: '/tame dire_wolf' },
      { k: 'wait', ms: 2600 },
      { k: 'cmd', text: '/spawnmob gnoll_champion 8' },
      { k: 'walk', x: -38, y: 94 },
      { k: 'wait', ms: 600 },
    ],
    beats: [
      { at: 0, do: { k: 'cam', move: { k: 'followFoe', pick: 'nearest', zoom: 1.95 } } },
      { at: 0, do: { k: 'handheld', amount: 0.35 } },
      { at: 0, do: { k: 'closeOn', within: 2.0 } },
      { at: 1800, do: { k: 'press', btn: 'attack', ms: 1400 } },
      { at: 3400, do: { k: 'press', btn: 'art', ms: 240 } },
      { at: 3900, do: { k: 'shake', amount: 2.6 } },
      { at: 4400, do: { k: 'backOff', speed: 0.8 } },
      { at: 5200, do: { k: 'closeOn', within: 1.8 } },
      { at: 5500, do: { k: 'mark', name: 'poster' } },
      { at: 5600, do: { k: 'press', btn: 'attack', ms: 1800 } },
      { at: 7600, do: { k: 'cam', move: { k: 'followFoe', pick: 'nearest', zoom: 2.25 } } },
      { at: 7800, do: { k: 'press', btn: 'attack', ms: 1600 } },
    ],
  },

  // ────────────────────────────────────────────── THE LONG DARK
  {
    id: 'the-long-dark',
    title: 'The key is the dungeon',
    caption:
      'Dungeons are cut by their keys — the same key always opens the same halls, and its ward holds three turns before it wears through.',
    pillar: 'dark',
    cast: 'blade',
    seconds: 11,
    hud: 'drama',
    poster: 5,
    stage: [
      { k: 'at', x: -498, y: -327 },
      ...PLATE,
      { k: 'equip', item: 'mountains_end' },
      // Down the Silverfall mouth into the Undercroft.
      { k: 'interact', x: -498, y: -327 },
      { k: 'wait', ms: 3000 },
      // FOUR IN THE DARK. Eight bodies under torchlight, each throwing
      // its own dynamic light into the underworld's night pass, cost
      // 50 ms a frame; four cost half that, and the dark hides the
      // difference in the count but not the difference in the pacing.
      { k: 'cmd', text: '/spawnmob skeleton_kingsman 4' },
      { k: 'walk', x: -326, y: 546 },
      { k: 'wait', ms: 600 },
    ],
    beats: [
      { at: 0, do: { k: 'cam', move: { k: 'followFoe', pick: 'nearest', zoom: 2.1 } } },
      { at: 0, do: { k: 'handheld', amount: 0.4 } },
      { at: 0, do: { k: 'closeOn', within: 2.0 } },
      { at: 2000, do: { k: 'press', btn: 'attack', ms: 1500 } },
      { at: 3800, do: { k: 'press', btn: 'art', ms: 240 } },
      { at: 4300, do: { k: 'shake', amount: 3.0 } },
      { at: 4300, do: { k: 'pulse', amount: 0.05 } },
      { at: 5000, do: { k: 'mark', name: 'poster' } },
      { at: 5600, do: { k: 'press', btn: 'attack', ms: 1800 } },
      { at: 7600, do: { k: 'backOff', speed: 0.8 } },
      { at: 8200, do: { k: 'closeOn', within: 1.8 } },
      { at: 8400, do: { k: 'cam', move: { k: 'followFoe', pick: 'nearest', zoom: 2.4 } } },
      { at: 8600, do: { k: 'press', btn: 'attack', ms: 1800 } },
    ],
  },

  // ────────────────────────────────────────────────── THE NIGHT
  {
    id: 'the-night',
    title: 'Every torch after dark',
    caption:
      'Light lives in the world here: every lantern, hearth and brazier throws its own, and the day turns over whether you are watching or not.',
    pillar: 'town',
    cast: 'steader',
    seconds: 12,
    hud: 'clean',
    hero: true,
    loop: true,
    poster: 6,
    stage: [
      { k: 'cmd', text: '/time 22.6' },
      { k: 'at', x: -60, y: 18 },
      { k: 'wait', ms: 2600 },
    ],
    beats: [
      { at: 0, do: { k: 'cam', move: { k: 'follow', zoom: 1.62, lead: 1.4 } } },
      { at: 0, do: { k: 'handheld', amount: 0.1 } },
      { at: 0, do: { k: 'aim', rad: 0.35 } },
      { at: 300, do: { k: 'move', x: 0.45, y: 0.22 } },
      { at: 5200, do: { k: 'move', x: 0.5, y: -0.2 } },
      { at: 6000, do: { k: 'mark', name: 'poster' } },
      { at: 9000, do: { k: 'move', x: 0.35, y: 0.3 } },
      { at: 11000, do: { k: 'cam', move: { k: 'zoom', to: 1.9, ms: 1000 } } },
    ],
  },
];

export function shotById(id: string): Shot | undefined {
  return SHOTS.find((s) => s.id === id);
}
