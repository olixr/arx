/**
 * THE DROPPED WORLD, pinned. The representation law: every item id in
 * the game resolves to an honest ground form — the satchel fallback
 * club is EMPTY and stays empty unless a new item is deliberately
 * ledgered here. Field identity outranks id heuristics (a
 * recipe_craft_iron_sword is parchment, a spiked_buckler is a shield),
 * every form's painter survives a bare context, and rarity speaks in
 * its tier's color from the dirt.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ITEMS, itemDef } from '@arx/content';
import type { ItemRoll } from '@arx/shared';
import {
  drawGroundDrop,
  drawsOwnPile,
  groundForm,
  groundGlowFor,
  groundShadowSpread,
  type GroundDropEnv,
  type GroundForm,
} from './groundItems.js';

/**
 * A counting 2d-context stub. getTransform is absent on purpose: the
 * ground outline shader falls back to direct paint (same guard the
 * rig's held-item ring uses for test stubs), so painters run whole.
 */
function makeCtx(counts: Record<string, number>): CanvasRenderingContext2D {
  const grad = { addColorStop: () => undefined };
  const state: Record<string, unknown> = { lineWidth: 1, globalAlpha: 1 };
  return new Proxy(state, {
    get(t, p: string) {
      if (p === 'getTransform') return undefined;
      if (p === 'createLinearGradient' || p === 'createRadialGradient') {
        return () => grad;
      }
      if (p in t) return t[p];
      return (..._a: unknown[]) => {
        counts[p] = (counts[p] ?? 0) + 1;
        return undefined;
      };
    },
    set(t, p: string, v) {
      t[p] = v;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
}

function env(itemId: string, over: Partial<GroundDropEnv> = {}): { g: GroundDropEnv; counts: Record<string, number> } {
  const counts: Record<string, number> = {};
  const g: GroundDropEnv = {
    ctx: makeCtx(counts),
    k: 48,
    eid: 4242,
    itemId,
    qty: 1,
    now: 5234,
    outline: '#241a2e',
    hovered: false,
    ...over,
  };
  return { g, counts };
}

test('THE REPRESENTATION LAW: every item in the game resolves to an honest form — the satchel club is empty', () => {
  const stragglers: string[] = [];
  for (const d of ITEMS.values()) {
    const f = groundForm(d.id);
    assert.ok(typeof f === 'string' && f.length > 0, `${d.id} resolved to nothing`);
    if (f === 'satchel') stragglers.push(d.id);
  }
  // The fallback exists for unknown/dev ids only. If a NEW item lands
  // here, either give it a form or ledger it below with a reason.
  assert.deepEqual(stragglers, [], `items fell through to the satchel: ${stragglers.join(', ')}`);
});

test('THE ARMORY IS 1:1: every weapon lies as a weapon, every tool as a tool', () => {
  let weapons = 0;
  for (const d of ITEMS.values()) {
    if (d.weapon) {
      assert.equal(groundForm(d.id), 'weapon', `${d.id} carries WeaponStats but drops as ${groundForm(d.id)}`);
      weapons++;
    } else if (d.tool) {
      assert.equal(groundForm(d.id), 'tool', `${d.id} is a tool but drops as ${groundForm(d.id)}`);
    }
  }
  assert.ok(weapons >= 250, `the armory shrank: only ${weapons} weapons resolved`);
});

test('FIELD IDENTITY OUTRANKS THE ID: recipe scrolls named after weapons are parchment', () => {
  assert.equal(groundForm('recipe_craft_iron_sword'), 'scroll');
  assert.equal(groundForm('recipe_craft_yew_longbow'), 'scroll');
  assert.equal(groundForm('scroll_keen_edge'), 'scroll');
  // And the offhand that sounds like a weapon is a shield.
  assert.equal(groundForm('spiked_buckler'), 'shield');
});

test('THE WARDROBE GENERALIZES BY SLOT — and offhands keep their true forms', () => {
  const bySlot: Record<string, GroundForm> = {
    head: 'helm',
    body: 'bodyarmor',
    legs: 'legarmor',
    boots: 'boots',
    gloves: 'gloves',
    cape: 'cape',
  };
  for (const d of ITEMS.values()) {
    const want = d.equipSlot ? bySlot[d.equipSlot] : undefined;
    if (want && !d.weapon) {
      assert.equal(groundForm(d.id), want, `${d.id} (${d.equipSlot}) drops as ${groundForm(d.id)}`);
    }
  }
  assert.equal(groundForm('tome_of_embers'), 'tome');
  assert.equal(groundForm('arcane_orb'), 'orb');
  assert.equal(groundForm('hunters_quiver'), 'quiver');
  assert.equal(groundForm('tower_shield'), 'shield');
  assert.equal(groundForm('sigil_fallen_champion'), 'trinket');
});

test('GRADED PRODUCE FOLDS ONTO ITS BASE: fine and prime wear the same form', () => {
  for (const id of ['carrot', 'apple', 'pumpkin', 'soft_cheese', 'egg', 'milk', 'honey', 'wool']) {
    const base = groundForm(id);
    assert.equal(groundForm(`${id}_fine`), base, `${id}_fine drifted from ${base}`);
    assert.equal(groundForm(`${id}_prime`), base, `${id}_prime drifted from ${base}`);
  }
});

test('EVERY FORM PAINTS: one representative per form survives a bare context and lays real ink', () => {
  // One representative per form, walked from the live catalog so the
  // roster can never drift out from under the test.
  const rep = new Map<GroundForm, string>();
  for (const d of ITEMS.values()) {
    const f = groundForm(d.id);
    if (!rep.has(f)) rep.set(f, d.id);
  }
  assert.ok(rep.size >= 70, `the taxonomy collapsed: only ${rep.size} forms represented`);
  for (const [form, id] of rep) {
    for (const qty of [1, 3, 12]) {
      const { g, counts } = env(id, { qty });
      drawGroundDrop(g);
      const inked = (counts.fill ?? 0) + (counts.fillRect ?? 0);
      assert.ok(inked > 0, `${form} (${id}) qty ${qty} painted nothing`);
    }
  }
});

test('RARITY SPEAKS FROM THE DIRT: tier glow, motes above rare, the legendary shaft', () => {
  const legendary: ItemRoll = { rar: 'legendary', seed: 7 };
  const rare: ItemRoll = { rar: 'rare', seed: 7 };
  const common: ItemRoll = { rar: 'common', seed: 7 };

  // Glow: tiers above common glow in the tier color; common is silent
  // (a cheap material with a common roll earns nothing).
  const glow = groundGlowFor('iron_sword', 1, legendary);
  assert.ok(glow, 'a legendary drop must glow');
  assert.equal(glow!.rgb, '255, 179, 71', 'legendary glow must speak the tier color');
  assert.ok(
    (groundGlowFor('iron_sword', 1, rare)?.a ?? 0) < glow!.a,
    'the glow must grow with the tier',
  );
  assert.equal(groundGlowFor('log', 1, common), null, 'a common log must not glow');
  // Crystal matter glows without any roll.
  assert.ok(groundGlowFor('ember_essence', 1), 'essences carry their own light');
  // Big coin piles keep the classic shimmer.
  assert.ok(groundGlowFor('coins', 40), 'a rich coin pile glows');
  assert.equal(groundGlowFor('coins', 3), null, 'three coppers do not light the street');

  // The painters: a legendary roll paints MORE ink than a common one
  // (shaft + motes + shimmer are real marks, not metadata).
  const plain = env('iron_sword', { roll: common });
  drawGroundDrop(plain.g);
  const dressed = env('iron_sword', { roll: legendary });
  drawGroundDrop(dressed.g);
  const inkOf = (c: Record<string, number>): number => (c.fill ?? 0) + (c.fillRect ?? 0);
  assert.ok(
    inkOf(dressed.counts) > inkOf(plain.counts),
    'a legendary drop must visibly out-dress a common one',
  );
});

test('THE PILE GRAMMAR: families with their own pile refuse the generic echo', () => {
  // Own grammar: the stack IS the art.
  for (const id of ['coins', 'egg', 'iron_bar', 'log', 'raw_trout', 'scroll_keen_edge', 'healing_tincture', 'arrow']) {
    assert.ok(drawsOwnPile(id), `${id} should draw its own pile`);
  }
  // Gear never stacks, so it never echoes either.
  for (const id of ['iron_sword', 'iron_platebody', 'tower_shield', 'bronze_axe']) {
    assert.ok(drawsOwnPile(id), `${id} is gear and must not echo`);
  }
  // Generic goods still lean on the renderer's echo heap.
  for (const id of ['arcane_dust', 'wool', 'leather', 'bones']) {
    assert.ok(!drawsOwnPile(id), `${id} should use the generic echo`);
  }
  // And a pile-family painter actually grows with quantity.
  const one = env('iron_bar', { qty: 1 });
  drawGroundDrop(one.g);
  const three = env('iron_bar', { qty: 3 });
  drawGroundDrop(three.g);
  assert.ok(
    (three.counts.fill ?? 0) > (one.counts.fill ?? 0),
    'three bars must paint more matter than one',
  );
});

test('THE SHADOW MATCHES THE MASS: lying arms throw long, a feather barely lands', () => {
  assert.ok(groundShadowSpread('iron_sword') > groundShadowSpread('bread'), 'a lying sword outshadows a loaf');
  assert.ok(groundShadowSpread('feather') < groundShadowSpread('bread'), 'a feather underthrows a loaf');
  // Every item yields a sane spread.
  for (const d of ITEMS.values()) {
    const sp = groundShadowSpread(d.id);
    assert.ok(sp > 0.2 && sp <= 2, `${d.id} shadow spread ${sp} out of band`);
  }
});

test('THE DUNGEON KEY WEARS ITS TIER: an epic key is painted, not just labeled', () => {
  assert.equal(groundForm('dungeon_key'), 'key');
  const { g, counts } = env('dungeon_key', { roll: { rar: 'epic', seed: 3 } });
  drawGroundDrop(g);
  assert.ok((counts.fill ?? 0) > 0, 'the key must paint');
  // Sanity: the def exists so the fallback color never fires silently.
  assert.ok(itemDef('dungeon_key'), 'dungeon_key def went missing');
});
