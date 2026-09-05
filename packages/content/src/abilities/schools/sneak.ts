/**
 * THE SNEAK SCHOOL — THE OPENED VEIN (THE MASTERED HAND, techniques v3,
 * Phase 2). Twenty rung arts and the unwritten page, rebuilt on the
 * school's grammar spine: afflictions stack per source; openers
 * envenom and expose from stealth; payoffs consume bleed and venom
 * (the tithe); sustain is the caltrop bed and the bloodletting note;
 * answers are the smoke, the feint and the ghost step. Three words
 * hang in the air after a sneak art: `venom` (the body is steeped),
 * `expose` (the body is opened), `vanish` (the knife is unseen).
 *
 * The signature: Nightshade Kiss (cast, venom) → Exposing Strike
 * (follows venom, lays sunder, leaves expose) → Thousand Cuts (follows
 * expose, every cut reads venom, the last drinks it dry).
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
 * Lights Out is the sneak school's ONE hold: a casted, fused blast of
 * dark that roots the room for a breath and a half (30t lock, cast 24
 * + fuse 10 = 34t of warning, 30/(220+120) = 8.8% duty; rank IV's
 * 180t cooldown sits at 30/300 = 10.0%, the budget exactly). The root snaps on six honest damage,
 * so it is the knife's moment to vanish or to sow the floor, never a
 * lockdown.
 */
export const SNEAK_LICENSES: Record<string, string[]> = {
  lights_out: ['root'],
};

