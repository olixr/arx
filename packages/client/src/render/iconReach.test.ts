import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LOOT_TABLES, RECIPES, SHOPS, itemDef } from '@arx/content';

/**
 * NO FACELESS SHIPS. `itemIconUrl` answers an unmapped id with a
 * tinted 'burnt' lump — a deliberate loud-in-review fallback that is
 * only loud if somebody LOOKS. Nobody was looking: the product-shot
 * loop walks ITEM_ICON's own entries, so an id with no row is invisible
 * to every other pin in the file, and two waves of faceless gear (the
 * chase houses, the promoted materials) shipped that way.
 *
 * This is the look. Every id a player can REACH — named by a recipe's
 * inputs, paid by a loot table, or racked on a shop shelf — must hold a
 * real painter.
 *
 * THE LUMP IS DETECTED STRUCTURALLY, not by name-matching the table: a
 * fallback render is `renderIcon('burnt', <the item's tint>, size)`, so
 * if that exact cache key is warmed FIRST, a falling-through id draws
 * literally nothing — a pure cache hit, an empty op trace under the
 * recording canvas below. A real painter always lays down ops. Each id
 * is probed at its own size (size is part of the cache key) so a real
 * painter is never warm by accident from an earlier id in the sweep.
 *
 * The detector is self-tested in BOTH directions before any verdict is
 * trusted: a known-good id must trace ops, a known-lump id must trace
 * none. A detector that cannot come back red proves nothing.
 */

// ---- the recording canvas: a 2D context that draws nowhere and keeps
// the geometry it was asked for. Method calls land in the trace with
// their numeric arguments; style/state assignments do NOT — two shipped
// records of the same trousers in different cloth ARE the same drawing,
// and this trace says so.
const trace: string[] = [];

const CTX_METHODS = new Set([
  'save', 'restore', 'translate', 'rotate', 'scale', 'transform', 'setTransform',
  'resetTransform', 'beginPath', 'closePath', 'moveTo', 'lineTo', 'quadraticCurveTo',
  'bezierCurveTo', 'arc', 'arcTo', 'ellipse', 'rect', 'roundRect', 'fill', 'stroke',
  'clip', 'fillRect', 'strokeRect', 'clearRect', 'drawImage', 'putImageData',
  'setLineDash', 'getLineDash', 'fillText', 'strokeText', 'isPointInPath',
]);

function fmt(a: unknown): string {
  if (typeof a === 'number') return Number.isFinite(a) ? a.toFixed(3) : 'nan';
  if (typeof a === 'string') return 's';
  if (Array.isArray(a)) return `[${a.length}]`;
  return typeof a;
}

