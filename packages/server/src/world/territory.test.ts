import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  AUTHORED_FRONTIER,
  FRONTIER,
  MINOR_DEFS,
  POI_DEFS,
  POI_PREFABS,
  familiesOf,
  replaceFrontier,
  territoryAt,
} from '@arx/content';
import { poiForCell, poiScanOrder, POI_CELL, type PoiContext, type PoiSite } from './pois.js';
import { findsForCell } from './finds.js';

const SEED = 1337;

/** Deep-frontier context over the REAL rosters — the atlas as shipped. */
const CTX: PoiContext = {
  anchors: [{ x: 0, y: 0, safeR: 8 }],
  zoneRects: [],
  claimRings: [],
  defs: [...POI_DEFS.values()],
  minors: [],
  prefabs: POI_PREFABS,
  capitals: [],
};

function withBias<T>(bias: number, fn: () => T): T {
  const prior = FRONTIER.territoryBias;
  try {
    replaceFrontier({ ...AUTHORED_FRONTIER, territoryBias: bias });
    return fn();
  } finally {
    replaceFrontier({ ...AUTHORED_FRONTIER, territoryBias: prior });
  }
}

function scan(max = 140): PoiSite[] {
  const out: PoiSite[] = [];
  let looked = 0;
  for (const { cx, cy } of poiScanOrder(9)) {
    if (looked >= max) break;
    looked++;
    const site = poiForCell(SEED, cx, cy, 0, CTX);
    if (site) out.push(site);
  }
  return out;
}

test('the lean moves the mix and NEVER gates the sites', () => {
  const atlas = familiesOf(CTX.defs);
  const inFamilyCountry = (s: PoiSite): boolean => {
    const fam = POI_DEFS.get(s.defId)?.family;
    if (fam === undefined) return false;
    const t = territoryAt(
      SEED,
      s.cellX * POI_CELL + POI_CELL / 2,
      s.cellY * POI_CELL + POI_CELL / 2,
      atlas,
    );
    return t === fam;
  };
  const flat = withBias(1, () => scan());
  const leaned = withBias(6, () => scan());
  assert.ok(flat.length > 30 && leaned.length > 30, 'the scan went thin');
  // Density is essentially untouched: the lean re-mixes WHICH stands.
  // (A leaned pick may carry a bigger footprint that fails ground the
  // smaller def would have seated — honest, and bounded to a whisper.)
  assert.ok(
    Math.abs(leaned.length - flat.length) <= Math.ceil(flat.length * 0.06),
    `the lean moved density beyond a whisper (${flat.length} → ${leaned.length})`,
  );
  const flatMatch = flat.filter(inFamilyCountry).length;
  const leanMatch = leaned.filter(inFamilyCountry).length;
  assert.ok(
    leanMatch > flatMatch,
    `bias 6 did not thicken the countries (${leanMatch} vs ${flatMatch})`,
  );
  // Never a cage: foreign archetypes still stand inside countries.
  const foreign = leaned.filter((s) => {
    const fam = POI_DEFS.get(s.defId)?.family;
    const t = territoryAt(
      SEED,
      s.cellX * POI_CELL + POI_CELL / 2,
      s.cellY * POI_CELL + POI_CELL / 2,
      atlas,
    );
    return t !== null && fam !== t;
  });
  assert.ok(foreign.length > 0, 'bias 6 emptied the countries of everything foreign — a cage');
});

test('the lean re-mixes the finds palette the same way', () => {
  const ctx: PoiContext = { ...CTX, minors: [...MINOR_DEFS.values()] };
  const count = (bias: number): { total: number; family: number } =>
    withBias(bias, () => {
      let total = 0;
      let family = 0;
      let looked = 0;
      for (const { cx, cy } of poiScanOrder(8)) {
        if (looked >= 100) break;
        looked++;
        for (const f of findsForCell(SEED, cx, cy, 0, ctx, null)) {
          total++;
          const fam = ctx.minors.find((m) => m.id === f.defId)?.family;
          if (fam !== undefined && territoryAt(SEED, f.anchorX, f.anchorY, familiesOf(ctx.defs)) === fam) {
            family++;
          }
        }
      }
      return { total, family };
    });
  const flat = count(1);
  const leaned = count(8);
  assert.ok(flat.total > 60, `the finds scan went thin (${flat.total})`);
  assert.ok(
    Math.abs(leaned.total - flat.total) <= Math.ceil(flat.total * 0.06),
    `the finds lean moved density beyond a whisper (${flat.total} → ${leaned.total})`,
  );
  assert.ok(
    leaned.family > flat.family,
    `bias 8 did not thicken the finds palette (${leaned.family} vs ${flat.family})`,
  );
});
