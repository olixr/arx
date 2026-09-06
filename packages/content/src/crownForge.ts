/**
 * THE WILD CROWN — the generative crown forge
 * (docs/boss-system-plan.md, THE WILD CROWN).
 *
 * The forge COMPOSES, it never invents (LAW W1): every part below is
 * authored — family voice pools drawing only shipped, fully-faced
 * abilities; authored chain pairs; ladder archetypes; CC temperaments
 * that are each a designed weakness story; bark, name, and epithet
 * pools in each family's own register. The seed chooses and jitters
 * WITHIN authored bounds. Emergence is composition, never soup.
 *
 * THE SEED IS THE SOUL (LAW W3): `forgeCrown(base, seed)` is pure —
 * the same base and seed yield the same crown forever, so a war
 * camp's forged tyrant is a stable foe with a stable name, not a
 * re-roll per visit.
 *
 * THE BODY IS THE BASE (LAW W4): the forged def keeps the base id —
 * every dialect look and art contract keys off the body that earned
 * them. The forge touches behavior and identity words only.
 *
 * GENERATED CONTENT WALKS THE SAME GATE (LAW W2): the fuzz contract
 * in crownForge.test.ts drives hundreds of seeds through
 * validateNpcDef whole. The structural asserts at the tail of
 * forgeCrown are the forge's own conscience — they throw on any
 * composition that would break a crown law, so a bad pool edit dies
 * in tests, never in the world.
 */
import { Rng } from '@arx/shared';
import type { BossPhaseDef, NpcDef, NpcKitEntry } from './npcs.js';

/** One authored candidate voice — a full lawful kit-entry preset. */
export interface ForgeVoice {
  entry: NpcKitEntry;
  /**
   * Composition tag: 'summon' voices anchor rising-court ladders,
   * 'lope' voices anchor skirmisher ladders, 'zone'/'strike' shape
   * entry choices for headlong ladders.
   */
  tag: 'summon' | 'lope' | 'zone' | 'strike';
}

/** A family's authored parts bin. */
export interface CrownPool {
  /** Base def ids this pool may crown — each carries its own kit. */
  appliesTo: readonly string[];
  /** Candidate voices beyond the base kit (faced abilities only). */
  voices: readonly ForgeVoice[];
  /**
   * Authored combo pairs [opener, follower] — wired as a `then` chain
   * only when both abilities stand in the forged kit. Openers must be
   * unique within a pool (single links: acyclic by construction).
   */
  chains: readonly (readonly [string, string])[];
  /** Loot tables appended to the base's (must exist in the registry). */
  lootAdd: readonly string[];
  names: readonly string[];
  epithets: readonly string[];
  titles: readonly string[];
  barksEngage: readonly string[];
  barksPhase: readonly string[];
  barksDefeat: readonly string[];
  /** Rung reveal-name pool ("The Court Rises" register). */
  phaseNames: readonly string[];
}

/**
 * THE TEMPERS — each an authored weakness story, never a free roll:
 * the seed picks a temper and jitters inside its authored band.
 *  - immovable: shove nothing; the interrupt school breaks it open.
 *  - stubborn:  the classic crown — staggered a beat, never chained.
 *  - light:     push it around; it barely staggers.
 *  - lesson:    hard control simply works — the entry-band story.
 */
const TEMPERS: ReadonlyArray<{
  key: string;
  kb: readonly [number, number];
  stun: readonly [number, number];
}> = [
  { key: 'immovable', kb: [0, 0.15], stun: [1.2, 1.6] },
  { key: 'stubborn', kb: [0.15, 0.35], stun: [0.4, 0.65] },
  { key: 'light', kb: [0.9, 1.3], stun: [0.5, 0.8] },
  { key: 'lesson', kb: [0.7, 0.95], stun: [0.9, 1.15] },
];

/**
 * THE LADDERS — phase-shape archetypes. Each names the voice tag its
 * first true rung wants for its entry cast; the forge only offers
 * ladders the drawn voices can anchor.
 *  - rising_court: the court answers at the first deep wound (summon).
 *  - headlong:     tempo and stride ramp — the fight accelerates.
 *  - skirmisher:   the hit-and-run turn (a lope voice leads the rung).
 */
