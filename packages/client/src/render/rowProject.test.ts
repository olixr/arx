import test from 'node:test';
import assert from 'node:assert/strict';
import { projectWorld, type XY } from './cameraProject.js';
import { rowProject, rowProjectX, type RowProj } from './rowProject.js';

// A representative camera. snapDpr matters only at q=0 (the origin snap);
// the memo must match projectWorld for whatever origin it uses.
const SCALE = 24;
const YSCALE = 0.82;
const CAMX = -17.3;
const CAMY = 42.6;
const SNAP = 2;
const W = 1500;
const H = 900;

// The shipping/spot-check leans plus 0 and a steeper grazing lean.
const QS = [0, 0.0005, 0.0013, 0.0016, 0.0034, 0.006];
// A spread of rows (near, at, far of look-at) and columns.
const ROWS = [-40, -5.5, 0, CAMY, 60, 220.25];
const COLS = [-120, -3, 0, 1, 12.7, 400];

test('rowProject memo equals per-call projectWorld', async (t) => {
  const p: XY = { x: 0, y: 0 };
  const rp: RowProj = { y: 0, xa: 0, xb: 0 };

  await t.test('rowProjectX(wx) === projectWorld(wx).x and row y === projectWorld.y, every q/row/col', () => {
    for (const q of QS) {
      for (const wy of ROWS) {
        rowProject(SCALE, YSCALE, CAMX, CAMY, q, SNAP, wy, W, H, rp);
        for (const wx of COLS) {
          projectWorld(SCALE, YSCALE, CAMX, CAMY, q, SNAP, wx, wy, W, H, p);
          const dx = Math.abs(rowProjectX(rp, wx) - p.x);
          const dy = Math.abs(rp.y - p.y);
          // Exact affine reconstruction — allow only float round-off.
          assert.ok(dx < 1e-9, `x mismatch q=${q} wy=${wy} wx=${wx}: ${dx}`);
          assert.ok(dy < 1e-9, `y mismatch q=${q} wy=${wy} wx=${wx}: ${dy}`);
        }
      }
    }
  });

  await t.test('q=0 is the plain ortho affine (byte-identical invariant)', () => {
    rowProject(SCALE, YSCALE, CAMX, CAMY, 0, SNAP, 7, W, H, rp);
    // At q=0 the row slope is exactly the world scale and xa is the snapped origin.
    assert.equal(rp.xb, SCALE);
    projectWorld(SCALE, YSCALE, CAMX, CAMY, 0, SNAP, 0, 7, W, H, p);
    assert.equal(rp.xa, p.x);
    assert.equal(rp.y, p.y);
  });

  await t.test('the row y is constant across columns at q>0 (the memo premise)', () => {
    rowProject(SCALE, YSCALE, CAMX, CAMY, 0.0013, SNAP, 33, W, H, rp);
    for (const wx of COLS) {
      projectWorld(SCALE, YSCALE, CAMX, CAMY, 0.0013, SNAP, wx, 33, W, H, p);
      assert.ok(Math.abs(p.y - rp.y) < 1e-9, `row y must not vary with wx (wx=${wx})`);
    }
  });
});
