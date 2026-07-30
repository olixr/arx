import type { SkillId } from '@arx/shared';

/**
 * THE QUEST LEDGER — the errands, hunts, and stories of the world.
 *
 * A quest STANDS ALONE, like a dialogue tree: the def is pure story
 * structure — who gives it, what each stage asks, what the turn-in
 * pays. It references the world by slug only (actor ids, item ids,
 * bestiary ids, zone ids) and never grows fields inside those defs
 * (the actor/archetype/placement law). The conversations that offer,
 * discuss, and close a quest are ORDINARY dialogue trees gated on the
 * synthetic `quest:` namespace (flags.ts) and carrying quest_* hooks —
 * the quest def owns the ledger, the trees own the words.
 *
 * THE DATABASE IS THE TRUTH: relational tables (server/db/quests.ts)
 * are what the game reads and what tooling edits, under the same
 * two-hash seed law as dialogues. These JSON files are the interchange
 * format — the shipped seed and the import/export envelope.
 *
 * THE GUIDANCE LAW: journal text gives written directions and lore in
 * the world's own voice — landmarks, bearings, names — never a map
 * marker. Knowing the land is the advantage; a rare stage may carry
 * `mark` where the story genuinely hands you a destination (a royal
 * summons), and that plants the ONE standard waypoint, nothing more.
 *
 * THE FLOOD LAW STANDS: `questDrops` is a separate channel rolled at
 * the kill site for each eligible participant, capped by construction
 * (a drop stops the moment your held count satisfies the objective).
 * Loot tables never learn player state; quest items carry no value.
 */

/** One thing a stage asks of the player. */
export type QuestObjective =
  /** Slay `count` of a bestiary def. Credit is participation-based. */
  | { kind: 'kill'; npc: string; count: number }
  /**
   * Hold `count` of an item. Counted LIVE from the pack — eggs you
   * already carry count — and consumed only at turn-in, so the ask is
   * honest until the moment it's paid.
   */
  | { kind: 'collect'; item: string; count: number }
  /** Chart a place: an authored zone's discovery id ('zone:<id>'). */
  | { kind: 'discover'; place: string }
  /** Address a named actor (a Talk within reach credits it). */
  | { kind: 'talk'; actor: string };

/** One leg of the story. Stages advance when every objective is met. */
export interface QuestStage {
  /** Slug, unique within the quest. */
  id: string;
  /**
   * The journal entry while this stage runs — written directions in
   * the Dawnlands' voice (VOICE.md), dialogue markup allowed.
   */
  journal: string;
  objectives: QuestObjective[];
  /**
   * RARE: plant the player's waypoint here when the stage begins —
   * only where the story literally hands over a destination.
   */
  mark?: { x: number; y: number };
}

/** Gates on offering (and on item-starts). All present parts must pass. */
export interface QuestRequires {
  /** Quest ids that must be completed at least once. */
  quests?: string[];
  /** Skill floors ("this work needs hands that have done it"). */
  skills?: { skill: SkillId; level: number }[];
  /** Story flags that must be set (plain or dlg: — never world:/quest:). */
  flags?: string[];
}

/** What the turn-in pays. */
export interface QuestRewards {
  xp?: { skill: SkillId; amount: number }[];
  items?: { item: string; qty: number }[];
  coins?: number;
  /** Story flags stamped at turn-in (plain slugs only). */
  flags?: string[];
}

/**
 * A quest-gated drop: while the quest is active and the collect
 * objective for `item` is still short, each eligible participant in a
 * kill of `npc` rolls `chance` for one. Rolled OUTSIDE the loot
 * tables, per player, at the kill site.
 */
export interface QuestDrop {
  npc: string;
  item: string;
  chance: number;
}

/** A whole quest — standalone; dialogue trees tie it to the world's mouths. */
export interface QuestDef {
  /** Unique slug: ^[a-z][a-z0-9_]*$ — filename must equal it. */
  id: string;
  /** Display name, shown in the journal and ceremonies. */
  name: string;
  /** Actor slug whose head wears the mark when this is offerable. */
  giver: string;
  /** Actor slug the finished quest is handed to; default = giver. */
  turnIn?: string;
  requires?: QuestRequires;
  /** Present = repeatable: re-offerable this many hours after turn-in. */
  repeat?: { cooldownHours: number };
  stages: QuestStage[];
  questDrops?: QuestDrop[];
  rewards: QuestRewards;
}