const LADDERS: ReadonlyArray<{ key: string; wants: ForgeVoice['tag'] | null }> = [
  { key: 'rising_court', wants: 'summon' },
  { key: 'headlong', wants: null },
  { key: 'skirmisher', wants: 'lope' },
];

/** The flood-law band every crown honors (xpReward / maxHp). */
const XP_RATIO: readonly [number, number] = [3.4, 4.4];

// ---------------------------------------------------------------- pools

/**
 * THE PARTS BINS. Dialect purity holds: a family draws only words its
 * bodies already speak in the world (the goblin casters taught fire
 * and gloom; the crypt taught bone; the canids share the low bite).
 */
export const CROWN_POOLS: readonly CrownPool[] = [
  {
    // The war-camps' bruiser made king: a melee base that may learn
    // the camp's fire — a forged warboss with the firecaller's word
    // fights nothing like his slab-handed brother two camps over.
    appliesTo: ['goblin_champion'],
    voices: [
      { entry: { ability: 'goblin_firebolt', cooldownTicks: 120, windupTicks: 14, minRange: 1.5, maxRange: 8 }, tag: 'strike' },
      { entry: { ability: 'cinder_ring', cooldownTicks: 200, windupTicks: 12, maxRange: 7, aim: 'lead', rally: true }, tag: 'summon' },
      { entry: { ability: 'miasma_ring', cooldownTicks: 260, windupTicks: 16, maxRange: 7, aim: 'lead' }, tag: 'zone' },
    ],
    chains: [['cinder_ring', 'goblin_firebolt']],
    lootAdd: ['champion_armory'],
    names: ['Gorbash', 'Snagrot', 'Bruk', 'Mawgash', 'Ikkit', 'Dregtooth', 'Uzgul', 'Ratbane'],
    epithets: ['the Unbowed', 'Camp-Burner', 'the Loud King', 'Toothtaker', 'Ashfist', 'the Twice-Crowned', 'Wallbreaker'],
    titles: ['Crowned of the War-Camp', 'Tyrant of the Small Fires', 'King of the Torn Banner', 'The Moot’s Last Word'],
    barksEngage: ['MY camp. MY bones.', 'Another skull for the pile!', 'You knock on the WRONG wall.'],
    barksPhase: ['BURN them out!', 'The camp answers ME!', 'Now you meet the whole moot!', 'I am not DONE!'],
    barksDefeat: ['The camp... holds without me...', 'A bigger skull... takes the pile...'],
    phaseNames: ['The Camp Answers', 'The Red Moot', 'The Last Wall', 'Ash and Teeth'],
  },
  {
    // The crypt's promoted dead, drawn deeper into the bone words —
    // a forged crown that raises its court is a different night from
    // one that stakes the mist. (The guard stays off the bin: a
    // kitless body has nothing lawful to compose — LAW W1.)
    appliesTo: ['skeleton_champion'],
    voices: [
      { entry: { ability: 'bone_volley', cooldownTicks: 220, windupTicks: 14, minRange: 2.5, maxRange: 9 }, tag: 'strike' },
      { entry: { ability: 'marrow_chill', cooldownTicks: 230, windupTicks: 10, maxRange: 2.8 }, tag: 'zone' },
      { entry: { ability: 'grave_mist', cooldownTicks: 250, windupTicks: 16, maxRange: 7, aim: 'lead' }, tag: 'zone' },
      { entry: { ability: 'raise_the_fallen', cooldownTicks: 450, windupTicks: 24, aim: 'self' }, tag: 'summon' },
    ],
    chains: [['grave_mist', 'bone_volley']],
    lootAdd: ['champion_armory'],
    names: ['Morvane', 'The Sexton', 'Hollowgrave', 'Wrent', 'The Pale Reeve', 'Ossler', 'Gravewright'],
    epithets: ['the Quiet', 'of the Sunken Court', 'Twice-Buried', 'the Unresting', 'Coldhand', 'the Long-Kept'],
    titles: ['Keeper of a Nameless Court', 'The Barrow’s Second Voice', 'Warden of the Old Dark', 'The Grave’s Own Sergeant'],
    barksEngage: ['The dark keeps its own accounts.', 'You were counted the moment you entered.', 'Lie down. It is easier.'],
    barksPhase: ['Rise. All of you. RISE.', 'The cold comes up through the floor.', 'This ground remembers me.', 'No more patience.'],
    barksDefeat: ['Back... to the counting...', 'The court... will keep... without me...'],
    phaseNames: ['The Court Stirs', 'The Cold Floor', 'The Last Accounting', 'Grave-Wake'],
  },
  {
    // The warband's second matriarch-in-waiting: the packlord forged
    // up — the laugh, the low bite, the gnawed bone.
    appliesTo: ['gnoll_champion'],
    voices: [
      { entry: { ability: 'hamstring_bite', cooldownTicks: 170, windupTicks: 10, maxRange: 1.8 }, tag: 'strike' },
      { entry: { ability: 'gnawed_mending', cooldownTicks: 550, windupTicks: 20, hpBelow: 0.45, aim: 'self' }, tag: 'zone' },
    ],
    chains: [['rending_lunge', 'ravening_cackle']],
    lootAdd: ['champion_armory'],
    names: ['Ripgut', 'Yelloweye', 'Sicklejaw', 'Craghide', 'Longlaugh', 'Bonemuzzle'],
    epithets: ['the Gorged', 'First-Fed', 'of the Cackling Hill', 'Scabmane', 'the Patient Jaw'],
    titles: ['Voice of the Warband', 'The Hill’s Loudest Laugh', 'Second Under the Mother', 'Packlord of the Red Grin'],
    barksEngage: ['Meat walks IN? Generous.', 'The warband eats tonight!', 'I smell the marrow already.'],
    barksPhase: ['LAUGH, brothers! LAUGH!', 'The hill answers me!', 'Still standing? Good. More running.', 'Now I stop playing.'],
    barksDefeat: ['The warband... still... laughing...', 'Save my... share...'],
    phaseNames: ['The Hill Laughs', 'Red Grins', 'The Long Chase', 'Marrow-Time'],
  },
  {
    // The wood's other matriarchs: a dire wolf forged into a named
    // terror — the brotherhood words are the family's to draw.
    appliesTo: ['dire_wolf'],
    voices: [
      { entry: { ability: 'hamstring_bite', cooldownTicks: 170, windupTicks: 10, maxRange: 1.8 }, tag: 'strike' },
      { entry: { ability: 'call_the_brotherhood', cooldownTicks: 400, windupTicks: 18, minRange: 5, maxRange: 30, lope: true, rally: true }, tag: 'lope' },
      { entry: { ability: 'throat_lunge', cooldownTicks: 210, windupTicks: 12, minRange: 2, maxRange: 6 }, tag: 'strike' },
    ],
    chains: [['call_the_brotherhood', 'throat_lunge']],
    lootAdd: ['champion_armory'],
    names: ['Greyjaw', 'Hollowhowl', 'Snagtooth', 'Ashpelt', 'The Long Shadow', 'Wintermaw', 'Sorrowtail'],
    epithets: ['the Wood’s Dread', 'Trap-Wise', 'the White-Eared', 'Herd-Bane', 'of the Starving Year'],
    titles: ['Terror of the Treeline', 'The Pack’s Old Winter', 'Matriarch of the Far Dens', 'The Road’s End'],
    barksEngage: [],
    barksPhase: [],
    barksDefeat: [],
    phaseNames: ['The Pack Closes', 'Red Snow', 'The Last Hunt', 'Winter’s Teeth'],
  },
  {
    // THE BRINE CROWNS' wild layer: a shoal-camp deepking forged into
    // the bank's own tyrant. The base croak (shoal_call) always
    // stays — the fight is the camp — and the seed decides whether
    // this king also learned the tidecaller's two words or how to
    // call the court's spears (the family verb: any crowned skral may
    // call the bank's harpoons; the AUTHORED tidelord keeps the jet,
    // the geyser, and the flood as his signature alone).
    appliesTo: ['skral_champion'],
    voices: [
      { entry: { ability: 'tide_lash', cooldownTicks: 130, windupTicks: 12, minRange: 1.5, maxRange: 8 }, tag: 'strike' },
      { entry: { ability: 'riptide_ring', cooldownTicks: 250, windupTicks: 14, maxRange: 7, aim: 'lead' }, tag: 'zone' },
      { entry: { ability: 'court_of_spears', cooldownTicks: 430, windupTicks: 18, aim: 'self', rally: true }, tag: 'summon' },
    ],
    chains: [['riptide_ring', 'tide_lash']],
    lootAdd: ['champion_armory'],
    names: ['Brakkul', 'Gormgul', 'Croalsh', 'Wetjaw', 'Old Sallow', 'Murkgill', 'Roeback', 'Gloamfin'],
    epithets: ['the Bank’s Dread', 'Weir-Wise', 'Nine-Gills', 'the Patient Flood', 'Netbreaker', 'of the Cold Larder', 'Twice-Drowned'],
    titles: ['Crowned of the Wet Bank', 'Tyrant of the Small Pools', 'King Under the Weir', 'The Shoal’s Loudest Croak'],
    barksEngage: ['This bank feeds the SHOAL.', 'Walk in. The water remembers everyone.', 'Croaaak — the pool sets another place.'],
    barksPhase: ['The bank RISES!', 'Spears! SPEARS for the king!', 'The water is not done with you!', 'Deeper. DEEPER!'],
    barksDefeat: ['The shoal... swims on...', 'Back... to the cold larder...'],
    phaseNames: ['The Bank Rises', 'The Wet Court', 'The Long Undertow', 'Cold Water Closing'],
  },
  {
    // THE COMPANY'S CROWN (contested lands, band 7 fix pass 2): the
    // toll reaver made warden. Brede at the First Road bar musters
    // crowned on his row (rulings R4; THE MOUTH ON THE ROW), and until
    // this bin existed the forge had no family to draw him from, so
    // he stood a plain reaver under a crown the client never showed
    // (the boot's "crowned but unforgeable"). Dialect purity holds
    // hard here: the brigand bodies speak ONE word in the world, the
    // reaver's own reaping sweep, and this bin adds none (a bandit
    // with a bow's volley or a goblin's fire is somebody else). The
    // crown is the ladder, the temper, the purse and the words: the
    // same sweep, sharpened, behind a man who counts and does not
    // raise his voice. Names are for a seat that gives none (every
    // crowned reaver today is named by its own row); the register is
    // the Company's, whole sentences, paid is paid.
    appliesTo: ['brigand_reaver'],
    voices: [],
    chains: [],
    lootAdd: ['champion_armory'],
    names: ['Osk Tally', 'Wat Ledger', 'Bess Sixlines', 'Hobb Weighman', 'Mora Plankwise', 'Tam Farthing'],
    epithets: ['the Counter', 'Two Columns', 'of the Wet Bar', 'the Patient Book', 'Halfweight', 'Paid in Full'],
    titles: ['Warden of the Bar', 'The Company’s Count', 'Keeper of the Two Columns', 'The Road’s Collector'],
    barksEngage: ['The bar is the road and the road pays.', 'Two columns. You are in the other one now.', 'I do not raise my voice. I count.'],
    barksPhase: ['The book stays open.', 'Six lines on the post. Read them after.', 'Paid is paid.', 'The Hall does not send apologies.'],
    barksDefeat: ['The Hall sends another.', 'Write it in the book.'],
    phaseNames: ['The Count Begins', 'The Second Column', 'The Bar Holds', 'Paid in Full'],
  },
];

