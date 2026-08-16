/**
 * DIALOGUE TREES — the conversations of the world.
 *
 * A dialogue STANDS ALONE: the tree is pure conversation, and a
 * separate BINDINGS list is the only thing tying it to the world —
 * "this tree is offered by actor old_maren", tomorrow "by the sealed
 * door", "by the strange monolith". The same tree can bind to many
 * targets, a target can offer many trees, and re-wiring who says what
 * is a data change, never a content rewrite. (This is the dialogue
 * system's copy of the actor/archetype/placement law.)
 *
 * THE DATABASE IS THE TRUTH: the relational tables (server/db) are
 * what the game reads and what internal tooling edits. These JSON
 * files are the interchange format — the seed shipped with the game
 * and the import/export envelope for moving content around. The sync
 * respects tool edits: a row the tooling has touched is never
 * clobbered by a JSON re-seed (see db/dialogues.ts).
 *
 * Selection: interacting with a bound target picks ONE eligible
 * dialogue — highest binding priority whose flag conditions pass — so
 * a voice evolves: a one-time welcome completes and a repeatable
 * default takes its place; a befriending choice unlocks a warmer tree
 * forever.
 *
 * FLAGS are the memory between conversations: plain slugs set by
 * choices or hook effects, checked by `requires`/`forbids` on defs and
 * choices. Completing a dialogue (reaching an authored ending — never
 * walking away) sets `dlg:<id>` automatically, so any def or choice
 * can require that another conversation happened first. The flag store
 * is per-character and shared with the systems still to come — quests
 * and factions read and write the very same ledger.
 *
 * SPOKEN TEXT carries light markup (see markup.ts): *word* speaks
 * with warm emphasis, _word_ lands cold and foreboding, {item:bread}
 * sets the item itself — icon and name — into the sentence. One
 * parser serves the validator and the client's typewriter.
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
 * Open the named shop when this conversation ENDS WELL (terminal node
 * reached or a farewell picked — never on Esc or an interrupt): the
 * trader says "have a look" and the shelf appears as the frame drops.
 * This is how a shopkeeper keeps both a voice and a counter — the
 * dialogue outranks the shop on interact, so the shop rides a hook.
 */
export interface DialogueHookShop {
  kind: 'shop';
  shop: string;
}

/**
 * THE KEYWRIGHT'S BENCH: open the key ledger with the forge lit when
 * this conversation ENDS WELL (the shop-hook law: terminal node or a
 * farewell, never Esc or an interrupt). Carries nothing — the ledger
 * is the player's own; the hook only lights the forge over it.
 */
export interface DialogueHookKeyForge {
  kind: 'keyforge';
}

/**
 * THE ASK MADE CONCRETE (living-frontier Phase 3.2): the speaker points
 * the player at the nearest standing trouble within their watch. The
 * server picks the offending cell, plants the player's waypoint at its
 * anchor, stamps a per-character `bounty:<cell>` flag, and answers in
 * the speaker's voice with a bearing. Breaking that camp pays the
 * bounty and lifts the flag — the site standing pays NOTHING, ever.
 * Carries no data: the world state at the moment of asking is the ask.
 */
export interface DialogueHookBounty {
  kind: 'bounty';
}

/**
 * Stage the quest's offer chip on this beat: the cinema shows the
 * quest's name, ask, and pay beside the line (the gifts pattern), so
 * the player reads what they're agreeing to BEFORE the choice plates.
 * Pure presentation — accepting is the quest_accept hook's job.
 */
export interface DialogueHookQuestOffer {
  kind: 'quest_offer';
  quest: string;
}

/**
 * Accept the quest: the server opens the ledger entry, stamps the
 * journal, and fires the accepted ceremony. Guarded — a no-op unless
 * `quest:<id>:available` answers true at that moment, so a stale
 * choice plate can never double-accept or jump a gate.
 */
export interface DialogueHookQuestAccept {
  kind: 'quest_accept';
  quest: string;
}

/**
 * Close the quest: verify every objective live, take the collected
 * items, pay the rewards, and mark it done (repeatables start their
 * cooldown). Guarded — a no-op unless `quest:<id>:ready` holds.
 */
