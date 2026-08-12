/**
 * Parliament design laws: the great owl and the elder are DESIGNS,
 * never reskins — the elder owns its palette (no tone shared with any
 * rank-and-file plumage cluster) and out-masses the hunter in every
 * dimension; the rank-and-file rolls a plumage cluster from its spawn
 * eid so a wing sorts into kin groups; the disc carries both eyes
 * FORWARD and no face survives on a backskull; and every painter runs
 * NaN-free across all eight facing bands, live, mantling, screaming,
 * and collapsed (ragdoll topScale).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ABILITIES,
  ITEMS,
  LOOT_TABLES,
  NPCS,
  POI_DEFS,
  WILD_ROSTER,
  familiesOf,
} from '@arx/content';
import {
  ELDER_GREAT_OWL_LOOK,
  GREAT_OWL_LOOK,
  beastSpec,
  drawGreatOwl,
  drawOwlHead,
  owlHoverHeight,
  owlLook,
  owlWingFan,
  paintOwlBody,
} from './rig.js';

test('the bestiary fields the parliament, packed, taloned, and led', () => {
  const owl = NPCS.get('great_owl');
  const elder = NPCS.get('elder_great_owl');
  assert.ok(owl && elder);
  // The elder is a champion of the ladder: above the wolf matriarch.
  assert.ok(elder.level > NPCS.get('dire_wolf')!.level);
  assert.ok(elder.maxHp > owl.maxHp * 2);
  // Both hunt as one parliament, and the elder screams it awake.
  assert.equal(owl.pack, 'parliament');
  assert.equal(elder.pack, 'parliament');
  assert.equal(elder.kit?.[0]?.ability, 'hushing_screech');
  assert.ok(ABILITIES.has('hushing_screech'), 'the screech must be a real ability');
  // Talons hook: both swoop (pounce) and both leave you bleeding.
  assert.ok(owl.pounce && elder.pounce);
  assert.equal(owl.attackStatus?.status, 'bleed');
  assert.equal(elder.attackStatus?.status, 'bleed');
  // The turning head: nothing walks up behind an owl.
  assert.ok((owl.sightArc ?? 0) >= 300, 'the owl watches nearly all around');
  assert.ok((elder.sightArc ?? 0) > (owl.sightArc ?? 0), 'the oldest head turns furthest');
});

test('the wilds run owl knots at night, and the atlas knows owl country', () => {
  const owlEntries = WILD_ROSTER.filter((e) => e.npc === 'great_owl');
  assert.ok(owlEntries.length >= 2, 'the parliament stands in the roster');
  for (const e of owlEntries) {
    assert.ok(e.hours, 'owls are the night shift');
    assert.equal(e.family, 'parliament');
    assert.ok((e.band?.[0] ?? 1) >= 2, 'a knot answers as a wing, never a straggler');
  }
  assert.ok(
    owlEntries.some((e) => e.lead?.npc === 'elder_great_owl'),
    'the tier-5 parliament stoops behind an elder',
  );
  // THE ONE ATLAS LAW: the family the knots lean on is a real country.
  const atlas = new Set(familiesOf([...POI_DEFS.values()]));
  assert.ok(atlas.has('parliament'), 'parliament country must live in the POI atlas');
  const roost = POI_DEFS.get('owl_roost');
  assert.ok(roost, 'the roost names the country');
  assert.equal(roost.family, 'parliament');
});

test('the parliament pays: tables stand, plumes exist, the elder pays richer', () => {
  assert.ok(LOOT_TABLES.has('great_owl'));
  assert.ok(LOOT_TABLES.has('elder_great_owl'));
  assert.ok(ITEMS.has('owl_plume'));
  assert.ok(ITEMS.has('elder_plume'));
  assert.ok(
    (LOOT_TABLES.get('elder_great_owl')!.rarityBonus ?? 0) > 0,
    'the champion pays like one',
  );
});

test('designs, not reskins: the elder shares no tone with any cluster', () => {
  // Walk the whole cluster space the rank-and-file can roll.
  const clusterTones = new Set<string>();
  for (let eid = 0; eid < 64; eid++) {
    const l = owlLook('great_owl', eid);
    for (const t of [l.mantle, l.breast, l.bar, l.disc, l.discRim, l.eye]) clusterTones.add(t);
  }
  for (const tone of [
    ELDER_GREAT_OWL_LOOK.mantle,
    ELDER_GREAT_OWL_LOOK.breast,
    ELDER_GREAT_OWL_LOOK.bar,
    ELDER_GREAT_OWL_LOOK.disc,
    ELDER_GREAT_OWL_LOOK.discRim,
    ELDER_GREAT_OWL_LOOK.eye,
  ]) {
    assert.ok(!clusterTones.has(tone), `elder shares a rank-and-file tone ${tone}`);
  }
  // The elder out-masses the hunter everywhere it counts.
  assert.ok(ELDER_GREAT_OWL_LOOK.bodyW > GREAT_OWL_LOOK.bodyW);
  assert.ok(ELDER_GREAT_OWL_LOOK.backH > GREAT_OWL_LOOK.backH);
  assert.ok(ELDER_GREAT_OWL_LOOK.headW > GREAT_OWL_LOOK.headW);
  assert.ok(ELDER_GREAT_OWL_LOOK.wingSpan > GREAT_OWL_LOOK.wingSpan);
  // The crest is a CROWN, not a trim: more than double the tuft.
  assert.ok(ELDER_GREAT_OWL_LOOK.tuftLen > GREAT_OWL_LOOK.tuftLen * 2);
  const owlSpec = beastSpec('great_owl', 0.36, 4.4);
  const elderSpec = beastSpec('elder_great_owl', 0.46, 4.6);
  assert.ok(elderSpec.bodyLen > owlSpec.bodyLen);
  assert.ok(elderSpec.rig.legLen > owlSpec.rig.legLen);
  // Bird ankles bow BACKWARD on both — the two-post law.
  assert.deepEqual(owlSpec.kneeFwd, [-1, -1]);
  assert.deepEqual(elderSpec.kneeFwd, [-1, -1]);
  assert.equal(owlSpec.rig.legs.length, 2);
});

test('the plumage clusters: seeded, deterministic, and kin-diverse', () => {
  // Same spawn, same coat — resolved looks are stable.
  assert.equal(owlLook('great_owl', 17), owlLook('great_owl', 17));
  // Consecutive eids (a spawned knot) spread across the clusters —
  // the hash law that keeps a wing from stamping one body.
  const mantles = new Set<string>();
  for (let eid = 100; eid < 116; eid++) mantles.add(owlLook('great_owl', eid).mantle);
  assert.ok(mantles.size >= 3, `a knot wears ${mantles.size} coats — too few kin groups`);
  // Elders never roll: an elder is a DESIGN.
  assert.equal(owlLook('elder_great_owl', 1).mantle, ELDER_GREAT_OWL_LOOK.mantle);
  assert.equal(owlLook('elder_great_owl', 99).mantle, ELDER_GREAT_OWL_LOOK.mantle);
  assert.ok(owlLook('elder_great_owl', 1).elder, 'the elder keeps its ledger');
});

test('THE PARLIAMENT FLIES: rank reads in the air, and the flier outflies the cave', () => {
  // The elder cruises higher than the hunter — rank you can read from
  // across the glade — and both ride above the cave bat's chest-high
  // hang (0.85 tiles): a great owl is a FLIER, never a hoverer.
  assert.ok(owlHoverHeight(ELDER_GREAT_OWL_LOOK) > owlHoverHeight(GREAT_OWL_LOOK));
  assert.ok(owlHoverHeight(GREAT_OWL_LOOK) > 0.85);
});

/** Minimal Path2D stand-in: records numbers, rejects NaN geometry. */
class FakePath2D {
  constructor(other?: FakePath2D) {
    void other;
  }
  moveTo(...args: number[]): void {
    check(args);
  }
  lineTo(...args: number[]): void {
    check(args);
  }
  closePath(): void {}
  addPath(): void {}
}

