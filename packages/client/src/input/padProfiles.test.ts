import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PadTranslator,
  genericLayout,
  hatToDpad,
  normalizePad,
  padIsActive,
  padVendorProduct,
  pickLivePad,
  resolveLayout,
} from './padProfiles.js';

const btn = (pressed: boolean): GamepadButton => ({
  pressed,
  touched: pressed,
  value: pressed ? 1 : 0,
});

interface FakeOpts {
  id: string;
  mapping?: string;
  buttons?: number;
  axes?: number[];
  pressed?: number[];
  index?: number;
}

function fakePad(o: FakeOpts): Gamepad {
  const n = o.buttons ?? 16;
  const pressed = new Set(o.pressed ?? []);
  return {
    id: o.id,
    index: o.index ?? 0,
    connected: true,
    mapping: o.mapping ?? '',
    timestamp: 0,
    axes: o.axes ?? [0, 0, 0, 0],
    buttons: Array.from({ length: n }, (_, i) => btn(pressed.has(i))),
    vibrationActuator: null,
  } as unknown as Gamepad;
}

/** Chrome parks an idle hat axis here — the tell that gives it away. */
const HAT_REST = 3.2857142857142856;
/** The hat's eight compass points, -1 (up) stepping to 1 (up-left). */
const hat = (i: number): number => -1 + (i * 2) / 7;

// ---- the id readers -------------------------------------------------

test('vendor/product read out of a Chrome pad id', () => {
  assert.deepEqual(padVendorProduct('8BitDo Pro 2 (Vendor: 2dc8 Product: 6006)'), {
    vendor: '2dc8',
    product: '6006',
  });
});

test('vendor/product read out of a Firefox pad id', () => {
  assert.deepEqual(padVendorProduct('057e-2009-Pro Controller'), {
    vendor: '057e',
    product: '2009',
  });
});

test('an id carrying no ids yields nothing rather than a wrong guess', () => {
  assert.equal(padVendorProduct('Wireless Controller'), null);
});

// ---- THE HAT IS A D-PAD ---------------------------------------------

test('the hat decodes to the eight compass points', () => {
  assert.deepEqual(hatToDpad(hat(0)), [true, false, false, false]); // up
  assert.deepEqual(hatToDpad(hat(1)), [true, false, false, true]); // up-right
  assert.deepEqual(hatToDpad(hat(2)), [false, false, false, true]); // right
  assert.deepEqual(hatToDpad(hat(3)), [false, true, false, true]); // down-right
  assert.deepEqual(hatToDpad(hat(4)), [false, true, false, false]); // down
  assert.deepEqual(hatToDpad(hat(5)), [false, true, true, false]); // down-left
  assert.deepEqual(hatToDpad(hat(6)), [false, false, true, false]); // left
  assert.deepEqual(hatToDpad(hat(7)), [true, false, true, false]); // up-left
});

test('an idle or nonsense hat reads as centred', () => {
  assert.deepEqual(hatToDpad(HAT_REST), [false, false, false, false]);
  assert.deepEqual(hatToDpad(NaN), [false, false, false, false]);
});

// ---- STANDARD PASSES THROUGH UNTOUCHED ------------------------------

test('a browser-mapped pad is never second-guessed', () => {
  const pad = fakePad({ id: 'DualSense Wireless Controller', mapping: 'standard' });
  assert.equal(resolveLayout(pad).name, 'standard');
  const v = normalizePad(pad);
  assert.equal(v.native, true);
  assert.equal(v.buttons, pad.buttons); // the very same array, untouched
});

// ---- the dialects ---------------------------------------------------

