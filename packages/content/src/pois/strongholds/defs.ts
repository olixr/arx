import type { PrefabDef } from '../../maps/prefab.js';
import { genStronghold, type StrongholdSizeClass } from './generate.js';
import type { StrongholdDef } from './types.js';
import { validateStronghold } from './validate.js';

/**
 * THE REPOSITORY'S SHIPPED SHELF (docs/strongholds-plan.md Phase 1).
 *
 * Every shipped layout is FOUNDRY OUTPUT AT A PINNED SEED — generated
 * at build, validated at build, walked by the test suite, identical
 * forever. Curation rides the same doors every prefab and def has:
 * the layout prefab seeds into data/prefabs (FILE WINS — Map Studio
 * polish sticks), the def seeds into content_docs kind 'stronghold'
 * (DB WINS — bench edits stick). The pinned seed is the authored
 * baseline both revert to.
 *
 * Seeds were chosen by sweeping the generator against the validator
 * and the layout report (scripts kept in the plan's as-built notes):
 * every entry composes lawfully — PULL LAW spacing, open gates,
 * reachable wards, muster inside the envelope — by construction.
 */

interface RosterEntry {
  id: string;
  name: string;
  description: string;
  family: string;
  tiers: readonly [number, number];
  weight: number;
  sizeClass: StrongholdSizeClass;
  seed: number;
  bossNames: readonly string[];
}

const ROSTER: readonly RosterEntry[] = [
  {
    id: 'stronghold_goblin_moot',
    name: 'Goblin moot-citadel',
    description:
      'The goblin country in session: palisade ring, totem courts, worg pens, and the moot fire where the war-boss holds his shouting court.',
    family: 'goblin',
    tiers: [3, 5],
    weight: 3,
    sizeClass: 'citadel',
    seed: 9,
    bossNames: ['Gruk Threefires', 'Nagga the Wide', 'Skarn Bonecounter', 'Old Yellowtooth', 'Vrek Stonehowl', 'Mor the Unfed'],
  },
  {
    id: 'stronghold_goblin_warring',
    name: 'Goblin war-ring',
    description: 'A tighter ring raised in a season: tents, drums, and too many spears for its size.',
    family: 'goblin',
    tiers: [3, 4],
    weight: 3,
    sizeClass: 'hold',
    seed: 1,
    bossNames: ['Hakk Redhand', 'Snagga Pitborn', 'Urzul the Patient', 'Grimtongue', 'Karsh Two-Drums'],
  },
  {
    id: 'stronghold_goblin_deepfort',
    name: 'Goblin deep-fort',
    description: 'The old moot, dug in deep: a citadel that has stood long enough to grow fat on the roads it robs.',
    family: 'goblin',
    tiers: [4, 5],
    weight: 2,
    sizeClass: 'citadel',
    seed: 4,
    bossNames: ['Zogg the Under-King', 'Marrgul Ashcrown', 'Thrukk Ninefingers', 'The Moot-Breaker'],
  },
  {
    id: 'stronghold_brigand_bastion',
    name: 'Brigand bastion',
    description:
      "A robber lord's walled yard: stolen stores stacked to the spikes, cages for the unlucky, a captain who keeps a ledger.",
    family: 'brigand',
    tiers: [3, 5],
    weight: 3,
    sizeClass: 'citadel',
    seed: 6,
    bossNames: ['Corvin the Toll', 'Mave Ironpurse', 'Halden Rook', 'Sorrel the Knife', 'Bract Longwatch'],
  },
  {
    id: 'stronghold_brigand_stockyard',
    name: 'Brigand stockyard',
    description: 'Half fort, half fencing operation: the loot moves through faster than the guards do.',
    family: 'brigand',
    tiers: [3, 4],
    weight: 2,
    sizeClass: 'hold',
    seed: 1,
    bossNames: ['Redga the Brand', 'Toller Finch', 'One-Eyed Wyn', 'Cutter Pell'],
  },
  {
    id: 'stronghold_wolfkin_greatring',
    name: 'Wolfkin great-ring',
    description:
      'A ring of thicket and old bone around the den heart. Nothing here built a fire; everything here eats.',
    family: 'wolfkin',
    tiers: [4, 5],
    weight: 2,
    sizeClass: 'citadel',
    seed: 5,
    bossNames: ['The Grey Sovereign', 'Mother Longfang', 'The Winter Jaw', 'Old Ninescar'],
  },
  {
    id: 'stronghold_wolfkin_bonering',
    name: 'Wolfkin bone-ring',
    description: 'A lesser ring on a kill-rich slope: larders, hollows, and a jaw that keeps them.',
    family: 'wolfkin',
    tiers: [3, 4],
    weight: 2,
    sizeClass: 'hold',
    seed: 6,
    bossNames: ['Splitmuzzle', 'The Lean King', 'Redhackle', 'Gnawer-of-Gates'],
  },
  {
    id: 'stronghold_gnoll_cacklefort',
    name: 'Gnoll cackle-fort',
    description: 'The hyena-folk behind spikes: totems, cook-fires, and laughter that carries too far at night.',
    family: 'gnoll',
    tiers: [4, 5],
    weight: 2,
    sizeClass: 'hold',
    seed: 3,
    bossNames: ['Yipmaw the Loud', 'Gash the Grinner', 'Half-Laugh', 'Rekka Boneshaker'],
  },
  {
    id: 'stronghold_dead_barrowcourt',
    name: 'Walled barrow-court',
    description:
      'An old kingdom keeping its last court: cairn stones, cold braziers, and a crowned thing that never left the throne yard.',
    family: 'dead',
    tiers: [4, 5],
    weight: 2,
    sizeClass: 'hold',
    seed: 4,
    bossNames: ['The Walled King', 'He Who Kept the Count', 'The Hollow Warden', 'The First Mason', 'The Crowned Silence'],
  },
];

