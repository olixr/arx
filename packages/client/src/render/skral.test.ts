/**
 * Brine-dialect laws: every skral NPC id owns a bespoke look (no
 * variant falls back to a reskin), the deepking is a DESIGN and not a
 * scale-up (own hide, pearl eyes, the coral crown, the trident, the
 * only scarred lid), the rank-and-file rolls a WATER CLUSTER from its
 * hashed spawn seed — each water carrying its OWN fin accent, so a
 * shoal sorts into family banners — while the tidecaller and the
 * deepking hold their authored designs, the whole dialect paints
 * clean across all eight facing bands (no NaN geometry), the face
 * never shows from behind, the crest is an ELASTIC BODY whose flare
 * is a carriage change (never a screen trick), the jaw croaks open
 * mid-swing, the shore roster feeds both ways, the SHORE CAMP def
 * really carries the flag, and the loot-story law holds: the catch
 * on the belt and the pearl at the throat really drop.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LOOT_TABLES, NPCS, POI_DEFS, wildCandidates } from '@arx/content';
import {
  SKRAL_LOOKS,
  drawSkralArm,
  drawSkralCrest,
  paintSkralBody,
  paintSkralFoot,
  paintSkralHead,
  paintSkralWrap,
  skralCrestCarriage,
  skralCrestStyle,
  skralLook,
  type SkralLook,
} from './skral.js';
import { earRestChain } from './earPhysics.js';

test('every skral NPC has its own authored look', () => {
  const ids = [...NPCS.keys()].filter((id) => id.startsWith('skral'));
  assert.ok(ids.length >= 4, 'the shoal fields the wader, the harpooner, the tidecaller, and the deepking');
  for (const id of ids) {
    assert.ok(SKRAL_LOOKS[id], `${id} must not fall back to a generic reskin`);
  }
  // Unknown future ids degrade to the rank-and-file design, never crash.
  assert.equal(skralLook('skral_new_thing', 7).hide, SKRAL_LOOKS['skral']!.hide);
});

test('the deepking is a design, not a scale-up', () => {
  const wader = SKRAL_LOOKS['skral']!;
  const king = SKRAL_LOOKS['skral_champion']!;
  assert.ok(wader.heavy < king.heavy, 'the deepking carries the heavier frame');
  assert.notEqual(wader.hide, king.hide, 'each variant wears its own water');
  assert.notEqual(wader.eye, king.eye, 'the pearl eyes are the crown before the crown');
  assert.ok(king.crowned && !wader.crowned, 'only the deepking wears the coral studs');
  assert.ok(king.trident && !wader.trident, 'only the deepking slings the barbed trident');
  assert.ok(king.scarred && !wader.scarred, 'only the deepking carries the ledger of scars');
});

test('the tidecaller wears the kelp, the rabble wades bare', () => {
  assert.ok(SKRAL_LOOKS['skral_tidecaller']!.garb, 'the tidecaller wears the kelp mantle');
  assert.ok(!SKRAL_LOOKS['skral']!.garb, 'the wader owns a net, a belt, and appetite');
  assert.ok(!SKRAL_LOOKS['skral_harpooner']!.garb, 'the harpooner likewise');
});

test('the water clusters: seeded, banner-true, and never on the named', () => {
  // Different cluster bits roll different waters...
  const a = skralLook('skral', 0);
  const b = skralLook('skral', 8);
  assert.notEqual(a.hide, b.hide, 'seeds in different clusters wear different waters');
  // ...each water flies its OWN fin banner (the family-banner law)...
  assert.notEqual(a.fin, b.fin, 'a different water carries a different fin accent');
  // ...the same seed always wears the same water (cached identity)...
  assert.equal(skralLook('skral', 8), b, 'a body keeps its water frame to frame');
  // ...the harpooner rolls the same bank stock...
  assert.notEqual(skralLook('skral_harpooner', 0).hide, skralLook('skral_harpooner', 8).hide);
  // ...and the named never roll: their designs hold at any seed.
  for (const id of ['skral_tidecaller', 'skral_champion']) {
    const authored = SKRAL_LOOKS[id]!;
    assert.equal(skralLook(id, 0).hide, authored.hide, `${id} holds its design`);
    assert.equal(skralLook(id, 8).hide, authored.hide, `${id} holds its design at any seed`);
  }
  // The wear marks stay the body's own either way.
  assert.equal(skralLook('skral_champion', 8).seed, 8);
});

test('the shoal answers as one throat and the deepking croaks', () => {
  const wader = NPCS.get('skral')!;
  const king = NPCS.get('skral_champion')!;
  assert.equal(wader.pack, 'skral');
  assert.equal(king.pack, 'skral', 'pull the deepking, raise the bank');
  assert.ok(wader.craven, 'a bloodied wader bolts croaking for the shoal');
  assert.equal(king.kit?.[0]?.ability, 'shoal_call', 'the croak calls the camp');
  assert.ok(king.kit?.[0]?.rally, 'the croak IS a rally — the fight is the camp');
  assert.ok((king.kit?.[0]?.windupTicks ?? 0) > 0, 'the throat fills before the word');
  assert.equal(king.attackStatus?.status, 'chill', 'the cold grip keeps arguing');
  // Cold-water natives to the last scale, race-wide — crowns included.
  for (const id of ['skral', 'skral_harpooner', 'skral_tidecaller', 'skral_champion', 'skral_tidelord', 'skral_deepmaw']) {
    const def = NPCS.get(id)!;
    assert.ok(def.resist?.includes('chill'), `${id} shrugs the chill`);
    assert.ok(def.weak?.includes('shock'), `the storm finds the wet ${id}`);
    // THE SLICK LANE rides every body of the race.
    assert.ok(def.lanes?.resist?.includes('archery'), `slick hide sheds the shaft on ${id}`);
    assert.ok(def.lanes?.weak?.includes('arx'), `the working bites the wet ${id}`);
  }
});

test('THE BRINE CROWNS: two authored crowns, each a design with a weakness story', () => {
  // The tidelord: the ONLY skral carrying the full regalia at once.
  const lord = SKRAL_LOOKS['skral_tidelord']!;
  assert.ok(lord.crowned && lord.trident && lord.garb, 'the tidelord carries crown, trident, and mantle');
  for (const [id, look] of Object.entries(SKRAL_LOOKS)) {
    if (id === 'skral_tidelord') continue;
    assert.ok(!(look.crowned && look.trident && look.garb), `${id} must not match the full regalia`);
  }
  // The deepmaw: the biggest jaw span in the game, and no regalia at
  // all — appetite wears nothing.
  const maw = SKRAL_LOOKS['skral_deepmaw']!;
  assert.ok((maw.jaw ?? 1) > (SKRAL_LOOKS['skral_champion']!.jaw ?? 1), 'the deepmaw out-gapes the deepking');
  assert.ok(!maw.crowned && !maw.trident && !maw.garb, 'the deepmaw wears nothing');
  assert.ok(maw.heavy > lord.heavy, 'the deepmaw is the bulkiest thing on the bank');
  // The crowns' fight identities hold: the tidelord's signature chain
  // (the flood, then the jet) and the shock-finds-the-wet weakness;
  // the deepmaw's breach-into-bite and the shove that sits him down.
  const tidelord = NPCS.get('skral_tidelord')!;
  assert.ok(tidelord.boss, 'the tidelord wears the crown');
  assert.equal(tidelord.kit?.find((k) => k.ability === 'drowning_surge')?.then, 'abyssal_jet', 'the flood chains into the jet');
  assert.ok((tidelord.boss!.stunMult ?? 0) > 1, 'the storm finds the wet: shock is the authored answer');
  assert.ok((tidelord.boss!.knockbackMult ?? 1) < 0.25, 'the tidelord is planted in his own pool');
  assert.ok(tidelord.kit?.find((k) => k.ability === 'court_of_spears')?.rally, 'the court call re-gathers the camp');
  const deepmaw = NPCS.get('skral_deepmaw')!;
  assert.ok(deepmaw.boss, 'the deepmaw wears the crown');
  assert.equal(deepmaw.kit?.find((k) => k.ability === 'breaching_crash')?.then, 'gullet_snap', 'the breach chains into the bite');
  assert.ok((deepmaw.kit?.find((k) => k.ability === 'breaching_crash')?.windupTicks ?? 0) >= 24, 'the breach is the longest wind any skral draws');
  assert.ok((deepmaw.boss!.knockbackMult ?? 0) >= 0.8, 'all that bulk rides on frog legs — the shove works');
});

test('the shore roster feeds both ways (the crab law, peopled)', () => {
  // A bank at tier 3 musters skral ON TOP of the meadow roster...
  const bank = wildCandidates(3, 'grass', 12, true);
  assert.ok(bank.some((e) => e.npc === 'skral'), 'the bank fields the shoal');
  // ...and inland ground never does.
  const meadow = wildCandidates(3, 'grass', 12, false);
  assert.ok(!meadow.some((e) => e.npc.startsWith('skral')), 'no shoal wades a dry meadow');
  // The night shoal marches behind its king.
  const night = wildCandidates(4, 'grass', 23, true);
  const warband = night.find((e) => e.npc === 'skral' && e.lead?.npc === 'skral_champion');
  assert.ok(warband, 'after dark the bank marches behind the deepking');
});

test('THE SHORE CAMP: the shoal POI carries the flag and the family', () => {
  const def = POI_DEFS.get('skral_shoal');
  assert.ok(def, 'the skral shoal is a registered archetype');
  assert.equal(def!.shore, true, 'the camp only ever stands on a bank');
  assert.equal(def!.family, 'skral', 'the territory atlas knows the shoal');
  assert.ok(def!.garrison.some((g) => g.npc === 'skral_champion' && g.names?.length), 'the crowned deepking holds the heart');
});

test('the loot-story law: the catch, the frill, and the pearl really drop', () => {
  const wader = LOOT_TABLES.get('skral')!;
  assert.ok(wader.entries.some((e) => e.item === 'raw_trout'), 'a fisher drops fish');
  assert.ok(wader.entries.some((e) => e.item === 'skral_frill'), 'the frill pays the skinner');
  const king = LOOT_TABLES.get('skral_champion')!;
  assert.ok(king.entries.some((e) => e.item === 'deepking_pearl'), 'the pearl leaves the throat');
  for (const id of ['skral', 'skral_champion']) {
    assert.ok(NPCS.get(id)!.loot.includes(id === 'skral' ? 'skral' : 'skral_champion'));
  }
});

/** A recording 2D-context stand-in: counts calls, rejects NaN coords. */
function mockCtx(): CanvasRenderingContext2D & {
  fills: number;
  inkFills: number;
  coordSum: number;
} {
  const counter = {
    fills: 0,
    inkFills: 0,
    coordSum: 0,
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
        counter.coordSum += a;
      }
    }
  };
  const noop = (...args: unknown[]): void => checkNums(args);
  return new Proxy(counter, {
    get(target, prop: string) {
      if (prop in target) return target[prop as keyof typeof target];
      const count = () => {
        target.fills++;
        // The skral inks live in the '#1x'/'#2x' families — both
        // read as face marks for the no-face-from-behind law.
        if (
          typeof target.fillStyle === 'string' &&
          (target.fillStyle.startsWith('#1') || target.fillStyle.startsWith('#2'))
        ) {
          target.inkFills++;
        }
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
  }) as unknown as CanvasRenderingContext2D & {
    fills: number;
    inkFills: number;
    coordSum: number;
  };
}

const FACINGS = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => (i / 8) * Math.PI * 2);