export interface DialogueHookQuestTurnin {
  kind: 'quest_turnin';
  quest: string;
}

/**
 * An authored standing shift (docs/factions-plan.md Phase 1): the
 * story's own hand on the ledger — a betrayal confided, a favor done
 * off the books. Rides the server's ONE standing choke; the delta is
 * capped by the doc's storyCap. Authored deltas never auto-pay the
 * opposition matrix — an author states both sides explicitly.
 */
export interface DialogueHookStanding {
  kind: 'standing';
  faction: string;
  delta: number;
}

/**
 * THE ROAD BACK (docs/factions-plan.md Phase 3): the fine counter.
 * With `quote: true` the server answers what clearing the player's
 * name with `faction` would cost, in the quiet quartermaster's voice.
 * Without it, the server takes the coins and restores standing to
 * exactly the doc's fineFloor through the ONE door — you buy back the
 * courtroom, never the hearts. Both forms no-op politely when the
 * name needs no buying or the purse is short; the arithmetic lives in
 * the live doc (finePerPoint × deficit below fineFloor).
 */
export interface DialogueHookFine {
  kind: 'fine';
  faction: string;
  quote?: boolean;
}

/**
 * THE SAND AND THE ROAR: raise the venue's stakes board when this
 * conversation ENDS WELL (the shop-hook law: terminal node or a
 * farewell, never Esc or an interrupt). The ringmaster keeps both a
 * voice and a counter — the talk explains the ring, the good ending
 * shows the card. The venue id names an ArenaVenueDef in the arena
 * live doc; the server validates the claim at raise time.
 */
export interface DialogueHookArena {
  kind: 'arena';
  venue: string;
}

/**
 * Node effects, executed server-side when the node is entered. This
 * union is THE open socket: quest grants, faction shifts, and shop
 * unlocks land here as new kinds without touching the walk logic.
 */
export type DialogueHook =
  | DialogueHookFlag
  | DialogueHookGive
  | DialogueHookShop
  | DialogueHookBounty
  | DialogueHookStanding
  | DialogueHookFine
  | DialogueHookQuestOffer
  | DialogueHookQuestAccept
  | DialogueHookQuestTurnin
  | DialogueHookKeyForge
  | DialogueHookArena;

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
  /**
   * THE SPOKEN LINE (voiceover-plan Phase 3): a VoiceClipDef id — the
   * full recorded read of this beat. The server resolves it to a URL
   * at the beat door; a missing clip degrades to the silent beat
   * (SILENCE IS VALID), never an error at a player.
   */
  voice?: string;
  /**
   * THE MOOD MARK (Phase 6): this beat is an affirmation ('yes'), a
   * refusal ('no'), or a hesitation ('hm') — when it has no full
   * line, the speaker's bank draws that slot instead of a rationed
   * ack. Authored intent: marked beats always speak if the slot can.
   */
  mood?: 'yes' | 'no' | 'hm';
}

/**
 * One place in the world a dialogue is offered. `kind` is the open
 * axis: 'actor' today; props, items, and world objects join as new
 * kinds without touching the tree format — the target column is just
 * a slug in that kind's namespace.
 */
export interface DialogueBinding {
  kind: 'actor';
  /** Slug in the kind's namespace (NpcActorDef.id for 'actor'). */
  target: string;
  /** Among a target's eligible dialogues, highest priority speaks (default 0). */
  priority?: number;
}

/** A whole conversation tree — standalone; bindings tie it to the world. */
export interface DialogueDef {
  /** Unique slug: ^[a-z][a-z0-9_]*$ — referenced by tools and flags. */
  id: string;
  /** Entry node id. */
  start: string;
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
  /**
   * Where this conversation is offered. A tree may ship unbound (a
   * tool will wire it later) — it simply never fires until bound.
   */
  bindings?: DialogueBinding[];
}

/** The completion flag a finished dialogue records. */
export function dialogueDoneFlag(id: string): string {
  return `dlg:${id}`;
}