function makeCtx(): CanvasRenderingContext2D {
  const state: Record<string, unknown> = { globalAlpha: 1, lineWidth: 1 };
  const gradient = { addColorStop: (): void => {} };
  return new Proxy({} as Record<string, unknown>, {
    get(_t, prop) {
      if (typeof prop !== 'string') return undefined;
      if (CTX_METHODS.has(prop)) {
        return (...args: unknown[]): void => {
          trace.push(`${prop}(${args.map(fmt).join(',')})`);
        };
      }
      switch (prop) {
        case 'createLinearGradient':
        case 'createRadialGradient':
        case 'createConicGradient':
        case 'createPattern':
          return () => gradient;
        case 'getTransform':
          return () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
        case 'measureText':
          return () => ({ width: 0 });
        case 'getImageData':
          return (_x: number, _y: number, w: number, h: number) => ({
            data: new Uint8ClampedArray(Math.max(1, w * h) * 4),
            width: w,
            height: h,
          });
        case 'createImageData':
          return (w: number, h: number) => ({ data: new Uint8ClampedArray(Math.max(1, w * h) * 4) });
        default:
          return state[prop];
      }
    },
    set(_t, prop, value) {
      if (typeof prop === 'string') state[prop] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
}

function makeCanvas(): unknown {
  const ctx = makeCtx();
  return {
    width: 0,
    height: 0,
    getContext: () => ctx,
    toDataURL: () => 'data:image/png;base64,stub',
  };
}

(globalThis as { document?: unknown }).document = {
  createElement: (tag: string) => (tag === 'canvas' ? makeCanvas() : { style: {} }),
};

const icons = await import('./icons.js');

/** The tint `itemIconUrl` would hand the lump for this id. */
function lumpColor(id: string): string {
  return itemDef(id)?.color ?? '#888';
}

let probeSize = 64;

/** Ops laid down when this id renders at a size nothing has warmed. */
function traceOf(id: string): string[] {
  const size = probeSize++;
  trace.length = 0;
  icons.itemIconUrl(id, size);
  return trace.slice();
}

/**
 * True when the id falls through to the lump: warm the exact fallback
 * key first, and a fallthrough render becomes a pure cache hit that
 * draws nothing.
 */
function isLump(id: string): boolean {
  const size = probeSize++;
  icons.paintedIconUrl('burnt', () => {}, lumpColor(id), size);
  trace.length = 0;
  icons.itemIconUrl(id, size);
  return trace.length === 0;
}

test('the lump detector answers in both directions', () => {
  // Down direction: an id with no ITEM_ICON row anywhere renders the
  // fallback, and with the fallback warmed that is a silent cache hit.
  assert.equal(isLump('__no_such_item_in_any_table__'), true);
  // Up direction: a shipped painter lays down ops with the fallback
  // warmed at the same size — the detector cannot be vacuously green.
  assert.equal(isLump('coins'), false);
  // And the lump is a real drawing when it is NOT pre-warmed, so an
  // empty trace means "cache hit", never "burnt paints nothing".
  assert.ok(traceOf('__another_missing_id__').length > 0);
});

/** Every id a player can reach through the three shipped ledgers. */
function reachableIds(): Map<string, string> {
  const src = new Map<string, string>();
  const note = (id: string, where: string): void => {
    if (!src.has(id)) src.set(id, where);
  };
  for (const r of RECIPES.values()) for (const i of r.inputs) note(i.item, `recipe ${r.id}`);
  for (const t of LOOT_TABLES.values()) {
    for (const e of t.entries) if (e.item) note(e.item, `loot ${t.id}`);
  }
  for (const s of SHOPS.values()) for (const e of s.stock) note(e.item, `shop ${s.id}`);
  return src;
}

/**
 * THE STANDING DEBT, named out loud. The sweep that first ran this pin
 * found 69 faceless reachable ids and paid off the 13 THE WORN BOOK
 * itself promoted; these 56 are older debt in other lanes' remits, and
 * they are written down rather than swept under a loose assertion. The
 * list is a CEILING, not a licence: a new faceless id fails the pin, and
 * a paid-off one fails it too, so the number can only go down.
 */
const KNOWN_FACELESS: ReadonlySet<string> = new Set([
  // Materials other waves promoted into ledgers and left faceless —
  // the elven trades (061d4084), the shield wave (d14d8efc), and the
  // scribe's bench, which never had faces at all.
  'salt', 'radiant_essence', 'umbral_essence', 'astral_essence', 'focused_dust',
  'moonglass_lens', 'turtle_scute', 'colossus_plate', 'deepking_pearl',
  'silverbark', 'moonpale_silk',
  // Champion and boss trophies that pay to the ground but feed no
  // recipe yet — the furrier arc's banked pelts among them.
  'warboss_tusk', 'crusher_claw', 'petrified_eye', 'bonegrinder_girdle',
  'feywolf_pelt', 'duskruff_pelt', 'smokebrush_pelt', 'wintercourt_rime',
  'sand_laurel', 'legion_ring', 'nightveil_pinion',
  // Named drops whose art lane never answered (0cc361f8 recorded the
  // barrowdusk colorway; these are its neighbours).
  'lowhall_breacher', 'fellhorn_gate', 'oxbow', 'cindermaw_bulwark',
  'deepening_sigil', 'night_sabercat', 'gilded_tyrant', 'legion_doorwall',
  // The colorway wardrobes: three tidecaller lots and barrowdusk, all
  // wanting a one-line seed row each (the colorway loop walks
  // EARLY_COLORWAYS, which holds none of them).
  'tidecaller_gloves_maelstrom', 'tidecaller_hood_maelstrom', 'tidecaller_robe_maelstrom',
  'tidecaller_skirts_maelstrom', 'tidecaller_slippers_maelstrom',
  'tidecaller_gloves_abyss', 'tidecaller_hood_abyss', 'tidecaller_robe_abyss',
  'tidecaller_skirts_abyss', 'tidecaller_slippers_abyss',
  'tidecaller_gloves_darkwater', 'tidecaller_hood_darkwater', 'tidecaller_robe_darkwater',
  'tidecaller_skirts_darkwater', 'tidecaller_slippers_darkwater',
  'nightveil_boots_barrowdusk', 'nightveil_cowl_barrowdusk', 'nightveil_gloves_barrowdusk',
  'nightveil_jerkin_barrowdusk', 'nightveil_leggings_barrowdusk',
  // Shop rows: the larder's two and the stable's four mounts.
  'fishers_pot', 'smoked_trout', 'hoargate_garron', 'bay_courser', 'grey_courser', 'dun_courser',
]);

test('every reachable item holds a real painter — no faceless ships', () => {
  const reach = reachableIds();
  const faceless: string[] = [];
  for (const [id, where] of reach) {
    if (KNOWN_FACELESS.has(id)) continue;
    if (isLump(id)) faceless.push(`${id} (${where})`);
  }
  assert.deepEqual(
    faceless,
    [],
    `${faceless.length} of ${reach.size} reachable ids render the burnt lump:\n  ${faceless.join('\n  ')}`,
  );
});

test('the recorded debt is exactly the debt — no stale entries', () => {
  // The other half of the ceiling. An id that gained a face, or left
  // the ledgers entirely, comes OFF the list the same day, or the list
  // starts hiding regressions instead of recording debt.
  const reach = reachableIds();
  const stale: string[] = [];
  for (const id of KNOWN_FACELESS) {
    if (!reach.has(id)) stale.push(`${id} (no longer reachable)`);
    else if (!isLump(id)) stale.push(`${id} (has a painter now)`);
  }
  assert.deepEqual(stale, [], `stale debt entries:\n  ${stale.join('\n  ')}`);
});

/**
 * The ops a painter itself lays down, with the bake frame stripped:
 * `bakeOutlinedSprite` opens with save/translate/scale, runs the
 * painter, then restores and composites — and the frame's own numbers
 * scale with the icon size, while a painter draws in the 0..1 unit box
 * at every size. Strip the frame and two ids are comparable even when
 * they were probed at different sizes. Tint never enters: style
 * assignments are not recorded, so two records of the same trousers in
 * different cloth read as what they are — the same drawing.
 */
const FRAME_OPS = (() => {
  trace.length = 0;
  icons.paintedIconUrl('__frame_probe__', () => {}, '#000', probeSize++);
  return trace.length;
})();

function geomOf(id: string): string {
  const t = traceOf(id);
  return t.slice(3, t.length - (FRAME_OPS - 3)).join(';');
}

test('the geometry trace is size- and tint-blind', () => {
  // Without this the twin check below is nonsense: the frame must
  // strip to nothing, a painter must survive it, and two ids sharing a
  // painter at different tints AND different probe sizes must match.
  trace.length = 0;
  icons.paintedIconUrl('__frame_probe__', () => {}, '#111', probeSize++);
  const blank = trace.slice();
  assert.equal(blank.slice(3, blank.length - (FRAME_OPS - 3)).join(';'), '');
  assert.ok(geomOf('coins').length > 0);
  assert.equal(geomOf('gold_ring'), geomOf('silver_ring'));
  assert.notEqual(geomOf('coins'), geomOf('gold_ring'));
});

test('a row that names a painter which does not exist is still a lump', () => {
  // THE BLIND SPOT IN THE PIN ABOVE, closed. `isLump` warms the
  // fallback cache key 'burnt|<tint>|<size>' and calls an empty trace
  // proof of a fallthrough. But an ITEM_ICON row naming a painter key
  // that does not exist ALSO falls back to the burnt drawing — under
  // its own '<typo>|<tint>|<size>' key, which nothing warmed. So it
  // traces a full burnt lump, looks like a real painter to that test,
  // and ships the grey rock anyway. Renaming a live row's icon to a
  // nonexistent key leaves the reachability pin GREEN; it must not.
  //
  // The answer needs no export and no name-matching: whatever key it
  // came from, the burnt drawing is one specific GEOMETRY, and no
  // authored painter may share it.
  const lumpGeom = geomOf('__never_mapped_at_all__');
  assert.ok(lumpGeom.length > 0, 'the burnt lump must itself draw something, or this proves nothing');
  // The one honest wearer: burnt_food's SUBJECT is a burnt lump, so it
  // draws the fallback on purpose and always has. Named here rather
  // than loosened out of the assertion, because the day a second id
  // joins it, that will be a defect and this list is where the next
  // author has to justify it.
  const HONEST_LUMP = new Set(['burnt_food']);
  const wearing: string[] = [];
  for (const id of icons.allIconItemIds()) {
    if (HONEST_LUMP.has(id)) continue;
    if (geomOf(id) === lumpGeom) wearing.push(id);
  }
  assert.deepEqual(
    wearing,
    [],
    `these ids hold an ITEM_ICON row but draw the burnt lump — the row names a painter that does ` +
      `not exist:\n  ${wearing.join('\n  ')}`,
  );
});

test('the promoted materials are drawings, not tinted twins', () => {
  // A material's face must be ITS OWN geometry: if a painter's trace
  // matches another id's exactly, the material is wearing somebody
  // else's picture in a different colour, which is the cheap work this
  // pin exists to catch.
  const materials = [
    'fox_pelt', 'lynx_pelt', 'basilisk_scale', 'ogre_tooth', 'warlord_crest',
    'elder_plume', 'owl_plume', 'everfrost_shard', 'molten_slag', 'golem_core',
    'hillstone_heart', 'forgeplate_scrap', 'razorback_tusk',
  ];
  const mats = new Set(materials);
  const seen = new Map<string, string>();
  for (const id of icons.allIconItemIds()) {
    if (mats.has(id)) continue;
    const key = geomOf(id);
    if (!seen.has(key)) seen.set(key, id);
  }
  const own = new Map<string, string>();
  for (const id of materials) {
    const key = geomOf(id);
    assert.ok(key.length > 0, `'${id}' draws nothing`);
    const twin = seen.get(key) ?? own.get(key);
    assert.equal(twin, undefined, `'${id}' draws the same geometry as '${twin}' — a tinted twin, not a face`);
    own.set(key, id);
  }
});