function headFrame(dir: number, gape = 0, hurt = false, nowMs = 1234) {
  const fx = Math.cos(dir);
  const fy = Math.sin(dir);
  return {
    s: 44,
    headX: fx * 2.6,
    headY: -28,
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
    tw: 6.8,
    ww: 6.6,
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
  for (const sk of Object.values(SKRAL_LOOKS) as SkralLook[]) {
    for (const dir of FACINGS) {
      for (const hurt of [false, true]) {
        const ctx = mockCtx();
        paintSkralHead(ctx, sk, headFrame(dir, 0, hurt));
        // The hurt flash is a deliberately reduced form (skull, throat,
        // and the near dome at profile) — still never a single block.
        assert.ok(ctx.fills > (hurt ? 2 : 3), 'the head is a built form, not a single block');
        paintSkralBody(ctx, sk, bodyFrame(dir, hurt), false, 'behind');
        paintSkralBody(ctx, sk, bodyFrame(dir, hurt), false);
        paintSkralWrap(ctx, sk, bodyFrame(dir, hurt));
        drawSkralArm(ctx, sk, 0, 0, 4, 8, 6, 16, 44, hurt, 1234);
        paintSkralFoot(ctx, sk, 5, 30, 44, 1, hurt);
      }
    }
  }
});

