/**
 * DIALOGUE TREES — the conversations of the world.
 *
 * A dialogue is its own def, keyed by the ACTOR SLUG it belongs to
 * (the actor/archetype/placement law: systems attach to actors, they
 * never grow fields inside NpcActorDef). Talking to an actor picks ONE
 * eligible dialogue — the highest-priority def whose flag conditions
 * pass — so an actor's voice evolves: a one-time welcome completes and
 * a repeatable default takes its place; a befriending choice unlocks a
 * warmer tree forever.
 *
 * INTERCHANGE FORMAT: dialogues are authored as JSON files in
 * `src/dialogues/defs/*.json` — one tree per file, filename = id. The
 * same shape is what dev tools read/write and what the server syncs
 * into its relational tables (db/dialogues.ts). One validator
 * (validate.ts) guards every path.
 *
 * FLAGS are the memory between conversations: plain slugs set by
 * choices or hook effects, checked by `requires`/`forbids` on defs and
 * choices. Completing a dialogue (reaching an authored ending — never
 * walking away) sets `dlg:<id>` automatically, so any def or choice
 * can require that another conversation happened first. The flag store
 * is per-character and shared with the systems still to come — quests
 * and factions read and write the very same ledger.
 *
 * The server owns the walk: clients see only text and choice labels,
 * never node ids or conditions, and every hook fires server-side.
 */

export type DialogueSpeaker = 'npc' | 'player';

/** Set a per-character flag — the durable "this happened" bit. */
export interface DialogueHookFlag {
  kind: 'flag';
  flag: string;
}

/** Hand the player items (a welcome gift, a small reward). */
export interface DialogueHookGive {
  kind: 'give';
  item: string;
  qty: number;
}

/**
 * Node effects, executed server-side when the node is entered. This
 * union is THE open socket: quest grants, faction shifts, and shop
 * unlocks will land here as new kinds without touching the walk logic.
 */
export type DialogueHook = DialogueHookFlag | DialogueHookGive;

/** One answer the player may pick (at most 4 per node). */
export interface DialogueChoice {
  /** The player's spoken line, shown on the choice plate. */
  text: string;
  /** Node to continue to; absent = an authored farewell (completes). */
  next?: string;
  /** Flags that must all be set for this choice to appear. */
  requires?: string[];
  /** Flags that must NOT be set — one-shot choices retire themselves. */
  forbids?: string[];
  /** Flags set the moment this choice is picked. */
  set?: string[];
}

/**
 * One beat of conversation. A node is either linear (`next`), a
 * question (`choices`), or an ending (neither) — never both paths.
 */
export interface DialogueNode {
  /** Node id, unique within the dialogue. */
  id: string;
  /** Who speaks the line; default 'npc'. */
  speaker?: DialogueSpeaker;
  text: string;
  next?: string;
  choices?: DialogueChoice[];
  /** Effects fired on entering this node (server-side, in order). */
  hooks?: DialogueHook[];
}

/** A whole conversation tree, bound to one actor. */
export interface DialogueDef {
  /** Unique slug: ^[a-z][a-z0-9_]*$ — referenced by tools and flags. */
  id: string;
  /** The NpcActorDef slug this conversation belongs to. */
  actor: string;
  /** Entry node id. */
  start: string;
  /** Among eligible defs, highest priority speaks (default 0). */
  priority?: number;
  /**
   * One-time: after completion (flag `dlg:<id>`) this def is never
   * offered again — the next-priority eligible def becomes the voice.
   */
  once?: boolean;
  /** Flags that must all be set for this dialogue to be offered. */
  requires?: string[];
  /** Flags that must NOT be set. */
  forbids?: string[];
  nodes: DialogueNode[];
}

/** The completion flag a finished dialogue records. */
export function dialogueDoneFlag(id: string): string {
  return `dlg:${id}`;
}
