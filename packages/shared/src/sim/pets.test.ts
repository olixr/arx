import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  GENTLE_HP_FRAC,
  PET_CATCHUP_DIST,
  PET_HEEL_DIST,
  PET_SPRINT_CAP,
  petFollowSpeed,
  petLevelFor,
  sanitizePetName,
} from './pets.js';
import { xpForLevel } from '../skills.js';

test('the gentling window is the craven threshold', () => {
  // Shared on purpose: the moment a wild thing's nerve breaks is the
  // moment a gentle hand can reach it. If the craven law ever moves,
  // this pin forces the two to be re-argued together.
  assert.equal(GENTLE_HP_FRAC, 0.35);
});

test('follow speed: settle at heel, walk in the band, sprint the gap', () => {
  assert.equal(petFollowSpeed(2.8, PET_HEEL_DIST), 0);
  assert.equal(petFollowSpeed(2.8, PET_HEEL_DIST + 0.1), 2.8);
  assert.equal(petFollowSpeed(2.8, PET_CATCHUP_DIST), 2.8 * 1.5);
});

test('no companion stride ever crosses the netcode lane', () => {
  // Fastest shipped beast today is worg at 5.0; assert the LAW, not
  // the roster: even an absurd species speed clamps under the cap,
  // and the cap sits under the netcode's smoothing ceiling with
  // margin (interpolation.ts SMOOTH_MAX_SPEED = 12 t/s — the mounts
  // cap keeps the same lane, mounts.test.ts pins it the same way).
  assert.equal(petFollowSpeed(11, 30), PET_SPRINT_CAP);
  assert.ok(PET_SPRINT_CAP < 12, 'sprint cap crossed the smoothing lane');
});

test('the leash on the ladder: base start, xp climbs, beastcraft caps', () => {
  // Fresh tame reads the species level whatever the keeper knows.
  assert.equal(petLevelFor(0, 6, 10), 6);
  assert.equal(petLevelFor(0, 16, 99), 16);
  // XP climbs from the species base on the one shipped curve.
  assert.equal(petLevelFor(xpForLevel(2), 6, 99), 7);
  // The keeper's beastcraft is the ceiling...
  assert.equal(petLevelFor(xpForLevel(50), 6, 12), 12);
  // ...but a beast is never less than itself (dev tames, migrations).
  assert.equal(petLevelFor(0, 16, 1), 16);
});

test('collar-tag names: letters live, junk dies, whitespace collapses', () => {
  assert.equal(sanitizePetName('Bramble'), 'Bramble');
  assert.equal(sanitizePetName('  Old   Iron  '), 'Old Iron');
  assert.equal(sanitizePetName("Fen's Own"), "Fen's Own");
  assert.equal(sanitizePetName('Boar-Bane'), 'Boar-Bane');
  assert.equal(sanitizePetName('X'), null); // too short
  assert.equal(sanitizePetName('a'.repeat(17)), null); // too long
  assert.equal(sanitizePetName('Sir Nips III!'), null); // punctuation
  assert.equal(sanitizePetName('-Bramble'), null); // must start on a letter
  assert.equal(sanitizePetName("Bramble'"), null); // must end on a letter
  assert.equal(sanitizePetName('   '), null);
  assert.equal(sanitizePetName(42), null);
  assert.equal(sanitizePetName(undefined), null);
});