export const SNEAK_ARTS: AbilityDef[] = [
  // ------------------------------------------------ THE FOUNDING TEN
  // Rung 5, PAYOFF: the first tithe. A level-5 knife already spends
  // the bleed Opened Vein leaves; follows `expose` (Opened Vein,
  // Redwork, Exposing Strike) and a kill gives the seat back.
  {
    id: 'rend',
    name: 'Rend',
    desc: 'Tear the wound wider. Rend spends every bleed on the body for half again the cut, cuts half again harder inside three seconds of an exposing art, and a kill gives two seconds back.',
    color: '#8a3040',
    code: 'Rz',
    cooldownTicks: 140, // 7 s
    shape: 'melee_arc',
    damage: 5,
    range: 1.9,
    arc: 0.9,
    status: { status: 'bleed', power: 1, durationTicks: 60 },
    vs: { status: 'bleed', mult: 1.5, consume: true },
    follow: { after: 'expose', windowTicks: 60, damageMult: 1.5 },
    onKill: { refundTicks: 40 },
    role: 'payoff',
  },

  // Rung 25, ANSWER: the school's escape and its stealth word. The
  // smoke stays as HELD GROUND: the room chokes at half speed while
  // the knife moves quick inside its own cloud, vanished for Fan of
  // Knives or Whisper Fang.
  {
    id: 'smoke_bomb',
    name: 'Smoke Bomb',
    desc: 'Drop the room into gray. Everything caught gropes at half speed while the smoke stands, you move quick inside your own cloud, and you are vanished for the art that follows.',
    color: '#8a8794',
    code: 'Sz',
    cooldownTicks: 240, // 12 s
    shape: 'nova',
    damage: 2,
    radius: 2.4,
    status: { status: 'chill', power: 1, durationTicks: 100 },
    aftermath: {
      fieldTicks: 80,
      everyTicks: 20,
      damage: 0,
      radius: 2.4,
      status: { status: 'chill', power: 1, durationTicks: 30 },
      self: { speedMult: 1.3, durationTicks: 22 },
    },
    tag: 'vanish',
    role: 'answer',
  },

  // Rung 54, ANSWER: the oiled edge. A stance, not a strike: every
  // basic for eight seconds lays venom, so the venom payoffs (Night
  // Fangs, Thousand Cuts) always find a body ready for them.
  {
    id: 'envenom',
    name: 'Envenom',
    desc: 'Oil the edge. For eight seconds every cut you land carries venom, so the fangs and the thousand cuts that drink venom always find a body ready for them.',
    color: '#a0c050',
    code: 'Ev',
    cooldownTicks: 320, // 16 s
    shape: 'self_buff',
    damage: 0,
    self: { onHitStatus: { status: 'venom', power: 1, durationTicks: 80 }, durationTicks: 160 },
    role: 'answer',
  },

  // Rung 78, PAYOFF: the seeking fangs drink the venom (consume) and
  // bite harder at an exposed body; the ranged tithe for a knife that
  // has stepped back.
  {
    id: 'night_fangs',
    name: 'Night Fangs',
    desc: 'Three thrown fangs of dark that pick their own throats. They drink every venom on the body for half again the bite, and thrown inside three seconds of an exposing art they strike half again harder.',
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
    vs: { status: 'venom', mult: 1.5, consume: true },
    follow: { after: 'expose', windowTicks: 60, damageMult: 1.5 },
    role: 'payoff',
  },

  // --------------------- THE SECOND BREATH — the sneak breath arts
  // Rung 10, OPENER: the casted artery. Deep bleed, and the body is
  // exposed for Rend (the level-5 tithe) or Thousand Cuts.
  {
    id: 'opened_vein',
    name: 'Opened Vein',
    desc: 'Draw the breath, then open the artery. A deep bleed that runs five seconds, and the body is exposed for three: Rend or Thousand Cuts landed in that window cut half again harder.',
    color: '#9a3040',
    code: 'Vn',
    cooldownTicks: 200, // 10 s
    castTicks: 18,
    shape: 'melee_arc',
    damage: 6,
    range: 2.0,
    arc: 0.9,
    status: { status: 'bleed', power: 2, durationTicks: 100 },
    tag: 'expose',
    role: 'opener',
  },

  // Rung 20, SUSTAIN: the first held note. Three passes of the needle,
  // the last pull tears the seam (finale): the level-20 player learns
  // that a channel held whole is paid and a channel broken is not.
  {
    id: 'threadwork',
    name: 'Threadwork',
    desc: 'Hold still and sew. Three passes of the needle through the same seam, and the last pull tears it for two and a half times the cut. Break the note early and you keep only the stitches.',
    color: '#7a6a8a',
    code: 'Tk',
    cooldownTicks: 190, // 9.5 s
    channelTicks: 48,
    pulseEveryTicks: 16,
    shape: 'melee_arc',
    damage: 4,
    range: 2.0,
    arc: 0.8,
    status: { status: 'bleed', power: 1, durationTicks: 40 },
    finaleMult: 2.5,
    role: 'sustain',
  },

  // Rung 30, OPENER: the signature's first press. Casted dart, deep
  // venom, and the body is envenomed for Exposing Strike's follow.
  {
    id: 'nightshade_kiss',
    name: 'Nightshade Kiss',
    desc: 'A dart steeped a week in the garden nobody plants twice. Deep venom for four seconds, and the body is envenomed for three: Exposing Strike landed in that window cuts half again harder and cracks them open.',
    color: '#8aa050',
    code: 'Nk',
    cooldownTicks: 230, // 11.5 s
    castTicks: 20,
    shape: 'projectile_fan',
    damage: 6,
    range: 9,
    projectiles: 1,
    projectileSpeed: 16,
    status: { status: 'venom', power: 2, durationTicks: 80 },
    tag: 'venom',
    role: 'opener',
  },

  // Rung 40, OPENER: the channeled steeping. A held line that lays
  // venom every breath and cuts twice on the last, leaving the
  // corridor envenomed for Exposing Strike.
  {
    id: 'quiet_knife',
    name: 'The Quiet Knife',
    desc: 'Lay a line of hush down the corridor and hold it. Every breath steeps whatever stands on the line in venom, the last breath cuts twice, and the line leaves them envenomed for the strike that follows.',
    color: '#6a6480',
    code: 'Qk',
    cooldownTicks: 180, // 9 s
    channelTicks: 48,
    pulseEveryTicks: 16,
    shape: 'beam',
    damage: 4,
    range: 7,
    width: 0.5,
    status: { status: 'venom', power: 1, durationTicks: 48 },
    finaleMult: 2,
    tag: 'venom',
    role: 'opener',
  },

  // Rung 50, OPENER: the casted bloom that leaves a blood pool
  // (aftermath) and exposes the whole room for Rend, Night Fangs or
  // Thousand Cuts.
  {
    id: 'redwork',
    name: 'Redwork',
    desc: 'The slow inhale, then the room blooms red. A pool of blood stays on the floor and bleeds whoever stands in it, and every body in the room is exposed for the tithe that follows.',
    color: '#a84048',
    code: 'Rd',
    cooldownTicks: 220, // 11 s
    castTicks: 22,
    shape: 'nova',
    damage: 8,
    radius: 2.3,
    status: { status: 'bleed', power: 1, durationTicks: 60 },
    aftermath: {
      fieldTicks: 64,
      everyTicks: 16,
      damage: 2,
      status: { status: 'bleed', power: 1, durationTicks: 40 },
    },
    tag: 'expose',
    role: 'opener',
  },

  // Rung 58, SUSTAIN: the chained note. The noose walks the line and
  // the last pull draws it tight (finale); every neck it touched is
  // venomed for the payoffs.
  {
    id: 'gallows_thread',
    name: 'Gallows Thread',
    desc: 'The noose passes down the line one neck at a time. Hold the knot three breaths; the last pull draws it tight for two and a half times the bite, and every neck it touched is venomed.',
    color: '#5a5468',
    code: 'Gh',
    cooldownTicks: 220, // 11 s
    channelTicks: 48,
    pulseEveryTicks: 16,
    shape: 'chain_zap',
    damage: 4,
    range: 9,
    radius: 3.0,
    chainTargets: 2,
    status: { status: 'venom', power: 1, durationTicks: 40 },
    finaleMult: 2.5,
    role: 'sustain',
  },

  // Rung 66, OPENER: the casted fan of steeped needles, three bodies
  // envenomed at once for the crowd payoffs (Night Fangs, Thousand
  // Cuts) and Exposing Strike's follow.
  {
    id: 'widows_draw',
    name: "Widow's Draw",
    desc: 'A fan of steeped needles dealt like cards. Everyone at the table takes venom, and the whole table is envenomed for three seconds: Exposing Strike or the fangs landed in that window collect the debt.',
    color: '#b0b47a',
    code: 'Wd',
    cooldownTicks: 230, // 11.5 s
    castTicks: 22,
    shape: 'projectile_fan',
    damage: 7,
    range: 10,
    projectiles: 3,
    spreadArc: 0.5,
    projectileSpeed: 15,
    element: 'verdant',
    status: { status: 'venom', power: 1, durationTicks: 60 },
    tag: 'venom',
    role: 'opener',
  },

  // Rung 74, SUSTAIN: the surgery. Four beats that drink what they
  // lose, the last beat cutting twice; the knife's only mend.
  {
    id: 'bloodletting',
    name: 'Bloodletting',
    desc: 'The old surgery, held to its rhythm. Four beats, each drinking a share of what they lose back into you, and the last beat cuts twice as deep.',
    color: '#8a2a34',
    code: 'Bt',
    cooldownTicks: 220, // 11 s
    channelTicks: 64,
    pulseEveryTicks: 16,
    shape: 'melee_arc',
    damage: 4,
    range: 2.1,
    arc: 1.0,
    drainFrac: 0.15,
    status: { status: 'bleed', power: 1, durationTicks: 40 },
    finaleMult: 2,
    role: 'sustain',
  },

  // Rung 82, OPENER: the school's one hold. Casted and fused, the dark
  // roots the room for a breath and a half (LICENSED: root) and the
  // knife is vanished for Fan of Knives or Whisper Fang.
  {
    id: 'lights_out',
    name: 'Lights Out',
    desc: 'Pinch the wick of a whole room. The dark lands and holds every body in it rooted for a breath and a half, and you are vanished until the knives arrive.',
    color: '#3a3450',
    code: 'Lx',
    cooldownTicks: 220, // 11 s
    castTicks: 24,
    shape: 'ground_aoe',
    damage: 12,
    range: 10,
    radius: 2.0,
    fuseTicks: 10,
    status: { status: 'root', power: 0, durationTicks: 30 },
    tag: 'vanish',
    role: 'opener',
  },

  // Rung 86, SUSTAIN: the long red note. Four beats across the room,
  // bleeding bodies pay half again, and the last beat cuts twice.
  {
    id: 'red_hour',
    name: 'The Red Hour',
    desc: 'The hour where every second cuts. Stand in the middle and count four beats of red across the room. The bleeding pay half again on every beat, and the last beat cuts twice.',
    color: '#c4384a',
    code: 'Rh',
    cooldownTicks: 260, // 13 s
    channelTicks: 64,
    pulseEveryTicks: 16,
    shape: 'nova',
    damage: 4,
    radius: 2.0,
    status: { status: 'bleed', power: 1, durationTicks: 40 },
    vs: { status: 'bleed', mult: 1.5 },
    finaleMult: 2,
    role: 'sustain',
  },

  // ------------------------------------ THE OPEN LADDER — new sneak arts
  // Rung 15, ANSWER: the mobility beat that leaves the stealth word.
  // Pass through them and the hush follows; Fan of Knives or Whisper
  // Fang thrown out of it strike harder.
  {
    id: 'ghost_step',
    name: 'Ghost Step',
    desc: 'Walk through them like a rumor and come out the far side unseen. The passing cut bleeds, and for three seconds you are vanished: Fan of Knives or Whisper Fang thrown from that hush strike harder.',
    color: '#8a7fae',
    code: 'Gt',
    cooldownTicks: 160, // 8 s
    shape: 'dash_strike',
    damage: 5,
    dashTiles: 6.8,
    status: { status: 'bleed', power: 1, durationTicks: 40 },
    tag: 'vanish',
    role: 'answer',
  },

  // Rung 35, SUSTAIN: the standing bed of iron. The field holds the
  // ground the knife wants kept, and bleeding bodies pay half again
  // for every crossing.
  {
    id: 'caltrops',
    name: 'Caltrops',
    desc: 'Sow the floor with iron teeth. Whoever crosses pays and bleeds, and a body already bleeding pays half again for every step it takes on the iron.',
    color: '#7a7468',
    code: 'Ca',
    cooldownTicks: 240, // 12 s
    shape: 'ground_field',
    damage: 3,
    range: 7,
    radius: 1.8,
    fieldTicks: 140,
    pulseEveryTicks: 16,
    status: { status: 'bleed', power: 1, durationTicks: 40 },
    vs: { status: 'bleed', mult: 1.5 },
    role: 'sustain',
  },

  // Rung 45, PAYOFF: the burst out of the smoke. Follows `vanish`
  // (Ghost Step, Smoke Bomb, Feint Double, Lights Out) for the room,
  // and a kill gives the seat back.
  {
    id: 'fan_of_knives',
    name: 'Fan of Knives',
    desc: 'Every direction at once, every edge yours. Thrown from a vanish, out of the smoke or off the ghost step, the fan cuts more than half again harder, and a kill gives two seconds back.',
    color: '#a8a4b8',
    code: 'Fk',
    cooldownTicks: 200, // 10 s
    shape: 'nova',
    damage: 6,
    radius: 2.2,
    status: { status: 'bleed', power: 1, durationTicks: 60 },
    follow: { after: 'vanish', windowTicks: 60, damageMult: 1.6 },
    onKill: { refundTicks: 40 },
    role: 'payoff',
  },

  // Rung 62, ANSWER: the lie that draws the room while the knife is
  // vanished for the art that follows.
  {
    id: 'feint_double',
    name: 'Feint Double',
    desc: 'Leave a lie standing where you were and slip out of sight. The double draws the room for seven seconds, and you are vanished for the art that follows.',
    color: '#8a8494',
    code: 'Fd',
    cooldownTicks: 300, // 15 s
    shape: 'summon',
    damage: 0,
    summon: { kind: 'decoy', durationTicks: 140, radius: 5, power: 0 },
    tag: 'vanish',
    role: 'answer',
  },

  // Rung 70, PAYOFF: the signature's hinge. Follows `venom` (the Kiss,
  // the Quiet Knife, the Draw), cracks the body open with sunder,
  // leaves `expose` for Thousand Cuts, and finishes the faltering.
  {
    id: 'exposing_strike',
    name: 'Exposing Strike',
    desc: 'Find the seam in them and make it official. Landed inside three seconds of a venom art it cuts half again harder. Either way it cracks them open with sunder, exposes them for Rend or Thousand Cuts, and finishes the faltering below a third.',
    color: '#9a6a8a',
    code: 'Ex',
    cooldownTicks: 170, // 8.5 s
    shape: 'melee_arc',
    damage: 8,
    range: 2.0,
    arc: 0.9,
    status: { status: 'sunder', power: 15, durationTicks: 80 },
    executeBelow: { frac: 0.35, mult: 1.8 },
    follow: { after: 'venom', windowTicks: 60, damageMult: 1.5 },
    tag: 'expose',
    onKill: { refundTicks: 40 },
    role: 'payoff',
  },

  // Rung 90, CROWN: the three-act art in one press. Five cuts in a
  // breath, every cut reads venom and the last drinks it dry, half
  // again on an exposed body, and a kill gives the seat back.
  {
    id: 'thousand_cuts',
    name: 'Thousand Cuts',
    desc: 'Stop counting, start cutting. Five cuts in a breath, every one half again on a venomed body and the last drinking the venom dry. Land it inside three seconds of an exposing art and every cut is half again again, and a kill gives three seconds back.',
    color: '#c4b8d8',
    code: 'Tc',
    cooldownTicks: 240, // 12 s
    shape: 'flurry',
    damage: 3,
    range: 2.0,
    arc: 0.9,
    hits: 5,
    pulseEveryTicks: 4,
    status: { status: 'bleed', power: 1, durationTicks: 40 },
    vs: { status: 'venom', mult: 1.5, consume: true },
    follow: { after: 'expose', windowTicks: 60, damageMult: 1.5 },
    onKill: { refundTicks: 60 },
    role: 'crown',
  },

  // THE UNWRITTEN PAGE, PAYOFF: the named throat. Reads `vanish` from
  // range, so the smoke and the ghost step pay off at a distance, and
  // the follow gives the seat two seconds back.
  {
    id: 'whisper_fang',
    name: 'Whisper Fang',
    desc: 'One fang, spoken softly, that finds the throat that was named. Thrown from a vanish it strikes half again harder and comes back to the hand two seconds sooner.',
    color: '#6a5a88',
    code: 'Wf',
    cooldownTicks: 190, // 9.5 s
    shape: 'projectile_fan',
    damage: 9,
    range: 12,
    projectiles: 1,
    projectileSpeed: 16,
    homing: 7.0,
    element: 'void',
    status: { status: 'bleed', power: 1, durationTicks: 60 },
    follow: { after: 'vanish', windowTicks: 60, damageMult: 1.5, refundTicks: 40 },
    role: 'payoff',
  },
];

