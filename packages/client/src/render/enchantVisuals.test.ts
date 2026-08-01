/**
 * THE WORN LIGHT on the weapon and the head — the two channels whose
 * regressions shipped silently once: the blade fx map collapsed three
 * schools into two shapes, and the helm style never carried its arx
 * mark, so the whole brow painter was dead code. These pin both.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ENCHANT_DEFS } from '@arx/content';
import { enchantedStyle } from './rig.js';
import { drawHelmet, helmStyle, type HelmStyle } from './armor.js';
import { arxMark, elementTint } from './wornLight.js';

// ------------------------------------------------- the blade edge

const SCHOOLS = [
  'arcane', 'ember', 'frost', 'storm', 'verdant',
  'void', 'radiant', 'blood', 'astral',
] as const;

/** A tier-2+ working of this school, from the live roster. */
function defOf(element: string, min = 2, max = 5): string | undefined {
  return ENCHANT_DEFS.find((e) => e.element === element && e.tier >= min && e.tier <= max)?.id;
}

test('NINE SCHOOLS, NINE EDGES: no two schools share a blade fx shape', () => {
  // The regression this pins: verdant mapped to 'gleam' (the tier-1
  // treatment every school gets) and astral shared arcane's 'star', so
  // a tier-3 verdant edge read as a tier-1 mark.
  const fxBySchool = new Map<string, unknown>();
  for (const school of SCHOOLS) {
    const id = defOf(school);
    if (!id) continue; // a school with no tier-2+ working yet has no edge to claim
    const st = enchantedStyle({ fx: undefined as unknown, fxColor: undefined as string | undefined }, id, 'blade');
    assert.notEqual(st.fx, undefined, `${school} must claim an edge shape`);
    assert.notEqual(st.fx, 'gleam', `${school} at tier 2+ must outgrow the tier-1 gleam`);
    fxBySchool.set(school, st.fx);
  }
  const shapes = new Set(fxBySchool.values());
  assert.equal(
    shapes.size,
    fxBySchool.size,
    `schools share an edge shape: ${JSON.stringify([...fxBySchool])}`,
  );
});

test('THE AURA BLADE: tier 5 stands a second edge off the steel, and only tier 5', () => {
  const t5 = ENCHANT_DEFS.find((e) => e.tier === 5)?.id;
  const t3 = ENCHANT_DEFS.find((e) => e.tier === 3)?.id;
  assert.ok(t5, 'the roster fields tier-5 workings');
  assert.ok(t3, 'the roster fields tier-3 workings');
  const base = { fx: undefined as unknown, fxColor: undefined as string | undefined, aura: undefined as string | undefined };
  assert.ok(enchantedStyle(base, t5, 'blade').aura, 'a tier-5 blade earns the aura');
  assert.equal(enchantedStyle(base, t3, 'blade').aura, undefined, 'tier 3 does not');
  assert.equal(enchantedStyle(base, t5, 'staff').aura, undefined, 'the aura is a BLADE read');
});

// ------------------------------------------------- the brow band

/** A recording 2D-context stand-in: counts calls, rejects NaN coords. */
function mockCtx(): { ctx: CanvasRenderingContext2D; calls: Map<string, number> } {
  const calls = new Map<string, number>();
  const target: Record<string | symbol, unknown> = {};
  const ctx = new Proxy(target, {
    get(t, prop) {
      if (prop in t) return t[prop];
      const fn = (...args: unknown[]) => {
        for (const a of args) {
          if (typeof a === 'number') {
            assert.ok(Number.isFinite(a), `painter emitted NaN via ${String(prop)}`);
          }
        }
        const key = String(prop);
        calls.set(key, (calls.get(key) ?? 0) + 1);
        return undefined;
      };
      t[prop] = fn;
      return fn;
    },
    set(t, prop, v) {
      t[prop] = v;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, calls };
}

const HEAD_FRAME = {
  s: 100,
  headX: 0,
  headY: -60,
  hw: 15,
  hh: 15,
  cut: 5,
  headR: 15,
  fx: 0,
  profileK: 0,
  backK: 0,
  lead: 1,
  hurt: false,
  nowMs: 480, // mid-breath: every tier-2+ pulse is well above its floor
};

test('the head channel is alive: an arx-marked helm paints MORE than a bare one', () => {
  // The regression this pins: rig.ts resolved helmStyle without the
  // withArx overlay, so HelmStyle.arx was never set on a live body and
  // drawArxBrow never ran for anyone.
  const bare: HelmStyle = { ...helmStyle('test_unknown_helm') };
  const mark = arxMark({ element: 'ember', tier: 3, tint: elementTint('ember') })!;
  const lit: HelmStyle = { ...bare, arx: mark };

  const a = mockCtx();
  drawHelmet(a.ctx, bare, HEAD_FRAME);
  const b = mockCtx();
  drawHelmet(b.ctx, lit, HEAD_FRAME);

  const strokes = (m: Map<string, number>) => m.get('stroke') ?? 0;
  const fills = (m: Map<string, number>) => m.get('fill') ?? 0;
  assert.ok(
    strokes(b.calls) > strokes(a.calls),
    'the brow band must stroke over the bare helm',
  );
  // Tier 3 also stands the crown mark clear of the helm — one more fill.
  assert.ok(fills(b.calls) > fills(a.calls), 'the tier-3 crown mark must fill');
});
