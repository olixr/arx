import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseC2S, type S2CSpectrum } from './messages.js';

test('bank message accepts and validates instance-addressing fields', () => {
  const ok = parseC2S(
    JSON.stringify({ t: 'bank', op: 'deposit', item: 'iron_helm', qty: 1, slot: 4 }),
  );
  assert.deepEqual(ok, { t: 'bank', op: 'deposit', item: 'iron_helm', qty: 1, slot: 4, gearId: undefined });

  const withdraw = parseC2S(
    JSON.stringify({ t: 'bank', op: 'withdraw', item: 'iron_helm', qty: 1, gearId: 12 }),
  );
  assert.equal(withdraw?.t === 'bank' && withdraw.gearId, 12);

  // Out-of-range or non-integer instance fields reject the message.
  assert.equal(parseC2S(JSON.stringify({ t: 'bank', op: 'deposit', item: 'x', qty: 1, slot: 64 })), null);
  assert.equal(parseC2S(JSON.stringify({ t: 'bank', op: 'deposit', item: 'x', qty: 1, slot: 1.5 })), null);
  assert.equal(parseC2S(JSON.stringify({ t: 'bank', op: 'withdraw', item: 'x', qty: 1, gearId: -1 })), null);
});

test('shop sell accepts an exact pack slot', () => {
  const ok = parseC2S(JSON.stringify({ t: 'shop', op: 'sell', item: 'iron_helm', qty: 1, slot: 7 }));
  assert.equal(ok?.t === 'shop' && ok.slot, 7);
  assert.equal(parseC2S(JSON.stringify({ t: 'shop', op: 'sell', item: 'x', qty: 1, slot: 99 })), null);
});

test('technique seats name a real tray seat — THE SECOND HAND wire law', () => {
  const q = parseC2S(JSON.stringify({ t: 'technique', ability: 'lunge', slot: 0 }));
  assert.deepEqual(q, { t: 'technique', ability: 'lunge', slot: 0 });
  const r = parseC2S(JSON.stringify({ t: 'technique', ability: 'heavy_slam', slot: 2 }));
  assert.deepEqual(r, { t: 'technique', ability: 'heavy_slam', slot: 2 });
  // The trinket slots and the seatless legacy shape are refused whole.
  assert.equal(parseC2S(JSON.stringify({ t: 'technique', ability: 'lunge', slot: 1 })), null);
  assert.equal(parseC2S(JSON.stringify({ t: 'technique', ability: 'lunge', slot: 3 })), null);
  assert.equal(parseC2S(JSON.stringify({ t: 'technique', ability: 'lunge' })), null);
  assert.equal(parseC2S(JSON.stringify({ t: 'technique', ability: 'x'.repeat(65), slot: 0 })), null);
});

test('pickup targets one drop entity and rejects bad eids', () => {
  const ok = parseC2S(JSON.stringify({ t: 'pickup', eid: 31 }));
  assert.deepEqual(ok, { t: 'pickup', eid: 31 });
  assert.equal(parseC2S(JSON.stringify({ t: 'pickup', eid: -1 })), null);
  assert.equal(parseC2S(JSON.stringify({ t: 'pickup', eid: 2.5 })), null);
  assert.equal(parseC2S(JSON.stringify({ t: 'pickup' })), null);
});

test('THE GILDED HAND: take-all and the loot preference parse honestly', () => {
  assert.deepEqual(parseC2S(JSON.stringify({ t: 'takeall' })), { t: 'takeall' });
  assert.deepEqual(parseC2S(JSON.stringify({ t: 'lootpref', auto: false })), {
    t: 'lootpref',
    auto: false,
  });
  assert.deepEqual(parseC2S(JSON.stringify({ t: 'lootpref', auto: true })), {
    t: 'lootpref',
    auto: true,
  });
  assert.equal(parseC2S(JSON.stringify({ t: 'lootpref' })), null);
  assert.equal(parseC2S(JSON.stringify({ t: 'lootpref', auto: 'yes' })), null);
});

