/**
 * ONE CLASS, ONE DETECTION (arms-v3 Phase 1) — the law tests.
 *
 * wieldClass is the single source for "what kind of held thing is
 * this?". Before it existed the class was re-derived at four sites
 * (held solve, stow solve, cape-layer stow, painter dispatch), each
 * with its own probe order — safe only as long as no item id ever
 * satisfied two registries. These tests pin (1) that wieldClass agrees
 * with the legacy derivation over the ENTIRE equipment roster, (2)
 * that the roster really is single-class per id (the assumption the
 * old four-site derivation silently leaned on), and (3) the
 * check-great-first law on the exact overlap that motivated it.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EQUIPMENT_DEFS, ITEMS } from '@arx/content';
import {
  bladeStyle,
  bowStyle,
  greatStyle,
  staffStyle,
  wieldClass,
  type WieldKind,
} from './weapons.js';

test('the roster is single-class: no weapon id satisfies two style registries (past the great/blade fallback overlap)', () => {
  for (const def of EQUIPMENT_DEFS) {
    if (def.slot !== 'weapon') continue;
    const isGreat = greatStyle(def.id) !== null;
    // The legacy rig derivation: blades were probed AFTER greats, so
    // the great/blade fallback overlap ('*greatsword') was resolved by
    // ordering. Everything else was assumed disjoint — now pinned.
    const isBlade = !isGreat && bladeStyle(def.id) !== null;
    const isStaff = staffStyle(def.id) !== null;
    const isBow = bowStyle(def.id) !== null;
    const hits = [isGreat, isBlade, isStaff, isBow].filter(Boolean).length;
    assert.ok(hits <= 1, `${def.id} satisfies ${hits} weapon-class registries`);
  }
});

test('wieldClass matches the legacy four-probe derivation over the whole equipment roster', () => {
  let weapons = 0;
  for (const def of EQUIPMENT_DEFS) {
    if (def.slot !== 'weapon') continue;
    weapons++;
    const isGreat = greatStyle(def.id) !== null;
    const legacy: WieldKind = isGreat
      ? 'great'
      : staffStyle(def.id) !== null
        ? 'staff'
        : bowStyle(def.id) !== null
          ? 'bow'
          : bladeStyle(def.id) !== null
            ? 'blade'
            : 'none';
    assert.equal(wieldClass(def.id), legacy, def.id);
  }
  // The roster is real: an import failure or a filter typo must not
  // let this test pass by iterating nothing.
  assert.ok(weapons > 50, `only ${weapons} weapon defs enumerated`);
});

test('THE CHECK-GREAT-FIRST LAW: a greatsword-shaped id satisfies BOTH fallbacks and resolves great', () => {
  // The trap must actually exist for the law to mean anything.
  assert.notEqual(bladeStyle('doom_greatsword'), null, 'blade fallback claims *sword ids');
  assert.notEqual(greatStyle('doom_greatsword'), null, 'great fallback claims *greatsword ids');
  assert.equal(wieldClass('doom_greatsword'), 'great');
});

test('tools are never a carry class: every tool id resolves none (the painter dispatch leans on this)', () => {
  // drawHeldItem's dispatch reads wieldClass for the four carry
  // classes and keeps its own interleaved toolStyle probe for axes,
  // picks, and rods — which is only equivalent to the old chain if no
  // tool id ever satisfies a weapon-style registry. Pinned here over
  // the whole item roster.
  let tools = 0;
  for (const def of ITEMS.values()) {
    if (!def.tool) continue;
    tools++;
    assert.equal(wieldClass(def.id), 'none', `tool ${def.id} claims a weapon class`);
  }
  assert.ok(tools > 5, `only ${tools} tool defs enumerated`);
});

test('wieldClass caches and stays stable across calls', () => {
  assert.equal(wieldClass('bronze_sword'), 'blade');
  assert.equal(wieldClass('bronze_sword'), 'blade');
  assert.equal(wieldClass('stickbow'), 'bow');
  assert.equal(wieldClass('apprentice_staff'), 'staff');
  assert.equal(wieldClass('iron_greatblade'), 'great');
  assert.equal(wieldClass(undefined), 'none');
  assert.equal(wieldClass('oak_log'), 'none');
});
