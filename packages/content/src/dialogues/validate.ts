import { ITEMS } from '../items.js';
import { NPC_ACTORS } from '../actors/registry.js';
import { SHOPS } from '../shop.js';
import { QUEST_FLAG_RE, isQuestFlag } from '../quests/flags.js';
import { FACTION_FLAG_RE, isFactionFlag } from '../factions/flags.js';
import { FACTIONS, factionIds } from '../factions/factions.js';
import { parseDialogueMarkup } from './markup.js';
import { WORLD_FLAGS, isWorldFlag } from './worldFlags.js';
import type {
  DialogueBinding,
  DialogueChoice,
  DialogueDef,
  DialogueHook,
  DialogueNode,
} from './types.js';

/**
 * THE ONE VALIDATOR — every path a dialogue def can travel goes
 * through here: authored JSON at registry init, DB rows reassembled at
 * server boot, and (later) dev-tool submissions. Errors are collected,
 * not thrown, so tooling can show a full report.
 */

export type ValidateDialogueResult =
  | { ok: true; dialogue: DialogueDef }
  | { ok: false; errors: string[] };

/**
 * Live cross-reference sets. The authored registries are the default;
 * a running server passes its DB-loaded actor roster so a tree may
 * bind a studio-born actor the shipped code never heard of.
 */
export interface ValidateDialogueRefs {
  actorIds?: ReadonlySet<string>;
  /**
   * Quest ids for cross-checking quest_* hooks and `quest:` flag
   * reads. The running server passes its DB-loaded roster; shipped
   * content is cross-checked in quests.test.ts instead (importing the
   * quest registry here would cycle the packages' content graph).
   */
  questIds?: ReadonlySet<string>;
  /**
   * Voice clip ids for cross-checking node `voice` refs. The running
   * server passes its DB-loaded ledger; without the set only the slug
   * grammar is checked (shipped trees may name clips that arrive by
   * Studio upload).
   */
  voiceClipIds?: ReadonlySet<string>;
}

const SLUG_RE = /^[a-z][a-z0-9_]*$/;
/**
 * Flags may reference dialogue completions (`dlg:<dialogue_id>`), the
 * synthetic world answers (`world:<name>` — the living-frontier
 * namespace, answered live at the Talk site, never stored), or the
 * synthetic quest answers (`quest:<id>:<state>` — quests/flags.ts,
 * answered live from the asking player's quest ledger).
 */
const FLAG_RE = /^(dlg:|world:)?[a-z][a-z0-9_]*$/;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function flagList(
  raw: unknown,
  name: string,
  errors: string[],
  refs?: ValidateDialogueRefs,
): string[] | undefined {
  if (raw === undefined) return undefined;
  if (!Array.isArray(raw) || raw.length > 8) {
    errors.push(`${name} must be an array of at most 8 flags`);
    return undefined;
  }
  const out: string[] = [];
  for (const f of raw) {
    if (typeof f !== 'string' || f.length > 64) {
      errors.push(`${name} flag '${String(f)}' must be a string of at most 64 chars`);
      continue;
    }
    // The quest: namespace has its own grammar — a malformed state
    // name would gate a tree out forever in silence, so it dies here.
    if (isQuestFlag(f)) {
      const m = QUEST_FLAG_RE.exec(f);
      if (!m) {
        errors.push(
          `${name} flag '${f}' must match quest:<id>:(available|active|ready|done|stage:<stage_id>)`,
        );
        continue;
      }
      if (refs?.questIds && !refs.questIds.has(m[1]!)) {
        errors.push(`${name} flag '${f}' references unknown quest '${m[1]}'`);
        continue;
      }
      out.push(f);
      continue;
    }
    // The faction: namespace has its own grammar AND a closed roster —
    // a typoed band or faction would gate a tree out forever in silence.
    if (isFactionFlag(f)) {
      const m = FACTION_FLAG_RE.exec(f);
      if (!m) {
        errors.push(
          `${name} flag '${f}' must match faction:<id>:(atleast:|atmost:)?<band>`,
        );
        continue;
      }
      if (!factionIds().includes(m[1]!)) {
        errors.push(`${name} flag '${f}' references unknown faction '${m[1]}'`);
        continue;
      }
      out.push(f);
      continue;
    }
    if (!FLAG_RE.test(f)) {
      errors.push(
        `${name} flag '${String(f)}' must match ^(dlg:|world:)?[a-z][a-z0-9_]*$ (max 64 chars)`,
      );
      continue;
    }
    // The world: namespace is a closed roster — a typo here would gate
    // a tree out forever in silence, so it dies in validation instead.
    if (isWorldFlag(f) && !WORLD_FLAGS.has(f)) {
      errors.push(`${name} flag '${f}' is not a known world answer (${[...WORLD_FLAGS].join(', ')})`);
      continue;
    }
    out.push(f);
  }
  return out;
}