test('dialogue intents parse; choice index stays inside the plate row', () => {
  assert.deepEqual(parseC2S(JSON.stringify({ t: 'dlgadv' })), { t: 'dlgadv' });
  assert.deepEqual(parseC2S(JSON.stringify({ t: 'dlgend' })), { t: 'dlgend' });
  assert.deepEqual(parseC2S(JSON.stringify({ t: 'dlgchoice', idx: 3 })), { t: 'dlgchoice', idx: 3 });
  assert.equal(parseC2S(JSON.stringify({ t: 'dlgchoice', idx: 4 })), null);
  assert.equal(parseC2S(JSON.stringify({ t: 'dlgchoice', idx: -1 })), null);
  assert.equal(parseC2S(JSON.stringify({ t: 'dlgchoice', idx: 1.5 })), null);
  assert.equal(parseC2S(JSON.stringify({ t: 'dlgchoice' })), null);
});

test('input viewMs (v8) is optional, clamped, and hostile-proof', () => {
  const frame = { seq: 1, mx: 0, my: 0, aim: 0, buttons: 0 };
  const plain = parseC2S(JSON.stringify({ t: 'input', frame }));
  assert.equal(plain?.t === 'input' && plain.viewMs, undefined);
  const ok = parseC2S(JSON.stringify({ t: 'input', frame, viewMs: 120 }));
  assert.equal(ok?.t === 'input' && ok.viewMs, 120);
  // A hostile value cannot buy extra rewind: clamped to [0, 400].
  const big = parseC2S(JSON.stringify({ t: 'input', frame, viewMs: 99999 }));
  assert.equal(big?.t === 'input' && big.viewMs, 400);
  const neg = parseC2S(JSON.stringify({ t: 'input', frame, viewMs: -50 }));
  assert.equal(neg?.t === 'input' && neg.viewMs, 0);
  // Junk types are dropped, not fatal.
  const junk = parseC2S(JSON.stringify({ t: 'input', frame, viewMs: 'evil' }));
  assert.equal(junk?.t === 'input' && junk.viewMs, undefined);
});

test('input aimed point (THE HELD SIGIL) survives only whole and finite', () => {
  const at = (f: Record<string, unknown>) => {
    const m = parseC2S(JSON.stringify({ t: 'input', frame: f }));
    return m?.t === 'input' ? [m.frame.tx, m.frame.ty] : null;
  };
  const base = { seq: 1, mx: 0, my: 0, aim: 0, buttons: 0 };
  // Absent: the frame casts by the server's own resolve, as ever.
  assert.deepEqual(at(base), [undefined, undefined]);
  // Whole and finite: carried through verbatim (the cast door clamps).
  assert.deepEqual(at({ ...base, tx: 12.5, ty: -3 }), [12.5, -3]);
  // Half a point is no point; hostile types are dropped, not fatal.
  assert.deepEqual(at({ ...base, tx: 12.5 }), [undefined, undefined]);
  assert.deepEqual(at({ ...base, ty: 4 }), [undefined, undefined]);
  assert.deepEqual(at({ ...base, tx: 'evil', ty: 4 }), [undefined, undefined]);
  assert.deepEqual(at({ ...base, tx: null, ty: 4 }), [undefined, undefined]);
});

test('carrystyle sets a grip per fist, defaulting to the main hand', () => {
  const main = parseC2S(JSON.stringify({ t: 'carrystyle', style: 'rogue' }));
  assert.deepEqual(main, { t: 'carrystyle', style: 'rogue', hand: undefined });
  const off = parseC2S(JSON.stringify({ t: 'carrystyle', style: 'normal', hand: 'off' }));
  assert.deepEqual(off, { t: 'carrystyle', style: 'normal', hand: 'off' });
  // Unknown hands and styles reject the message.
  assert.equal(parseC2S(JSON.stringify({ t: 'carrystyle', style: 'rogue', hand: 'left' })), null);
  assert.equal(parseC2S(JSON.stringify({ t: 'carrystyle', style: 'icepick' })), null);
});

test('waypoint sets with both integer coords or clears with neither', () => {
  assert.deepEqual(parseC2S(JSON.stringify({ t: 'waypoint', x: 340, y: -20 })), {
    t: 'waypoint',
    x: 340,
    y: -20,
  });
  assert.deepEqual(parseC2S(JSON.stringify({ t: 'waypoint' })), { t: 'waypoint' });
  // Half a coordinate is neither a set nor a clear.
  assert.equal(parseC2S(JSON.stringify({ t: 'waypoint', x: 12 })), null);
  assert.equal(parseC2S(JSON.stringify({ t: 'waypoint', y: 12 })), null);
  // Non-integers and hostile magnitudes reject.
  assert.equal(parseC2S(JSON.stringify({ t: 'waypoint', x: 1.5, y: 2 })), null);
  assert.equal(parseC2S(JSON.stringify({ t: 'waypoint', x: 2_000_000, y: 0 })), null);
  assert.equal(parseC2S(JSON.stringify({ t: 'waypoint', x: 'a', y: 0 })), null);
});

