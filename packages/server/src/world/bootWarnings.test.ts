import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { POI_PREFABS } from '@arx/content';
import { loadPoiPrefabs } from './pois.js';
import * as metrics from '../metrics.js';

/** Load the library into a scratch data dir, capturing the warnings it raised. */
function load(seedBad: boolean): { lib: ReturnType<typeof loadPoiPrefabs>; warned: string[]; counted: number } {
  const dir = mkdtempSync(join(tmpdir(), 'arx-prefabs-'));
  try {
    mkdirSync(join(dir, 'prefabs'));
    if (seedBad) writeFileSync(join(dir, 'prefabs', 'poi_broken.json'), '{ not json');
    metrics.resetAll();
    metrics.unsealBoot();
    const warned: string[] = [];
    const orig = console.warn;
    console.warn = (line: string) => {
      warned.push(line);
    };
    try {
      const lib = loadPoiPrefabs(dir);
      return { lib, warned, counted: metrics.bootWarnings() };
    } finally {
      console.warn = orig;
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('THE BOOT COUNTS ITS SOFT FAILS: a malformed prefab file is skipped, warned, and counted once', () => {
  // A clean library may carry its own debt (today: the authored
  // poi_iron_rest sketch fails its round trip on legs over the 12-hop
  // cap — one warning every boot); the pin is the DELTA a bad file adds.
  const clean = load(false);
  assert.equal(clean.counted, clean.warned.length, 'every loader warning is counted');
  {
    const { lib, warned, counted } = load(true);
    assert.equal(counted, clean.counted + 1);
    assert.equal(warned.length, clean.warned.length + 1);
    assert.ok(warned.some((w) => /bad prefab file .*poi_broken\.json — skipped/.test(w)));
    // The builtins still stand — a bad file never bricks the library.
    assert.ok(lib.size >= POI_PREFABS.size);
    assert.equal(lib.has('poi_broken'), false);
  }
});