/** Pool lookup — null when no family claims the base. */
export function crownPoolFor(baseId: string): CrownPool | null {
  return CROWN_POOLS.find((p) => p.appliesTo.includes(baseId)) ?? null;
}

// ---------------------------------------------------------------- forge

export interface ForgeOpts {
  /**
   * A given name from the seat's own pool (POI name rows) — kept as
   * the crown's first name; the forge appends only its epithet.
   */
  name?: string;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * Forge a boss variant of `base` from its family's authored parts.
 * Pure in (base.id, base.level, seed, opts.name). Throws when the
 * base has no pool, no kit, or already wears an authored crown
 * (LAW W5 — authored outranks forged).
 */
export function forgeCrown(base: NpcDef, seed: number, opts: ForgeOpts = {}): NpcDef {
  if (base.boss) throw new Error(`forgeCrown: ${base.id} already wears an authored crown`);
  if (!base.kit || base.kit.length === 0) {
    throw new Error(`forgeCrown: ${base.id} carries no kit — nothing lawful to compose`);
  }
  const pool = crownPoolFor(base.id);
  if (!pool) throw new Error(`forgeCrown: no crown pool claims ${base.id}`);
  const rng = new Rng(seed);

  // 1 — THE VOICES: the base kit is the body's identity and always
  // stays; the seed draws 1..N pool voices that don't repeat it.
  const kit: NpcKitEntry[] = base.kit.map((k) => ({ ...k }));
  const have = new Set(kit.map((k) => k.ability));
  const candidates = pool.voices.filter((v) => !have.has(v.entry.ability));
  const drawCount = Math.min(candidates.length, rng.int(1, Math.min(3, candidates.length)));
  const drawn: ForgeVoice[] = [];
  const bag = [...candidates];
  for (let i = 0; i < drawCount; i++) {
    const idx = rng.int(0, bag.length - 1);
    drawn.push(bag.splice(idx, 1)[0]!);
  }
  for (const v of drawn) kit.push({ ...v.entry });

  // 2 — THE LADDER: only archetypes the drawn hand can anchor.
  const tags = new Set(drawn.map((v) => v.tag));
  const anchorable = LADDERS.filter((l) => l.wants === null || tags.has(l.wants));
  const ladder = anchorable[rng.int(0, anchorable.length - 1)]!;
  const rungs = rng.chance(0.35) ? 3 : 2; // 2 gates most crowns; 3 for the long fights
  const g1 = round2(rng.range(0.55, 0.7));
  const g2 = round2(Math.max(0.2, g1 - rng.range(0.25, 0.35)));

  // The rung entries: the wanted-tag voice leads the first true rung;
  // later rungs draw strikes/zones (never the summon twice — the
  // court rises once, then the fight gets personal).
  const entryFor = (want: ForgeVoice['tag'] | null): string | undefined => {
    if (want) {
      const v = drawn.find((d) => d.tag === want);
      if (v) return v.entry.ability;
    }
    const late = drawn.find((d) => d.tag === 'zone') ?? drawn.find((d) => d.tag === 'strike');
    return late?.entry.ability ?? kit[0]!.ability;
  };
  const phaseBarks = pool.barksPhase.length > 0 ? [...pool.barksPhase] : [];
  const pickBark = (): string | undefined => {
    if (phaseBarks.length === 0) return undefined;
    return phaseBarks.splice(rng.int(0, phaseBarks.length - 1), 1)[0];
  };
  const rungNames = [...pool.phaseNames];
  const pickRungName = (): string | undefined => {
    if (rungNames.length === 0) return undefined;
    return rungNames.splice(rng.int(0, rungNames.length - 1), 1)[0];
  };
  const phases: BossPhaseDef[] = [{ name: pickRungName() }];
  phases.push({
    hpBelow: g1,
    name: pickRungName(),
    bark: pickBark(),
    entry: entryFor(ladder.wants),
    cdMult: round2(rng.range(0.8, 0.9)),
    ...(ladder.key === 'headlong' ? { speedMult: round2(rng.range(1.05, 1.15)) } : {}),
  });
  if (rungs === 3) {
    phases.push({
      hpBelow: g2,
      name: pickRungName(),
      bark: pickBark(),
      entry: entryFor(null),
      cdMult: round2(rng.range(0.65, 0.8)),
      speedMult: round2(rng.range(1.1, 1.25)),
    });
  }

  // A late voice sometimes waits for the turn — the surprise the
  // second half of the fight is allowed to keep.
  if (drawn.length > 1 && rng.chance(0.5)) {
    const lateAb = drawn[drawn.length - 1]!.entry.ability;
    const usedAsEntry = phases.some((p) => p.entry === lateAb);
    if (!usedAsEntry) {
      const k = kit.find((e) => e.ability === lateAb)!;
      k.phase = 1;
    }
  }

  // 3 — THE CHAINS: authored pairs, wired only when both stand.
  const abilitiesIn = new Set(kit.map((k) => k.ability));
  for (const [opener, follower] of pool.chains) {
    if (!abilitiesIn.has(opener) || !abilitiesIn.has(follower)) continue;
    const k = kit.find((e) => e.ability === opener)!;
    if (!k.then) k.then = follower;
  }

  // 4 — THE TEMPER: an authored weakness story, jittered in-band.
  const temper = TEMPERS[rng.int(0, TEMPERS.length - 1)]!;
  const knockbackMult = round2(rng.range(temper.kb[0], temper.kb[1]));
  const stunMult = round2(rng.range(temper.stun[0], temper.stun[1]));

  // 5 — THE PRICE: crown stats over the base body, flood-law honest.
  const maxHp = Math.round(base.maxHp * rng.range(2.1, 3.0));
  const damage = Math.round(base.damage * rng.range(1.15, 1.35));
  const xpReward = Math.round(maxHp * rng.range(XP_RATIO[0], XP_RATIO[1]));

  // 6 — THE NAME: a seat's given name is a COMPLETE identity (POI
  // pools author 'Varga Nine Teeth' whole) and is kept untouched;
  // only a pool-drawn first name gets signed with an epithet. The
  // epithet roll happens either way — the seed's stream stays
  // identical whether or not a seat named the body (LAW W3).
  const first = pool.names[rng.int(0, pool.names.length - 1)]!;
  const epithet = pool.epithets[rng.int(0, pool.epithets.length - 1)]!;
  const name = opts.name ?? `${first} ${epithet}`;
  const title = pool.titles[rng.int(0, pool.titles.length - 1)]!;

  const forged: NpcDef = {
    ...base,
    name,
    maxHp,
    damage,
    xpReward,
    respawnSec: Math.max(base.respawnSec, 120),
    loot: [...base.loot, ...pool.lootAdd.filter((t) => !base.loot.includes(t))],
    kit,
    boss: {
      title,
      phases,
      knockbackMult,
      stunMult,
      arenaR: rng.int(14, 20),
      engageBark:
        pool.barksEngage.length > 0
          ? pool.barksEngage[rng.int(0, pool.barksEngage.length - 1)]
          : undefined,
      defeatBark:
        pool.barksDefeat.length > 0
          ? pool.barksDefeat[rng.int(0, pool.barksDefeat.length - 1)]
          : undefined,
    },
  };

  // THE FORGE'S CONSCIENCE — structural asserts on its own output.
  // (The fuzz contract walks the full CMS validator; these throws
  // catch a bad pool edit at the first forged seed in any test.)
  const gates = forged.boss!.phases.slice(1).map((p) => p.hpBelow!);
  for (let i = 1; i < gates.length; i++) {
    if (!(gates[i]! < gates[i - 1]!)) throw new Error('forgeCrown: gates must descend');
  }
  for (const k of forged.kit!) {
    if (k.then && !forged.kit!.some((e) => e.ability === k.then)) {
      throw new Error(`forgeCrown: chain ${k.ability}->${k.then} lost its follower`);
    }
    if (k.then && forged.kit!.find((e) => e.ability === k.then)?.then) {
      throw new Error(`forgeCrown: chain through ${k.then} grows past one link`);
    }
    if (k.lope && !(typeof k.minRange === 'number' && k.minRange > 0)) {
      throw new Error(`forgeCrown: lope voice ${k.ability} lost its gap`);
    }
  }
  const ratio = forged.xpReward / forged.maxHp;
  if (ratio < 2.2 || ratio > 8) throw new Error('forgeCrown: flood-law ratio broken');
  if (forged.kit!.length > 10) throw new Error('forgeCrown: the crown holds ten voices at most');
  return forged;
}
