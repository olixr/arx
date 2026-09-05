/**
 * THE COMBAT SCHOOL — its twenty rung arts (and its unwritten page) with
 * their honing ladders, one file per school (THE MASTERED HAND,
 * techniques v3, Phase 2: THE VETERAN'S ROAD).
 *
 * The spine (docs/techniques-v3-plan.md Part 2): shouts and rally. The
 * veteran has no element and no single steel; what he owns is the
 * voice, the footing, and the read of a guard. Three words hang in
 * the air after his arts:
 *   `weaken`  — the shout laid on them; their arm is dulled (War Shout,
 *               Loose Iron, Scarworn).
 *   `stagger` — the line is broken; they are off their feet (Shoulder
 *               Check, Break the Line).
 *   `rally`   — his own blood is up (First Blood, Second Breath, Hold
 *               Fast, The Long Fight).
 * Payoffs read those words: The Opening strikes a weakened guard twice
 * as hard, Measured Blow and Thrown Iron follow the shout, The Fifth
 * Road runs through the broken line, No Quarter feeds on the rally.
 * Sustains are the drum, the cold lane, the old storm and the staked
 * watch, each with a finale; the gathered breath and the crown leave
 * HELD GROUND the veteran keeps by standing on it.
 * Signature: War Shout → Break the Line → The Opening.
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
 * Holds: Shoulder Check (cast 10, cd 170 → 130 honed) and Break the
 * Line (cast 14, cd 180 → 170) each stagger 14t: duty 14/(130+56) = 7.5%
 * and 14/(170+56) = 6.2%, both warned past half the lock. The Opening
 * READS weaken (vs) and lays nothing; the register walks every status
 * id, so its read is licensed here too.
 */
export const COMBAT_LICENSES: Record<string, string[]> = {
  war_shout: ['weaken'],
  loose_iron: ['weaken'],
  scarworn: ['weaken'],
  shoulder_check: ['stagger'],
  break_the_line: ['stagger'],
  second_breath: ['mend'],
  hold_fast: ['stonehide'],
};

