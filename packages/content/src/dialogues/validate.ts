import { ITEMS } from '../items.js';
import { NPC_ACTORS } from '../actors/registry.js';
import { parseDialogueMarkup } from './markup.js';
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

const SLUG_RE = /^[a-z][a-z0-9_]*$/;
/** Flags may reference dialogue completions: `dlg:<dialogue_id>`. */
const FLAG_RE = /^(dlg:)?[a-z][a-z0-9_]*$/;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function flagList(raw: unknown, name: string, errors: string[]): string[] | undefined {
  if (raw === undefined) return undefined;
  if (!Array.isArray(raw) || raw.length > 8) {
    errors.push(`${name} must be an array of at most 8 flags`);
    return undefined;
  }
  const out: string[] = [];
  for (const f of raw) {
    if (typeof f !== 'string' || !FLAG_RE.test(f) || f.length > 64) {
      errors.push(`${name} flag '${String(f)}' must match ^(dlg:)?[a-z][a-z0-9_]*$ (max 64 chars)`);
      continue;
    }
    out.push(f);
  }
  return out;
}

function validateHooks(raw: unknown, where: string, errors: string[]): DialogueHook[] | undefined {
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
    } else {
      errors.push(`${where}.hooks[${i}].kind must be 'flag' or 'give'`);
    }
  }
  return out;
}

function validateChoices(
  raw: unknown,
  where: string,
  errors: string[],
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
    choice.requires = flagList(c.requires, `${where}.choices[${i}].requires`, errors);
    choice.forbids = flagList(c.forbids, `${where}.choices[${i}].forbids`, errors);
    choice.set = flagList(c.set, `${where}.choices[${i}].set`, errors);
    if (choice.set?.some((f) => f.startsWith('dlg:'))) {
      errors.push(`${where}.choices[${i}].set may not write dlg: flags (completions are automatic)`);
      continue;
    }
    out.push(choice);
  }
  return out;
}

function validateNode(raw: unknown, index: number, errors: string[]): DialogueNode | undefined {
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
  node.choices = validateChoices(raw.choices, where, errors);
  if (node.next !== undefined && node.choices !== undefined) {
    errors.push(`${where} cannot have both next and choices — a beat is linear OR a question`);
  }
  node.hooks = validateHooks(raw.hooks, where, errors);
  return node;
}

/** Validate one untrusted dialogue def (parsed JSON, DB row, tool input). */
export function validateDialogue(raw: unknown): ValidateDialogueResult {
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
  const requires = flagList(raw.requires, 'requires', errors);
  const forbids = flagList(raw.forbids, 'forbids', errors);

  if (!Array.isArray(raw.nodes) || raw.nodes.length < 1 || raw.nodes.length > 64) {
    errors.push('nodes must be an array of 1..64 nodes');
    return { ok: false, errors: errors.map((e) => `${id || '<dialogue>'}: ${e}`) };
  }
  const nodes: DialogueNode[] = [];
  const nodeIds = new Set<string>();
  for (const [i, rawNode] of raw.nodes.entries()) {
    const node = validateNode(rawNode, i, errors);
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

  const bindings = validateBindings(raw.bindings, errors);

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
function validateBindings(raw: unknown, errors: string[]): DialogueBinding[] | undefined {
  if (raw === undefined) return undefined;
  if (!Array.isArray(raw) || raw.length > 8) {
    errors.push('bindings must be an array of at most 8 entries');
    return undefined;
  }
  const out: DialogueBinding[] = [];
  const seen = new Set<string>();
  for (const [i, b] of raw.entries()) {
    if (!isRecord(b)) {
      errors.push(`bindings[${i}] must be an object`);
      continue;
    }
    if (b.kind !== 'actor') {
      errors.push(`bindings[${i}].kind '${String(b.kind)}' is unknown (only 'actor' exists yet)`);
      continue;
    }
    if (typeof b.target !== 'string' || !NPC_ACTORS.has(b.target)) {
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
