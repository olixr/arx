import assert from 'node:assert/strict';
import { test } from 'node:test';
import { drawTorsoGarment, type TorsoFrame } from './armor.js';
import { TORSO_LAYERS } from './armorTorsoLayers.js';
import { BODY_STYLES } from './armorStyles.js';
import { recordingCtx } from './testkit.js';

// THE GARMENT'S ROLL CALL (foundations F3.3). drawTorsoGarment's ninety
// decoration blocks became an ordered layer array; these pins drive every
// authored body style through the whole array — front, turned, seated and
// hurt — on the recording ctx, whose finite-geometry assert catches the
// exact failure mode of a lost local.

const frame = (over: Partial<TorsoFrame> = {}): TorsoFrame => ({
  s: 48,
  tw: 9,
  ww: 7,
  th: 16,
  lead: 1,
  profileK: 0,
  backK: 0,
  yaw: 0.4,
  hurt: false,
  strideSw: 0.3,
  nowMs: 1234,
  runF: 0.5,
  dragX: 0.2,
  ...over,
});

test('every authored body style dresses in four poses', () => {
  for (const [name, st] of Object.entries(BODY_STYLES)) {
    for (const f of [
      frame(),
      frame({ profileK: 1, backK: 0.8, yaw: -0.9, lead: -1 }),
      frame({ sit: 1, groundY: 18, seatKnees: [{ x: -3, y: 12 }, { x: 3, y: 12 }] }),
      frame({ hurt: true }),
    ]) {
      const ctx = recordingCtx();
      drawTorsoGarment(ctx, st, f);
      assert.ok(ctx.calls.length > 0, `body style '${name}' painted nothing`);
    }
  }
});

test('the dress code holds ninety-one entries in marching order', () => {
  // 89 decoration blocks + the two front-plane markers, exactly the
  // statement count the old !hurt region carried.
  assert.equal(TORSO_LAYERS.length, 91);
});