export const COMBAT_ARTS: AbilityDef[] = [
  // ------------------- THE SECOND BREATH — the combat breath arts
  // Rung 10, payoff: the first follow the school teaches. First Blood
  // rallies at 5; the measured blow read inside that rally (or after
  // any shout) lands half again, so a level-10 player already owns
  // the setup and the answer.
  {
    id: 'measured_blow',
    name: 'Measured Blow',
    desc: 'A blow measured on a rallied step or a shouted foe lands half again as hard.',
    color: '#b09a7a',
    code: 'Me',
    cooldownTicks: 160, // 8 s
    castTicks: 18,
    shape: 'melee_arc',
    damage: 11,
    range: 2.3,
    arc: 1.0,
    role: 'payoff',
    follow: { after: ['rally', 'weaken'], windowTicks: 60, damageMult: 1.5 },
  },

  // Rung 20, sustain: the school's first held note. The drum drives
  // the ring back beat by beat and the LAST beat is the one that
  // matters (finale). Struck inside a rally the whole cadence hits
  // harder; it is the fourth press of the level-20 combo.
  {
    id: 'drumbeat',
    name: 'Drumbeat',
    desc: 'Hold the old cadence with your heels. Every beat shoves the ring back and the last beat lands double.',
    color: '#c4885a',
    code: 'Dm',
    cooldownTicks: 240, // 12 s
    channelTicks: 48,
    pulseEveryTicks: 16,
    shape: 'nova',
    damage: 5,
    radius: 2.0,
    knockback: 0.6,
    role: 'sustain',
    finaleMult: 2,
    follow: { after: 'rally', windowTicks: 80, damageMult: 1.25 },
  },

  // Rung 30, payoff: the thrown answer to War Shout. Iron thrown at a
  // foe who has just heard the shout lands half again, and a kill
  // gives the arm back its throw.
  {
    id: 'thrown_iron',
    name: 'Thrown Iron',
    desc: 'Whatever iron is near, thrown hard. Thrown after the shout it lands half again, and a kill hands it straight back.',
    color: '#8a8f98',
    code: 'Th',
    cooldownTicks: 180, // 9 s
    castTicks: 20,
    shape: 'projectile_fan',
    damage: 12,
    range: 9,
    projectiles: 1,
    projectileSpeed: 14,
    splashRadius: 1.3,
    role: 'payoff',
    follow: { after: 'weaken', windowTicks: 60, damageMult: 1.5 },
    onKill: { refundTicks: 60 },
  },

  // Rung 40, sustain: the cold lane. A beam held to its end pays its
  // finale; the chill keeps the line from closing while the veteran
  // stands and breathes it out.
  {
    id: 'ironbreath',
    name: 'Ironbreath',
    desc: 'Exhale winter down the lane. It slows everything it touches, and the last breath of it bites double.',
    color: '#9ab4bc',
    code: 'Ih',
    cooldownTicks: 210, // 10.5 s
    channelTicks: 48,
    pulseEveryTicks: 16,
    shape: 'beam',
    damage: 5,
    range: 6,
    width: 0.6,
    status: { status: 'chill', power: 1, durationTicks: 40 },
    role: 'sustain',
    finaleMult: 2,
  },

  // Rung 50, payoff: the charge through the broken line. Run after
  // Break the Line or Shoulder Check (or on a rally) and the road hits
  // half again and gives back its wait.
  {
    id: 'fifth_road',
    name: 'The Fifth Road',
    desc: 'Four roads are taught. The fifth runs through whoever stands on it. Run it through a broken line and it hits half again.',
    color: '#7a6a80',
    code: '5r',
    cooldownTicks: 220, // 11 s
    castTicks: 22,
    shape: 'dash_strike',
    damage: 12,
    dashTiles: 9.0,
    travel: 'charge',
    status: { status: 'bleed', power: 1, durationTicks: 50 },
    role: 'payoff',
    follow: { after: ['stagger', 'rally'], windowTicks: 50, damageMult: 1.5, refundTicks: 40 },
  },

  // Rung 58, sustain: the old storm, a held arc that shocks and ends
  // on its loudest clap. Read off a stagger it lands on a foe who
  // cannot step out of it.
  {
    id: 'old_thunder',
    name: 'Old Thunder',
    desc: 'The joints remember every storm. Hold the swing and it rolls on, louder on the last clap, and a staggered foe takes it full.',
    color: '#b8a45a',
    code: 'Od',
    cooldownTicks: 210, // 10.5 s
    channelTicks: 64,
    pulseEveryTicks: 16,
    shape: 'melee_arc',
    damage: 4,
    range: 2.3,
    arc: 1.2,
    status: { status: 'shock', power: 1, durationTicks: 25 },
    role: 'sustain',
    finaleMult: 2,
    follow: { after: 'stagger', windowTicks: 60, damageMult: 1.3 },
  },

  // Rung 66, sustain: the veteran's HELD GROUND. The breath is loosed
  // as a blast, and the square it was gathered on stays his for four
  // seconds: standing in it he wears armor, and it grinds whoever
  // crowds back in.
  {
    id: 'gathered_breath',
    name: 'The Gathered Breath',
    desc: 'All of it held, then all of it at once. The ground you gathered on stays yours a while, and you stand harder on it.',
    color: '#d9c084',
    code: 'Gg',
    cooldownTicks: 210, // 10.5 s
    castTicks: 24,
    shape: 'nova',
    damage: 10,
    radius: 2.5,
    knockback: 1.0,
    role: 'sustain',
    aftermath: { fieldTicks: 80, everyTicks: 16, damage: 2, self: { armor: 3, durationTicks: 18 } },
  },

  // Rung 74, sustain: the staked watch. A point on the ground held
  // for three seconds; the last beat of the watch is the one they
  // walked into.
  {
    id: 'long_watch',
    name: 'The Long Watch',
    desc: 'Stake the ground they will stand on and hold the watch. It strikes there beat after beat and the last beat lands double.',
    color: '#7a8a94',
    code: 'Lh',
    cooldownTicks: 250, // 12.5 s
    channelTicks: 64,
    pulseEveryTicks: 16,
    shape: 'ground_aoe',
    damage: 4,
    range: 6,
    radius: 2.1,
    fuseTicks: 8,
    role: 'sustain',
    finaleMult: 2,
  },

  // Rung 82, opener: the late shout. A casted blow that shows them the
  // scars; their arm dulls for four seconds (weaken) and the veteran
  // keeps a share of what he takes. Feeds The Opening and Last Lesson.
  {
    id: 'scarworn',
    name: 'Scarworn',
    desc: 'Every scar is a paid receipt. Show them and their arm goes soft a while, and you keep a share of what you take.',
    color: '#a05a48',
    code: 'Sx',
    cooldownTicks: 200, // 10 s
    castTicks: 24,
    shape: 'melee_arc',
    damage: 13,
    range: 2.4,
    arc: 1.2,
    drainFrac: 0.2,
    status: { status: 'weaken', power: 15, durationTicks: 80 },
    role: 'opener',
    tag: 'weaken',
  },

  // Rung 86, sustain: the lesson passed from one student to the next,
  // a held chain whose last word is the loudest; on a shouted crowd it
  // carries further.
  {
    id: 'last_lesson',
    name: 'Last Lesson',
    desc: 'The lesson passes from one student to the next while you hold it. The last word lands double, and a shouted crowd hears it harder.',
    color: '#c9b46a',
    code: 'Ln',
    cooldownTicks: 250, // 12.5 s
    channelTicks: 64,
    pulseEveryTicks: 16,
    shape: 'chain_zap',
    damage: 4,
    range: 7,
    radius: 3.0,
    chainTargets: 2,
    role: 'sustain',
    finaleMult: 2,
    follow: { after: 'weaken', windowTicks: 60, damageMult: 1.3 },
  },

  // ------------------------ THE VETERAN'S SCHOOL — the combat ladder
  // The school every fighter is already in. No weapon owns it: these
  // are the lessons the fight itself teaches — footing, breath, the
  // shout, the read of a guard — cast the same whatever the hand
  // holds. THE SHARED LESSON feeds the skill; this ladder spends it.
  // Grammar: dust and brass. Kicked grit, drill-yard iron, one horn
  // note — never an element, never a single school's steel.

  // Rung 5, opener: the fight starts on the veteran's word. A light
  // cut that bleeds and RALLIES him (tag) so Measured Blow at 10 has
  // its window; a kill on the opening hands the press back.
  {
    id: 'first_blood',
    name: 'First Blood',
    desc: 'The fight starts when you say it does. The first cut bleeds, puts your blood up, and a kill on it hands the press back.',
    color: '#c4553d',
    code: 'Fb',
    cooldownTicks: 150, // 7.5 s
    shape: 'melee_arc',
    damage: 8,
    range: 2.2,
    arc: 1.1,
    status: { status: 'bleed', power: 1, durationTicks: 60 },
    role: 'opener',
    tag: 'rally',
    onKill: { refundTicks: 60 },
  },

  // Rung 15, answer: the run and the shove. A short casted run-up
  // (the telegraph a hold owes) that knocks them off their feet for a
  // breath (stagger) and leaves the word for The Fifth Road and The
  // Opening.
  {
    id: 'shoulder_check',
    name: 'Shoulder Check',
    desc: 'No blade needed. Take a run and put the whole body into them. They go back off their feet for a breath.',
    color: '#b09a7a',
    code: 'Sk',
    cooldownTicks: 170, // 8.5 s
    castTicks: 10,
    shape: 'dash_strike',
    damage: 9,
    dashTiles: 6,
    travel: 'charge',
    knockback: 1.5,
    status: { status: 'stagger', power: 1, durationTicks: 14 },
    role: 'answer',
    tag: 'stagger',
  },

  // Rung 25, opener: THE shout. Casted, the ring hears it and their
  // arms go soft (weaken); the word hangs for Thrown Iron, Break the
  // Line and The Opening. First press of the signature.
  {
    id: 'war_shout',
    name: 'War Shout',
    desc: 'The oldest weapon is the voice. Draw the breath and let it go. Everyone who hears it swings softer for a while.',
    color: '#d9b04a',
    code: 'Wh',
    cooldownTicks: 160, // 8 s
    castTicks: 16,
    shape: 'nova',
    damage: 7,
    radius: 2.4,
    knockback: 0.6,
    status: { status: 'weaken', power: 12, durationTicks: 60 },
    role: 'opener',
    tag: 'weaken',
  },

  // Rung 35, answer: the mend page. A pull of air that knits the
  // veteran over five seconds and puts his blood up (rally) so the
  // next payoff has its window.
  {
    id: 'second_breath',
    name: 'Second Breath',
    desc: 'The fight is long. Breathe like it. You knit back over the next five seconds, move quicker, and your blood is up.',
    color: '#a8c4b0',
    code: 'Sb',
    cooldownTicks: 400, // 20 s
    shape: 'self_buff',
    damage: 0,
    self: { heal: 6, speedMult: 1.1, selfStatus: { status: 'mend', power: 2, durationTicks: 100 }, durationTicks: 100 },
    role: 'answer',
    tag: 'rally',
  },

  // Rung 45, opener: grit in the eye. A fan of camp iron that dulls
  // the swing of whoever it catches (weaken); the veteran's cheap
  // ranged shout, feeding every weaken reader.
  {
    id: 'loose_iron',
    name: 'Loose Iron',
    desc: 'A buckle, a camp nail, the pommel stone. It all flies, and nobody swings well with iron in their face.',
    color: '#8a8f98',
    code: 'Li',
    cooldownTicks: 160, // 8 s
    shape: 'projectile_fan',
    damage: 5,
    range: 7,
    projectiles: 3,
    spreadArc: 0.18,
    projectileSpeed: 13,
    status: { status: 'weaken', power: 8, durationTicks: 40 },
    role: 'opener',
    tag: 'weaken',
    onKill: { refundTicks: 40 },
  },

  // Rung 54, answer: the stonehide page. Feet planted, the skin turns
  // to stone for eight seconds, and the word given is a rally.
  {
    id: 'hold_fast',
    name: 'Hold Fast',
    desc: 'Feet planted. The word given. Your hide goes to stone for a while and your blood is up.',
    color: '#7a8494',
    code: 'Hf',
    cooldownTicks: 400, // 20 s
    shape: 'self_buff',
    damage: 0,
    self: { shieldHp: 8, selfStatus: { status: 'stonehide', power: 1, durationTicks: 140 }, durationTicks: 140 },
    role: 'answer',
    tag: 'rally',
  },

  // Rung 62, opener: the second press of the signature. A casted
  // wide blow that walks through the wall and leaves them staggered;
  // thrown after the shout it lands harder. Leaves `stagger` for The
  // Opening, The Fifth Road and Old Thunder.
  {
    id: 'break_the_line',
    name: 'Break the Line',
    desc: 'A wall is only a wall until somebody walks through. Wind it up and the whole line goes back off its feet, harder if they heard the shout.',
    color: '#b0623c',
    code: 'Bl',
    cooldownTicks: 180, // 9 s
    castTicks: 14,
    shape: 'melee_arc',
    damage: 12,
    range: 2.4,
    arc: 1.5,
    knockback: 1.8,
    status: { status: 'stagger', power: 1, durationTicks: 14 },
    role: 'opener',
    tag: 'stagger',
    follow: { after: 'weaken', windowTicks: 60, damageMult: 1.3 },
  },

  // Rung 70, payoff: the third press of the signature. Reads the
  // dulled arm (weakened bodies take double), executes a failing
  // guard, and pressed on a stagger it hands back its wait. A kill
  // on it refunds the seat.
  {
    id: 'the_opening',
    name: 'The Opening',
    desc: 'Every guard opens once. A weakened guard takes it half again, a failing one takes it worse, and on a staggered foe it comes straight back.',
    color: '#e0d0a0',
    code: 'Op',
    cooldownTicks: 210, // 10.5 s
    shape: 'melee_arc',
    damage: 13,
    range: 2.3,
    arc: 0.8,
    executeBelow: { frac: 0.3, mult: 2.0 },
    vs: { status: 'weaken', mult: 1.5 },
    role: 'payoff',
    follow: { after: 'stagger', windowTicks: 60, refundTicks: 60 },
    onKill: { refundTicks: 60 },
  },

  // Rung 78, payoff: the rally spent. Four refusals that drink; pressed
  // while the blood is up they land harder and give back their wait.
  {
    id: 'no_quarter',
    name: 'No Quarter',
    desc: 'None asked. None given. Four cuts that feed you, harder and sooner back while your blood is up.',
    color: '#a83c32',
    code: 'Nq',
    cooldownTicks: 210, // 10.5 s
    shape: 'flurry',
    damage: 5,
    range: 2.1,
    arc: 1.0,
    hits: 4,
    pulseEveryTicks: 5,
    drainFrac: 0.2,
    role: 'payoff',
    follow: { after: 'rally', windowTicks: 80, damageMult: 1.4, refundTicks: 40 },
    onKill: { refundTicks: 60 },
  },

  // Rung 90, crown: three acts in one press. Drawn (cast), three waves
  // roll out and shove the ring, and the ground stays the veteran's
  // for five seconds (HELD GROUND: armor and a quick step while he
  // stands on it). Rallies him; read off a shout or a break it widens.
  {
    id: 'the_long_fight',
    name: 'The Long Fight',
    desc: 'You have been here before. Three waves roll out from where you stand, and that ground stays yours a while after. Pressed after a shout or a break it reaches wider.',
    color: '#c9a44a',
    code: 'Lf',
    cooldownTicks: 280, // 14 s
    castTicks: 16,
    shape: 'pulse_nova',
    damage: 7,
    radius: 2.2,
    pulses: 3,
    pulseEveryTicks: 10,
    knockback: 0.8,
    role: 'crown',
    tag: 'rally',
    follow: { after: ['weaken', 'stagger'], windowTicks: 60, damageMult: 1.25, radiusMult: 1.2 },
    aftermath: { fieldTicks: 100, everyTicks: 20, damage: 2, self: { armor: 3, speedMult: 1.08, durationTicks: 22 } },
    onKill: { refundTicks: 60 },
  },

  // The unwritten page, answer: every road walked at once. A quick
  // drawn burst that reads any word of the school and gets the veteran
  // moving.
  {
    id: 'four_roads',
    name: 'Four Roads',
    desc: 'Blade, both hands, string, staff. Every road taught the same hand. After any of your words it hits harder, and it gets you moving.',
    color: '#d8c080',
    code: 'Fr',
    cooldownTicks: 210, // 10.5 s
    castTicks: 12,
    shape: 'nova',
    damage: 10,
    radius: 2.2,
    knockback: 1.0,
    self: { speedMult: 1.1, durationTicks: 80 },
    role: 'answer',
    follow: { after: ['weaken', 'stagger', 'rally'], windowTicks: 60, damageMult: 1.3 },
  },
];