function validateHooks(
  raw: unknown,
  where: string,
  errors: string[],
  refs?: ValidateDialogueRefs,
): DialogueHook[] | undefined {
  if (raw === undefined) return undefined;
  if (!Array.isArray(raw) || raw.length > 4) {
    errors.push(`${where}.hooks must be an array of at most 4 hooks`);
    return undefined;
  }
  const out: DialogueHook[] = [];
  for (const [i, h] of raw.entries()) {
    if (!isRecord(h)) {
      errors.push(`${where}.hooks[${i}] must be an object`);
      continue;
    }
    if (h.kind === 'flag') {
      // Hooks never write dlg: flags — completions are the system's to record.
      if (typeof h.flag !== 'string' || !SLUG_RE.test(h.flag) || h.flag.length > 64) {
        errors.push(`${where}.hooks[${i}].flag must match ^[a-z][a-z0-9_]*$`);
        continue;
      }
      out.push({ kind: 'flag', flag: h.flag });
    } else if (h.kind === 'give') {
      if (typeof h.item !== 'string' || !ITEMS.has(h.item)) {
        errors.push(`${where}.hooks[${i}] references unknown item '${String(h.item)}'`);
        continue;
      }
      if (typeof h.qty !== 'number' || !Number.isInteger(h.qty) || h.qty < 1 || h.qty > 1000) {
        errors.push(`${where}.hooks[${i}].qty must be an integer 1..1000`);
        continue;
      }
      out.push({ kind: 'give', item: h.item, qty: h.qty });
    } else if (h.kind === 'shop') {
      if (typeof h.shop !== 'string' || !SHOPS.has(h.shop)) {
        errors.push(`${where}.hooks[${i}] references unknown shop '${String(h.shop)}'`);
        continue;
      }
      out.push({ kind: 'shop', shop: h.shop });
    } else if (h.kind === 'bounty') {
      // Carries nothing — the world state at the moment of asking is
      // the ask (the server picks the cell, plants the waypoint).
      out.push({ kind: 'bounty' });
    } else if (h.kind === 'standing') {
      if (typeof h.faction !== 'string' || !factionIds().includes(h.faction)) {
        errors.push(`${where}.hooks[${i}] references unknown faction '${String(h.faction)}'`);
        continue;
      }
      const cap = FACTIONS.deeds.storyCap;
      if (
        typeof h.delta !== 'number' ||
        !Number.isInteger(h.delta) ||
        h.delta === 0 ||
        Math.abs(h.delta) > cap
      ) {
        errors.push(`${where}.hooks[${i}].delta must be a non-zero integer within ±${cap}`);
        continue;
      }
      out.push({ kind: 'standing', faction: h.faction, delta: h.delta });
    } else if (h.kind === 'fine') {
      if (typeof h.faction !== 'string' || !factionIds().includes(h.faction)) {
        errors.push(`${where}.hooks[${i}] references unknown faction '${String(h.faction)}'`);
        continue;
      }
      if (h.quote !== undefined && typeof h.quote !== 'boolean') {
        errors.push(`${where}.hooks[${i}].quote must be a boolean`);
        continue;
      }
      out.push({ kind: 'fine', faction: h.faction, ...(h.quote === true ? { quote: true } : {}) });
    } else if (h.kind === 'quest_offer' || h.kind === 'quest_accept' || h.kind === 'quest_turnin') {
      if (typeof h.quest !== 'string' || !SLUG_RE.test(h.quest) || h.quest.length > 48) {
        errors.push(`${where}.hooks[${i}].quest must be a quest id slug`);
        continue;
      }
      if (refs?.questIds && !refs.questIds.has(h.quest)) {
        errors.push(`${where}.hooks[${i}] references unknown quest '${h.quest}'`);
        continue;
      }
      out.push({ kind: h.kind, quest: h.quest });
    } else if (h.kind === 'keyforge') {
      // Carries nothing — the shop-hook pattern: armed on the walk,
      // the forge lights when the conversation ends well.
      out.push({ kind: 'keyforge' });
    } else {
      errors.push(
        `${where}.hooks[${i}].kind must be 'flag', 'give', 'shop', 'bounty', 'standing', 'fine', 'quest_offer', 'quest_accept', 'quest_turnin', or 'keyforge'`,
      );
    }
  }
  return out;
}

