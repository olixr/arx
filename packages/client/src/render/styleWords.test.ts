/**
 * THE DECLARED WORD IS SPENT — the ablation pins for style fields that
 * a piece announces and the painter may quietly never read. A style
 * record is a promise in the wardrobe's own vocabulary; a word nobody
 * spends is a lie the next author inherits, and the flavour comment
 * above it makes the lie worse.
 *
 * Section one, THE CROWN DEVICES: `spikesCrown` (the comb up the
 * centerline) and `fins` (the swept temple blades) live OUTSIDE any
 * one kind branch. Both grew up on the metal kinds and are now lent to
 * the cowls — packlord's bristle ridge and weirkeeper's frill are each
 * their piece's one crown device. The regression pinned: both hoods
 * shipped DECLARING their device while drawHelmet's hood branch
 * returned long before either painter, so ablating the field left the
 * op stream byte-identical. Every carrier is pinned in BOTH directions
 * — the roster must still declare the word, and the painter must still
 * spend it.
 *
 * Section two, THE PLATE WORDS UNDER CLOTH: the opposite verdict, for
 * the case where the silence is CORRECT and must stay written down.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BODY_STYLES,
  HELM_STYLES,
  drawHelmet,
  drawTorsoGarment,
  type BodyStyle,
  type HeadFrame,
  type HelmStyle,
  type TorsoFrame,
} from './armor.js';

/** A recording 2D-context stand-in: the whole op stream, args and all. */
function traceCtx(): { ctx: CanvasRenderingContext2D; ops: string[] } {
  const ops: string[] = [];
  const target: Record<string | symbol, unknown> = {};
  const ctx = new Proxy(target, {
    get(t, prop) {
      if (prop in t) return t[prop];
      const name = String(prop);
      const fn = (...args: unknown[]) => {
        for (const a of args) {
          if (typeof a === 'number') {
            assert.ok(Number.isFinite(a), `painter emitted NaN via ${name}`);
          }
        }
        ops.push(`${name}(${args.map((a) => (typeof a === 'number' ? a.toFixed(6) : String(a))).join(',')})`);
        // Gradients are objects with their own recorder.
        if (name.startsWith('create')) {
          return { addColorStop: (o: number, c: string) => ops.push(`stop(${o},${c})`) };
        }
        return undefined;
      };
      t[prop] = fn;
      return fn;
    },
    set(t, prop, v) {
      ops.push(`${String(prop)}=${String(v)}`);
      t[prop] = v;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, ops };
}

// ------------------------------------------- the crown devices

/** The eight facings the rig actually shows, from its own facing math. */
const FACINGS = [
  Math.PI / 2, Math.PI / 4, 0, -Math.PI / 4,
  -Math.PI / 2, (-3 * Math.PI) / 4, Math.PI, (3 * Math.PI) / 4,
];

/** The whole sweep as one string — every facing, at a mid-clock beat. */
function sweep(st: HelmStyle, hurt = false): string {
  const out: string[] = [];
  for (const dir of FACINGS) {
    const fx = Math.cos(dir);
    const fy = Math.sin(dir);
    const s = 150;
    const headR = 0.15 * s;
    const f: HeadFrame = {
      s, headX: 40, headY: -60,
      hw: headR * 1.04, hh: headR, cut: headR * 0.34, headR,
      fx, profileK: Math.abs(fx),
      backK: Math.max(0, Math.min(1, (-fy - 0.2) / 0.35)),
      lead: fx >= 0 ? 1 : -1,
      hurt, nowMs: 5234,
    };
    const { ctx, ops } = traceCtx();
    drawHelmet(ctx, st, f);
    out.push(ops.join('\n'));
  }
  return out.join('\n==\n');
}

/** Every helm in the roster that spends the named crown word. */
function carriersOf(word: 'spikesCrown' | 'fins'): string[] {
  return Object.entries(HELM_STYLES)
    .filter(([, st]) => st[word] !== undefined)
    .map(([id]) => id);
}

for (const word of ['spikesCrown', 'fins'] as const) {
  test(`THE ${word.toUpperCase()} IS SPENT: every helm that declares it paints it`, () => {
    const carriers = carriersOf(word);
    assert.ok(carriers.length > 0, `no helm declares ${word} — the word died`);
    for (const id of carriers) {
      const st = HELM_STYLES[id]!;
      const { [word]: _ablated, ...bare } = st;
      const full = sweep(st);
      const without = sweep(bare as HelmStyle);
      assert.notEqual(
        full,
        without,
        `${id} declares ${word} and paints NOTHING for it — the word is inert`,
      );
      // The device's own color must reach the canvas, not merely some
      // downstream ripple: an inert word can still shift a later clock.
      const col = st[word]!.color;
      assert.ok(
        full.includes(`fillStyle=${col}`),
        `${id} never fills in its ${word} color ${col}`,
      );
      // The hurt flash is a flat white silhouette: no device paints.
      assert.equal(
        sweep(st, true),
        sweep(bare as HelmStyle, true),
        `${id} paints its ${word} through the hurt flash`,
      );
    }
  });
}

test('THE TWO COWLS WEAR THEIR CROWNS: the hood branch spends both words', () => {
  // The exact pair the audit caught. Named outright so a future style
  // edit that quietly drops the word cannot pass by emptying the
  // roster-wide sweep above.
  const bristle = HELM_STYLES.packlord_hood!;
  assert.equal(bristle.kind, 'hood');
  assert.ok(bristle.spikesCrown, 'packlord_hood keeps its bristle ridge');
  const frill = HELM_STYLES.weirkeeper_hood!;
  assert.equal(frill.kind, 'hood');
  assert.ok(frill.fins, 'weirkeeper_hood keeps its frill');
  // Seated ON the cowl: the crest paints AFTER the ruff, so the ruff's
  // last fill is not the last fill on the head.
  const full = sweep(bristle);
  const ruffAt = full.lastIndexOf(`fillStyle=${bristle.ruff!.color}`);
  const crestAt = full.lastIndexOf(`fillStyle=${bristle.spikesCrown!.color}`);
  assert.ok(ruffAt >= 0 && crestAt > ruffAt, 'the bristle ridge must seat over the ruff');
});

// ------------------------------------ the plate words under cloth

/** A torso frame at one yaw — the body painter's whole input. */
function torsoSweep(st: BodyStyle): string {
  const out: string[] = [];
  for (const yaw of [0, 0.8, Math.PI / 2, -1.4]) {
    for (const backK of [0, 0.9]) {
      const f: TorsoFrame = {
        s: 150, tw: 22, ww: 18, th: 40, lead: yaw >= 0 ? 1 : -1,
        profileK: Math.abs(Math.cos(yaw)), backK, yaw, hurt: false,
        strideSw: 0.2, nowMs: 5234, runF: 0.4, dragX: 1.4,
      };
      const { ctx, ops } = traceCtx();
      drawTorsoGarment(ctx, st, f);
      out.push(ops.join('\n'));
    }
  }
  return out.join('\n==\n');
}

test('THE SURCOAT COVERS THE BREASTPLATE: midline and rivets never reach cloth', () => {
  // The counterpart verdict to the crowns, and the reason warvaliant's
  // two words were struck rather than wired up. `midline` and
  // `rivetSeams` are breastplate work: the painter only cuts the
  // breastplate rect on a BARE chest, so a tabarded plate can never
  // show either — and un-guarding them would stamp forge rivets onto
  // cloth. If a future edit lets them through the surcoat, this goes
  // red, and whoever wrote it learns the guard was load-bearing.
  let tabarded = 0;
  for (const [id, st] of Object.entries(BODY_STYLES)) {
    if (st.chest !== 'plate' || !st.tabard) continue;
    tabarded++;
    const dressed = { ...st, midline: true, rivetSeams: true };
    const bare = { ...st, midline: undefined, rivetSeams: undefined };
    assert.equal(
      torsoSweep(dressed),
      torsoSweep(bare),
      `${id} wears a tabard, so midline/rivetSeams must stay unreachable`,
    );
  }
  assert.ok(tabarded > 0, 'the roster still fields a tabarded plate');
  // warvaliant is the one this wave cleaned: no dead words on it.
  const wv = BODY_STYLES.warvaliant_platebody!;
  assert.equal(wv.midline, undefined, 'warvaliant must not re-declare a dead midline');
  assert.equal(wv.rivetSeams, undefined, 'warvaliant must not re-declare dead rivetSeams');
});