test('questabandon carries one bounded quest id', () => {
  assert.deepEqual(parseC2S(JSON.stringify({ t: 'questabandon', quest: 'hobbs_hens' })), {
    t: 'questabandon',
    quest: 'hobbs_hens',
  });
  assert.equal(parseC2S(JSON.stringify({ t: 'questabandon' })), null);
  assert.equal(parseC2S(JSON.stringify({ t: 'questabandon', quest: '' })), null);
  assert.equal(parseC2S(JSON.stringify({ t: 'questabandon', quest: 'x'.repeat(65) })), null);
  assert.equal(parseC2S(JSON.stringify({ t: 'questabandon', quest: 7 })), null);
});

test('build message carries the dye dial through the whitelist', () => {
  // THE DYE LAW: a valid roster index survives the parse (the door
  // that silently swallowed it in the first live proof — this pin
  // keeps any future C2SBuild field from dying the same quiet death).
  const dyed = parseC2S(
    JSON.stringify({ t: 'build', buildable: 'awning_shed', tx: -58, ty: 33, dye: 7 }),
  );
  assert.equal(dyed?.t === 'build' && dyed.dye, 7);
  // Absent stays absent; junk is dropped without killing the message.
  const plain = parseC2S(JSON.stringify({ t: 'build', buildable: 'wood_wall', tx: 0, ty: 0 }));
  assert.equal(plain?.t === 'build' && plain.dye, undefined);
  for (const bad of [-1, 10, 1.5, '3', null]) {
    const m = parseC2S(
      JSON.stringify({ t: 'build', buildable: 'awning_shed', tx: 0, ty: 0, dye: bad }),
    );
    assert.equal(m?.t === 'build' && m.dye, undefined, `dye ${String(bad)} dropped, build kept`);
  }
});

test('THE LIVING SOIL verbs walk the whitelist whole', () => {
  // THE WHITELIST LESSON: every new C2S field joins parseC2S or dies
  // silently — these pins keep the tending verbs alive.
  const fert = parseC2S(JSON.stringify({ t: 'fertilize', tx: -12, ty: 44 }));
  assert.deepEqual(fert, { t: 'fertilize', tx: -12, ty: 44 });
  const mulch = parseC2S(JSON.stringify({ t: 'mulch', tx: 3, ty: -9 }));
  assert.deepEqual(mulch, { t: 'mulch', tx: 3, ty: -9 });
  const add = parseC2S(JSON.stringify({ t: 'compostadd', tx: 0, ty: 0, slot: 27 }));
  assert.deepEqual(add, { t: 'compostadd', tx: 0, ty: 0, slot: 27 });
  // Hostile shapes die at the door, quietly and completely.
  assert.equal(parseC2S(JSON.stringify({ t: 'fertilize', tx: 1.5, ty: 0 })), null);
  assert.equal(parseC2S(JSON.stringify({ t: 'mulch', tx: 'a', ty: 0 })), null);
  assert.equal(parseC2S(JSON.stringify({ t: 'compostadd', tx: 0, ty: 0, slot: -1 })), null);
  assert.equal(parseC2S(JSON.stringify({ t: 'compostadd', tx: 0, ty: 0, slot: 64 })), null);
  assert.equal(parseC2S(JSON.stringify({ t: 'compostadd', tx: 0, ty: 0 })), null);
});

test('THE ORCHARD KNIFE walks the whitelist whole', () => {
  const prune = parseC2S(JSON.stringify({ t: 'prune', tx: 7, ty: -3 }));
  assert.deepEqual(prune, { t: 'prune', tx: 7, ty: -3 });
  assert.equal(parseC2S(JSON.stringify({ t: 'prune', tx: 0.5, ty: 0 })), null);
  assert.equal(parseC2S(JSON.stringify({ t: 'prune', tx: 0 })), null);
});

