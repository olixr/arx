/**
 * Bone-dialect laws: every skeleton NPC id owns a bespoke look (no
 * variant falls back to a reskin), the stature/heaviness ladder is
 * ordered (archer gracile → champion massive, never a plain scale-up),
 * and the skull/ribcage painters run clean across all eight facing
 * bands for every variant — no NaN geometry, sockets only where a face
 * is, a crown only on royalty.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NPCS } from '@devcraft/content';
import {
  SKELETON_LOOKS,
  paintRibcage,
  paintSkull,
  skeletonLook,
  type SkeletonLook,
} from './rig.js';

test('every skeleton NPC has its own authored look', () => {
  const skeletonIds = [...NPCS.keys()].filter((id) => id.startsWith('skeleton'));
  assert.ok(skeletonIds.length >= 4, 'the crypt fields at least four variants');
  for (const id of skeletonIds) {
    assert.ok(SKELETON_LOOKS[id], `${id} must not fall back to a generic reskin`);
  }
  // Unknown future ids degrade to the rank-and-file, never crash.
  assert.equal(skeletonLook('skeleton_new_thing'), SKELETON_LOOKS['skeleton']);
});

test('the variant ladder is designed, not scaled: distinct bones, ordered heft', () => {
  const archer = SKELETON_LOOKS['skeleton_archer']!;
  const plain = SKELETON_LOOKS['skeleton']!;
  const guard = SKELETON_LOOKS['skeleton_guard']!;
  const champ = SKELETON_LOOKS['skeleton_champion']!;
  assert.ok(archer.heavy < plain.heavy, 'the archer is gracile');
  assert.ok(plain.heavy < guard.heavy, 'the guard is heavy-set');
  assert.ok(guard.heavy < champ.heavy, 'the champion looms over all');
  // Each variant ages its own bone tone — no shared palette entry.
  const bones = new Set([archer.bone, plain.bone, guard.bone, champ.bone]);
  assert.equal(bones.size, 4);
  // Only the champion wears the crown; only archer + champion burn.
  assert.ok(champ.crown && !plain.crown && !guard.crown && !archer.crown);
  assert.ok(archer.glow && champ.glow && !plain.glow && !guard.glow);
});

/** A recording 2D-context stand-in: counts calls, rejects NaN coords. */
function mockCtx(): CanvasRenderingContext2D & { fills: number; darkFills: number } {
  const counter = {
    fills: 0,
    darkFills: 0,
    fillStyle: '#000' as string,
    strokeStyle: '#000' as string,
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    globalAlpha: 1,
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
      if (prop === 'fill') {
        return () => {
          target.fills++;
          if (typeof target.fillStyle === 'string' && target.fillStyle.startsWith('#2')) {
            target.darkFills++;
          }
        };
      }
      if (prop === 'fillRect') {
        return (...args: unknown[]) => {
          checkNums(args);
          target.fills++;
          if (typeof target.fillStyle === 'string' && target.fillStyle.startsWith('#2')) {
            target.darkFills++;
          }
        };
      }
      return noop;
    },
    set(target, prop: string, value) {
      (target as Record<string, unknown>)[prop] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D & { fills: number; darkFills: number };
}

const FACINGS = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => (i / 8) * Math.PI * 2);

function skullFrame(dir: number) {
  const fx = Math.cos(dir);
  const fy = Math.sin(dir);
  return {
    s: 44,
    headX: fx * 2.2,
    headY: -28,
    hw: 6.9,
    hh: 6.6,
    cut: 2.2,
    headR: 6.6,
    fx,
    fy,
    profileK: Math.abs(fx),
    backK: Math.max(0, Math.min(1, (-fy - 0.2) / 0.35)),
    lead: fx >= 0 ? 1 : -1,
    hurt: false,
    nowMs: 1234,
    gape: 0,
  };
}

test('skull and ribcage paint clean at all eight facings for every variant', () => {
  for (const sk of Object.values(SKELETON_LOOKS) as SkeletonLook[]) {
    for (const dir of FACINGS) {
      const ctx = mockCtx();
      paintSkull(ctx, sk, skullFrame(dir));
      assert.ok(ctx.fills > 3, 'the skull is a built form, not a single block');
      const fx = Math.cos(dir);
      paintRibcage(ctx, sk, {
        s: 44,
        tw: 8.1,
        ww: 5.5,
        th: 20.2,
        fx,
        lead: fx >= 0 ? 1 : -1,
        profileK: Math.abs(fx),
        backK: Math.max(0, Math.min(1, (-Math.sin(dir) - 0.2) / 0.35)),
        hurt: false,
      });
      assert.ok(ctx.fills > 10, 'the ribcage is a built form');
    }
  }
});

test('sockets face the camera, never the back of the skull', () => {
  const sk = SKELETON_LOOKS['skeleton']!;
  const front = mockCtx();
  paintSkull(front, sk, skullFrame(Math.PI / 2)); // facing down-screen
  const back = mockCtx();
  paintSkull(back, sk, skullFrame(-Math.PI / 2)); // facing away
  // Facing the camera shows sockets + nasal + mouth darks; from behind
  // the skull shows none of them.
  assert.ok(front.darkFills >= 3, 'front band carries the socket darks');
  assert.ok(back.darkFills === 0, 'back band shows suture, not face');
});