function validateChoices(
  raw: unknown,
  where: string,
  errors: string[],
  refs?: ValidateDialogueRefs,
): DialogueChoice[] | undefined {
  if (raw === undefined) return undefined;
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > 4) {
    errors.push(`${where}.choices must be an array of 1..4 choices`);
    return undefined;
  }
  const out: DialogueChoice[] = [];
  for (const [i, c] of raw.entries()) {
    if (!isRecord(c) || typeof c.text !== 'string' || c.text.length === 0 || c.text.length > 90) {
      errors.push(`${where}.choices[${i}].text must be a non-empty string of at most 90 chars`);
      continue;
    }
    const choice: DialogueChoice = { text: c.text };
    if (c.next !== undefined) {
      if (typeof c.next !== 'string') {
        errors.push(`${where}.choices[${i}].next must be a node id string`);
        continue;
      }
      choice.next = c.next;
    }
    choice.requires = flagList(c.requires, `${where}.choices[${i}].requires`, errors, refs);
    choice.forbids = flagList(c.forbids, `${where}.choices[${i}].forbids`, errors, refs);
    choice.set = flagList(c.set, `${where}.choices[${i}].set`, errors, refs);
    if (choice.set?.some((f) => f.startsWith('dlg:'))) {
      errors.push(`${where}.choices[${i}].set may not write dlg: flags (completions are automatic)`);
      continue;
    }
    if (choice.set?.some((f) => isWorldFlag(f))) {
      errors.push(`${where}.choices[${i}].set may not write world: flags (the world answers, nobody writes it)`);
      continue;
    }
    if (choice.set?.some((f) => isQuestFlag(f))) {
      errors.push(`${where}.choices[${i}].set may not write quest: flags (the ledger answers, nobody writes it)`);
      continue;
    }
    if (choice.set?.some((f) => isFactionFlag(f))) {
      errors.push(`${where}.choices[${i}].set may not write faction: flags (deeds write standing, the bands answer)`);
      continue;
    }
    out.push(choice);
  }
  return out;
}

function validateNode(
  raw: unknown,
  index: number,
  errors: string[],
  refs?: ValidateDialogueRefs,
): DialogueNode | undefined {
  const where = `nodes[${index}]`;
  if (!isRecord(raw)) {
    errors.push(`${where} must be an object`);
    return undefined;
  }
  const id = typeof raw.id === 'string' ? raw.id : '';
  if (!SLUG_RE.test(id) || id.length > 48) {
    errors.push(`${where}.id '${String(raw.id)}' must match ^[a-z][a-z0-9_]*$ (max 48 chars)`);
    return undefined;
  }
  const node: DialogueNode = { id, text: '' };
  if (raw.speaker !== undefined) {
    if (raw.speaker !== 'npc' && raw.speaker !== 'player') {
      errors.push(`${where}.speaker must be 'npc' or 'player'`);
    } else {
      node.speaker = raw.speaker;
    }
  }
  if (typeof raw.text !== 'string' || raw.text.length === 0 || raw.text.length > 480) {
    errors.push(`${where}.text must be a non-empty string of at most 480 chars`);
  } else {
    node.text = raw.text;
    // The one markup parser rules here too: an unbalanced span or a
    // ghost item never survives to a player's screen.
    const parsed = parseDialogueMarkup(raw.text);
    for (const e of parsed.errors) errors.push(`${where}.text: ${e}`);
    for (const tok of parsed.tokens) {
      if (tok.kind === 'item' && !ITEMS.has(tok.item)) {
        errors.push(`${where}.text: {item:${tok.item}} references an unknown item`);
      }
    }
  }
  if (raw.next !== undefined) {
    if (typeof raw.next !== 'string') errors.push(`${where}.next must be a node id string`);
    else node.next = raw.next;
  }
  node.choices = validateChoices(raw.choices, where, errors, refs);
  if (node.next !== undefined && node.choices !== undefined) {
    errors.push(`${where} cannot have both next and choices — a beat is linear OR a question`);
  }
  node.hooks = validateHooks(raw.hooks, where, errors, refs);
  if (raw.voice !== undefined) {
    if (typeof raw.voice !== 'string' || !SLUG_RE.test(raw.voice) || raw.voice.length > 48) {
      errors.push(`${where}.voice must be a voice clip slug`);
    } else if (refs?.voiceClipIds && !refs.voiceClipIds.has(raw.voice)) {
      errors.push(`${where}.voice names unknown clip '${raw.voice}'`);
    } else {
      node.voice = raw.voice;
    }
  }
  if (raw.mood !== undefined) {
    if (raw.mood !== 'yes' && raw.mood !== 'no' && raw.mood !== 'hm') {
      errors.push(`${where}.mood must be 'yes', 'no', or 'hm'`);
    } else {
      node.mood = raw.mood;
    }
  }
  return node;
}