test('THE ANIMALS OF THE YARD verbs walk the whitelist whole', () => {
  const feed = parseC2S(JSON.stringify({ t: 'troughadd', tx: -4, ty: 9, slot: 3 }));
  assert.deepEqual(feed, { t: 'troughadd', tx: -4, ty: 9, slot: 3 });
  assert.equal(parseC2S(JSON.stringify({ t: 'troughadd', tx: 0, ty: 0, slot: 64 })), null);
  const name = parseC2S(JSON.stringify({ t: 'stockname', slot: 2, name: 'Butterworth' }));
  assert.deepEqual(name, { t: 'stockname', slot: 2, name: 'Butterworth' });
  assert.equal(parseC2S(JSON.stringify({ t: 'stockname', slot: -1, name: 'x' })), null);
  assert.equal(parseC2S(JSON.stringify({ t: 'stockname', slot: 0, name: 'x'.repeat(25) })), null);
});

test('THE WORKING YARD verbs walk the whitelist whole', () => {
  const w = parseC2S(JSON.stringify({ t: 'workstart', tx: 2, ty: -7, recipe: 'work_mill_flour', qty: 5 }));
  assert.deepEqual(w, { t: 'workstart', tx: 2, ty: -7, recipe: 'work_mill_flour', qty: 5 });
  assert.equal(parseC2S(JSON.stringify({ t: 'workstart', tx: 0, ty: 0, recipe: 'x', qty: 0 })), null);
  assert.equal(parseC2S(JSON.stringify({ t: 'workstart', tx: 0, ty: 0, recipe: 'x', qty: 51 })), null);
  assert.equal(parseC2S(JSON.stringify({ t: 'workstart', tx: 0.5, ty: 0, recipe: 'x', qty: 1 })), null);
});

test('use carries its aims whole — stow and the off-hand pair, literal true only', () => {
  assert.deepEqual(parseC2S(JSON.stringify({ t: 'use', slot: 3 })), { t: 'use', slot: 3 });
  assert.deepEqual(parseC2S(JSON.stringify({ t: 'use', slot: 3, stow: true })), {
    t: 'use',
    slot: 3,
    stow: true,
  });
  // THE DELIBERATE PAIR: the off-hand aim rides the standing verb.
  assert.deepEqual(parseC2S(JSON.stringify({ t: 'use', slot: 3, off: true })), {
    t: 'use',
    slot: 3,
    off: true,
  });
  assert.deepEqual(parseC2S(JSON.stringify({ t: 'use', slot: 3, stow: true, off: true })), {
    t: 'use',
    slot: 3,
    stow: true,
    off: true,
  });
  // Truthy is not true: a hostile aim dies silently at the door.
  assert.deepEqual(parseC2S(JSON.stringify({ t: 'use', slot: 3, off: 1 })), { t: 'use', slot: 3 });
  assert.deepEqual(parseC2S(JSON.stringify({ t: 'use', slot: 3, off: 'yes' })), { t: 'use', slot: 3 });
  assert.equal(parseC2S(JSON.stringify({ t: 'use', slot: 64, off: true })), null);
});

test('THE UNMAKING parses at the door — the strike that broke the bench', () => {
  // The regression that mattered: these two messages shipped with the
  // epic but never joined parseC2S, so every bench press was judged
  // malformed traffic and three presses closed the socket.
  assert.deepEqual(parseC2S(JSON.stringify({ t: 'unmake', slot: 3 })), { t: 'unmake', slot: 3 });
  assert.equal(parseC2S(JSON.stringify({ t: 'unmake' })), null);
  assert.equal(parseC2S(JSON.stringify({ t: 'unmake', slot: -1 })), null);
  assert.equal(parseC2S(JSON.stringify({ t: 'unmake', slot: 64 })), null);
  assert.equal(parseC2S(JSON.stringify({ t: 'unmake', slot: 1.5 })), null);
});

test('THE BULK BREAKING: a batch parses whole or not at all', () => {
  assert.deepEqual(parseC2S(JSON.stringify({ t: 'unmake', slots: [0, 5, 27] })), {
    t: 'unmake',
    slots: [0, 5, 27],
  });
  // One dialect per message; a piece named twice is refused, not doubled.
  assert.equal(parseC2S(JSON.stringify({ t: 'unmake', slot: 1, slots: [2] })), null);
  assert.equal(parseC2S(JSON.stringify({ t: 'unmake', slots: [] })), null);
  assert.equal(parseC2S(JSON.stringify({ t: 'unmake', slots: [3, 3] })), null);
  assert.equal(parseC2S(JSON.stringify({ t: 'unmake', slots: [3, 64] })), null);
  assert.equal(parseC2S(JSON.stringify({ t: 'unmake', slots: [3, -1] })), null);
  assert.equal(parseC2S(JSON.stringify({ t: 'unmake', slots: 'all' })), null);
});

