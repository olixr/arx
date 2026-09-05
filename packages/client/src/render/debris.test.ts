import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Debris, DEBRIS_CAP, type DebrisChunk } from './debris.js';

/** Deterministic PRNG so break-up laws are pinnable. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NO_WALLS = () => false;

const chunksOf = (d: Debris): DebrisChunk[] => [...d.chunks()];

test('chunks burst WITH the blow: every velocity lies in the impact cone', () => {
  const d = new Debris();
  d.smash(5, 5, 0, 'barrel', mulberry32(7));
  const chunks = chunksOf(d);
  assert.ok(chunks.length >= 8, 'a barrel gives up a real handful');
  for (const c of chunks) {
    // vy is depth-compressed at spawn; undo it for the true heading.
    const ang = Math.atan2(c.vy / 0.8, c.vx);
    assert.ok(Math.abs(ang) < 0.7, `chunk heading ${ang} escapes the cone`);
    assert.ok(c.vz > 0, 'burst matter goes up before it comes down');
  }
});

test('debris never crosses a wall — it thuds and stays on this side', () => {
  const d = new Debris();
  const wallAt2 = (x: number) => x >= 2;
  d.smash(0.5, 0.5, 0, 'crate', mulberry32(11));
  for (let i = 0; i < 250; i++) d.update(0.016, (x) => wallAt2(x));
  for (const c of chunksOf(d)) {
    assert.ok(c.x < 2, `chunk at x=${c.x} passed the wall`);
  }
});

test('every chunk lands, settles, and eventually clears itself', () => {
  const d = new Debris();
  d.smash(5, 5, Math.PI / 3, 'table', mulberry32(3));
  for (let i = 0; i < 250; i++) d.update(0.016, NO_WALLS); // 4s
  const alive = chunksOf(d);
  assert.ok(alive.length > 0, 'table wreckage lingers past the bounces');
  for (const c of alive) {
    assert.equal(c.z, 0, 'grounded');
    assert.ok(c.settled, 'settled');
  }
  for (let i = 0; i < 400; i++) d.update(0.016, NO_WALLS); // +6.4s > maxLife
  assert.equal(chunksOf(d).length, 0, 'the mess politely leaves');
});

test('the pool is capped — a rampage can never grow the draw bill', () => {
  const d = new Debris();
  for (let i = 0; i < 40; i++) d.smash(i, i, 0, 'goods', mulberry32(i));
  assert.ok(chunksOf(d).length <= DEBRIS_CAP);
});

test('no two breakages match: different rolls, different wreckage', () => {
  const a = new Debris();
  const b = new Debris();
  a.smash(0, 0, 0, 'barrel', mulberry32(1));
  b.smash(0, 0, 0, 'barrel', mulberry32(2));
  const sig = (d: Debris) => chunksOf(d).map((c) => `${c.len.toFixed(3)}:${c.rot.toFixed(3)}`);
  assert.notDeepEqual(sig(a), sig(b));
});

test('a crack chips small and brief — never a full burst', () => {
  const d = new Debris();
  d.chip(5, 5, 0, 'table', mulberry32(9));
  const chips = chunksOf(d);
  assert.ok(chips.length >= 2 && chips.length <= 4, 'a handful, not a burst');
  for (const c of chips) {
    assert.ok(c.len <= 0.17, 'chips are small');
    assert.ok(c.maxLife < 4, 'chips clear fast');
    const ang = Math.atan2(c.vy / 0.8, c.vx);
    assert.ok(Math.abs(ang) < 0.6, 'chips fly with the blow');
  }
});

test('THE TIMBER LAW: lumber breaks ALONG the lie and stays near it', () => {
  const d = new Debris();
  const bark = { base: '#6b4a2c', lit: '#8a6a45', dark: '#4a3420' };
  // Lie heading east: dx=1, dy=0, reach 3 tiles.
  d.timber(10, 10, 1, 0, 3, bark, mulberry32(13));
  const chunks = chunksOf(d);
  assert.ok(chunks.length >= 5, 'a real trunk gives up a real row of lumber');
  const rounds = chunks.filter((c) => c.round);
  assert.ok(rounds.length >= 2, 'the buck saws at least two rounds');
  for (const r of rounds) assert.equal(r.stripe, bark.lit, 'rounds carry lit end grain');
  for (const c of chunks) {
    assert.ok(c.x >= 10 && c.x <= 10 + 3.2, `chunk at x=${c.x} left the trunk line`);
    assert.ok(Math.abs(c.y - 10) < 0.6, 'lumber spawns ON the lie, not around it');
    assert.ok(c.z < 0.3, 'the trunk lies LOW — it breaks low');
    assert.ok(c.vz > 0, 'the pop is UP off the break line');
    assert.ok(Math.hypot(c.vx, c.vy) < 2.2, 'lumber is heavy: it thuds, never sails');
  }
});

test('the canopy bursts in its own leaves and clears before the lumber', () => {
  const d = new Debris();
  const leaves: [string, string, string] = ['#2a5f30', '#3d8542', '#58ab55'];
  d.canopyBurst(5, 5, leaves, 1.4, mulberry32(21));
  const mats = chunksOf(d);
  assert.ok(mats.length >= 10, 'a broad crown sheds a real storm');
  const palette = new Set([leaves[0], leaves[1], leaves[2]]);
  for (const c of mats) {
    assert.ok(c.round, 'leaf mats are tufts, never slabs');
    assert.ok(c.maxLife < 4.6, 'litter leaves before lumber');
    const base = c.color;
    // Every mat speaks the species palette (base tones or their shades).
    assert.ok(typeof base === 'string' && base.startsWith('#'));
  }
  assert.ok(
    mats.some((c) => palette.has(c.color)),
    'the species light bands survive into the burst',
  );
});

test('each kind breaks along its own joinery', () => {
  const colors = (kind: Parameters<Debris['smash']>[3]) => {
    const d = new Debris();
    d.smash(0, 0, 0, kind, mulberry32(5));
    return new Set(chunksOf(d).map((c) => c.color));
  };
  // Barrels shed iron hoops; chairs are all wood (and maybe cushion).
  assert.ok(colors('barrel').has('#3a3444'), 'barrel hoops are iron');
  assert.ok(!colors('chair').has('#3a3444'), 'chairs own no ironwork');
});

/**
 * THE SCARRED LAND (K3/K4 THE VOCAB): the seven kits K0 stubbed are
 * real — every one gives up a handful with the shape of the thing
 * that broke, and the shapes are pinnable: the cart keeps its one
 * wheel, the ribcage its skull, the tally stone its slabs, the cot its
 * canvas, the root its tap-root, the post its long top, the thread
 * its one pale line. Nothing bright: the field's wreckage is wood,
 * iron, bone and stone.
 */
