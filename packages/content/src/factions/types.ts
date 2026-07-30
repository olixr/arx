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
  /** |delta| ceiling for QuestDef.rewards.standing entries. */
  questCap: number;
  /** |delta| ceiling for dialogue `standing` hooks. */
  storyCap: number;
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
}