test('SUNDERING parses both its dialects — pack slot and worn piece', () => {
  assert.deepEqual(parseC2S(JSON.stringify({ t: 'sunder', slot: 4 })), {
    t: 'sunder',
    slot: 4,
    worn: undefined,
    seat: undefined,
  });
  const worn = parseC2S(JSON.stringify({ t: 'sunder', slot: -1, worn: 'body', seat: 'art' }));
  assert.deepEqual(worn, { t: 'sunder', slot: -1, worn: 'body', seat: 'art' });
  // -1 is the "worn names the piece" sentinel and rides ONLY with worn.
  assert.equal(parseC2S(JSON.stringify({ t: 'sunder', slot: -1 })), null);
  assert.equal(parseC2S(JSON.stringify({ t: 'sunder', slot: 4, worn: 'hat' })), null);
  assert.equal(parseC2S(JSON.stringify({ t: 'sunder', slot: 4, seat: 'deep' })), null);
  assert.equal(parseC2S(JSON.stringify({ t: 'sunder', slot: 64 })), null);
});

test('EVERY DOOR ANSWERS: a canonical sample of each C2S message parses', () => {
  // The unmake lesson, generalized: an interface without a validator
  // case is a message that strikes the sender. Every C2S `t` keeps a
  // canonical sample here; adding a message means adding its sample,
  // and a sample that parses to null names the door that never opened.
  const samples: Record<string, object> = {
    hello: { t: 'hello', v: 1 },
    login: { t: 'login', user: 'a', pass: 'b' },
    register: { t: 'register', user: 'a', pass: 'b', name: 'c' },
    logout: { t: 'logout' },
    input: { t: 'input', frame: { seq: 1, mx: 0, my: 0, aim: 0, buttons: 0 } },
    chat: { t: 'chat', text: 'hi' },
    ping: { t: 'ping', ct: 1 },
    interact: { t: 'interact', tx: 0, ty: 0 },
    signedit: { t: 'signedit', tx: 0, ty: 0, title: 'x', lines: [] },
    waypoint: { t: 'waypoint' },
    questabandon: { t: 'questabandon', quest: 'q' },
    use: { t: 'use', slot: 0 },
    unequip: { t: 'unequip', slot: 'body' },
    invmove: { t: 'invmove', from: 0, to: 1 },
    dropitem: { t: 'dropitem', slot: 0, qty: 1 },
    unmake: { t: 'unmake', slot: 0 },
    sunder: { t: 'sunder', slot: 0 },
    craft: { t: 'craft', recipe: 'r', qty: 1 },
    craftstop: { t: 'craftstop' },
    bank: { t: 'bank', op: 'deposit', item: 'i', qty: 1 },
    shop: { t: 'shop', op: 'buy', item: 'i', qty: 1 },
    build: { t: 'build', buildable: 'b', tx: 0, ty: 0 },
    demolish: { t: 'demolish', tx: 0, ty: 0 },
    ownbuilt: { t: 'ownbuilt' },
    plant: { t: 'plant', tx: 0, ty: 0, seed: 's' },
    fertilize: { t: 'fertilize', tx: 0, ty: 0 },
    mulch: { t: 'mulch', tx: 0, ty: 0 },
    prune: { t: 'prune', tx: 0, ty: 0 },
    compostadd: { t: 'compostadd', tx: 0, ty: 0, slot: 0 },
    troughadd: { t: 'troughadd', tx: 0, ty: 0, slot: 0 },
    stockname: { t: 'stockname', slot: 0, name: 'n' },
    workstart: { t: 'workstart', tx: 0, ty: 0, recipe: 'r', qty: 1 },
    interactnpc: { t: 'interactnpc', eid: 1 },
    dlgadv: { t: 'dlgadv' },
    dlgchoice: { t: 'dlgchoice', idx: 0 },
    dlgend: { t: 'dlgend' },
    usekey: { t: 'usekey', key: 1 },
    keydrop: { t: 'keydrop', key: 1 },
    keylabel: { t: 'keylabel', seed: 1 },
    keyforge: { t: 'keyforge', seed: 1 },
    pickup: { t: 'pickup', eid: 1 },
    technique: { t: 'technique', ability: 'a', slot: 0 },
    calling: { t: 'calling', calling: 'c', on: true },
    carrystyle: { t: 'carrystyle', style: 'normal' },
    lootpref: { t: 'lootpref', auto: true },
    takeall: { t: 'takeall' },
    petname: { t: 'petname', slot: 0, name: 'n' },
    stable: { t: 'stable', op: 'heel', slot: 0 },
    companionop: { t: 'companionop', op: 'heel', slot: 0 },
    companionname: { t: 'companionname', slot: 0, name: 'n' },
    social: { t: 'social' },
    friendsearch: { t: 'friendsearch', query: 'q' },
    friendrequest: { t: 'friendrequest', name: 'n' },
    friendaccept: { t: 'friendaccept', name: 'n' },
    frienddecline: { t: 'frienddecline', name: 'n' },
    friendremove: { t: 'friendremove', name: 'n' },
    party: { t: 'party' },
    partyinvite: { t: 'partyinvite', name: 'n' },
    partyaccept: { t: 'partyaccept', name: 'n' },
    partydecline: { t: 'partydecline', name: 'n' },
    partyleave: { t: 'partyleave' },
    partykick: { t: 'partykick', name: 'n' },
    partydisband: { t: 'partydisband' },
    partyjoinrun: { t: 'partyjoinrun', name: 'n' },
    arenaqueue: { t: 'arenaqueue', match: 'm' },
    arenaleave: { t: 'arenaleave' },
    // setlook and petarts are absent on purpose: their payloads pass
    // through sanitizeLook/sanitizePetArts, whose own suites prove the
    // doors open — a hand-faked look here would test the fake, not the door.
  };
  for (const [name, sample] of Object.entries(samples)) {
    assert.notEqual(parseC2S(JSON.stringify(sample)), null, `the '${name}' door never opened`);
  }
});