/** Validate one untrusted dialogue def (parsed JSON, DB row, tool input). */
export function validateDialogue(raw: unknown, refs?: ValidateDialogueRefs): ValidateDialogueResult {
  const errors: string[] = [];
  if (!isRecord(raw)) return { ok: false, errors: ['dialogue def must be an object'] };

  const id = typeof raw.id === 'string' ? raw.id : '';
  if (!SLUG_RE.test(id) || id.length > 48) {
    errors.push(`id '${String(raw.id)}' must match ^[a-z][a-z0-9_]*$ (max 48 chars)`);
  }
  let once: boolean | undefined;
  if (raw.once !== undefined) {
    if (typeof raw.once !== 'boolean') errors.push('once must be a boolean');
    else once = raw.once;
  }
  const requires = flagList(raw.requires, 'requires', errors, refs);
  const forbids = flagList(raw.forbids, 'forbids', errors, refs);

  if (!Array.isArray(raw.nodes) || raw.nodes.length < 1 || raw.nodes.length > 64) {
    errors.push('nodes must be an array of 1..64 nodes');
    return { ok: false, errors: errors.map((e) => `${id || '<dialogue>'}: ${e}`) };
  }
  const nodes: DialogueNode[] = [];
  const nodeIds = new Set<string>();
  for (const [i, rawNode] of raw.nodes.entries()) {
    const node = validateNode(rawNode, i, errors, refs);
    if (!node) continue;
    if (nodeIds.has(node.id)) errors.push(`nodes[${i}]: duplicate node id '${node.id}'`);
    nodeIds.add(node.id);
    nodes.push(node);
  }

  // Graph integrity: every reference lands, every node is reachable.
  const start = typeof raw.start === 'string' ? raw.start : '';
  if (!nodeIds.has(start)) errors.push(`start '${String(raw.start)}' is not a node id`);
  for (const node of nodes) {
    if (node.next !== undefined && !nodeIds.has(node.next)) {
      errors.push(`node '${node.id}' continues to unknown node '${node.next}'`);
    }
    for (const [i, c] of (node.choices ?? []).entries()) {
      if (c.next !== undefined && !nodeIds.has(c.next)) {
        errors.push(`node '${node.id}' choice[${i}] continues to unknown node '${c.next}'`);
      }
    }
  }
  if (nodeIds.has(start)) {
    const reached = new Set<string>([start]);
    const queue = [start];
    const byId = new Map(nodes.map((n) => [n.id, n]));
    while (queue.length > 0) {
      const node = byId.get(queue.pop()!)!;
      const outs = [node.next, ...(node.choices ?? []).map((c) => c.next)];
      for (const out of outs) {
        if (out !== undefined && byId.has(out) && !reached.has(out)) {
          reached.add(out);
          queue.push(out);
        }
      }
    }
    for (const node of nodes) {
      if (!reached.has(node.id)) errors.push(`node '${node.id}' is unreachable from start`);
    }
  }

  const bindings = validateBindings(raw.bindings, errors, refs);

  if (errors.length > 0) return { ok: false, errors: errors.map((e) => `${id || '<dialogue>'}: ${e}`) };
  return {
    ok: true,
    dialogue: { id, start, once, requires, forbids, nodes, bindings },
  };
}

/**
 * The association layer: where in the world this tree is offered.
 * 'actor' is the only kind today; each future kind (prop, item,
 * monolith…) adds one namespace check here and nothing anywhere else.
 */
function validateBindings(
  raw: unknown,
  errors: string[],
  refs?: ValidateDialogueRefs,
): DialogueBinding[] | undefined {
  if (raw === undefined) return undefined;
  if (!Array.isArray(raw) || raw.length > 8) {
    errors.push('bindings must be an array of at most 8 entries');
    return undefined;
  }
  const out: DialogueBinding[] = [];
  const seen = new Set<string>();
  const knownActor = (id: string): boolean =>
    refs?.actorIds ? refs.actorIds.has(id) : NPC_ACTORS.has(id);
  for (const [i, b] of raw.entries()) {
    if (!isRecord(b)) {
      errors.push(`bindings[${i}] must be an object`);
      continue;
    }
    if (b.kind !== 'actor') {
      errors.push(`bindings[${i}].kind '${String(b.kind)}' is unknown (only 'actor' exists yet)`);
      continue;
    }
    if (typeof b.target !== 'string' || !knownActor(b.target)) {
      errors.push(`bindings[${i}] references unknown actor '${String(b.target)}'`);
      continue;
    }
    const key = `${b.kind}:${b.target}`;
    if (seen.has(key)) {
      errors.push(`bindings[${i}] duplicates ${key}`);
      continue;
    }
    seen.add(key);
    const binding: DialogueBinding = { kind: 'actor', target: b.target };
    if (b.priority !== undefined) {
      if (typeof b.priority !== 'number' || !Number.isInteger(b.priority) || Math.abs(b.priority) > 1000) {
        errors.push(`bindings[${i}].priority must be an integer -1000..1000`);
        continue;
      }
      binding.priority = b.priority;
    }
    out.push(binding);
  }
  return out;
}
