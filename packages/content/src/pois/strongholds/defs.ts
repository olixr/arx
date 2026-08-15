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
  /** THE DROWNED CHARTER: this layout seats only on a waterside. */
  shore?: boolean;
  bossNames: readonly string[];
  /** Seat-name pool (Phase 5) — the world knows the place by these. */
  titles: readonly string[];
  /** THE MANY BANNERS (Third Charter): per-layout piece pool bias. */
  pieces?: readonly string[];
}

const ROSTER: readonly RosterEntry[] = [
  {
    id: 'stronghold_goblin_moot',
    name: 'Goblin moot-citadel',
    description:
      'The goblin country in session: palisade ring, totem courts, worg pens, and the moot fire where the war-boss holds his shouting court.',
    family: 'goblin',
    tiers: [3, 9],
    weight: 3,
    sizeClass: 'citadel',
    seed: 2,
    bossNames: ['Gruk Threefires', 'Nagga the Wide', 'Skarn Bonecounter', 'Old Yellowtooth', 'Vrek Stonehowl', 'Mor the Unfed'],
    titles: ["The Shouting Ring", "Threefires Moot", "The Wide Court"],
  },
  {
    id: 'stronghold_goblin_warring',
    name: 'Goblin war-ring',
    description: 'A tighter ring raised in a season: tents, drums, and too many spears for its size.',
    family: 'goblin',
    tiers: [3, 4],
    weight: 3,
    sizeClass: 'hold',
    seed: 4,
    bossNames: ['Hakk Redhand', 'Snagga Pitborn', 'Urzul the Patient', 'Grimtongue', 'Karsh Two-Drums'],
    titles: ["The Quick Ring", "Redhand Ring", "The Raised Spears"],
  },
  {
    id: 'stronghold_goblin_deepfort',
    name: 'Goblin deep-fort',
    description: 'The old moot, dug in deep: a citadel that has stood long enough to grow fat on the roads it robs.',
    family: 'goblin',
    tiers: [4, 9],
    weight: 2,
    sizeClass: 'citadel',
    seed: 0,
    bossNames: ['Zogg the Under-King', 'Marrgul Ashcrown', 'Thrukk Ninefingers', 'The Moot-Breaker'],
    titles: ["The Old Moot", "Ashcrown Fast", "The Under Fort"],
  },
  {
    id: 'stronghold_brigand_bastion',
    name: 'Brigand bastion',
    description:
      "A robber lord's walled yard: stolen stores stacked to the spikes, cages for the unlucky, a captain who keeps a ledger.",
    family: 'brigand',
    tiers: [3, 9],
    weight: 3,
    sizeClass: 'citadel',
    seed: 1,
    bossNames: ['Corvin the Toll', 'Mave Ironpurse', 'Halden Rook', 'Sorrel the Knife', 'Bract Longwatch'],
    titles: ["The Ledger House", "The Toll Bastion", "The Robbers' Yard"],
  },
  {
    id: 'stronghold_brigand_stockyard',
    name: 'Brigand stockyard',
    description: 'Half fort, half fencing operation: the loot moves through faster than the guards do.',
    family: 'brigand',
    tiers: [3, 7],
    weight: 2,
    sizeClass: 'hold',
    seed: 1,
    bossNames: ['Redga the Brand', 'Toller Finch', 'One-Eyed Wyn', 'Cutter Pell'],
    titles: ["The Stockyard", "The Long Count", "The Fenced Yard"],
  },
  {
    id: 'stronghold_wolfkin_greatring',
    name: 'Wolfkin great-ring',
    description:
      'A ring of thicket and old bone around the den heart. Nothing here built a fire; everything here eats.',
    family: 'wolfkin',
    tiers: [4, 9],
    weight: 2,
    sizeClass: 'citadel',
    seed: 1,
    bossNames: ['The Grey Sovereign', 'Mother Longfang', 'The Winter Jaw', 'Old Ninescar'],
    titles: ["The Grey Ring", "The Winter Court", "The Longfang Ring"],
  },
  {
    id: 'stronghold_wolfkin_bonering',
    name: 'Wolfkin bone-ring',
    description: 'A lesser ring on a kill-rich slope: larders, hollows, and a jaw that keeps them.',
    family: 'wolfkin',
    tiers: [3, 4],
    weight: 2,
    sizeClass: 'hold',
    seed: 0,
    bossNames: ['Splitmuzzle', 'The Lean King', 'Redhackle', 'Gnawer-of-Gates'],
    titles: ["The Bone Ring", "The Lean Yard", "The Gnawed Ring"],
  },
  {
    id: 'stronghold_gnoll_cacklefort',
    name: 'Gnoll cackle-fort',
    description: 'The hyena-folk behind spikes: totems, cook-fires, and laughter that carries too far at night.',
    family: 'gnoll',
    tiers: [4, 8],
    weight: 2,
    sizeClass: 'hold',
    seed: 1,
    bossNames: ['Yipmaw the Loud', 'Gash the Grinner', 'Half-Laugh', 'Rekka Boneshaker'],
    titles: ["The Cackle Fort", "The Loud Fort", "The Grinning Ring"],
  },
  {
    id: 'stronghold_dead_gravecourt',
    name: 'Walled grave-court',
    description:
      'A graveyard that learned to defend itself: fenced rows of old graves, cold braziers between them, and a warden who counts the resting.',
    family: 'dead',
    tiers: [4, 9],
    weight: 2,
    sizeClass: 'citadel',
    seed: 3,
    bossNames: ['The Grave Warden', 'The Pale Sexton', 'The Roll Keeper', 'He Who Closes the Earth'],
    titles: ['The Sunken Rows', 'The Counted Field', 'The Long Rest'],
    pieces: ['ward_dd_gravefield', 'ward_dd_graves', 'ward_dd_stones', 'ward_dd_cairnfield', 'ward_dd_processional'],
  },
  {
    id: 'stronghold_wolfkin_wargcamp',
    name: 'Warg camp',
    description:
      'A settlement built around its pens: wargs behind rails, wolves between them, and a pen mother nothing rides.',
    family: 'wolfkin',
    tiers: [3, 8],
    weight: 2,
    sizeClass: 'hold',
    seed: 0,
    bossNames: ['Ironhide', 'The Pen Mother', 'Blackgirth', 'The Unbroken Warg'],
    titles: ['The Warg Yard', 'The Howling Pens', 'The Saddle Bones'],
    pieces: ['ward_wk_wargpens', 'ward_wk_nests', 'ward_wk_racks', 'ward_wk_hollowfield'],
  },
  {
    id: 'stronghold_goblin_encampment',
    name: 'Goblin encampment',
    description:
      'A tent city on the march that stopped marching: rows on rows of hide and drum, more cook fires than sense.',
    family: 'goblin',
    tiers: [3, 4],
    weight: 2,
    sizeClass: 'hold',
    seed: 0,
    bossNames: ['Vex Halfspear', 'Grubbin the Loud', 'Nakka of the Tents', 'Skiv Firstpole'],
    titles: ['The Sprawl of Tents', 'The Loud Field', 'The Marching Ground'],
    pieces: ['ward_gs_wartents', 'ward_gs_tents', 'ward_gs_cookyard', 'ward_gs_greatring', 'ward_gs_muster'],
  },
  {
    id: 'stronghold_gnoll_greatfort',
    name: 'Gnoll great-fort',
    description:
      'The cackle-fort grown up: a full citadel of the hyena-folk, laughter on every wall and a champion who has stopped laughing.',
    family: 'gnoll',
    tiers: [4, 9],
    weight: 2,
    sizeClass: 'citadel',
    seed: 3,
    bossNames: ['Rakkash the Greatlaugh', 'Old Bonebreaker', 'Yezza Longgrin', 'The Last Laugh'],
    titles: ['The Greatlaugh Fort', 'The Howl Keep', 'The Long Grin'],
  },
  {
    id: 'stronghold_skral_greatweir',
    name: 'The Great Weir',
    description:
      'The shoal country in council: dug pools behind drowned-kingdom stone, drying yards and net lines working the shallows, and a deepking holding the oldest pool of all.',
    family: 'skral',
    tiers: [4, 9],
    weight: 3,
    sizeClass: 'citadel',
    seed: 2,
    shore: true,
    bossNames: ['The Drowned King', 'Mother-of-Pools', 'Gorrmaw the Patient', 'The Tide That Stays'],
    titles: ['The Great Weir', 'The Drowned Court', 'The Long Pools'],
  },
  {
    id: 'stronghold_skral_tidefast',
    name: 'Skral tidefast',
    description:
      'A lesser weir-hold on a working bank: middens, beached hulls, and too many bone-tipped spears for its size.',
    family: 'skral',
    tiers: [3, 6],
    weight: 2,
    sizeClass: 'hold',
    seed: 4,
    shore: true,
    bossNames: ['Brinefather', 'The Bank King', 'Croalsh Ninespine', 'The Weir Warden'],
    titles: ['The Tidefast', 'The Wet Ring', 'The Croaking Fast'],
  },
  {
    id: 'stronghold_dead_barrowcourt',
    name: 'Walled barrow-court',
    description:
      'An old kingdom keeping its last court: cairn stones, cold braziers, and a crowned thing that never left the throne yard.',
    family: 'dead',
    tiers: [4, 9],
    weight: 2,
    sizeClass: 'hold',
    seed: 5,
    bossNames: ['The Walled King', 'He Who Kept the Count', 'The Hollow Warden', 'The First Mason', 'The Crowned Silence'],
    titles: ["The Walled Court", "The Counted Court", "The Silent Court"],
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
    const { seed, sizeClass, bossNames, titles, ...specRest } = entry;
    const proposal = genStronghold(seed, { ...specRest, sizeClass, bossNames });
    // The seat-name pool rides the def, not the generator — a reroll
    // keeps the place's names.
    const withTitles = { ...proposal.def, titles };
    const res = validateStronghold(withTitles, { prefab: proposal.prefab });
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
