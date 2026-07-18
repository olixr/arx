import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DAY_CYCLE_MS,
  DAY_START_HOURS,
  SUNRISE,
  SUNSET,
  TIME_NAMES,
  clockHours,
  clockHoursAtTick,
  daylightAt,
  ofsForHours,
} from './daylight.js';
import { TICK_MS } from '../constants.js';

describe('world clock', () => {
  it('boots at mid-morning and wraps every cycle', () => {
    assert.equal(clockHours(0), DAY_START_HOURS);
    assert.ok(Math.abs(clockHours(DAY_CYCLE_MS) - DAY_START_HOURS) < 1e-9);
    const quarter = clockHours(DAY_CYCLE_MS / 4);
    assert.ok(Math.abs(quarter - ((DAY_START_HOURS + 6) % 24)) < 1e-9);
  });

  it('ofsForHours lands the clock on the requested hour', () => {
    for (const tick of [0, 12345, 999999]) {
      for (const target of [0, 6, 12, 19.8, 23]) {
        const ofs = ofsForHours(tick, target);
        assert.ok(ofs >= 0);
        const got = clockHoursAtTick(tick, ofs);
        // Rounded to whole ticks: within one tick's worth of hours.
        const tol = (TICK_MS / DAY_CYCLE_MS) * 24 * 1.01;
        const diff = Math.min(Math.abs(got - target), 24 - Math.abs(got - target));
        assert.ok(diff <= tol, `tick ${tick} → ${target}h got ${got}h`);
      }
    }
  });
});

describe('daylight laws', () => {
  it('solar noon: sun at zenith, short shadows cast due south', () => {
    const noon = daylightAt((SUNRISE + SUNSET) / 2);
    assert.ok(noon.sun > 0.95);
    assert.equal(noon.moon, 0);
    assert.ok(!noon.moonlit);
    assert.ok(Math.abs(noon.shadowX) < 0.15, 'noon shadow ~straight down-screen');
    assert.ok(noon.shadowY > 0.98);
    assert.ok(noon.shadowLen < 0.6, 'noon shadows are short');
    assert.ok(noon.shadowAlpha > 0.25);
    assert.ok(noon.darkness < 0.02, 'midday lightmap can be skipped');
    assert.ok(noon.flame < 0.05, 'lamps are cold at noon');
  });

  it('morning shadows point southwest, evening southeast — the fan stays south', () => {
    assert.ok(daylightAt(8).shadowX < -0.35);
    assert.ok(daylightAt(18).shadowX > 0.35);
    // The whole fan stays SOUTH of the caster (light from the northern
    // sky, consistent with the art's lit crowns) — never up-screen,
    // and never hard side-light.
    for (const h of [6, 8, 10, 12, 14, 16, 18, 20, 22, 2]) {
      const s = daylightAt(h);
      assert.ok(s.shadowY > 0.6, `shadow at ${h}h falls south, not sideways`);
    }
  });

  it('night is moonlit: playable-blue ambient, faint long shadows', () => {
    const mid = daylightAt(0);
    assert.equal(mid.sun, 0);
    assert.ok(mid.moon > 0.6);
    assert.ok(mid.moonlit);
    assert.ok(mid.shadowAlpha > 0.05 && mid.shadowAlpha < 0.15);
    const [r, g, b] = mid.ambient;
    assert.ok(b > r, 'night ambient is blue-cast');
    for (const c of mid.ambient) assert.ok(c >= 88, 'night floor stays readable');
    assert.ok(mid.darkness > 0.4);
    assert.ok(mid.flame > 0.95, 'flames fully lit at night');
  });

  it('dawn and dusk are golden', () => {
    for (const h of [6.3, 19.4]) {
      const [r, , b] = daylightAt(h).ambient;
      assert.ok(r > b + 30, `${h}h ambient is warm`);
    }
  });

  it('everything glides — no pops around the whole clock', () => {
    let prev = daylightAt(0);
    for (let h = 0.02; h < 24; h += 0.02) {
      const s = daylightAt(h);
      for (let c = 0; c < 3; c++) {
        assert.ok(Math.abs(s.ambient[c]! - prev.ambient[c]!) < 6, `ambient pop at ${h}h`);
        assert.ok(Math.abs(s.sky[c]! - prev.sky[c]!) < 8, `sky pop at ${h}h`);
      }
      assert.ok(Math.abs(s.shadowAlpha - prev.shadowAlpha) < 0.03, `shadow alpha pop at ${h}h`);
      assert.ok(Math.abs(s.flame - prev.flame) < 0.04, `flame pop at ${h}h`);
      const dot = s.shadowX * prev.shadowX + s.shadowY * prev.shadowY;
      // Direction may flip at the sun/moon handoff but only while
      // shadows are invisible; when visible it must sweep smoothly.
      if (s.shadowAlpha > 0.02 && prev.shadowAlpha > 0.02) {
        assert.ok(dot > 0.98, `shadow direction jump at ${h}h`);
      }
      prev = s;
    }
  });

  it('shadow vectors are unit length with bounded reach', () => {
    for (let h = 0; h < 24; h += 0.25) {
      const s = daylightAt(h);
      assert.ok(Math.abs(Math.hypot(s.shadowX, s.shadowY) - 1) < 1e-9);
      assert.ok(s.shadowLen >= 0.3 && s.shadowLen <= 2.6);
      for (const c of s.ambient) assert.ok(c >= 88 && c <= 255);
    }
  });

  it('twilight gap: neither body casts right at the horizon swap', () => {
    assert.equal(daylightAt(SUNRISE).shadowAlpha, 0);
    assert.equal(daylightAt(SUNSET).shadowAlpha, 0);
  });

  it('named times are within the clock', () => {
    for (const [name, h] of Object.entries(TIME_NAMES)) {
      assert.ok(h >= 0 && h < 24, name);
    }
  });
});
