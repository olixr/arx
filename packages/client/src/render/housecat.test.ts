import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * THE HEARTH'S SHADOW — the house cat's standing laws.
 *
 * The cat is the game's first pure-company critter: its whole value
 * is the coat cabinet and the domestic carriage, so these pins guard
 * exactly that — the cabinet's breadth (a square of town cats must
 * scatter, never stamp one body), the brief's named coats (the
 * capped white with the ringed tail, the grey over white), the hair
 * length told from the tail, and the seed stability THE COAT
 * OUTLIVES THE BODY depends on.
 */
import { beastSpec, housecatLook } from './rig.js';
import { TailSim } from './tail.js';

test('the cat walks its own bespoke rig, never the generic fallback', () => {
  const spec = beastSpec('cat', 0.16, 3.6);
  // The generic fallback derives everything from the radius; the
  // authored spec carries the feline bones instead.
  assert.ok(spec.segSplit, 'the cat carries the unequal feline bones (segSplit)');
  assert.equal(spec.rig.legs.length, 4);
  // The quickest pivot in town: nothing else turns at 12.
  assert.ok((spec.rig.turnRate ?? 0) >= 12, 'a cat pivots inside its own length');
  // Kitten scale: smaller than the lynx cub in every dimension.
  const cub = beastSpec('lynx_young', 0.2, 4.6);
  assert.ok(spec.bodyLen < cub.bodyLen, 'smaller than the lynx cub');
  assert.ok(spec.rig.legLen < cub.rig.legLen);
});

test('the cabinet scatters a town square — never one body stamped', () => {
  // Consecutive town eids (a spawn cluster) must spread across the
  // cabinet: the gnoll hash law, spoken domestic.
  const coats = new Set<string>();
  for (let eid = 400; eid < 412; eid++) {
    const l = housecatLook('cat', eid);
    coats.add(`${l.coat}|${l.pattern}|${l.tail}|${l.longhair}`);
  }
  assert.ok(coats.size >= 6, `12 neighbors wear ${coats.size} coats — the square must scatter`);
});

test('the brief’s named cats hang in the cabinet', () => {
  // Sweep the seed space and collect every pattern/tail/hair combo
  // the cabinet can produce.
  const seen = new Set<string>();
  for (let seed = 0; seed < 512; seed++) {
    const l = housecatLook('cat', seed);
    seen.add(`${l.pattern}|${l.tail}|${l.longhair ? 'long' : 'short'}`);
  }
  // The capped white with the ringed raccoon tail.
  assert.ok(seen.has('capped|rings|short'), 'the capped white with the ringed tail');
  // The grey with the white underbody and the all-grey tail.
  assert.ok(seen.has('bicolor|coat|short'), 'the grey over white, tail in coat');
  // Both hair lengths ship, and the tail tells them apart.
  assert.ok([...seen].some((k) => k.endsWith('|long')), 'longhairs ship');
  assert.ok([...seen].some((k) => k.endsWith('|short')), 'shorthairs ship');
  // Tabbies, solids, tuxedos, patches, and points all live.
  for (const pat of ['tabby', 'solid', 'tuxedo', 'patched', 'points', 'capped', 'bicolor']) {
    assert.ok([...seen].some((k) => k.startsWith(pat + '|')), `${pat} lives in the cabinet`);
  }
});

test('THE COAT OUTLIVES THE BODY: one seed, one cat, forever', () => {
  const a = housecatLook('cat', 123456789);
  const b = housecatLook('cat', 123456789);
  assert.equal(a.coat, b.coat);
  assert.equal(a.pattern, b.pattern);
  assert.equal(a.tail, b.tail);
  assert.equal(a.longhair, b.longhair);
  // Distinct 31-bit pet seeds must not alias through the cache (the
  // full seed keys it — a low-byte key would hand two pets one coat).
  const c = housecatLook('cat', 123456789 + 256);
  const d = housecatLook('cat', 123456789 + 512);
  const distinct = new Set([
    `${a.coat}|${a.pattern}`,
    `${c.coat}|${c.pattern}`,
    `${d.coat}|${d.pattern}`,
  ]);
  assert.ok(distinct.size >= 2, 'high-bit seed changes must be able to change the coat');
});

test('THE RAISED FLAG: perk stands the rest carriage up, and 0 changes nothing', () => {
  // Perked: after settling, the tip must ride well above the root.
  const perked = new TailSim(0.72, 7, 0.19);
  for (let i = 0; i < 600; i++) {
    perked.update(10, 10, 0.27, 0, 1 / 60, i / 60, 1, 1);
  }
  const pRoot = perked.nodes[0]!;
  const pTip = perked.nodes[perked.nodes.length - 1]!;
  assert.ok(
    pTip.z > pRoot.z + 0.12,
    `perked tip must stand above the root (tip ${pTip.z.toFixed(3)} vs root ${pRoot.z.toFixed(3)})`,
  );
  // Unperked: the same sim with perk 0 keeps the shipped drooping
  // carriage — the tip stays at or below the root.
  const flat = new TailSim(0.72, 7, 0.19);
  for (let i = 0; i < 600; i++) {
    flat.update(10, 10, 0.27, 0, 1 / 60, i / 60, 1);
  }
  const fTip = flat.nodes[flat.nodes.length - 1]!;
  assert.ok(fTip.z <= flat.nodes[0]!.z + 0.02, 'perk 0 keeps the shipped carriage verbatim');
});

test('the paw answers the coat: mitts and points dress the extremities', () => {
  let mitts = 0;
  let points = 0;
  for (let seed = 0; seed < 256; seed++) {
    const l = housecatLook('cat', seed);
    if (l.mitts) mitts++;
    if (l.pattern === 'points') points++;
  }
  assert.ok(mitts > 0, 'white mitts ship');
  assert.ok(points > 0, 'the seal points ship');
});