test("THE LIVING GROUND record is additive JSON: a canonical sample survives the wire whole", () => {
  const wire: S2CSpectrum = {
    t: 'spectrum',
    strokes: [
      { id: 'wold_gloom', axis: 'blight', shape: { kind: 'circle', x: 1200, y: 1200, r: 40 }, amp: 1, soft: 0.5, grain: 0.7, mode: 'max' },
      { id: 'the_dying_stand', axis: 'blight', shape: { kind: 'capsule', x0: 0, y0: 0, x1: 60, y1: 40, r: 24 }, amp: 0.8, soft: 0.6, grain: 1, mode: 'max', bones: true },
      { id: 'first_frost', axis: 'season', shape: { kind: 'rect', x: 900, y: -900, w: 80, h: 40, pad: 30 }, amp: -1, soft: 1, grain: 0, mode: 'add' },
    ],
    cores: [{ id: 'den', axis: 'blight', x: 300, y: -40, r0: 10, r1: 50, t0: 1_000, t1: 5_000, soft: 0.6, amp: 1 }],
  };
  const back = JSON.parse(JSON.stringify(wire)) as S2CSpectrum;
  assert.deepEqual(back, wire);
  assert.equal(back.t, 'spectrum');
  // Both lists are always present, so a client never guesses whether cores exist.
  assert.deepEqual(Object.keys(back).sort(), ['cores', 'strokes', 't']);
});

test('the gate owns its keys: prototype-named message types are rejected, never thrown', () => {
  for (const key of Object.getOwnPropertyNames(Object.prototype)) {
    assert.equal(parseC2S(JSON.stringify({ t: key })), null, key);
    assert.equal(parseC2S(JSON.stringify({ t: key, x: 1 })), null, key);
  }
  assert.equal(parseC2S(JSON.stringify({ t: '__proto__' })), null);
  assert.equal(parseC2S(JSON.stringify({ t: 'constructor' })), null);
  assert.equal(parseC2S(JSON.stringify({ t: 'nope' })), null);
  assert.equal(parseC2S('{"t":'), null);
  assert.equal(parseC2S('[]'), null);
  assert.equal(parseC2S('null'), null);
});
