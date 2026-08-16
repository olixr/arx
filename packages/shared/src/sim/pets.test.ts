import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  GENTLE_HP_FRAC,
  PET_ART_SLOTS,
  PET_BOND_RANK_NAMES,
  PET_BOND_RANK_XP,
  PET_CATCHUP_DIST,
  PET_HEEL_DIST,
  PET_SPRINT_CAP,
  petBondRank,
  petFocusMax,
  petFollowSpeed,
  petLevelFor,
  petXpMentorMult,
  sanitizePetArts,
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

test('focus is earned twice, and three crowns never fit', () => {
  // The tame's gift alone.
  assert.equal(petFocusMax(1, 0), 1);
  // The pet's own climb pays at 20/40/60...
  assert.equal(petFocusMax(20, 0), 2);
  assert.equal(petFocusMax(40, 0), 3);
  assert.equal(petFocusMax(60, 0), 4);
  // ...and the bond pays at ranks 2/3/4.
  assert.equal(petFocusMax(1, 2), 2);
  assert.equal(petFocusMax(1, 4), 4);
  // The ceiling, fully walked both roads.
  assert.equal(petFocusMax(99, 4), 7);
  // THE ARITHMETIC IS THE DESIGN: three signatures (3+3+3 = 9) exceed
  // the ceiling forever — nobody stacks three crowns.
  assert.ok(petFocusMax(99, 4) < 9, 'three signatures fit; the design broke');
});

test('the rope has five knots and they only tighten forward', () => {
  assert.equal(PET_BOND_RANK_XP.length, 5);
  assert.equal(PET_BOND_RANK_NAMES.length, 5);
  assert.equal(petBondRank(0), 0);
  assert.equal(petBondRank(199), 0);
  assert.equal(petBondRank(200), 1);
  assert.equal(petBondRank(600), 2);
  assert.equal(petBondRank(1400), 3);
  assert.equal(petBondRank(2800), 4);
  assert.equal(petBondRank(1_000_000), 4);
  // Thresholds strictly climb — a knot can never be passed twice.
  for (let i = 1; i < PET_BOND_RANK_XP.length; i++) {
    assert.ok(PET_BOND_RANK_XP[i]! > PET_BOND_RANK_XP[i - 1]!);
  }
});

test("the mentor's hand speeds the road, never teleports down it", () => {
  // No mentor bonus at or below the pet's own level.
  assert.equal(petXpMentorMult(10, 10), 1);
  assert.equal(petXpMentorMult(5, 40), 1);
  // A point of beastcraft over the friend pays one percent...
  assert.equal(petXpMentorMult(30, 10), 1.2);
  // ...capped at half again, however wide the gap.
  assert.equal(petXpMentorMult(99, 1), 1.5);
});

test('a loadout is short, distinct, and lowercase or it is nothing', () => {
  assert.deepEqual(sanitizePetArts([]), []);
  assert.deepEqual(sanitizePetArts(['maul', 'thick_fat']), ['maul', 'thick_fat']);
  assert.equal(sanitizePetArts(['a', 'b', 'c', 'd']), null); // past the collars
  assert.equal(sanitizePetArts(['maul', 'maul']), null); // twice is once
  assert.equal(sanitizePetArts(['Maul']), null); // ids are lowercase
  assert.equal(sanitizePetArts(['9lives']), null); // and start on a letter
  assert.equal(sanitizePetArts('maul'), null);
  assert.equal(sanitizePetArts(undefined), null);
  assert.equal(sanitizePetArts([42]), null);
  assert.ok(PET_ART_SLOTS === 3, 'the three collars are three');
});
