/**
 * Legion-dialect laws: every hobgoblin NPC id owns a bespoke look (no
 * variant falls back to a reskin), the warlord and the juggernaut are
 * DESIGNS and not scale-ups, the rank-and-file rolls a SKIN CLUSTER
 * from its hashed spawn seed while THE BANNER IS ONE (the legion
 * crimson never varies — a legion sorts by rank, never family), the
 * master race shares not one hide with the goblins it commands, the
 * whole dialect paints clean across all eight facing bands (no NaN
 * geometry), the face never shows from behind, the war queue hangs
 * DOWN and grows with rank, the snarl pins the blades flatter, the
 * discipline inversion holds (pack without craven — a goblin bolts, a
 * legionary stands), the phalanx lane rides only the shield-bearers,
 * the wilds patrol the expedition line and march at night behind the
 * warlord, the war-camp def carries the family, and the loot-story
 * law holds: the ring off the braid and the crest off the galea
 * really drop.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LOOT_TABLES, NPCS, POI_DEFS, wildCandidates } from '@arx/content';
import {
  HOB_LOOKS,
  drawHobEar,
  drawHobQueue,
  drawHobgoblinArm,
  hobEarCarriage,
  hobEarStyle,
  hobQueueCarriage,
  hobQueueStyle,
  hobgoblinLook,
  paintHobgoblinBody,
  paintHobgoblinFoot,
  paintHobgoblinHead,
  type HobgoblinLook,
} from './hobgoblin.js';
import { GOBLIN_LOOKS } from './rig.js';
import { earRestChain } from './earPhysics.js';

const HOB_IDS = [
  'hobgoblin',
  'hobgoblin_archer',
  'hobgoblin_warcaster',
  'hobgoblin_champion',
  'hobgoblin_juggernaut',
] as const;

test('every hobgoblin NPC has its own authored look', () => {
  const ids = [...NPCS.keys()].filter((id) => id.startsWith('hobgoblin'));
  assert.ok(
    ids.length >= 5,
    'the legion fields the line, the bow, the flame, the warlord, and the breach',
  );
  for (const id of ids) {
    assert.ok(HOB_LOOKS[id], `${id} must not fall back to a generic reskin`);
  }
  // Unknown future ids degrade to the line rank, never crash.
  assert.equal(hobgoblinLook('hobgoblin_new_thing', 7).hide, HOB_LOOKS['hobgoblin']!.hide);
});

test('THE MASTER RACE STANDS APART: no hobgoblin wears a goblin hide', () => {
  // The user's founding order: not one part shared with the goblin.
  // Structural half: no palette collision between the two species'
  // authored designs (the painter half is a different module by
  // construction — hobgoblin.ts imports nothing from the greenskin).
  const gobHides = new Set(Object.values(GOBLIN_LOOKS).map((g) => g.hide));
  for (const [id, hb] of Object.entries(HOB_LOOKS)) {
    assert.ok(!gobHides.has(hb.hide), `${id} must not wear a goblin green`);
  }
});

test('the warlord and the juggernaut are designs, not scale-ups', () => {
  const line = HOB_LOOKS['hobgoblin']!;
  const lord = HOB_LOOKS['hobgoblin_champion']!;
  const jugg = HOB_LOOKS['hobgoblin_juggernaut']!;
  assert.ok(line.heavy < lord.heavy && lord.heavy < jugg.heavy, 'rank climbs the frame');
  assert.notEqual(line.hide, lord.hide, 'each rank wears its own skin');
  assert.equal(lord.helm, 'crest', 'the officer wears the combed galea');
  assert.equal(jugg.helm, 'horns', 'the breach wears the horned crown');
  assert.ok(lord.scarred && !line.scarred, 'only the warlord carries the ledger of scars');
  assert.ok(lord.standard && !line.standard && !jugg.standard, 'the standard is the warlord alone');
  assert.ok(lord.bearded && jugg.bearded && !line.bearded, 'the jaw fringe is an officer right');
  assert.ok(lord.queue > line.queue, 'rank grows the braid');
});

test('THE BANNER IS ONE: skins roll, the crimson never does', () => {
  // Different cluster bits roll different skins on the line ranks...
  const a = hobgoblinLook('hobgoblin', 0);
  const b = hobgoblinLook('hobgoblin', 8);
  assert.notEqual(a.hide, b.hide, 'seeds in different clusters wear different skins');
  // ...but every rolled body flies the SAME banner (the inversion of
  // the skral's family banners — a legion sorts by rank).
  assert.equal(a.banner, b.banner, 'the crimson is the legion, not the family');
  assert.equal(a.banner, HOB_LOOKS['hobgoblin']!.banner);
  // The same seed always wears the same skin (cached identity)...
  assert.equal(hobgoblinLook('hobgoblin', 8), b, 'a body keeps its skin frame to frame');
  // ...the longbowman rolls the same muster stock...
  assert.notEqual(hobgoblinLook('hobgoblin_archer', 0).hide, hobgoblinLook('hobgoblin_archer', 8).hide);
  // ...and the ranked never roll: their designs hold at any seed.
  for (const id of ['hobgoblin_warcaster', 'hobgoblin_champion', 'hobgoblin_juggernaut']) {
    const authored = HOB_LOOKS[id]!;
    assert.equal(hobgoblinLook(id, 0).hide, authored.hide, `${id} holds its design`);
    assert.equal(hobgoblinLook(id, 8).hide, authored.hide, `${id} holds its design at any seed`);
  }
  assert.equal(hobgoblinLook('hobgoblin_champion', 8).seed, 8);
});

test('THE DISCIPLINE INVERSION: the legion holds where the goblin bolts', () => {
  for (const id of HOB_IDS) {
    const def = NPCS.get(id)!;
    assert.equal(def.pack, 'hobgoblin', `${id} answers with the column`);
    assert.ok(!def.craven, `${id} NEVER routs — the discipline IS the species`);
  }
  // The contrast is the point — pin it against drift on either side.
  assert.ok(NPCS.get('goblin')!.craven, 'the goblin still bolts (the rabble stays rabble)');
});

test('the kits speak iron and flame, and the horn is an order', () => {
  const lord = NPCS.get('hobgoblin_champion')!;
  assert.equal(lord.kit?.[0]?.ability, 'warlord_horn', 'the horn calls the camp');
  assert.ok(lord.kit?.[0]?.rally, 'the horn IS a rally — the fight is the formation');
  assert.ok((lord.kit?.[0]?.windupTicks ?? 0) > 0, 'the breath is drawn before the note');
  assert.equal(lord.attackStatus?.status, 'bleed', "the officer's steel keeps arguing");
  const caster = NPCS.get('hobgoblin_warcaster')!;
  const kitIds = (caster.kit ?? []).map((k) => k.ability);
  assert.deepEqual(kitIds, ['iron_brand', 'forge_ring'], 'the flame-speaker owns both words');
  for (const k of caster.kit ?? []) {
    assert.ok((k.windupTicks ?? 0) > 0, `${k.ability} is WOUND — the charge law`);
  }
  assert.ok(caster.resist?.includes('burn'), 'forge-raised: the fire is an old friend');
  assert.ok(caster.weak?.includes('chill'), 'deep cold cracks the forge-raised');
  const jugg = NPCS.get('hobgoblin_juggernaut')!;
  assert.equal(jugg.kit?.[0]?.ability, 'ground_slam', 'the breach breaks ground');
});

test('THE PHALANX LANE rides the shield-bearers alone', () => {
  for (const id of ['hobgoblin', 'hobgoblin_champion', 'hobgoblin_juggernaut']) {
    const def = NPCS.get(id)!;
    assert.ok(def.lanes?.resist?.includes('archery'), `the wall turns the shaft on ${id}`);
    assert.ok(def.lanes?.weak?.includes('twohand'), `the crush caves the wall on ${id}`);
  }
  for (const id of ['hobgoblin_archer', 'hobgoblin_warcaster']) {
    assert.equal(NPCS.get(id)!.lanes, undefined, `${id} carries no shield and fights fair`);
  }
});

test('the legion patrols by day and marches at night behind the warlord', () => {
  const day = wildCandidates(3, 'grass', 12);
  assert.ok(day.some((e) => e.npc === 'hobgoblin'), 'the expedition line is patrolled');
  const night = wildCandidates(4, 'forest', 23);
  const march = night.find((e) => e.npc === 'hobgoblin' && e.lead?.npc === 'hobgoblin_champion');
  assert.ok(march, 'after dark the column marches behind the warlord');
  // No hobgoblin below the expedition line: tier 2 fields none.
  const shallow = wildCandidates(2, 'grass', 12);
  assert.ok(!shallow.some((e) => e.npc.startsWith('hobgoblin')), 'the legion keeps the line');
});

test('THE WAR-CAMP: the def carries the family and crowns the warlord', () => {
  const def = POI_DEFS.get('hobgoblin_warcamp');
  assert.ok(def, 'the war-camp is a registered archetype');
  assert.equal(def!.family, 'hobgoblin', 'the territory atlas knows the legion');
  assert.ok(
    def!.garrison.some((g) => g.npc === 'hobgoblin_champion' && (g.names?.length ?? 0) >= 4),
    'the named warlord holds the heart',
  );
  assert.ok(
    def!.garrison.some((g) => g.npc === 'hobgoblin_archer' && g.patrol),
    'a legion camp posts sentries that WALK',
  );
});

test('the loot-story law: the ring, the crest, and the issued steel drop', () => {
  const line = LOOT_TABLES.get('hobgoblin')!;
  assert.ok(line.entries.some((e) => e.item === 'legion_ring'), 'the queue-ring pays the count');
  const lord = LOOT_TABLES.get('hobgoblin_champion')!;
  assert.ok(lord.entries.some((e) => e.item === 'warlord_crest'), 'the crest leaves the galea');
  const arms = LOOT_TABLES.get('hobgoblin_arms')!;
  for (const item of ['iron_sword', 'oak_kiteshield', 'shortbow', 'steel_sword', 'iron_greatblade', 'ember_staff']) {
    assert.ok(arms.entries.some((e) => e.item === item), `the ${item} really drops off the rack`);
  }
  for (const id of HOB_IDS) {
    const def = NPCS.get(id)!;
    assert.ok(
      def.loot.includes(id === 'hobgoblin_champion' ? 'hobgoblin_champion' : 'hobgoblin'),
      `${id} pays from the legion tables`,
    );
  }
});

test('the carriage laws: the queue HANGS and rank raises it, the snarl pins the blades', () => {
  const line = HOB_LOOKS['hobgoblin']!;
  const lord = HOB_LOOKS['hobgoblin_champion']!;
  // The queue's rest direction is DOWN: the chain's tip must sit
  // below its root at a calm carriage (hair hangs, it never stands).
  const qc = hobQueueCarriage(line, 0);
  const chain = earRestChain(1, qc, { dir: Math.PI / 2, pin: 0, sway: 0 });
  assert.ok(
    chain.pts[chain.pts.length - 1]!.y > chain.pts[0]!.y,
    'the braid hangs below its own root',
  );
  // Rank reach: the warlord's carriage out-reaches the line's.
  assert.ok(
    hobQueueCarriage(lord, 0).length > hobQueueCarriage(line, 0).length,
    'the officer braid is the longer',
  );
  // The alarm kicks the braid up and out — the strike-beat snap.
  assert.ok(hobQueueCarriage(line, 1).rise > hobQueueCarriage(line, 0).rise);
  // The snarl PINS the ear blades: spread narrows as the pin rises.
  assert.ok(hobEarCarriage(1, 1).spread < hobEarCarriage(1, 0).spread, 'the snarl lays the blades back');
});

/** A recording 2D-context stand-in: counts calls, rejects NaN coords. */
function mockCtx(ink: string): CanvasRenderingContext2D & {
  fills: number;
  inkFills: number;
} {
  const counter = {
    fills: 0,
    inkFills: 0,
    fillStyle: '#000' as string,
    strokeStyle: '#000' as string,
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    globalAlpha: 1,
  };
  const checkNums = (args: unknown[]): void => {
    for (const a of args) {
      if (typeof a === 'number') {
        assert.ok(Number.isFinite(a), 'painter emitted NaN geometry');
      }
    }
  };
  const noop = (...args: unknown[]): void => checkNums(args);
  return new Proxy(counter, {
    get(target, prop: string) {
      if (prop in target) return target[prop as keyof typeof target];
      const count = () => {
        target.fills++;
        // Face ink is counted by the LOOK'S OWN ink color — hair and
        // strap fills share the dark family, so a prefix test would
        // convict the scalp of being a face.
        if (target.fillStyle === ink) target.inkFills++;
      };
      if (prop === 'fill') return count;
      if (prop === 'fillRect') {
        return (...args: unknown[]) => {
          checkNums(args);
          count();
        };
      }
      return noop;
    },
    set(target, prop: string, value) {
      (target as Record<string, unknown>)[prop] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D & { fills: number; inkFills: number };
}

const FACINGS = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => (i / 8) * Math.PI * 2);

function headFrame(dir: number, gape = 0, hurt = false, nowMs = 1234) {
  const fx = Math.cos(dir);
  const fy = Math.sin(dir);
  return {
    s: 44,
    headX: fx * 2.6,
    headY: -30,
    hw: 6.9,
    hh: 6.6,
    cut: 2.2,
    fx,
    fy,
    profileK: Math.abs(fx),
    backK: Math.max(0, Math.min(1, (-fy - 0.2) / 0.35)),
    lead: fx >= 0 ? 1 : -1,
    hurt,
    nowMs,
    gape,
  };
}

function bodyFrame(dir: number, hurt = false) {
  const fx = Math.cos(dir);
  const fy = Math.sin(dir);
  return {
    s: 44,
    tw: 8.4,
    ww: 6.2,
    th: 18,
    fx,
    fy,
    profileK: Math.abs(fx),
    backK: Math.max(0, Math.min(1, (-fy - 0.2) / 0.35)),
    lead: fx >= 0 ? 1 : -1,
    hurt,
    nowMs: 1234,
  };
}

test('the whole dialect paints clean at all eight facings for every variant', () => {
  for (const hb of Object.values(HOB_LOOKS) as HobgoblinLook[]) {
    for (const dir of FACINGS) {
      for (const hurt of [false, true]) {
        const ctx = mockCtx(hb.ink);
        paintHobgoblinHead(ctx, hb, headFrame(dir, 0.6, hurt));
        paintHobgoblinBody(ctx, hb, bodyFrame(dir, hurt), false, 'behind');
        paintHobgoblinBody(ctx, hb, bodyFrame(dir, hurt), false, 'front');
        paintHobgoblinFoot(ctx, hb, 0, 12, 44, Math.cos(dir), 1, hurt);
        drawHobgoblinArm(ctx, hb, -6, -20, -8, -12, -6, -4, 44, hurt, 1234);
        assert.ok(ctx.fills > 0, 'every band paints a body');
        if (hurt) {
          assert.equal(ctx.inkFills, 0, 'the hurt flash keeps the silhouette clean of ink');
        }
      }
    }
  }
});

test('NO FACE FROM BEHIND: the war mask leaves with the turn', () => {
  const hb = HOB_LOOKS['hobgoblin']!;
  const south = mockCtx(hb.ink);
  paintHobgoblinHead(south, hb, headFrame(Math.PI / 2, 0.6));
  const north = mockCtx(hb.ink);
  paintHobgoblinHead(north, hb, headFrame(-Math.PI / 2, 0.6));
  assert.ok(south.inkFills > 0, 'the face reads at the bow');
  assert.equal(north.inkFills, 0, 'no eye, mouth-room, or nostril paints from behind');
});

test('the ear blade and the queue painters hold their anatomy', () => {
  const hb = HOB_LOOKS['hobgoblin_champion']!;
  // A settled chain from the real projection feeds both painters.
  const ec = hobEarCarriage(hb.heavy, 0);
  const ear = earRestChain(1, ec, { dir: Math.PI / 2, pin: 0, sway: 0 });
  const s = 44;
  const pts = ear.pts.map((p) => ({ x: p.x * s, y: p.y * s }));
  const ctx = mockCtx(hb.ink);
  drawHobEar(ctx, pts, 2.2, hobEarStyle(hb, false), { hurt: false, back: false, notch: true, ringed: true });
  assert.ok(ctx.fills > 0, 'the blade paints');
  const qc = hobQueueCarriage(hb, 0);
  const queue = earRestChain(1, qc, { dir: Math.PI / 2, pin: 0, sway: 0 });
  const qpts = queue.pts.map((p) => ({ x: p.x * s, y: p.y * s }));
  const qctx = mockCtx(hb.ink);
  drawHobQueue(qctx, qpts, 2.4, hobQueueStyle(hb, false), { hurt: false });
  assert.ok(qctx.fills > 0, 'the braid paints');
  // Hurt: both painters flash clean.
  const hctx = mockCtx(hb.ink);
  drawHobEar(hctx, pts, 2.2, hobEarStyle(hb, false), { hurt: true, back: false });
  drawHobQueue(hctx, qpts, 2.4, hobQueueStyle(hb, false), { hurt: true });
  assert.equal(hctx.inkFills, 0, 'the hurt flash keeps the appendages clean');
});
