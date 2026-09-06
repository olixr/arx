/**
 * Course-dialect laws (band 9a, THE MARL): every dolmen NPC id owns
 * the Marl design (no reskin fallback), the hide is BONE — warm, not
 * the moon's blue-white, not any golem's stone, not a hob's or a
 * skral's; the whole dialect paints clean across all eight facing
 * bands; the face never shows from behind and keeps both eyes at the
 * three-quarters; headless-from-behind reads as a HOOD (the back
 * plate rises 0.05s over the crown); THE STONE FACE ignores the gape;
 * THE LEVEL GAIT's dial lands at BOTH hip sites through one helper;
 * the plumb's sim settles to THE ONE REST; and the hand-synced
 * mirrors agree on the id and the number.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { NPCS } from '@arx/content';
import {
  DOLMEN_BOB,
  DOLMEN_HEAD_DEBUG,
  DOLMEN_LOOKS,
  dolmenHeadHull,
  dolmenLook,
  dolmenPlumbFront,
  dolmenPlumbRoot,
  dolmenYokeRim,
  PLUMB_FRONT_OFF,
  PLUMB_FRONT_ON,
  drawDolmenArm,
  drawDolmenPlumb,
  paintDolmenBody,
  paintDolmenFoot,
  paintDolmenHead,
  type DolmenLook,
} from './dolmen.js';
import { walkBobK, type RigPose } from './rig.js';
import { GOLEM_LOOKS } from './golems.js';
import { HOB_LOOKS } from './hobgoblin.js';
import { SKRAL_LOOKS } from './skral.js';
import { PendantSim, pendantRest } from './ogre.js';
import { humanoidMonsterSize, isHumanoidMonster } from './npcRoster.js';

const HERE = dirname(fileURLToPath(import.meta.url));

test('every dolmen NPC id resolves to its own authored look', (t) => {
  const ids = [...NPCS.keys()].filter((id) => id.startsWith('dolmen'));
  if (ids.length === 0) {
    // L2 lands the NpcDef row; L3 re-runs this pin with it present.
    t.diagnostic('no dolmen NpcDef registered yet — the roster pin waits for L2');
  } else {
    for (const id of ids) assert.ok(DOLMEN_LOOKS[id], `${id} must not fall back to a generic reskin`);
  }
  // Unknown future ids degrade to the Marl, never crash.
  assert.equal(dolmenLook('dolmen_new_thing', 7).hide, DOLMEN_LOOKS['dolmen']!.hide);
  assert.equal(dolmenLook('dolmen', 8), dolmenLook('dolmen', 8), 'a body keeps its look frame to frame');
  assert.equal(dolmenLook('dolmen', 8).seed, 8);
  assert.equal(DOLMEN_LOOKS['dolmen']!.stratum, 'marl');
});

test('BONE, NOT MOON, NOT STONE: the hide is warm and shared with no other dialect', () => {
  const hide = DOLMEN_LOOKS['dolmen']!.hide;
  const n = parseInt(hide.slice(1), 16);
  const r = n >> 16;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  assert.ok(r >= g && g >= b, 'a yellow-grey cast, never blue');
  assert.ok(r - b >= 0x14, 'warm by a clear margin, never moonpale');
  const others = new Set<string>([
    ...Object.values(GOLEM_LOOKS).map((g2) => g2.shell),
    ...Object.values(HOB_LOOKS).map((h) => h.hide),
    ...Object.values(SKRAL_LOOKS).map((s) => s.hide),
  ]);
  assert.ok(!others.has(hide), 'the Marl wears no golem stone, no hob brick, no skral water');
});

/** A recording 2D-context stand-in: counts fills by colour, rejects NaN coords. */
function mockCtx(ink: string): CanvasRenderingContext2D & {
  fills: number;
  inkFills: number;
  fillsOf: (col: string) => number;
} {
  const byCol = new Map<string, number>();
  const counter = {
    fills: 0,
    inkFills: 0,
    fillStyle: '#000' as string,
    strokeStyle: '#000' as string,
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    globalAlpha: 1,
    fillsOf: (col: string) => byCol.get(col) ?? 0,
  };
  const checkNums = (args: unknown[]): void => {
    for (const a of args) {
      if (typeof a === 'number') assert.ok(Number.isFinite(a), 'painter emitted NaN geometry');
    }
  };
  const noop = (...args: unknown[]): void => checkNums(args);
  return new Proxy(counter, {
    get(target, prop: string) {
      if (prop in target) return target[prop as keyof typeof target];
      const count = () => {
        target.fills++;
        byCol.set(target.fillStyle, (byCol.get(target.fillStyle) ?? 0) + 1);
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
  }) as unknown as CanvasRenderingContext2D & {
    fills: number;
    inkFills: number;
    fillsOf: (col: string) => number;
  };
}

const S = 44;
const TH = 0.46 * S;
const HEAD_R = 0.15 * S * 0.9;
const FACINGS = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => (i / 8) * Math.PI * 2);

function headFrame(dir: number, gape = 0, hurt = false, nowMs = 1234) {
  const fx = Math.cos(dir);
  const fy = Math.sin(dir);
  return {
    s: S,
    headX: fx * 0.1 * S,
    headY: -TH - HEAD_R * 0.25,
    hw: HEAD_R * 1.04,
    hh: HEAD_R,
    cut: HEAD_R * 0.34,
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
    s: S,
    tw: 0.185 * S * 1.3,
    ww: 0.125 * S * 0.85,
    th: TH,
    fx,
    fy,
    profileK: Math.abs(fx),
    backK: Math.max(0, Math.min(1, (-fy - 0.2) / 0.35)),
    lead: fx >= 0 ? 1 : -1,
    hurt,
    nowMs: 1234,
  };
}

test('the whole dialect paints clean at all eight facings, hurt and whole', () => {
  for (const dl of Object.values(DOLMEN_LOOKS) as DolmenLook[]) {
    for (const dir of FACINGS) {
      for (const hurt of [false, true]) {
        const ctx = mockCtx(dl.ink);
        paintDolmenHead(ctx, dl, headFrame(dir, 0.6, hurt));
        paintDolmenBody(ctx, dl, bodyFrame(dir, hurt), hurt, 'behind');
        paintDolmenBody(ctx, dl, bodyFrame(dir, hurt), hurt, 'front');
        paintDolmenFoot(ctx, dl, 0, 12, S, Math.cos(dir), 1, hurt);
        drawDolmenArm(ctx, dl, -6, -20, -8, -12, -6, -4, S, hurt, 1234, Math.sin(dir));
        drawDolmenPlumb(ctx, pendantRest(S * 0.22), dl, S, hurt);
        assert.ok(ctx.fills > 0, 'every band paints a body');
        if (hurt) assert.equal(ctx.inkFills, 0, 'the hurt flash keeps the silhouette clean of ink');
      }
    }
  }
});

test('NO FACE FROM BEHIND: the north band and both rear diagonals paint no ink', () => {
  const dl = DOLMEN_LOOKS['dolmen']!;
  const south = mockCtx(dl.ink);
  paintDolmenHead(south, dl, headFrame(Math.PI / 2));
  assert.ok(south.inkFills > 0, 'the face reads at the bow');
  for (const dir of [-Math.PI / 2, -Math.PI / 4, (-3 * Math.PI) / 4]) {
    const rear = mockCtx(dl.ink);
    paintDolmenHead(rear, dl, headFrame(dir));
    assert.equal(rear.inkFills, 0, `no face ink survives dir ${dir.toFixed(2)}`);
  }
});

test('THE THREE-QUARTER KEEPS BOTH EYES', () => {
  const dl = DOLMEN_LOOKS['dolmen']!;
  for (const dir of [Math.PI / 4, (3 * Math.PI) / 4]) {
    const ctx = mockCtx(dl.ink);
    paintDolmenHead(ctx, dl, headFrame(dir));
    assert.ok(ctx.inkFills >= 2, 'both tick eyes hold through the three-quarter turn');
  }
});

test('HEADLESS FROM BEHIND READS AS A HOOD: the back plate rises 0.05s over the crown', () => {
  const dl = DOLMEN_LOOKS['dolmen']!;
  const f = headFrame(-Math.PI / 2);
  const hull = dolmenHeadHull(f.hw, f.hh, f.fx, f.fy);
  const crownY = f.headY + hull.st(0, 0, hull.crownZ).y;
  const rim = dolmenYokeRim(f);
  assert.ok(
    rim.y <= crownY - 0.05 * S + 1e-6,
    `the rim (${rim.y.toFixed(2)}) sits 0.05s above the crown (${crownY.toFixed(2)})`,
  );
  assert.ok(rim.d > 0.5, 'the nape rim faces the camera from the north band');
  const ctx = mockCtx(dl.ink);
  paintDolmenHead(ctx, dl, f);
  assert.ok(ctx.fillsOf(dl.yoke) > 0, 'the back plate paints over the head from behind');
  // From the bow the same rim is the far wall, painted by the body's
  // behind pass — the head painter leaves the plate to it.
  const bow = mockCtx(dl.ink);
  paintDolmenBody(bow, dl, bodyFrame(Math.PI / 2), false, 'behind');
  assert.ok(bow.fills > 0, 'the far wall paints behind the head at the bow');
});

test('THE STONE FACE: the gape is accepted and ignored', () => {
  const dl = DOLMEN_LOOKS['dolmen']!;
  for (const dir of [Math.PI / 2, Math.PI / 4, 0]) {
    const shut = mockCtx(dl.ink);
    paintDolmenHead(shut, dl, headFrame(dir, 0));
    const shout = mockCtx(dl.ink);
    paintDolmenHead(shout, dl, headFrame(dir, 1));
    assert.equal(shout.fills, shut.fills, 'no fill answers the gape');
    assert.equal(shout.inkFills, shut.inkFills, 'no ink answers the gape');
  }
});

test('THE LEVEL GAIT twin law: one helper, both hip sites, no literal left behind', () => {
  assert.equal(walkBobK({} as RigPose), 0.45, 'every other body keeps its bob');
  assert.equal(walkBobK({ dolmen: DOLMEN_LOOKS['dolmen'] } as RigPose), DOLMEN_BOB);
  assert.ok(DOLMEN_BOB >= 0.05 && DOLMEN_BOB <= 0.15, 'the dial lands inside the art lane');
  const src = readFileSync(resolve(HERE, 'rig.ts'), 'utf8');
  const sites = src.split('\n').filter((l) => /const hipY(Stand)? = rig\.y - \(rig\.rise \+ rig\.bob \* /.test(l));
  assert.equal(sites.length, 2, 'drawHumanoid hipYStand and drawBackGear hipY');
  for (const line of sites) {
    assert.ok(line.includes('walkBobK(rig)'), `the dial is the helper: ${line.trim()}`);
    assert.ok(!line.includes('0.45'), `no literal bob survives: ${line.trim()}`);
  }
});

test('THE PLUMB KEEPS ITS LAYER: the front/behind switch latches, cardinals resolve outside the band', () => {
  // Stateless callers (the sheet, the card): the plain threshold at the band's middle.
  assert.equal(dolmenPlumbFront(undefined, 0.05), true);
  assert.equal(dolmenPlumbFront(undefined, -0.05), false);
  // With a memory the flag holds its last state anywhere inside the band.
  const mem: { bands?: Record<string, boolean> } = {};
  assert.equal(dolmenPlumbFront(mem, PLUMB_FRONT_ON + 0.2), true, 'front past ON');
  assert.equal(dolmenPlumbFront(mem, -0.05), true, 'holds front inside the band');
  assert.equal(dolmenPlumbFront(mem, PLUMB_FRONT_OFF - 0.05), false, 'behind past OFF');
  assert.equal(dolmenPlumbFront(mem, 0.05), false, 'holds behind inside the band');
  assert.equal(dolmenPlumbFront(mem, PLUMB_FRONT_ON), true, 'ON is inclusive');
  // Every cardinal facing's root depth lies outside the dead zone, so a
  // settled heading resolves exactly as the old threshold did.
  for (let i = 0; i < 8; i++) {
    const dir = Math.PI / 2 + (i / 8) * Math.PI * 2;
    const d = dolmenPlumbRoot(S, S * 0.36, Math.cos(dir), Math.sin(dir)).d;
    assert.ok(d >= PLUMB_FRONT_ON || d <= PLUMB_FRONT_OFF, `band ${i} root depth ${d.toFixed(3)} sits outside the band`);
    assert.equal(dolmenPlumbFront({}, d), d >= 0, `band ${i} resolves as the plain threshold`);
  }
  // The rig hands ONE latched answer to both passes.
  const src = readFileSync(resolve(HERE, 'rig.ts'), 'utf8');
  const passes = src.split('\n').filter((l) => /plumb: dolPlumb, plumbFront: dolPlumbFront/.test(l));
  assert.equal(passes.length, 2, 'the behind pass and the front pass both carry the latch');
  assert.ok(/dolPlumbFront = dolmenPlumbFront\(rig\.depthMemory, pr\.d\)/.test(src), 'latched on the entity depth memory');
});

test('THE ONE REST: a settled PendantSim equals pendantRest', () => {
  const len = S * 0.22;
  const sim = new PendantSim(5);
  sim.update(0, 0, len, 0);
  // One shove sideways, then the anchor holds still.
  sim.update(3, 0, len, 16);
  let chain = sim.update(3, 0, len, 32);
  for (let i = 3; i <= 600; i++) chain = sim.update(3, 0, len, i * 16);
  const rest = pendantRest(len);
  assert.equal(chain.pts.length, rest.pts.length);
  // The verlet's two-pass root-out constraint leaves a uniform gravity
  // stretch of 0.22% of the cord (0.02 px at the test scale, 0.05 px
  // at the sheet's 110, a tenth of a pixel at 220) — sub-pixel at
  // every zoom, so the sheet and the card paint what the game relaxes
  // to. Pinned honestly: no sway at all, and the sag under 0.3%.
  for (let i = 0; i < rest.pts.length; i++) {
    assert.ok(Math.abs(chain.pts[i]!.x - rest.pts[i]!.x) < 0.01, `node ${i} hangs dead-true`);
    assert.ok(Math.abs(chain.pts[i]!.y - rest.pts[i]!.y) <= len * 0.003, `node ${i} y settles`);
  }
  assert.ok(!sim.restless, 'a settled plumb stops re-baking the body');
});

test('the mirrors agree: size 1.02, the humanoid roster, the 3D stature, the probe off', () => {
  const gr = readFileSync(resolve(HERE, '..', 'cms', 'gameRender.ts'), 'utf8');
  const m = gr.match(/^\s*dolmen:\s*([\d.]+),\s*$/m);
  assert.ok(m, 'gameRender MOB_SIZE carries the dolmen');
  assert.equal(parseFloat(m![1]!), 1.02);
  const rr = readFileSync(resolve(HERE, 'renderer.ts'), 'utf8');
  const rm = rr.match(/DOLMEN_SIZE: Record<string, number> = \{\s*dolmen: ([\d.]+),/);
  assert.ok(rm, 'renderer DOLMEN_SIZE carries the dolmen');
  assert.equal(parseFloat(rm![1]!), 1.02, 'renderer and card agree on the stature');
  assert.ok(isHumanoidMonster('dolmen'));
  assert.ok(isHumanoidMonster('dolmen_setter_body'));
  assert.equal(humanoidMonsterSize('dolmen'), 1.0);
  assert.equal(DOLMEN_HEAD_DEBUG.on, false, 'the probe is a lab lever, off at import');
});