test('THE SCARRED KITS: cart, post, bones, stone, root, thread and cot break with their own shape', () => {
  const roll = (kind: Parameters<Debris['smash']>[3], seed: number): DebrisChunk[] => {
    const d = new Debris();
    d.smash(4, 4, 0, kind, mulberry32(seed));
    return chunksOf(d);
  };
  const rgbHex = /^#[0-9a-f]{6}$/i;
  const lum = (c: string): number => {
    const r = parseInt(c.slice(1, 3), 16);
    const g = parseInt(c.slice(3, 5), 16);
    const b = parseInt(c.slice(5, 7), 16);
    return (r * 0.299 + g * 0.587 + b * 0.114) / 255;
  };
  for (const kind of ['cart', 'post', 'bones', 'stone', 'root', 'thread', 'cot'] as const) {
    const a = roll(kind, 31);
    const b = roll(kind, 32);
    assert.ok(a.length >= 8, `${kind}: a real handful (${a.length})`);
    for (const c of a) {
      assert.ok(rgbHex.test(c.color), `${kind}: colour ${c.color} is not a flat #rrggbb key`);
      if (c.stripe !== null) assert.ok(rgbHex.test(c.stripe), `${kind}: stripe ${c.stripe}`);
      assert.ok(c.len > 0 && c.wid > 0, `${kind}: a chunk with no body`);
      assert.ok(c.vz > 0, `${kind}: burst matter goes up before it comes down`);
    }
    // No two breakages match.
    const sig = (cs: DebrisChunk[]) => cs.map((c) => `${c.len.toFixed(3)}:${c.rot.toFixed(3)}`);
    assert.notDeepEqual(sig(a), sig(b), `${kind}: two rolls, one wreck`);
  }
  // The cart: exactly one wheel (the round piece wide enough to roll),
  // the two shafts as the longest timbers, and iron in the kit.
  const cart = roll('cart', 5);
  assert.equal(cart.filter((c) => c.round && c.wid >= 0.2).length, 1, 'the cart keeps ONE wheel — the other was already gone');
  assert.ok(cart.filter((c) => !c.round && c.len >= 0.5).length >= 2, 'the two shafts are the longest pieces');
  assert.ok(cart.some((c) => c.color === '#3a3444'), 'a cart is iron besides wood: the axle and the fittings');
  // Old bone: every piece pale (the MournerStatue precedent — bone
  // reads as bone), the skull one round piece that rolls clear.
  const bones = roll('bones', 6);
  for (const c of bones) assert.ok(lum(c.color) > 0.55, `bones: ${c.color} is not dry pale bone`);
  assert.equal(bones.filter((c) => c.round && c.wid >= 0.15).length, 1, 'one skull');
  assert.ok(bones.filter((c) => !c.round && c.len >= 0.3).length >= 2, 'two long bones');
  // The tally stone: flat slabs (wide, not round) that keep the counted
  // face's pale stripe, and grit — stone reads as stone in pieces.
  const stone = roll('stone', 7);
  const slabs = stone.filter((c) => !c.round && c.wid >= 0.1);
  assert.ok(slabs.length >= 2, 'the stone cracks in slabs');
  for (const s of slabs) assert.equal(s.stripe, '#a39ead', 'the counted face keeps its tally');
  assert.ok(stone.filter((c) => c.round).length >= 4, 'a spray of grit');
  // The root: one long tap-root, knotted lengths, pale sap-wood checks.
  const root = roll('root', 8);
  assert.ok(root.some((c) => !c.round && c.len >= 0.42), 'the tap-root is the long piece');
  assert.ok(root.filter((c) => c.round && lum(c.color) > 0.6).length >= 3, 'pale sap-wood where the cut went through');
  assert.ok(root.filter((c) => !c.round && lum(c.color) < 0.3).length >= 3, 'dark knotted lengths');
  // The thread: one pale line (the longest thing in the kit, and
  // thin), two dark pegs, the knots — and nothing bright.
  const thread = roll('thread', 9);
  const line = thread.reduce((m, c) => (c.len > m.len ? c : m), thread[0]!);
  assert.ok(line.wid <= 0.025 && line.color === '#d8cba8', 'the longest piece is the pale line, thin');
  assert.ok(thread.filter((c) => !c.round && c.wid >= 0.03 && c.wid <= 0.04 && lum(c.color) < 0.35).length >= 2, 'the two driven pegs');
  assert.ok(thread.filter((c) => c.round).length >= 3, 'the knots it was tied with');
  assert.ok(thread.length <= 12, 'a thread is a small thing to break');
  // The cot: the canvas as one big flap (round, wide), the blanket a
  // second smaller flap, the poles as long timbers, the lashings thin.
  const cot = roll('cot', 10);
  const flaps = cot.filter((c) => c.round && c.wid >= 0.15).sort((p, q) => q.wid - p.wid);
  assert.equal(flaps.length, 2, 'canvas and blanket');
  assert.ok(flaps[0]!.wid > flaps[1]!.wid, 'the canvas is the bigger flap');
  assert.ok(cot.filter((c) => !c.round && c.len >= 0.38).length >= 2, 'the two long side-poles');
  assert.ok(cot.filter((c) => c.wid <= 0.02).length >= 3, 'the lashings');
  // The post: one long top (with the board's stripe still on it), one
  // short dark stub, splinters, two nails, three clods of earth.
  const post = roll('post', 11);
  const top = post.reduce((m, c) => (c.len > m.len ? c : m), post[0]!);
  assert.ok(top.len >= 0.48 && top.stripe === '#7a5c36', 'the long top carries what it carried');
  assert.ok(post.some((c) => !c.round && c.len <= 0.21 && c.len >= 0.16 && c.wid >= 0.075 && lum(c.color) < 0.25), 'the stub, dark with the damp');
  assert.equal(post.filter((c) => c.color === '#3a3444').length, 2, 'the two nails');
  assert.equal(post.filter((c) => c.round).length, 3, 'the earth the stub tore out');
});