function check(args: unknown[]): void {
  for (const a of args) {
    if (typeof a === 'number') assert.ok(Number.isFinite(a), 'painter emitted NaN geometry');
  }
}

/** A recording 2D-context stand-in: rejects NaN coords everywhere. */
function mockCtx(): CanvasRenderingContext2D {
  const state = {
    fillStyle: '#000' as string,
    strokeStyle: '#000' as string,
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    globalAlpha: 1,
  };
  return new Proxy(state, {
    get(target, prop: string) {
      if (prop in target) return target[prop as keyof typeof target];
      return (...args: unknown[]) => check(args);
    },
    set(target, prop: string, value) {
      (target as Record<string, unknown>)[prop] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
}

test('the flier runs clean: eight facings, every altitude, banking, swooping, hurt', () => {
  const g = globalThis as { Path2D?: unknown };
  const hadPath = g.Path2D;
  g.Path2D = FakePath2D;
  try {
    const owlSpec = beastSpec('great_owl', 0.36, 4.4);
    const elderSpec = beastSpec('elder_great_owl', 0.46, 4.6);
    for (let band = 0; band < 8; band++) {
      const dir = (band / 8) * Math.PI * 2;
      // The full altitude ledger: roost, fold edge, flare, climb, cruise.
      for (const air of [0, 0.15, 0.3, 0.31, 0.5, 0.8, 1]) {
        for (const at of [0, 0.5, 0.85]) {
          for (const hurt of [false, true]) {
            drawGreatOwl(mockCtx(), owlSpec, owlLook('great_owl', band * 5), {
              x: 100,
              y: 100,
              s: 48,
              dir,
              ys: 0.82,
              air,
              moveK: air > 0.5 ? 1 : 0,
              bank: band % 2 === 0 ? 0.3 : -0.25,
              attackT: at,
              hurt,
              nowMs: 5234 + band * 331,
              seed: band,
              collar: band === 3 ? '#8a6234' : undefined,
            });
            drawGreatOwl(mockCtx(), elderSpec, ELDER_GREAT_OWL_LOOK, {
              x: 100,
              y: 100,
              s: 48,
              dir,
              ys: 0.82,
              air,
              moveK: 0.5,
              attackT: at,
              hurt,
              nowMs: 917 + band * 77,
              seed: band * 13,
            });
          }
        }
      }
      // The pinned-clock guard: a zero clock (test rigs, first frame)
      // must never divide the idle-life drivers into NaN.
      drawGreatOwl(mockCtx(), owlSpec, owlLook('great_owl', 1), {
        x: 100,
        y: 100,
        s: 48,
        dir,
        ys: 0.82,
        air: 0,
        moveK: 0,
        nowMs: 0,
        seed: 0,
      });
    }
  } finally {
    g.Path2D = hadPath as typeof Path2D;
  }
});

test('every owl painter runs clean: eight facings, mantling, screaming, dead', () => {
  const g = globalThis as { Path2D?: unknown };
  const hadPath = g.Path2D;
  g.Path2D = FakePath2D;
  try {
    const owlSpec = beastSpec('great_owl', 0.36, 4.4);
    const elderSpec = beastSpec('elder_great_owl', 0.46, 4.6);
    for (let band = 0; band < 8; band++) {
      const dir = (band / 8) * Math.PI * 2;
      const fx = Math.cos(dir);
      const fy = Math.sin(dir);
      for (const topScale of [undefined, 0.45]) {
        const frame = {
          bx: 100,
          gy: 100,
          s: 48,
          fx,
          fy,
          ys: topScale === undefined ? 0.82 : 1,
          seed: 1234 + band,
          hurt: false,
          bob: 0,
          roll: 0,
          topScale,
          botH: topScale === undefined ? undefined : 0.02,
        };
        // Live through the whole telegraph: rest, windup, strike.
        for (const at of topScale === undefined ? [0, 0.5, 0.85] : [0]) {
          paintOwlBody(mockCtx(), owlSpec, owlLook('great_owl', band), frame, at);
          paintOwlBody(mockCtx(), elderSpec, ELDER_GREAT_OWL_LOOK, frame, at);
        }
      }
      for (const dead of [false, true]) {
        drawOwlHead(mockCtx(), owlLook('great_owl', band * 7), {
          x: 100,
          y: 80,
          s: 48,
          fx,
          fy,
          ys: 0.82,
          dead,
          screech: dead ? 0 : 0.8,
          blink: dead ? 0 : 0.6,
          seed: band,
        });
        drawOwlHead(mockCtx(), ELDER_GREAT_OWL_LOOK, {
          x: 100,
          y: 80,
          s: 48,
          fx,
          fy,
          ys: 0.82,
          dead,
          screech: dead ? 0 : 1,
          seed: band,
        });
      }
      // The wing fan at every spread, both sides, upper and under.
      for (const spread of [0.2, 0.6, 1]) {
        for (const ang of [dir, -0.8, Math.PI + 0.8]) {
          owlWingFan(mockCtx(), ELDER_GREAT_OWL_LOOK, {
            x: 100,
            y: 90,
            s: 48,
            ang,
            spread,
            span: 1.55,
            under: spread > 0.5,
            squash: spread === 1 ? 0.5 : 1,
            seed: band,
          });
        }
      }
    }
  } finally {
    g.Path2D = hadPath as typeof Path2D;
  }
});