test('a Switch-mode pad gets the face swap and the hat', () => {
  const pad = fakePad({
    id: '8BitDo SN30 Pro (Vendor: 057e Product: 2009)',
    axes: [0, 0, 0, 0, 0, 0, 0, 0, 0, HAT_REST],
  });
  const layout = resolveLayout(pad);
  assert.equal(layout.name, 'switch-pro');
  // Nintendo reports B in slot 0 and A in slot 1; standard wants A first.
  assert.equal(layout.buttons[0], 1);
  assert.equal(layout.buttons[1], 0);
  // Y and X already sit where standard's X (west) and Y (north) live.
  assert.equal(layout.buttons[2], 2);
  assert.equal(layout.buttons[3], 3);
  assert.equal(layout.hatAxis, 9);
});

test('an 8BitDo id is recognised by vendor and by name', () => {
  assert.equal(resolveLayout(fakePad({ id: 'Vendor: 2dc8 Product: 3106' })).name, '8bitdo');
  assert.equal(resolveLayout(fakePad({ id: '8BitDo Ultimate 2C' })).name, '8bitdo');
});

test('an unknown pad still gets the heuristic layout, not silence', () => {
  assert.equal(resolveLayout(fakePad({ id: 'Some Nameless Pad' })).name, 'generic');
});

test('the heuristic skips a hat when picking the four stick axes', () => {
  const l = genericLayout(fakePad({ id: 'x', axes: [0, 0, 0, 0, HAT_REST, 0] }));
  assert.equal(l.hatAxis, 4);
  assert.deepEqual(l.axes, [0, 1, 2, 3]);
});

test('sticks the device does not have are marked absent, never read past the end', () => {
  assert.deepEqual(genericLayout(fakePad({ id: 'x', axes: [0, 0] })).axes, [0, 1, -1, -1]);
});

// ---- the translated view --------------------------------------------

test('a hat becomes d-pad buttons 12-15', () => {
  const pad = fakePad({
    id: '8BitDo Ultimate (Vendor: 2dc8 Product: 3106)',
    axes: [0, 0, 0, 0, hat(4), 0], // ▼ held, hat proven by its axis slot
  });
  const t = new PadTranslator();
  // Prove the hat first (idle), the way a real session does.
  t.layoutFor(fakePad({ id: '8BitDo Ultimate (Vendor: 2dc8 Product: 3106)', axes: [0, 0, 0, 0, HAT_REST, 0] }));
  const v = t.view(pad);
  assert.equal(v.buttons[13]?.pressed, true); // ▼ sits
  assert.equal(v.buttons[12]?.pressed, false);
  assert.equal(v.buttons[14]?.pressed, false);
  assert.equal(v.buttons[15]?.pressed, false);
});

test('the view always has sixteen slots and four axes, even from a short pad', () => {
  const v = normalizePad(fakePad({ id: 'tiny', buttons: 6, axes: [0, 0] }));
  assert.equal(v.buttons.length, 16);
  assert.equal(v.buttons[15]?.pressed, false);
  assert.equal(v.axes.length, 4);
  assert.equal(v.axes[2], 0);
});

test('the right stick comes from the axes the layout chose', () => {
  const v = normalizePad(fakePad({ id: 'x', axes: [0, 0, 0.8, -0.6, HAT_REST] }));
  assert.ok(Math.abs((v.axes[2] ?? 0) - 0.8) < 1e-6);
  assert.ok(Math.abs((v.axes[3] ?? 0) + 0.6) < 1e-6);
});

// ---- THE LIVE PAD ---------------------------------------------------

test('an idle hat and idle trigger axes are not signs of life', () => {
  const pad = fakePad({ id: 'x', axes: [0, 0, 0, 0, -1, -1, 0, 0, 0, HAT_REST] });
  assert.equal(padIsActive(pad), false);
});

test('a pressed button or a deflected stick is a sign of life', () => {
  assert.equal(padIsActive(fakePad({ id: 'x', pressed: [3] })), true);
  assert.equal(padIsActive(fakePad({ id: 'x', axes: [0, -0.9, 0, 0] })), true);
});

// ---- THE TRANSLATOR REMEMBERS ---------------------------------------