function buildShelf(): {
  defs: Map<string, StrongholdDef>;
  prefabs: Map<string, PrefabDef>;
} {
  const defs = new Map<string, StrongholdDef>();
  const prefabs = new Map<string, PrefabDef>();
  const errors: string[] = [];
  for (const entry of ROSTER) {
    const { seed, sizeClass, bossNames, ...specRest } = entry;
    const proposal = genStronghold(seed, { ...specRest, sizeClass, bossNames });
    const res = validateStronghold(proposal.def, { prefab: proposal.prefab });
    if (!res.ok) {
      errors.push(...res.errors.map((e) => `${entry.id}: ${e}`));
      continue;
    }
    if (defs.has(res.def.id)) errors.push(`${res.def.id}: duplicate stronghold id`);
    defs.set(res.def.id, res.def);
    prefabs.set(proposal.prefab.id, proposal.prefab);
  }
  // Authored content is code: a bad layout fails the build, loudly.
  if (errors.length > 0) throw new Error(`invalid stronghold shelf:\n  ${errors.join('\n  ')}`);
  return { defs, prefabs };
}

const shelf = buildShelf();

/**
 * The LIVE layout registry — runtime consumers resolve through
 * .get()/.values() at call time (the live-registry law), so
 * replaceStrongholds applies bench edits immediately.
 */
export const STRONGHOLD_DEFS: ReadonlyMap<string, StrongholdDef> = new Map(shelf.defs);

/** The shelf exactly as shipped — the bench's revert target. */
export const AUTHORED_STRONGHOLDS: ReadonlyMap<string, StrongholdDef> = shelf.defs;

/**
 * The shipped layout prefabs — the server seeds these into
 * data/prefabs at boot beside the POI prefabs (FILE WINS thereafter;
 * Map Studio curation sticks).
 */
export const STRONGHOLD_PREFABS: ReadonlyMap<string, PrefabDef> = shelf.prefabs;

export function strongholdDef(id: string): StrongholdDef | undefined {
  return STRONGHOLD_DEFS.get(id);
}

/** THE CMS HOOK — repopulate the live registry in place. */
export function replaceStrongholds(next: Iterable<StrongholdDef>): void {
  const map = STRONGHOLD_DEFS as Map<string, StrongholdDef>;
  map.clear();
  for (const def of next) map.set(def.id, def);
}

/** The pinned roster (id → seed/sizeClass) — the Foundry bench's "reroll from shipped" reference. */
export const STRONGHOLD_ROSTER: ReadonlyArray<{
  id: string;
  seed: number;
  sizeClass: StrongholdSizeClass;
}> = ROSTER.map((r) => ({ id: r.id, seed: r.seed, sizeClass: r.sizeClass }));