export const COMBAT_LADDER: TechniqueDef[] = [
  // --------------------- THE VETERAN'S SCHOOL — the combat ladder
  {
    ability: 'first_blood',
    style: 'combat',
    unlockLevel: 5,
    ranks: [
      { note: 'The first one lands harder.', damage: 10 },
      { note: 'The wound stays open longer and a kill gives more back.', status: { status: 'bleed', power: 1, durationTicks: 70 }, onKill: { refundTicks: 80 } },
      { note: 'First blood wakes your feet, and comes quicker.', damage: 11, cooldownTicks: 140, self: { speedMult: 1.06, durationTicks: 60 } },
    ],
  },
  {
    ability: 'measured_blow',
    style: 'combat',
    unlockLevel: 10,
    ranks: [
      { note: 'The measure lands heavier.', damage: 13 },
      {
        note: 'Measured on a rally or a shout, it reads the seam too.',
        follow: { after: ['rally', 'weaken'], windowTicks: 60, damageMult: 1.5, status: { status: 'sunder', power: 12, durationTicks: 60 } },
      },
      { note: 'Measured once now. Landed just the same, and harder in the window.', damage: 14, castTicks: 16, cooldownTicks: 140, follow: { after: ['rally', 'weaken'], windowTicks: 60, damageMult: 1.6, status: { status: 'sunder', power: 12, durationTicks: 60 } } },
    ],
  },
  {
    ability: 'shoulder_check',
    style: 'combat',
    unlockLevel: 15,
    ranks: [
      { note: 'More weight behind the shoulder.', damage: 11 },
      { note: 'A longer run at them, and they go further.', dashTiles: 7.2, knockback: 2.0 },
      { note: 'The run comes back sooner and needs less of one.', damage: 13, cooldownTicks: 130, castTicks: 8 },
    ],
  },
  {
    ability: 'drumbeat',
    style: 'combat',
    unlockLevel: 20,
    ranks: [
      { note: 'The drum strikes harder.', damage: 6 },
      { note: 'The cadence holds a fourth bar.', channelTicks: 64 },
      { note: 'The last beat drives the whole line back, half again as hard.', finaleMult: 2.5, radius: 2.3, knockback: 0.9 },
    ],
  },
  {
    ability: 'war_shout',
    style: 'combat',
    unlockLevel: 25,
    ranks: [
      { note: 'Louder, and it hurts more.', damage: 9 },
      { note: 'The yard hears it further out and their arms go softer.', radius: 2.8, status: { status: 'weaken', power: 15, durationTicks: 60 } },
      { note: 'The shout that ends one fight starts the next, and comes quicker.', damage: 10, cooldownTicks: 140, status: { status: 'weaken', power: 15, durationTicks: 80 }, onKill: { refundTicks: 60 } },
    ],
  },
  {
    ability: 'thrown_iron',
    style: 'combat',
    unlockLevel: 30,
    ranks: [
      { note: 'The iron lands harder.', damage: 13 },
      { note: 'The throw carries further, and the shouted throw comes back quicker.', range: 11, projectileSpeed: 16, follow: { after: 'weaken', windowTicks: 60, damageMult: 1.5, refundTicks: 30 } },
      { note: 'Both hands throw now.', projectiles: 2, spreadArc: 0.15, castTicks: 18 },
    ],
  },
  {
    ability: 'second_breath',
    style: 'combat',
    unlockLevel: 35,
    ranks: [
      { note: 'A deeper pull of air, and it knits faster.', self: { heal: 8, speedMult: 1.1, selfStatus: { status: 'mend', power: 3, durationTicks: 100 }, durationTicks: 100 } },
      { note: 'The legs get their share.', self: { heal: 8, speedMult: 1.12, selfStatus: { status: 'mend', power: 3, durationTicks: 100 }, durationTicks: 100 } },
      {
        note: 'The breath steadies the arm too, and the knitting runs longer.',
        self: { heal: 10, speedMult: 1.12, armor: 2, selfStatus: { status: 'mend', power: 3, durationTicks: 120 }, durationTicks: 120 },
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
      { note: 'The exhale holds a fourth count and the last of it bites hardest.', channelTicks: 64, finaleMult: 2.5, cooldownTicks: 200 },
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
        note: 'Grit in the eye. Nobody swings well half blind.',
        status: { status: 'weaken', power: 12, durationTicks: 50 },
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
      { note: 'Through a broken line the toll comes back at once.', damage: 15, cooldownTicks: 200, follow: { after: ['stagger', 'rally'], windowTicks: 50, damageMult: 1.6, refundTicks: 60 } },
    ],
  },
  {
    ability: 'hold_fast',
    style: 'combat',
    unlockLevel: 54,
    ranks: [
      { note: 'The stance sets deeper.', self: { shieldHp: 10, selfStatus: { status: 'stonehide', power: 1, durationTicks: 140 }, durationTicks: 140 } },
      { note: 'Held longer.', self: { shieldHp: 12, selfStatus: { status: 'stonehide', power: 1, durationTicks: 160 }, durationTicks: 160 } },
      {
        note: 'What breaks on stone, breaks back.',
        self: { shieldHp: 14, reflectFrac: 0.1, selfStatus: { status: 'stonehide', power: 1, durationTicks: 160 }, durationTicks: 160 },
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
      { note: 'The last clap is the one they remember.', finaleMult: 2.5, cooldownTicks: 190 },
    ],
  },
  {
    ability: 'break_the_line',
    style: 'combat',
    unlockLevel: 62,
    ranks: [
      { note: 'More of you arrives at once.', damage: 14 },
      { note: 'The line bends further back, further still after the shout.', knockback: 2.2, follow: { after: 'weaken', windowTicks: 60, damageMult: 1.4 } },
      { note: 'A line that breaks and dies gives the next break back.', damage: 16, cooldownTicks: 170, onKill: { refundTicks: 60 } },
    ],
  },
  {
    ability: 'gathered_breath',
    style: 'combat',
    unlockLevel: 66,
    ranks: [
      { note: 'The breath lands heavier.', damage: 12 },
      { note: 'The burst takes the whole square, and the square stays yours longer.', radius: 2.9, knockback: 1.3, aftermath: { fieldTicks: 100, everyTicks: 16, damage: 2, self: { armor: 3, durationTicks: 18 } } },
      { note: 'The ground you hold answers back for you.', cooldownTicks: 180, aftermath: { fieldTicks: 100, everyTicks: 16, damage: 3, self: { armor: 4, reflectFrac: 0.1, durationTicks: 18 } } },
    ],
  },
  {
    ability: 'the_opening',
    style: 'combat',
    unlockLevel: 70,
    ranks: [
      { note: 'The answer arrives heavier.', damage: 15 },
      { note: 'A failing guard is an open door.', executeBelow: { frac: 0.3, mult: 2.3 } },
      { note: 'On a staggered foe the opening is the whole fight.', damage: 16, follow: { after: 'stagger', windowTicks: 60, damageMult: 1.2, refundTicks: 60 } },
    ],
  },
  {
    ability: 'long_watch',
    style: 'combat',
    unlockLevel: 74,
    ranks: [
      { note: 'The watch strikes harder.', damage: 5 },
      { note: 'The ground covered grows, and it draws them in.', radius: 2.5, knockback: -0.5 },
      { note: 'The last beat of the watch is the one they walked into.', finaleMult: 3, cooldownTicks: 230 },
    ],
  },
  {
    ability: 'no_quarter',
    style: 'combat',
    unlockLevel: 78,
    ranks: [
      { note: 'You keep more of what you take.', drainFrac: 0.3 },
      { note: 'Each refusal lands harder.', damage: 6 },
      { note: 'While the blood is up the fight feeds you as fast as it costs them.', drainFrac: 0.4, follow: { after: 'rally', windowTicks: 80, damageMult: 1.5, refundTicks: 40 } },
    ],
  },
  {
    ability: 'scarworn',
    style: 'combat',
    unlockLevel: 82,
    ranks: [
      { note: 'The receipts collect deeper.', damage: 15 },
      { note: 'The taking is thorough.', drainFrac: 0.3 },
      { note: 'The scars answer at once, and a kill on them pays the next.', damage: 16, cooldownTicks: 180, castTicks: 22, onKill: { refundTicks: 60 } },
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
      { note: 'The fight widens around you and the ground bites harder.', radius: 2.4, aftermath: { fieldTicks: 100, everyTicks: 20, damage: 3, self: { armor: 3, speedMult: 1.08, durationTicks: 22 } } },
      { note: 'It ends the way it always ends. You, standing, on ground that answers back.', damage: 9, aftermath: { fieldTicks: 140, everyTicks: 20, damage: 3, self: { armor: 4, speedMult: 1.08, reflectFrac: 0.1, durationTicks: 22 } } },
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
        cooldownTicks: 180,
        self: { speedMult: 1.14, armor: 2, durationTicks: 100 },
        follow: { after: ['weaken', 'stagger', 'rally'], windowTicks: 60, damageMult: 1.5 },
      },
    ],
  },
];