test('the face never shows from behind', () => {
  for (const sk of Object.values(SKRAL_LOOKS) as SkralLook[]) {
    const front = mockCtx();
    paintSkralHead(front, sk, headFrame(Math.PI / 2)); // facing down-screen
    const back = mockCtx();
    paintSkralHead(back, sk, headFrame(-Math.PI / 2)); // facing away
    // Facing the camera carries the pupils and the nostril pits; from
    // behind the head is wet hide, gill nape, and the eye domes.
    assert.ok(front.inkFills >= 2, 'front band carries the pupils and the pits');
    assert.equal(back.inkFills, 0, 'back band shows hide and domes, not a face');
  }
});

test('the jaw croaks through the strike beat', () => {
  const sk = SKRAL_LOOKS['skral_champion']!;
  const shut = mockCtx();
  paintSkralHead(shut, sk, headFrame(Math.PI / 2, 0));
  const open = mockCtx();
  paintSkralHead(open, sk, headFrame(Math.PI / 2, 1));
  assert.ok(open.fills > shut.fills, 'the gape opens the maw and drops the shovel');
});

test('the crest is an elastic body and the flare is a carriage change', () => {
  // The flare raises the sail through the strike beat — the threat is
  // REACH, not a screen rotation (the motion doctrine, law three).
  const calm = skralCrestCarriage(1, 0);
  const flared = skralCrestCarriage(1, 1);
  assert.ok(flared.rise > calm.rise, 'anger stands the sail up');
  assert.ok(flared.length > calm.length, 'anger grows the sail');
  // The rest chain rakes behind the facing and STANDS — a crest can
  // never point forward like a nose, by construction.
  for (const side of [-1, 1] as const) {
    const ch = earRestChain(side, calm, { dir: 0, pin: 0, sway: 0 });
    const root = ch.pts[0]!;
    const tip = ch.pts[ch.pts.length - 1]!;
    assert.ok(tip.x < root.x, 'facing east the sail rakes west, behind the crown');
    assert.ok(tip.y < root.y, 'the sail stands up-screen, never level');
  }
  // THE ONE REST sways on the wall clock between moments.
  const t0 = earRestChain(1, calm, { dir: Math.PI / 2, pin: 0, sway: 0.05 });
  const t1 = earRestChain(1, calm, { dir: Math.PI / 2, pin: 0, sway: -0.05 });
  assert.notDeepEqual(t0.pts, t1.pts, 'the sail breathes between moments');
  // The painter runs clean, and the scar notch is the deepking's own.
  const pts = t0.pts.map((p) => ({ x: 100 + p.x * 44, y: 100 + p.y * 44 }));
  const plain = mockCtx();
  drawSkralCrest(plain, pts, 4.4, skralCrestStyle(SKRAL_LOOKS['skral']!, false), { hurt: false });
  const notched = mockCtx();
  drawSkralCrest(notched, pts, 4.4, skralCrestStyle(SKRAL_LOOKS['skral_champion']!, false), {
    hurt: false,
    notch: true,
  });
  assert.ok(notched.fills > plain.fills, 'the notch is painted ledger, not a missing draw');
  const hurt = mockCtx();
  drawSkralCrest(hurt, pts, 4.4, skralCrestStyle(SKRAL_LOOKS['skral']!, false), { hurt: true });
  assert.ok(hurt.fills >= 1, 'the crest lives in the hurt-flash silhouette');
});
