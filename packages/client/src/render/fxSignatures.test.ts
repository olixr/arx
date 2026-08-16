import { test } from 'node:test';
import { MATTER_MIGRATED } from './fxSignatures.js';
import { MATTER } from './matter/index.js';
import assert from 'node:assert/strict';
import { FX_STYLES } from './abilityFx.js';
import { SIGNATURES } from './fxSignatures.js';

/**
 * THE SIGNATURE LAW's registry contract: a signature can only crown
 * an ability that exists — an orphan key is a typo waiting to make a
 * bespoke set-piece silently unreachable.
 */
test('every signature crowns a real ability face', () => {
  for (const id of Object.keys(SIGNATURES)) {
    assert.ok(FX_STYLES[id], `signature '${id}' has no FX_STYLES face — orphan key`);
  }
});

test('every signature carries at least one hook', () => {
  for (const [id, sig] of Object.entries(SIGNATURES)) {
    assert.ok(
      sig.spawn || sig.ground || sig.air,
      `signature '${id}' is an empty object — a crown with no jewels`,
    );
  }
});

/**
 * THE ONE-VOICE LAW's ledger: the migrated list only grows, every
 * entry is a real signature, and the exemplar wave stays pinned —
 * a migration can never silently fall off the books.
 */
test('the matter-migration ledger is sound and append-only', () => {
  const EXEMPLARS = ['fireburst', 'shockwave', 'frost_nova', 'smoke_bomb', 'envenom'];
  for (const id of EXEMPLARS) {
    assert.ok(MATTER_MIGRATED.includes(id), `exemplar '${id}' fell off the migration ledger`);
  }
  for (const id of MATTER_MIGRATED) {
    assert.ok(SIGNATURES[id], `ledger entry '${id}' has no signature`);
  }
  assert.equal(new Set(MATTER_MIGRATED).size, MATTER_MIGRATED.length, 'ledger holds duplicates');
  // The library the migrations lean on is present and whole.
  assert.equal(Object.keys(MATTER).length, 10);
});

/**
 * THE BRINE WAVE: a crown's word is read a dozen times a fight, so
 * every one of the skral bosses' eight arts carries a full bespoke
 * set-piece — never just the shared grammar. The layered promise is
 * pinned per art: every signature owns its ground story, and the
 * arts whose reads live at true height (the geyser's column, the
 * eel's dorsal ghosts, the jet's falling drips, the sunder crack,
 * the gob's stink) carry an air stratum too.
 */
test('THE BRINE CROWNS: all eight boss arts wear bespoke signatures', () => {
  const GROUNDED = [
    'drowning_surge', 'abyssal_jet', 'court_of_spears', 'kingspool_geyser',
    'shallows_rush', 'gullet_snap', 'gorge_spray', 'breaching_crash',
  ];
  for (const id of GROUNDED) {
    const sig = SIGNATURES[id];
    assert.ok(sig, `brine crown art '${id}' lost its bespoke signature`);
    assert.ok(sig.spawn, `'${id}' spawn hook: every brine landing wets the bank`);
    assert.ok(sig.ground, `'${id}' ground hook: every brine art marks its floor`);
  }
  for (const id of ['kingspool_geyser', 'shallows_rush', 'abyssal_jet', 'gullet_snap', 'gorge_spray']) {
    assert.ok(SIGNATURES[id]!.air, `'${id}' air hook: this read stands at true height`);
  }
});

/**
 * THE SECOND BREATH SPEAKS: the sixty breath arts of the six grown
 * schools arrived under the v4 SIGNATURE LAW late — this pin makes
 * sure none of them ever slips back to shared grammar. Every art
 * carries a bespoke signature with at least two hooks (a one-hook
 * signature cannot hold an impact AND an aftermath).
 */
test('THE SECOND BREATH SPEAKS: all sixty breath arts wear layered signatures', () => {
  const WAVES: Record<string, string[]> = {
    archery: ['kingshot', 'stringsong', 'hawks_hour', 'winterflight', 'emberhead',
      'skyloom', 'gloamshaft', 'harrier', 'zenith', 'crowsong'],
    sneak: ['opened_vein', 'threadwork', 'nightshade_kiss', 'quiet_knife', 'redwork',
      'gallows_thread', 'widows_draw', 'bloodletting', 'lights_out', 'red_hour'],
    shield: ['iron_toll', 'grindstone', 'doorfall', 'held_gate', 'sunbrass',
      'millwall', 'anchorfall', 'patient_wall', 'standing_sun', 'winterhold'],
    twohand: ['fell_timber', 'quarry_work', 'forgefall', 'wheelbreaker', 'gravedigger',
      'ore_song', 'skyweight', 'long_lever', 'sunhammer', 'worlds_rim'],
    dualwield: ['two_bells', 'ribbonwork', 'twin_moons', 'silver_reel', 'matched_flame',
      'stormstitch', 'mirrorfall', 'the_weave', 'first_and_last', 'hummingbird'],
    combat: ['measured_blow', 'drumbeat', 'thrown_iron', 'ironbreath', 'fifth_road',
      'old_thunder', 'gathered_breath', 'long_watch', 'scarworn', 'last_lesson'],
  };
  for (const [school, arts] of Object.entries(WAVES)) {
    assert.equal(arts.length, 10, `${school}: the wave is ten arts`);
    for (const id of arts) {
      const sig = SIGNATURES[id];
      assert.ok(sig, `${school} breath art '${id}' lost its bespoke signature`);
      const hooks = [sig.spawn, sig.ground, sig.air].filter(Boolean).length;
      assert.ok(hooks >= 2, `'${id}' carries ${hooks} hook(s) — impact and aftermath need two`);
    }
  }
});