test('a hat held at first sight is learned the moment it is released', () => {
  const t = new PadTranslator();
  // Poll one: the d-pad is HELD, so the hat reads inside stick range
  // and hides. The heuristic mistakes it for a third stick axis.
  const held = fakePad({ id: 'mystery', axes: [0, 0, 0, 0, -1] });
  assert.equal(t.layoutFor(held).hatAxis, undefined);
  // Released: it parks out of range and gives itself away.
  const idle = fakePad({ id: 'mystery', axes: [0, 0, 0, 0, HAT_REST] });
  assert.equal(t.layoutFor(idle).hatAxis, 4);
  // And it stays known when the player grabs the d-pad again.
  assert.equal(t.layoutFor(held).hatAxis, 4);
});

test('a device that unplugs takes its layout with it', () => {
  const t = new PadTranslator();
  const a = fakePad({ id: 'mystery', axes: [0, 0, 0, 0, HAT_REST] });
  assert.equal(t.layoutFor(a).hatAxis, 4);
  t.forget(a);
  const b = fakePad({ id: 'mystery', axes: [0, 0, 0, 0, -1] });
  assert.equal(t.layoutFor(b).hatAxis, undefined);
});

test('two pads in different slots keep separate layouts', () => {
  const t = new PadTranslator();
  t.layoutFor(fakePad({ id: 'hat pad', index: 0, axes: [0, 0, 0, 0, HAT_REST] }));
  const plain = t.layoutFor(fakePad({ id: 'plain pad', index: 1, axes: [0, 0, 0, 0] }));
  assert.equal(plain.hatAxis, undefined);
  assert.equal(t.layoutFor(fakePad({ id: 'hat pad', index: 0, axes: [0, 0, 0, 0, 0] })).hatAxis, 4);
});

// —— THE CORPSE HOLDS NO SWAY ——————————————————————————————————————

test('a frozen entry stuck mid-press never swallows the live pad', () => {
  // Chrome's Switch handshake killed slot 0 while its stick was
  // deflected; the player is holding the (previously chosen) pad in
  // slot 1, currently idle. The corpse must not steal the active slot.
  const corpse = fakePad({ id: 'corpse', index: 0, axes: [0.9, 0, 0, 0] });
  const live = fakePad({ id: 'live', index: 1 });
  const { pad, touched } = pickLivePad(
    [
      { pad: corpse, quietMs: 5000 },
      { pad: live, quietMs: 0 },
    ],
    1,
  );
  assert.equal(pad?.id, 'live');
  assert.equal(touched, false);
});

test('a fresh touched pad beats a frozen-touched earlier slot', () => {
  const corpse = fakePad({ id: 'corpse', index: 0, pressed: [0] });
  const live = fakePad({ id: 'live', index: 1, axes: [0, 0.8, 0, 0] });
  const { pad, touched } = pickLivePad(
    [
      { pad: corpse, quietMs: 9000 },
      { pad: live, quietMs: 0 },
    ],
    null,
  );
  assert.equal(pad?.id, 'live');
  assert.equal(touched, true);
});

test('nobody touched: the held pad wins, then slot order', () => {
  const a = fakePad({ id: 'a', index: 0 });
  const b = fakePad({ id: 'b', index: 1 });
  const cands = [
    { pad: a, quietMs: 100 },
    { pad: b, quietMs: 100 },
  ];
  assert.equal(pickLivePad(cands, 1).pad?.id, 'b');
  assert.equal(pickLivePad(cands, null).pad?.id, 'a');
});

test('a button held steady past the freshness window keeps its pad chosen', () => {
  // Holding a button advances no timestamps, so the only pad goes
  // "quiet" while genuinely pressed — it must still be returned (as
  // held / first, just no longer claiming the touched slot).
  const only = fakePad({ id: 'only', index: 0, pressed: [0] });
  const held = pickLivePad([{ pad: only, quietMs: 4000 }], 0);
  assert.equal(held.pad?.id, 'only');
  const fallback = pickLivePad([{ pad: only, quietMs: 4000 }], null);
  assert.equal(fallback.pad?.id, 'only');
});
