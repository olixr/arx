/**
 * THE LEG LEARNS TO SPEAK — the pins for the leg product shot.
 *
 * A LegStyle carries eighteen words. The icon painter used to read
 * five of them (kind, thigh, shin, knee, kneeColor), so the whole
 * shipped roster — a hundred and twenty leg items, seven houses —
 * collapsed to FIVE distinct drawings, every house separated by hex
 * codes alone. Thirteen one-owner leather words (the hare's hocks,
 * the fisher's waders and calf fin, the thief's tool roll, the
 * fox's socks, the drake's scale rows…) were authored, painted on
 * the body by rig.ts's leg pass, and dropped on the floor by the
 * pack. So was the dye lot's own cut: `thistledown_skirts_madder`
 * failed an id test anchored at the end of the string and drew as
 * TROUSERS, while its undyed twin drew a skirt.
 *
 * These pins measure the thing the eye actually complains about:
 * SHAPE, with every color ablated. Two houses that differ only in
 * hex are one drawing at 26px, and this file will not accept that.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EQUIPMENT_DEFS } from '@arx/content';
import { LEG_STYLES, legStyle, type LegStyle } from './armor.js';
import { legsIconPainter } from './armorIcons.js';

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
            assert.ok(Number.isFinite(a), `leg painter emitted NaN via ${name}`);
          }
        }
        ops.push(`${name}(${args.map((a) => (typeof a === 'number' ? a.toFixed(6) : String(a))).join(',')})`);
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

/** The full op stream for one leg product shot. */
function trace(st: LegStyle, id: string, fallback = '#8a7a5f'): string {
  const { ctx, ops } = traceCtx();
  legsIconPainter(st, fallback, id)(ctx);
  return ops.join('|');
}

/**
 * The same stream with every paint color ablated — what is LEFT is
 * the drawing itself. This is the honest test of "tellable apart in
 * the pack": a recolor is not a second icon.
 */
function shape(st: LegStyle, id: string): string {
  return trace(st, id).replace(/(fillStyle|strokeStyle)=[^|]*/g, '$1=*');
}

/** Every shipped leg item, dye lots included. */
const LEG_IDS = EQUIPMENT_DEFS.filter((d) => d.slot === 'legs').map((d) => d.id);

test('the roster is a wardrobe, not five drawings in a hundred tints', () => {
  assert.ok(LEG_IDS.length > 100, `expected the shipped leg roster, saw ${LEG_IDS.length}`);
  const shapes = new Set(LEG_IDS.map((id) => shape(legStyle(id), id)));
  // The floor, held well above the five-drawing collapse this file
  // was written to end. It is a FLOOR, not a target: an author who
  // spends another word on another house only pushes it up.
  assert.ok(
    shapes.size >= 12,
    `only ${shapes.size} distinct leg drawings across ${LEG_IDS.length} shipped items`,
  );
});

test('the houses that should look different DO', () => {
  // One from each lane that owns a leg word of its own, plus the two
  // plain roads. Every pair must differ in SHAPE, not just in tint.
  const houses = [
    'hareswift_chaps',      // hare-fur hocks
    'kingfisher_chaps',     // waxed waders + calf fin
    'cutpurse_leggings',    // the thief's tool roll
    'trapline_chaps',       // snare-cord lacing
    'emberfox_leggings',    // the fox's socks
    'wolfstalker_chaps',    // winter fur over the knee
    'nightveil_leggings',   // the thigh garter
    'drakescale_chaps',     // lapped scale rows
    'stagheart_chaps',      // moss-bound bands
    'wayfarer_chaps',       // the road patch
    'woven_trousers',       // plain cloth hose
    'vigil_skirts',         // a long robe skirt
    'wrightcloth_skirts',   // the one skirt that admits to a knee
    'steel_greaves',        // plain forged harness
  ];
  const seen = new Map<string, string>();
  for (const id of houses) {
    assert.ok(LEG_STYLES[id], `${id} left the roster`);
    const sh = shape(legStyle(id), id);
    const twin = seen.get(sh);
    assert.equal(twin, undefined, `${id} and ${twin} are the same drawing in two tints`);
    seen.set(sh, id);
  }
});

test('every one-owner leg word is SPENT by the pack', () => {
  // The ablation pin, both directions: the roster must still declare
  // the word, and the painter must still spend it. A word nobody
  // spends is a lie the next author inherits.
  const WORDS: Record<string, string> = {
    hock: 'hareswift_chaps',
    wader: 'kingfisher_chaps',
    calffin: 'kingfisher_chaps',
    pickroll: 'cutpurse_leggings',
    shadewrap: 'cutpurse_leggings_moonless',
    thighsheath: 'cutpurse_leggings_redhand',
    shinlace: 'trapline_chaps',
    sock: 'emberfox_leggings',
    roadpatch: 'wayfarer_chaps',
    furknee: 'wolfstalker_chaps',
    garter: 'nightveil_leggings',
    scalerows: 'drakescale_chaps',
    mossbind: 'stagheart_chaps',
  };
  for (const [word, id] of Object.entries(WORDS)) {
    const st = legStyle(id) as Record<string, unknown> & LegStyle;
    assert.ok(st[word] !== undefined, `${id} stopped declaring ${word}`);
    const ablated = { ...st };
    delete (ablated as Record<string, unknown>)[word];
    assert.notEqual(
      trace(st, id),
      trace(ablated as LegStyle, id),
      `${id} declares ${word} and the pack never paints it`,
    );
  }
});

test('a dye lot keeps its cut — a dyed skirt is still a skirt', () => {
  // The id test used to be anchored at the end of the string, so
  // every colorway skirt in the wardrobe drew as trousers.
  for (const dyed of LEG_IDS.filter((id) => /_skirts_/.test(id))) {
    const base = dyed.replace(/_skirts_.*$/, '_skirts');
    assert.equal(
      shape(legStyle(dyed), dyed),
      shape(legStyle(base), base),
      `${dyed} is cut differently from ${base}`,
    );
  }
});

test('the leather lane is not the cloth lane — kind is a word too', () => {
  // Ablate the kind: wound leather and hanging cloth must not be the
  // same drawing with a different word on the label.
  const st = legStyle('adderfang_leggings');
  assert.equal(st.kind, 'wraps');
  assert.notEqual(
    shape(st, 'adderfang_leggings'),
    shape({ ...st, kind: 'pants' }, 'adderfang_leggings'),
    'wraps and pants draw the same leg',
  );
});
