import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ABILITIES, NPCS } from '@arx/content';
import { fxStyleFor } from './abilityFx.js';
import { BREATH_DIALECTS, speakBreath } from './breathFx.js';
import type { MatterCtx } from './matter/index.js';

/**
 * THE BREATH SPEAKS — the dialect contract.
 *
 * CURATED VOICES extends to the matter layer: every shipped breath
 * art (castTicks or channelTicks, the tame's own grammar excepted)
 * must carry a hand-picked dialect entry — the face-derived fallback
 * exists for arts in flight, never for arts on the shelf. And every
 * dialect must actually SPEAK: resolved against the live matter
 * library, a voice that names a missing deployment fails here, not
 * silently in a fight.
 */

const breathArts = [...ABILITIES.values()].filter((ab) => ab.shape !== 'tame');
// THE FOE'S BREATH (enemy arts): an NPC kit entry with a windup
// winds its ability exactly like castTicks winds a player art — the
// charge wire carries the same id, so the curation law reaches it.
const kitWound = new Set<string>();
for (const npc of NPCS.values()) {
  for (const k of npc.kit ?? []) {
    if ((k.windupTicks ?? 0) > 0) kitWound.add(k.ability);
  }
}
const casted = breathArts.filter((ab) => ab.castTicks || kitWound.has(ab.id));
const channeled = breathArts.filter((ab) => ab.channelTicks);

/** A permissive particle host: counts every call, satisfies any verb. */
function stubCtx(): { c: MatterCtx; calls: () => number } {
  let n = 0;
  const emitter = { stop: () => undefined, move: () => undefined };
  const particles = new Proxy(
    {},
    {
      get: () => (..._a: unknown[]) => {
        n++;
        return emitter;
      },
    },
  ) as unknown as MatterCtx['particles'];
  return { c: { particles, glow: () => undefined }, calls: () => n };
}

test('every shipped breath art carries a curated dialect voice', () => {
  for (const ab of casted) {
    assert.ok(
      BREATH_DIALECTS[ab.id]?.charge,
      `${ab.id} winds up but has no curated charge voice — the fallback is for arts in flight`,
    );
  }
  for (const ab of channeled) {
    assert.ok(
      BREATH_DIALECTS[ab.id]?.note,
      `${ab.id} holds a note but has no curated note voice`,
    );
  }
});

test('no orphan dialects: every entry names a live breath art with the matching grammar', () => {
  for (const [id, d] of Object.entries(BREATH_DIALECTS)) {
    const ab = ABILITIES.get(id);
    assert.ok(ab, `dialect '${id}' speaks for no ability`);
    if (d.charge) {
      assert.ok(
        ab!.castTicks || kitWound.has(id),
        `'${id}' has a charge voice but no wind-up (neither castTicks nor a winding kit entry)`,
      );
    }
    if (d.note) assert.ok(ab!.channelTicks, `'${id}' has a note voice but no held note`);
  }
});

test('every voice speaks real matter when the wire calls it', () => {
  for (const ab of casted) {
    const { c, calls } = stubCtx();
    speakBreath('charge', ab.id, fxStyleFor(ab.id, ab.color), c, 0, 0, 1.5);
    assert.ok(calls() > 0, `${ab.id}: the charge voice spawned nothing`);
  }
  for (const ab of channeled) {
    const { c, calls } = stubCtx();
    speakBreath('note', ab.id, fxStyleFor(ab.id, ab.color), c, 0, 0, 0.9);
    assert.ok(calls() > 0, `${ab.id}: the note voice spawned nothing`);
  }
});

test('the face-derived fallback covers an unknown art of every debris family', () => {
  // A future breath art is never voiceless while its curated entry
  // waits: any face the fallback map serves must produce matter.
  for (const ab of breathArts) {
    const { c, calls } = stubCtx();
    speakBreath('charge', 'definitely_not_shipped', fxStyleFor(ab.id, ab.color), c, 0, 0, 1.2);
    assert.ok(calls() > 0, `fallback for debris '${fxStyleFor(ab.id, ab.color).debris}' is silent`);
  }
});