export const SNEAK_LADDER: TechniqueDef[] = [
  {
    ability: 'rend',
    style: 'sneak',
    unlockLevel: 5,
    ranks: [
      { note: 'The tear bites deeper.', damage: 6 },
      { note: 'The tear comes sooner, and a kill pays back three seconds.', cooldownTicks: 120, onKill: { refundTicks: 60 } },
      {
        note: 'The Tithe: on an exposed body the tear is three quarters again, and the kill pays faster.',
        follow: { after: 'expose', windowTicks: 60, damageMult: 1.75 },
        onKill: { refundTicks: 80 },
      },
    ],
  },
  {
    ability: 'opened_vein',
    style: 'sneak',
    unlockLevel: 10,
    ranks: [
      { note: 'The cut sits deeper.', damage: 7 },
      { note: 'The vein gives more freely.', status: { status: 'bleed', power: 3, durationTicks: 100 } },
      {
        note: 'The Vein Never Closes: the cut leaves a pool of blood on the floor.',
        cooldownTicks: 180,
        aftermath: { fieldTicks: 48, everyTicks: 16, damage: 2, status: { status: 'bleed', power: 1, durationTicks: 40 } },
      },
    ],
  },
  {
    ability: 'ghost_step',
    style: 'sneak',
    unlockLevel: 15,
    ranks: [
      { note: 'A longer walk.', dashTiles: 8.4 },
      { note: 'The rumor travels oftener.', cooldownTicks: 130 },
      {
        note: 'The Open Passage: you pass, and the wound stays open behind you.',
        damage: 6,
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
      { note: 'The thread pulls red behind it.', status: { status: 'bleed', power: 1, durationTicks: 60 } },
      { note: 'The Knot: the last pull tears the seam for three times the cut.', finaleMult: 3 },
    ],
  },
  {
    ability: 'smoke_bomb',
    style: 'sneak',
    unlockLevel: 25,
    ranks: [
      { note: 'The gray reaches farther.', radius: 2.8 },
      {
        note: 'The smoke stands six seconds.',
        aftermath: {
          fieldTicks: 120,
          everyTicks: 20,
          damage: 0,
          radius: 2.4,
          status: { status: 'chill', power: 1, durationTicks: 30 },
          self: { speedMult: 1.3, durationTicks: 22 },
        },
      },
      { note: 'The Lost Room: a whole hall gone to gray, and you a ghost in it.', radius: 3.2, cooldownTicks: 220 },
    ],
  },
  {
    ability: 'nightshade_kiss',
    style: 'sneak',
    unlockLevel: 30,
    ranks: [
      { note: 'The dart strikes truer.', damage: 8 },
      { note: 'The kiss asks again sooner.', cooldownTicks: 210 },
      {
        note: 'Two Kisses: the dart flies twinned, two venoms steeping at once.',
        projectiles: 2,
        spreadArc: 0.1,
      },
    ],
  },
  {
    ability: 'caltrops',
    style: 'sneak',
    unlockLevel: 35,
    ranks: [
      { note: 'The teeth bite deeper.', damage: 4 },
      { note: 'More iron, sown wider, waiting longer, sooner.', radius: 2.2, fieldTicks: 160, cooldownTicks: 220 },
      {
        note: 'Rusted Barbs: the crossing is never forgotten.',
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
      { note: 'The Hush Falls: the last breath cuts two and a half times over.', finaleMult: 2.5, cooldownTicks: 170 },
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
        note: 'Every Edge Signs Its Name: out of the smoke, the fan nearly doubles.',
        status: { status: 'bleed', power: 2, durationTicks: 60 },
        follow: { after: 'vanish', windowTicks: 60, damageMult: 1.8 },
      },
    ],
  },
  {
    ability: 'redwork',
    style: 'sneak',
    unlockLevel: 50,
    ranks: [
      { note: 'The bloom cuts deeper.', damage: 10 },
      { note: 'The red reaches the far walls.', radius: 2.6 },
      {
        note: 'The Pool Keeps: the blood stands five seconds and bleeds deeper.',
        cooldownTicks: 200,
        aftermath: { fieldTicks: 96, everyTicks: 16, damage: 3, status: { status: 'bleed', power: 1, durationTicks: 40 } },
      },
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
        note: 'The Crueler Brew: every cut carries a double dose.',
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
      { note: 'The Third Neck: the noose reaches one body further down the line.', chainTargets: 3 },
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
        note: 'The Gathered Crowd: a lie good enough to draw the whole room.',
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
      { note: "The Widow's Patience: the needles seek, and the deal comes round sooner.", cooldownTicks: 210, homing: 4 },
    ],
  },
  {
    ability: 'exposing_strike',
    style: 'sneak',
    unlockLevel: 70,
    ranks: [
      { note: 'The seam opens wider.', damage: 10 },
      { note: 'You find it faster.', cooldownTicks: 150 },
      {
        note: 'What Is Open, Ends: the crack runs deeper and the faltering below two fifths die.',
        executeBelow: { frac: 0.4, mult: 2.2 },
        status: { status: 'sunder', power: 20, durationTicks: 80 },
      },
    ],
  },
  {
    ability: 'bloodletting',
    style: 'sneak',
    unlockLevel: 74,
    ranks: [
      { note: 'The surgery cuts deeper.', damage: 5 },
      { note: 'The rhythm quickens.', cooldownTicks: 200 },
      { note: 'The Thorough Taking: a quarter drunk back, and the last beat cuts thrice.', drainFrac: 0.25, finaleMult: 2.5 },
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
        note: 'The Bites Stay Open: every fang leaves a deep bleed for the tithe.',
        status: { status: 'bleed', power: 2, durationTicks: 60 },
      },
    ],
  },
  {
    ability: 'lights_out',
    style: 'sneak',
    unlockLevel: 82,
    ranks: [
      { note: 'The dark lands heavier.', damage: 15 },
      { note: 'The room grows, and the dark lands heavier still.', radius: 2.4, damage: 17 },
      {
        note: 'The Dark Stays: the room stays cold after the light, and the wick pinches sooner.',
        cooldownTicks: 180,
        damage: 18,
        aftermath: { fieldTicks: 48, everyTicks: 16, damage: 0, status: { status: 'chill', power: 1, durationTicks: 30 } },
      },
    ],
  },
  {
    ability: 'red_hour',
    style: 'sneak',
    unlockLevel: 86,
    ranks: [
      { note: 'Every second cuts deeper.', damage: 5 },
      { note: 'The hour fills a wider room.', radius: 2.3 },
      { note: 'The Clock Strikes: the last beat cuts three times over.', finaleMult: 3, cooldownTicks: 240 },
    ],
  },
  {
    ability: 'thousand_cuts',
    style: 'sneak',
    unlockLevel: 90,
    ranks: [
      { note: 'Each cut counts double.', damage: 4 },
      { note: 'A sixth beat in the drumroll.', hits: 6, cooldownTicks: 230 },
      {
        note: 'Count Them Later: every cut leaves a deep bleed, and a kill pays back four seconds.',
        status: { status: 'bleed', power: 2, durationTicks: 40 },
        onKill: { refundTicks: 80 },
      },
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
        note: 'The Whisper Keeps Talking: the bleed runs deep after it lands.',
        status: { status: 'bleed', power: 2, durationTicks: 80 },
      },
    ],
  },
];
