/**
 * FACTIONS & REPUTATION — the shapes (docs/factions-plan.md).
 *
 * A faction is a loyalty the world already pays for in dialogue: the
 * Amberford Charter, the Crown of Silverfall, the Waykeepers, Mab's
 * Rookery, the Red Company. The player carries one integer STANDING
 * per faction; gameplay never reads the number — it reads the BAND
 * (the band law). Membership references actor slugs and bestiary id
 * prefixes; NpcActorDef never grows a faction field (the actor-split
 * law, actors/types.ts).
 */

/** The seven rungs of a name, worst to best. */
export type FactionBand =
  | 'hunted'
  | 'outlaw'
  | 'suspect'
  | 'neutral'
  | 'known'
  | 'trusted'
  | 'champion';

/** One faction of the roster. */
export interface FactionDef {
  /** Slug: ^[a-z][a-z0-9_]*$. */
  id: string;
  /** Display name, shown on the Standing screen and in ledger lines. */
  name: string;
  /** One-glyph sigil hint for painters ('gate', 'crown', 'lamp', ...). */
  sigil: string;
  /** One line of what this name buys — the Standing screen's blurb. */
  blurb: string;
  /** Actor slugs who read this faction's ledger. */
  members: string[];
  /**
   * The subset that polices it — the bodies that will hunt an outlaw
   * come Phase 2. Every enforcer must be a member.
   */
  enforcers: string[];
  /** Bestiary id prefixes ('brigand' claims brigand_archer too). */
  npcPrefixes: string[];
  /**
   * Town anchors whose bounties and watch credit this faction —
   * matched by nearest-anchor at deed time. Road factions keep none.
   */
  anchors: { x: number; y: number }[];
  /**
   * Cold-shoulder barks for a closed throat (Phase 2) — the member
   * refuses to talk at outlaw and below. VOICE.md: plain speech.
   */
  refusals: string[];
  /** The actor who takes fines and restores a name (Phase 3). */
  fineActor?: string;
}

/**
 * Band thresholds. Negative rungs read value <= threshold, positive
 * rungs read value >= threshold; between suspect and known is neutral.
 */
export interface FactionBandsDef {
  hunted: number;
  outlaw: number;
  suspect: number;
  known: number;
  trusted: number;
  champion: number;
}

/**
 * The named deed values — every systemic standing move in the game is
 * one of these, applied through the server's ONE choke. Authored moves
 * (quest rewards, dialogue hooks) carry their own delta under the caps.
 */
export interface FactionDeedsDef {
  /** A posted bounty honored — the town's thanks. */
  bountyHonored: number;
  /** A road toll broken inside a town's marches. */
  tollBroken: number;
  /** First blow against a faction's enforcer (once per NPC-life). */
  assaultEnforcer: number;
  /** A faction member slain. */
  slayMember: number;
  /** A theft seen by a faction body (Phase 5) — unseen is unswayed. */
  theftWitnessed: number;
  /**
   * THE WARD DEED (contested lands, band 8): one length of the Court's
   * ward thread cut by a deliberate hand. The thread is the Court's
   * word strung across a wood; the cut is a deed against the Court,
   * chosen with a hand and not a swing (a swing passes through it),
   * and the wood re-strings it in ten minutes for everyone because
   * the world is shared. Paid to `evencourt` through the one door with
   * the cross matrix (evencourt|reavers 0.5 pays the Company above
   * outlaw). Four cuts from a clean name = outlaw, the ladder's rhythm.
   */
  wardCut: number;
  /** |delta| ceiling for QuestDef.rewards.standing entries. */
  questCap: number;
  /** |delta| ceiling for dialogue `standing` hooks. */
  storyCap: number;
}

/**
 * THE LIGHT FINGERS (Phase 5) — every crime dial in one group. The
 * roll is public arithmetic (theftChance), the witness law is a
 * radius and a sightline, and the fence list names whose counters
 * take stolen goods at all.
 */
export interface FactionTheftDef {
  /** Success chance at equal sneak and mark level. */
  base: number;
  /** Chance moved per point of (sneak level − mark level). */
  perLevel: number;
  /** Coins skimmed per lift, at most — coin is coin, never stolen. */
  coinCap: number;
  /** The mark stays wary of the same hand this long. */
  retrySec: number;
  /** Tiles within which a faction body can witness a theft. */
  witnessRadius: number;
  /** Sneak level that works a town lock — deterministic, no roll. */
  lockLevel: number;
  /** Enforcers sharpen the sneak factor by this below neutral band. */
  suspectEye: number;
  /** What a fence pays for stolen goods, of the honest sell price. */
  stolenSellMult: number;
  /** Roster ids whose members' counters accept stolen goods. */
  fences: string[];
}

/** Price multipliers by band (Phase 3); outlaw and below are refused. */
export interface FactionPricesDef {
  champion: number;
  trusted: number;
  known: number;
  neutral: number;
  suspect: number;
}

/** The whole doc — the Studio edits exactly this (kind 'factions'). */
export interface FactionsDef {
  roster: FactionDef[];
  bands: FactionBandsDef;
  deeds: FactionDeedsDef;
  /**
   * THE TWO POLES: unordered pairs 'a|b' (ids sorted) -> weight 0..1.
   * A systemic deed's delta with A applies -delta*w to B — while the
   * player still stands above outlaw with A (THE BORDER LAW: cross-pay
   * stops at the border, so grinding an enemy never farms a friend).
   * Authored deltas never cross — authors state both sides.
   */
  oppose: Record<string, number>;
  prices: FactionPricesDef;
  /**
   * The faction credited for deeds done beyond every town's marches —
   * the road belongs to somebody. Must name a roster id.
   */
  roadFaction: string;
  /** Enforcer engage circle vs outlaws, tiles (Phase 2). */
  enforcerAggro: number;
  /** Band at which a hostile faction's bodies hold their fire (Phase 2). */
  peaceBand: FactionBand;
  /** Coins per point of deficit below fineFloor (Phase 3). */
  finePerPoint: number;
  /** A paid fine restores standing to exactly this (the suspect floor). */
  fineFloor: number;
  /** Daily drift toward 0; ships at 0 — time never launders a name. */
  driftPerDay: number;
  /** The crime dials (Phase 5). */
  theft: FactionTheftDef;
}
