import {
  FACTION_BAND_ORDER,
  SHOPS,
  bandAtLeast,
  dialogueDoneFlag,
  dialogueEligible,
  isFactionFlag,
  parseDialogueMarkup,
  parseFactionFlag,
  pickDialogue,
  stripDialogueMarkup,
  validateDialogue,
  type DialogueChoice,
  type DialogueDef,
  type DialogueHook,
  type DialogueNode,
  type FactionBand,
  type NpcActorDef,
} from '@arx/content';
import { itemIconUrl } from '../render/icons.js';
import { iconImg } from '../editor/editorIcons.js';
import { markDirty, persistence, setSection, state, toast, zoneAt } from './cms.js';
import { actorBust } from './portraits.js';
import { audition } from './voiceEditor.js';
import { combobox, el, pill, type ComboOption } from './widgets.js';

/**
 * The Dialogue Studio — the conversation bench of the Content Studio.
 *
 * A tree is shown three ways at once, all live views of ONE draft:
 *   THE MAP    a laid-out flow graph — every beat a card, every next a
 *              brass line, every choice a steel line (gated ones dash),
 *              so the whole shape of a conversation reads at a glance;
 *   THE BEATS  editable cards in authored order — text with live
 *              markup preview, flow (continues / asks / ends), gates,
 *              and hooks, drag-to-reorder;
 *   REHEARSAL  the tree PLAYED, against a scratch flag ledger you can
 *              toggle freely — gates open and close in front of you,
 *              gifts and flags land in a log, and the voice ladder
 *              shows which tree each bound actor would actually speak.
 *
 * Every edit revalidates through the one validator (with the LIVE
 * actor roster), and the health strip never lets an unsound tree hide
 * it. Save lands in the DB and hot-swaps the running registry — the
 * next Talk in the world speaks the edit.
 */

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

/** The highest-priority bound actor — whose throat the tree speaks with. */
function boundActorOf(def: DialogueDef): string | null {
  const bindings = (def.bindings ?? []).slice().sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  return bindings[0]?.target ?? null;
}

/**
 * The Studio's mirror of THE ONE RESOLVER: what a beat would sound
 * like live — the node's full line, else the bound throat's moment
 * slot (greet on the first beat, farewell on a terminal one, ack
 * between). Used by the beat cards' fallback pill and by rehearsal.
 */
function rehearseVoice(
  def: DialogueDef,
  node: DialogueNode,
  first: boolean,
): { url: string; what: string } | null {
  const v = state.voice;
  if (!v) return null;
  if (node.voice !== undefined) {
    const clip = v.clips.find((c) => c.def.id === node.voice);
    return clip ? { url: clip.url, what: `line '${clip.def.id}'` } : null;
  }
  if ((node.speaker ?? 'npc') === 'player') return null;
  const actor = boundActorOf(def);
  if (!actor) return null;
  const bank = v.banks.find((b) => b.owner.kind === 'actor' && b.owner.id === actor);
  const last = node.next === undefined && (node.choices ?? []).length === 0;
  const slot = first ? 'greet' : last ? 'farewell' : 'ack';
  const entries = (bank?.slots[slot] ?? []).filter((e) => e.clip);
  if (entries.length === 0) return null;
  const total = entries.reduce((a, e) => a + (e.weight ?? 1), 0);
  let mark = Math.random() * total;
  let picked = entries[entries.length - 1]!;
  for (const e of entries) {
    mark -= e.weight ?? 1;
    if (mark < 0) {
      picked = e;
      break;
    }
  }
  const clip = v.clips.find((c) => c.def.id === picked.clip);
  return clip ? { url: clip.url, what: `${slot} quip '${clip.def.id}'` } : null;
}
const SLUG_RE = /^[a-z][a-z0-9_]*$/;
// Mirrors content's grammar: plain/dlg:/world: slugs, quest: states,
// and faction: band gates (the server validator is the final word).
const FLAG_RE =
  /^(?:(dlg:|world:)?[a-z][a-z0-9_]*|quest:[a-z][a-z0-9_]*:(?:available|active|ready|done|stage:[a-z][a-z0-9_]*)|faction:[a-z][a-z0-9_]*:(?:(?:atleast|atmost):)?(?:hunted|outlaw|suspect|neutral|known|trusted|champion))$/;

/** Per-dialogue UI memory that survives rebuilds within a session. */
const selByDlg = new Map<string, string>();
const rehearsalFlagsByDlg = new Map<string, Set<string>>();
const bustUrlCache = new Map<string, string | null>();
/**
 * THE STANDING SIMULATOR (factions Phase 6): the band the rehearsal
 * walks in with, per faction — one simulated identity across every
 * tree (a name spans conversations), absent = neutral. faction: gates
 * answer from HERE, never from the scratch ledger, mirroring the live
 * server's synthetic namespaces: rehearse a tree as an outlaw without
 * becoming one.
 */
const rehearsalStanding = new Map<string, FactionBand>();

export function newDialogueDef(id: string): DialogueDef {
  return {
    id,
    start: 'greeting',
    nodes: [
      {
        id: 'greeting',
        text: 'Well met, traveler.',
        choices: [
          { text: 'Who are you?', next: 'about' },
          { text: 'Farewell.' },
        ],
      },
      {
        id: 'about',
        text: 'A voice the studio drafted — give me a name and a story.',
      },
    ],
  };
}

// -------------------------------------------------------- option pools

function actorBustUrl(def: NpcActorDef): string | null {
  const cached = bustUrlCache.get(def.id);
  if (cached !== undefined) return cached;
  const bust = def.model.kind === 'humanoid' ? actorBust(def, 24) : null;
  const url = bust ? bust.toDataURL() : null;
  bustUrlCache.set(def.id, url);
  return url;
}

function actorOptions(): ComboOption[] {
  return state.actors
    .slice()
    .sort((a, b) => a.def.name.localeCompare(b.def.name))
    .map((a) => ({
      id: a.def.id,
      label: a.def.name,
      sub: a.def.title ?? a.def.id,
      icon: actorBustUrl(a.def) ?? undefined,
    }));
}

function itemOptions(): ComboOption[] {
  return state.items
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((i) => ({ id: i.id, label: i.name, sub: i.id, icon: itemIconUrl(i.id, 22) }));
}

function shopOptions(): ComboOption[] {
  return [...SHOPS.values()].map((s) => ({
    id: s.id,
    label: s.name,
    sub: `${s.stock.length} wares`,
  }));
}

// ------------------------------------------------------ flag universe

interface FlagUse {
  /** Dialogue ids whose gates read this flag (requires/forbids). */
  readBy: Set<string>;
  /** Dialogue ids that write it (choice set / flag hooks / completion). */
  writtenBy: Set<string>;
}

/** Every flag the world's dialogues speak of, with who reads/writes it. */
function flagUniverse(draft?: DialogueDef): Map<string, FlagUse> {
  const uses = new Map<string, FlagUse>();
  const use = (flag: string): FlagUse => {
    let u = uses.get(flag);
    if (!u) {
      u = { readBy: new Set(), writtenBy: new Set() };
      uses.set(flag, u);
    }
    return u;
  };
  const defs = state.dialogues.map((d) => (draft && d.def.id === draft.id ? draft : d.def));
  if (draft && !defs.some((d) => d.id === draft.id)) defs.push(draft);
  for (const def of defs) {
    use(dialogueDoneFlag(def.id)).writtenBy.add(def.id);
    for (const f of def.requires ?? []) use(f).readBy.add(def.id);
    for (const f of def.forbids ?? []) use(f).readBy.add(def.id);
    for (const n of def.nodes) {
      for (const h of n.hooks ?? []) if (h.kind === 'flag') use(h.flag).writtenBy.add(def.id);
      for (const c of n.choices ?? []) {
        for (const f of c.requires ?? []) use(f).readBy.add(def.id);
        for (const f of c.forbids ?? []) use(f).readBy.add(def.id);
        for (const f of c.set ?? []) use(f).writtenBy.add(def.id);
      }
    }
  }
  return uses;
}

// ------------------------------------------------------ markup preview

/** Paint a spoken line the way the cinema reads it — one shared parser. */
function markupPreview(text: string): HTMLElement {
  const box = el('div', 'mk-preview');
  const parsed = parseDialogueMarkup(text);
  for (const tok of parsed.tokens) {
    if (tok.kind === 'text') box.appendChild(document.createTextNode(tok.text));
    else if (tok.kind === 'em') box.appendChild(el('span', 'mk-em', tok.text));
    else if (tok.kind === 'grim') box.appendChild(el('span', 'mk-grim', tok.text));
    else {
      const chip = el('span', 'mk-item');
      const img = document.createElement('img');
      img.src = itemIconUrl(tok.item, 18);
      img.width = 18;
      img.height = 18;
      chip.appendChild(img);
      const known = state.items.find((i) => i.id === tok.item);
      chip.appendChild(el('b', '', known?.name ?? tok.item));
      if (!known) chip.classList.add('ghost');
      box.appendChild(chip);
    }
  }
  if (parsed.errors.length > 0) {
    for (const err of parsed.errors) box.appendChild(el('span', 'mk-err', ` ⚠ ${err}`));
  }
  return box;
}

// ------------------------------------------------------ the flow graph

const CARD_W = 204;
const CARD_H = 100;
const GAP_X = 92;
const GAP_Y = 18;
const PAD = 16;

interface GraphPos {
  x: number;
  y: number;
  depth: number;
}

/** Layered layout: BFS depth = column, discovery order = row. */
function layoutGraph(def: DialogueDef): Map<string, GraphPos> {
  const byId = new Map(def.nodes.map((n) => [n.id, n]));
  const depth = new Map<string, number>();
  if (byId.has(def.start)) {
    depth.set(def.start, 0);
    const queue = [def.start];
    while (queue.length > 0) {
      const nid = queue.shift()!;
      const node = byId.get(nid)!;
      const d = depth.get(nid)!;
      const outs = [node.next, ...(node.choices ?? []).map((c) => c.next)];
      for (const out of outs) {
        if (out !== undefined && byId.has(out) && !depth.has(out)) {
          depth.set(out, d + 1);
          queue.push(out);
        }
      }
    }
  }
  // Orphans park past the deepest reachable column, plainly visible.
  const maxDepth = Math.max(0, ...depth.values());
  for (const n of def.nodes) if (!depth.has(n.id)) depth.set(n.id, maxDepth + 1);

  const rows = new Map<number, number>();
  const pos = new Map<string, GraphPos>();
  for (const n of def.nodes) {
    const d = depth.get(n.id)!;
    const row = rows.get(d) ?? 0;
    rows.set(d, row + 1);
    pos.set(n.id, {
      x: PAD + d * (CARD_W + GAP_X),
      y: PAD + row * (CARD_H + GAP_Y),
      depth: d,
    });
  }
  return pos;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

function edgePath(
  svg: SVGElement,
  from: GraphPos,
  to: GraphPos,
  kind: 'linear' | 'choice',
  gated: boolean,
  label: string,
): void {
  const sx = from.x + CARD_W;
  const sy = from.y + CARD_H / 2;
  const tx = to.x;
  const ty = to.y + CARD_H / 2;
  const path = document.createElementNS(SVG_NS, 'path');
  let d: string;
  if (to.x > from.x) {
    const bend = Math.min(64, (tx - sx) * 0.6);
    d = `M ${sx} ${sy} C ${sx + bend} ${sy}, ${tx - bend} ${ty}, ${tx} ${ty}`;
  } else {
    // A back edge (hub loop): swoop under both cards so it reads as a return.
    const dip = Math.max(sy, ty) + CARD_H * 0.75;
    d = `M ${sx} ${sy} C ${sx + 70} ${dip}, ${tx - 70} ${dip}, ${tx} ${ty}`;
  }
  path.setAttribute('d', d);
  path.setAttribute('class', `edge-${kind}${gated ? ' edge-gated' : ''}`);
  path.setAttribute('marker-end', `url(#arr-${kind})`);
  if (label) {
    const title = document.createElementNS(SVG_NS, 'title');
    title.textContent = label;
    path.appendChild(title);
  }
  svg.appendChild(path);
  if (label && kind === 'choice' && to.x > from.x) {
    const text = document.createElementNS(SVG_NS, 'text');
    text.setAttribute('x', String(sx + 10));
    text.setAttribute('y', String(sy + (ty - sy) * 0.22 - 5));
    text.setAttribute('class', 'edge-label');
    text.textContent = label.length > 20 ? `${label.slice(0, 19)}…` : label;
    svg.appendChild(text);
  }
}

/** The conversation, laid out — cards and flow lines, click to edit. */
function buildGraph(
  def: DialogueDef,
  npcName: string,
  selId: string | null,
  onPick: (nodeId: string) => void,
): HTMLElement {
  const wrap = el('div', 'dlg-map');
  const pos = layoutGraph(def);
  let w = 0;
  let h = 0;
  for (const p of pos.values()) {
    w = Math.max(w, p.x + CARD_W + PAD);
    h = Math.max(h, p.y + CARD_H + PAD + 26);
  }
  const canvas = el('div', 'dlg-canvas');
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;

  const svg = document.createElementNS(SVG_NS, 'svg') as SVGElement;
  svg.setAttribute('class', 'dlg-svg');
  svg.setAttribute('width', String(w));
  svg.setAttribute('height', String(h));
  const defs = document.createElementNS(SVG_NS, 'defs');
  for (const [id, cls] of [
    ['arr-linear', 'arr-linear'],
    ['arr-choice', 'arr-choice'],
  ] as const) {
    const marker = document.createElementNS(SVG_NS, 'marker');
    marker.setAttribute('id', id);
    marker.setAttribute('viewBox', '0 0 10 10');
    marker.setAttribute('refX', '8');
    marker.setAttribute('refY', '5');
    marker.setAttribute('markerWidth', '7');
    marker.setAttribute('markerHeight', '7');
    marker.setAttribute('orient', 'auto-start-reverse');
    const tip = document.createElementNS(SVG_NS, 'path');
    tip.setAttribute('d', 'M 0 0 L 10 5 L 0 10 z');
    tip.setAttribute('class', cls);
    marker.appendChild(tip);
    defs.appendChild(marker);
  }
  svg.appendChild(defs);

  const reachable = new Set<string>();
  {
    const byId = new Map(def.nodes.map((n) => [n.id, n]));
    if (byId.has(def.start)) {
      reachable.add(def.start);
      const queue = [def.start];
      while (queue.length > 0) {
        const node = byId.get(queue.shift()!)!;
        for (const out of [node.next, ...(node.choices ?? []).map((c) => c.next)]) {
          if (out !== undefined && byId.has(out) && !reachable.has(out)) {
            reachable.add(out);
            queue.push(out);
          }
        }
      }
    }
  }

  for (const node of def.nodes) {
    const from = pos.get(node.id)!;
    if (node.next !== undefined && pos.has(node.next)) {
      edgePath(svg, from, pos.get(node.next)!, 'linear', false, 'continues');
    }
    for (const c of node.choices ?? []) {
      if (c.next !== undefined && pos.has(c.next)) {
        const gated = (c.requires?.length ?? 0) + (c.forbids?.length ?? 0) > 0;
        edgePath(svg, from, pos.get(c.next)!, 'choice', gated, c.text);
      }
    }
  }
  canvas.appendChild(svg);

  for (const node of def.nodes) {
    const p = pos.get(node.id)!;
    const speaker = node.speaker ?? 'npc';
    const isEnd = node.next === undefined && (node.choices?.length ?? 0) === 0;
    const card = el(
      'button',
      'beat-node' +
        (speaker === 'player' ? ' player' : '') +
        (node.id === selId ? ' sel' : '') +
        (!reachable.has(node.id) ? ' orphan' : ''),
    ) as HTMLButtonElement;
    card.type = 'button';
    card.style.left = `${p.x}px`;
    card.style.top = `${p.y}px`;
    const head = el('div', 'bn-head');
    head.appendChild(el('span', 'bn-speaker', speaker === 'player' ? 'You' : npcName));
    head.appendChild(el('span', 'bn-id', node.id));
    card.appendChild(head);
    card.appendChild(el('div', 'bn-text', stripDialogueMarkup(node.text)));
    const foot = el('div', 'bn-foot');
    if (node.id === def.start) foot.appendChild(el('span', 'bn-chip start', 'start'));
    if (!reachable.has(node.id)) foot.appendChild(el('span', 'bn-chip bad', 'unreachable'));
    const farewells = (node.choices ?? []).filter((c) => c.next === undefined).length;
    if (node.choices?.length) foot.appendChild(el('span', 'bn-chip ask', `${node.choices.length} choices`));
    if (isEnd) foot.appendChild(el('span', 'bn-chip end', 'ends'));
    else if (farewells > 0) foot.appendChild(el('span', 'bn-chip end', `${farewells} farewell${farewells === 1 ? '' : 's'}`));
    for (const hook of node.hooks ?? []) {
      foot.appendChild(
        el('span', `bn-chip hook-${hook.kind}`, hook.kind === 'give' ? 'gift' : hook.kind),
      );
    }
    card.appendChild(foot);
    card.onclick = () => onPick(node.id);
    canvas.appendChild(card);
  }

  wrap.appendChild(canvas);
  return wrap;
}

// ---------------------------------------------------- flag chip editor

/** Chips + an add box (with the whole flag universe as suggestions). */
function flagChips(
  kindClass: string,
  get: () => string[] | undefined,
  set: (flags: string[] | undefined) => void,
  onEdit: () => void,
  allowDlg = true,
): HTMLElement {
  const wrap = el('div', 'flag-chips');
  const render = (): void => {
    wrap.innerHTML = '';
    for (const [i, f] of (get() ?? []).entries()) {
      const chip = el('span', `flag-chip ${kindClass}`);
      chip.appendChild(el('b', '', f));
      const x = el('button', 'chip-x', '×') as HTMLButtonElement;
      x.type = 'button';
      x.title = 'remove';
      x.onclick = () => {
        const list = (get() ?? []).slice();
        list.splice(i, 1);
        set(list.length > 0 ? list : undefined);
        markDirty();
        render();
        onEdit();
      };
      chip.appendChild(x);
      wrap.appendChild(chip);
    }
    const add = document.createElement('input');
    add.className = 'flag-add';
    add.placeholder = '+ flag';
    add.setAttribute('list', 'dlg-flag-universe');
    const commit = (): void => {
      const f = add.value.trim();
      if (!f) return;
      if (!FLAG_RE.test(f) || (!allowDlg && f.startsWith('dlg:'))) {
        toast(
          allowDlg
            ? 'flags are lowercase slugs, optionally dlg:-prefixed'
            : 'set-flags are plain lowercase slugs (dlg: completions are automatic)',
          3600,
          'error',
        );
        return;
      }
      const list = (get() ?? []).slice();
      if (list.includes(f)) return;
      if (list.length >= 8) {
        toast('at most 8 flags per gate', 3000, 'error');
        return;
      }
      list.push(f);
      set(list);
      add.value = '';
      markDirty();
      render();
      onEdit();
    };
    add.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        commit();
      }
    });
    add.addEventListener('change', commit);
    wrap.appendChild(add);
  };
  render();
  return wrap;
}

// -------------------------------------------------------- main detail

export function dialogueDetail(body: HTMLElement, linkage: HTMLElement, id: string): void {
  const entry = state.dialogues.find((d) => d.def.id === id);
  if (!entry) return;
  const draft = clone(entry.def);
  const actorIds = (): Set<string> => new Set(state.actors.map((a) => a.def.id));

  // Restore per-dialogue UI memory.
  let sel = selByDlg.get(id) ?? draft.start;
  let scratch = rehearsalFlagsByDlg.get(id);
  if (!scratch) {
    scratch = new Set();
    rehearsalFlagsByDlg.set(id, scratch);
  }
  const flags = scratch;

  /** Choices stashed when a beat flips to linear, restored on flip back. */
  const choiceStash = new Map<string, DialogueChoice[]>();

  // Rehearsal walk.
  let rhNodeId: string | null = null;
  let rhLog: Array<{ text: string; cls: string; icon?: string }> = [];

  const save = (): void => {
    const res = validateDialogue(draft, { actorIds: actorIds() });
    if (!res.ok) {
      toast(`cannot save — ${res.errors[0]}`, 5200, 'error');
      return;
    }
    void persistence.saveDialogueDef(res.dialogue).catch((err: Error) => toast(err.message, 5200, 'error'));
  };

  const rebuild = (): void => {
    body.innerHTML = '';
    linkage.innerHTML = '';
    build();
  };

  const primarySpeaker = (): NpcActorDef | null => {
    const bindings = (draft.bindings ?? [])
      .slice()
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
    for (const b of bindings) {
      const actor = state.actors.find((a) => a.def.id === b.target);
      if (actor) return actor.def;
    }
    return null;
  };
  const npcName = (): string => primarySpeaker()?.name ?? 'Them';

  const freeNodeId = (): string => {
    let n = draft.nodes.length + 1;
    while (draft.nodes.some((x) => x.id === `beat_${n}`)) n++;
    return `beat_${n}`;
  };

  const addNode = (afterIdx?: number): DialogueNode => {
    const node: DialogueNode = { id: freeNodeId(), text: '…' };
    if (afterIdx === undefined) draft.nodes.push(node);
    else draft.nodes.splice(afterIdx + 1, 0, node);
    markDirty();
    return node;
  };

  const renameNode = (from: string, to: string): void => {
    if (draft.start === from) draft.start = to;
    for (const n of draft.nodes) {
      if (n.next === from) n.next = to;
      for (const c of n.choices ?? []) if (c.next === from) c.next = to;
    }
  };

  // ------------------------------------------------- light refreshers

  let healthBox: HTMLElement;
  let graphHost: HTMLElement;
  let flagList: HTMLDataListElement;

  const renderFlagUniverse = (): void => {
    flagList.innerHTML = '';
    const seen = new Set<string>();
    for (const flag of [...flagUniverse(draft).keys()].sort()) {
      seen.add(flag);
      const opt = document.createElement('option');
      opt.value = flag;
      flagList.appendChild(opt);
    }
    // THE POLITICAL GATES (factions Phase 6): the chips authors
    // actually write, offered for every roster name even before any
    // tree uses them — the roster is live (Studio edits included).
    for (const f of state.factions?.def.roster ?? []) {
      for (const gate of [
        `faction:${f.id}:atleast:known`,
        `faction:${f.id}:atleast:trusted`,
        `faction:${f.id}:atleast:champion`,
        `faction:${f.id}:atmost:suspect`,
        `faction:${f.id}:atmost:outlaw`,
      ]) {
        if (seen.has(gate)) continue;
        const opt = document.createElement('option');
        opt.value = gate;
        flagList.appendChild(opt);
      }
    }
  };

  const renderHealth = (): void => {
    healthBox.innerHTML = '';
    const res = validateDialogue(draft, { actorIds: actorIds() });
    if (res.ok) {
      healthBox.className = 'dlg-health ok';
      const ends = draft.nodes.filter(
        (n) => (n.next === undefined && (n.choices?.length ?? 0) === 0) ||
          (n.choices ?? []).some((c) => c.next === undefined),
      ).length;
      healthBox.textContent = `Sound tree — ${draft.nodes.length} beats, every one reachable, ${ends} authored ending${ends === 1 ? '' : 's'}.`;
    } else {
      healthBox.className = 'dlg-health bad';
      healthBox.appendChild(el('b', '', `${res.errors.length} problem${res.errors.length === 1 ? '' : 's'} to settle before this can save:`));
      const ul = el('ul', 'dlg-issues');
      for (const err of res.errors.slice(0, 6)) ul.appendChild(el('li', '', err));
      if (res.errors.length > 6) ul.appendChild(el('li', 'muted', `…and ${res.errors.length - 6} more`));
      healthBox.appendChild(ul);
    }
  };

  const pickBeat = (nodeId: string): void => {
    sel = nodeId;
    selByDlg.set(id, nodeId);
    renderGraph();
    const card = body.querySelector(`[data-beat='${nodeId}']`);
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      card.classList.add('flash');
      window.setTimeout(() => card.classList.remove('flash'), 900);
    }
  };

  const renderGraph = (): void => {
    const scroll = { x: graphHost.firstElementChild?.scrollLeft ?? 0, y: graphHost.firstElementChild?.scrollTop ?? 0 };
    graphHost.innerHTML = '';
    const graph = buildGraph(draft, npcName(), sel, pickBeat);
    graphHost.appendChild(graph);
    graph.scrollLeft = scroll.x;
    graph.scrollTop = scroll.y;
  };

  const refreshLight = (): void => {
    renderHealth();
    renderGraph();
    renderFlagUniverse();
  };

  // ------------------------------------------------------- rehearsal

  let rhBox: HTMLElement;

  const rhHas = (f: string): boolean => {
    if (isFactionFlag(f)) {
      const p = parseFactionFlag(f);
      if (p) {
        const band = rehearsalStanding.get(p.faction) ?? 'neutral';
        if (p.cmp === 'exact') return band === p.band;
        if (p.cmp === 'atleast') return bandAtLeast(band, p.band);
        return bandAtLeast(p.band, band);
      }
    }
    return flags.has(f);
  };

  const rhEnter = (nodeId: string, first = false): void => {
    rhNodeId = nodeId;
    const node = draft.nodes.find((n) => n.id === nodeId);
    // REHEARSAL SPEAKS (voiceover Phase 5): the beat plays exactly
    // what the live resolver would — the full line, else the bound
    // throat's moment slot (unrationed here: an audition wants to
    // hear every moment, not roll dice).
    if (node) {
      const wire = rehearseVoice(draft, node, first);
      if (wire) {
        audition(wire.url);
        rhLog.push({ text: `voice: ${wire.what}`, cls: 'flag' });
      }
    }
    for (const hook of node?.hooks ?? []) {
      if (hook.kind === 'flag') {
        if (!flags.has(hook.flag)) rhLog.push({ text: `flag set: ${hook.flag}`, cls: 'flag' });
        flags.add(hook.flag);
      } else if (hook.kind === 'give') {
        const name = state.items.find((i) => i.id === hook.item)?.name ?? hook.item;
        rhLog.push({ text: `given ${name} × ${hook.qty}`, cls: 'gift', icon: hook.item });
      } else if (hook.kind === 'shop') {
        rhLog.push({ text: `arms shop '${hook.shop}' — opens on a good ending`, cls: 'shop' });
      } else {
        rhLog.push({
          text: 'bounty posted — waypoint planted at the offending camp, paid when it breaks',
          cls: 'flag',
        });
      }
    }
  };

  const rhComplete = (): void => {
    const done = dialogueDoneFlag(draft.id);
    if (!flags.has(done)) rhLog.push({ text: `completed — ${done} recorded`, cls: 'flag' });
    flags.add(done);
    rhNodeId = null;
  };

  const rhStart = (): void => {
    rhLog = [];
    rhEnter(draft.start, true);
    renderRehearsal();
  };

  const renderRehearsal = (): void => {
    rhBox.innerHTML = '';

    // The scratch ledger: every flag this tree touches, toggleable.
    const uses = flagUniverse(draft);
    const mine = new Set<string>();
    const collect = (list?: string[]): void => list?.forEach((f) => mine.add(f));
    collect(draft.requires);
    collect(draft.forbids);
    for (const n of draft.nodes) {
      for (const h of n.hooks ?? []) if (h.kind === 'flag') mine.add(h.flag);
      for (const c of n.choices ?? []) {
        collect(c.requires);
        collect(c.forbids);
        collect(c.set);
      }
    }
    mine.add(dialogueDoneFlag(draft.id));
    for (const f of flags) mine.add(f);

    const chipFor = (f: string): HTMLButtonElement => {
      const on = flags.has(f);
      const chip = el('button', 'flag-chip toggle' + (on ? ' on' : ''), f) as HTMLButtonElement;
      chip.type = 'button';
      const u = uses.get(f);
      chip.title =
        `${on ? 'set — click to clear' : 'unset — click to set'}` +
        (u ? ` · read by ${u.readBy.size || 'none'}, written by ${u.writtenBy.size || 'none'}` : '');
      chip.onclick = () => {
        if (on) flags.delete(f);
        else flags.add(f);
        renderRehearsal();
        renderLinkage();
      };
      return chip;
    };
    // The world answers rehearse in their own tray: toggling one
    // SIMULATES the frontier around the speaker — in the live game the
    // server answers these and nobody writes them.
    const worldMine = [...mine].filter((f) => f.startsWith('world:')).sort();
    const tray = el('div', 'rh-tray');
    tray.appendChild(el('span', 'rh-tray-label', 'the scratch ledger'));
    for (const f of [...mine].sort()) {
      if (f.startsWith('world:') || isFactionFlag(f)) continue;
      tray.appendChild(chipFor(f));
    }
    if (flags.size > 0) {
      const clear = el('button', 'mini', 'clear ledger') as HTMLButtonElement;
      clear.onclick = () => {
        flags.clear();
        renderRehearsal();
        renderLinkage();
      };
      tray.appendChild(clear);
    }
    rhBox.appendChild(tray);
    if (worldMine.length > 0) {
      const wtray = el('div', 'rh-tray world');
      wtray.appendChild(el('span', 'rh-tray-label', 'the world answers (simulated)'));
      for (const f of worldMine) wtray.appendChild(chipFor(f));
      rhBox.appendChild(wtray);
    }
    // THE STANDING SIMULATOR (factions Phase 6): every faction this
    // tree gates on gets a band dial — the gates answer from the dial,
    // never the scratch ledger, so you rehearse as an outlaw without
    // becoming one. One simulated name across all trees.
    const factionMine = new Set<string>();
    for (const f of mine) {
      if (!isFactionFlag(f)) continue;
      const p = parseFactionFlag(f);
      if (p) factionMine.add(p.faction);
    }
    if (factionMine.size > 0) {
      const stray = el('div', 'rh-tray standing');
      stray.appendChild(el('span', 'rh-tray-label', 'the name you carry (simulated)'));
      for (const fid of [...factionMine].sort()) {
        const wrap = el('span', 'rh-standing');
        const fname = state.factions?.def.roster.find((r) => r.id === fid)?.name ?? fid;
        wrap.appendChild(el('span', 'rh-standing-name', fname));
        const bandSel = document.createElement('select');
        bandSel.className = 'rh-band';
        for (const b of FACTION_BAND_ORDER) {
          const o = document.createElement('option');
          o.value = b;
          o.textContent = b;
          if ((rehearsalStanding.get(fid) ?? 'neutral') === b) o.selected = true;
          bandSel.appendChild(o);
        }
        bandSel.onchange = () => {
          rehearsalStanding.set(fid, bandSel.value as FactionBand);
          renderRehearsal();
          renderLinkage();
        };
        wrap.appendChild(bandSel);
        stray.appendChild(wrap);
      }
      rhBox.appendChild(stray);
    }

    // Would this tree even be offered?
    if (!dialogueEligible(draft, rhHas)) {
      const missing = (draft.requires ?? []).filter((f) => !rhHas(f));
      const blocking = (draft.forbids ?? []).filter((f) => rhHas(f));
      const why =
        draft.once && flags.has(dialogueDoneFlag(draft.id))
          ? `it is one-time and ${dialogueDoneFlag(draft.id)} is set`
          : missing.length > 0
            ? `requires ${missing.join(', ')}`
            : `forbidden by ${blocking.join(', ')}`;
      rhBox.appendChild(
        el('p', 'rh-gate-note', `Under this ledger the tree would NOT be offered — ${why}. Rehearsing it anyway.`),
      );
    }

    const stage = el('div', 'rh-stage');
    if (rhNodeId === null) {
      const openBtn = el('button', 'primary', rhLog.length > 0 ? 'Rehearse again' : 'Rehearse this conversation') as HTMLButtonElement;
      openBtn.onclick = rhStart;
      stage.appendChild(openBtn);
    } else {
      const node = draft.nodes.find((n) => n.id === rhNodeId);
      if (!node) {
        rhNodeId = null;
        stage.appendChild(el('p', 'muted empty', 'The beat being rehearsed was removed — restart.'));
      } else {
        const speaker = node.speaker ?? 'npc';
        const banner = el('div', 'rh-banner' + (speaker === 'player' ? ' player' : ''));
        banner.appendChild(el('b', '', speaker === 'player' ? 'You' : npcName()));
        banner.appendChild(el('span', '', node.id));
        stage.appendChild(banner);
        const sheet = el('div', 'rh-sheet');
        sheet.appendChild(markupPreview(node.text));
        stage.appendChild(sheet);

        const plates = el('div', 'rh-plates');
        if (node.choices && node.choices.length > 0) {
          for (const [ci, c] of node.choices.entries()) {
            const missing = (c.requires ?? []).filter((f) => !rhHas(f));
            const blocking = (c.forbids ?? []).filter((f) => rhHas(f));
            const locked = missing.length > 0 || blocking.length > 0;
            const plate = el('button', 'rh-plate' + (locked ? ' locked' : '')) as HTMLButtonElement;
            plate.type = 'button';
            plate.appendChild(el('span', 'rh-plate-n', String(ci + 1)));
            plate.appendChild(el('span', '', c.text));
            if (locked) {
              plate.appendChild(
                el(
                  'span',
                  'rh-lock',
                  missing.length > 0 ? `needs ${missing.join(', ')}` : `blocked by ${blocking.join(', ')}`,
                ),
              );
            }
            if (c.next === undefined) plate.appendChild(el('span', 'rh-fare', 'farewell'));
            plate.disabled = locked;
            plate.onclick = () => {
              for (const f of c.set ?? []) {
                if (!flags.has(f)) rhLog.push({ text: `flag set: ${f}`, cls: 'flag' });
                flags.add(f);
              }
              rhLog.push({ text: `you: “${stripDialogueMarkup(c.text)}”`, cls: 'you' });
              if (c.next === undefined) rhComplete();
              else rhEnter(c.next);
              renderRehearsal();
              renderLinkage();
            };
            plates.appendChild(plate);
          }
        } else if (node.next !== undefined) {
          const next = node.next;
          const cont = el('button', '', 'Continue ▸') as HTMLButtonElement;
          cont.onclick = () => {
            rhEnter(next);
            renderRehearsal();
            renderLinkage();
          };
          plates.appendChild(cont);
        } else {
          const fin = el('button', 'primary', 'The conversation completes') as HTMLButtonElement;
          fin.onclick = () => {
            rhComplete();
            renderRehearsal();
            renderLinkage();
          };
          plates.appendChild(fin);
        }
        const restart = el('button', 'mini', 'Restart') as HTMLButtonElement;
        restart.onclick = rhStart;
        plates.appendChild(restart);
        stage.appendChild(plates);
      }
    }
    rhBox.appendChild(stage);

    if (rhLog.length > 0) {
      const log = el('div', 'rh-log');
      for (const line of rhLog.slice(-8)) {
        const chip = el('span', `rh-chip ${line.cls}`);
        if (line.icon) {
          const img = document.createElement('img');
          img.src = itemIconUrl(line.icon, 18);
          img.width = 18;
          img.height = 18;
          chip.appendChild(img);
        }
        chip.append(line.text);
        log.appendChild(chip);
      }
      rhBox.appendChild(log);
    }
  };

  // --------------------------------------------------------- linkage

  const renderLinkage = (): void => {
    linkage.innerHTML = '';

    const bindings = draft.bindings ?? [];
    const head = el('div', 'panel-head');
    head.appendChild(iconImg('actor', 15));
    head.append(' Offered by');
    head.appendChild(el('span', 'count', String(bindings.length)));
    linkage.appendChild(head);
    if (bindings.length === 0) {
      linkage.appendChild(
        el('p', 'muted empty', 'Unbound — this tree exists but no one in the world offers it yet.'),
      );
    }
    for (const b of bindings) {
      const actor = state.actors.find((a) => a.def.id === b.target);
      const row = document.createElement('button');
      row.className = 'link-row';
      const url = actor ? actorBustUrl(actor.def) : null;
      if (url) {
        const img = document.createElement('img');
        img.className = 'ico';
        img.src = url;
        row.appendChild(img);
      }
      row.appendChild(el('b', '', actor?.def.name ?? b.target));
      const post = state.sites.actors.find((s) => s.actor === b.target);
      const where = post ? zoneAt(post.x, post.y)?.name ?? `${post.x},${post.y}` : 'unposted';
      row.appendChild(el('span', '', `${where} · priority ${b.priority ?? 0}`));
      row.onclick = () => setSection('actors', b.target);
      linkage.appendChild(row);
    }

    // THE VOICE LADDER — for each bound actor, every tree they offer,
    // ranked; the one the scratch ledger would actually pick is crowned.
    for (const b of bindings) {
      const actor = state.actors.find((a) => a.def.id === b.target);
      const offers: Array<{ def: DialogueDef; priority: number }> = [];
      for (const d of state.dialogues) {
        const def = d.def.id === draft.id ? draft : d.def;
        for (const ob of def.bindings ?? []) {
          if (ob.kind === 'actor' && ob.target === b.target) {
            offers.push({ def, priority: ob.priority ?? 0 });
          }
        }
      }
      offers.sort((x, y) => y.priority - x.priority || x.def.id.localeCompare(y.def.id));
      const spoken = pickDialogue(offers, rhHas);
      const lhead = el('div', 'panel-head');
      lhead.appendChild(iconImg('speech', 15));
      lhead.append(` ${actor?.def.name ?? b.target}'s voices`);
      linkage.appendChild(lhead);
      for (const o of offers) {
        const speaks = spoken?.id === o.def.id;
        const eligible = dialogueEligible(o.def, rhHas);
        const row = document.createElement(o.def.id === draft.id ? 'div' : 'button');
        row.className = 'link-row ladder-row' + (speaks ? ' speaks' : '') + (eligible ? '' : ' dimmed');
        row.appendChild(el('b', '', o.def.id + (o.def.id === draft.id ? ' (this)' : '')));
        row.appendChild(
          el(
            'span',
            '',
            `p${o.priority}${o.def.once ? ' · once' : ''} · ${speaks ? 'SPEAKS under the ledger' : eligible ? 'eligible' : 'gated out'}`,
          ),
        );
        if (o.def.id !== draft.id) {
          (row as HTMLButtonElement).onclick = () => setSection('dialogues', o.def.id);
        }
        linkage.appendChild(row);
      }
    }

    // Flags in play — with every other tree that reads or writes them.
    const uses = flagUniverse(draft);
    const involved = [...uses.entries()].filter(
      ([, u]) => u.readBy.has(draft.id) || u.writtenBy.has(draft.id),
    );
    if (involved.length > 0) {
      const fhead = el('div', 'panel-head');
      fhead.appendChild(iconImg('flag', 15));
      fhead.append(' Flags in play');
      fhead.appendChild(el('span', 'count', String(involved.length)));
      linkage.appendChild(fhead);
      for (const [flag, u] of involved.sort((a, b) => a[0].localeCompare(b[0]))) {
        const others = new Set([...u.readBy, ...u.writtenBy]);
        others.delete(draft.id);
        const row = el('div', 'link-row flag-row');
        const chip = el('b', '', flag);
        row.appendChild(chip);
        const reads = u.readBy.has(draft.id) ? 'read' : '';
        const writes = u.writtenBy.has(draft.id) ? 'written' : '';
        row.appendChild(
          el('span', '', `${[reads, writes].filter(Boolean).join(' + ')} here${others.size > 0 ? ` · also: ${[...others].join(', ')}` : ' · only here'}`),
        );
        if (others.size > 0) {
          const jump = el('button', 'mini', 'open') as HTMLButtonElement;
          jump.title = `open ${[...others][0]}`;
          jump.onclick = () => setSection('dialogues', [...others][0]!);
          row.appendChild(jump);
        }
        linkage.appendChild(row);
      }
    }

    // Gifts and wares this conversation hands over.
    const gifts: Array<{ item: string; qty: number }> = [];
    const shops: string[] = [];
    for (const n of draft.nodes) {
      for (const h of n.hooks ?? []) {
        if (h.kind === 'give') gifts.push({ item: h.item, qty: h.qty });
        else if (h.kind === 'shop' && !shops.includes(h.shop)) shops.push(h.shop);
      }
    }
    if (gifts.length > 0 || shops.length > 0) {
      const ghead = el('div', 'panel-head');
      ghead.appendChild(iconImg('picker', 15));
      ghead.append(' Gifts & wares');
      linkage.appendChild(ghead);
      for (const g of gifts) {
        const item = state.items.find((i) => i.id === g.item);
        const row = document.createElement('button');
        row.className = 'link-row';
        const img = document.createElement('img');
        img.className = 'ico';
        img.src = itemIconUrl(g.item, 26);
        row.appendChild(img);
        row.appendChild(el('b', '', item?.name ?? g.item));
        row.appendChild(el('span', '', `× ${g.qty} · gifted on entry`));
        row.onclick = () => setSection('items', g.item);
        linkage.appendChild(row);
      }
      for (const s of shops) {
        const row = el('div', 'link-row');
        row.appendChild(el('b', '', SHOPS.get(s)?.name ?? s));
        row.appendChild(el('span', '', 'shop — opens on a good ending'));
        linkage.appendChild(row);
      }
    }
  };

  // ------------------------------------------------------ beat cards

  const hookEditor = (node: DialogueNode): HTMLElement => {
    const box = el('div', 'hook-box');
    const hooks = node.hooks ?? [];
    for (const [hi, hook] of hooks.entries()) {
      const row = el('div', `hook-row ${hook.kind}`);
      if (hook.kind === 'flag') {
        row.appendChild(el('span', 'hook-kind', 'sets flag'));
        const input = document.createElement('input');
        input.value = hook.flag;
        input.className = 'flag-add wide';
        input.setAttribute('list', 'dlg-flag-universe');
        input.onchange = () => {
          const v = input.value.trim();
          if (!SLUG_RE.test(v)) {
            toast('hook flags are plain lowercase slugs', 3200, 'error');
            input.value = hook.flag;
            return;
          }
          hook.flag = v;
          markDirty();
          refreshLight();
        };
        row.appendChild(input);
      } else if (hook.kind === 'give') {
        row.appendChild(el('span', 'hook-kind', 'gives'));
        row.appendChild(
          combobox(itemOptions, hook.item, (v) => {
            hook.item = v;
            markDirty();
            refreshLight();
          }),
        );
        const qty = document.createElement('input');
        qty.type = 'number';
        qty.min = '1';
        qty.max = '1000';
        qty.value = String(hook.qty);
        qty.title = 'quantity';
        qty.oninput = () => {
          hook.qty = Math.max(1, Math.min(1000, Number(qty.value) || 1));
          markDirty();
          refreshLight();
        };
        row.appendChild(qty);
      } else if (hook.kind === 'shop') {
        row.appendChild(el('span', 'hook-kind', 'opens shop'));
        row.appendChild(
          combobox(shopOptions, hook.shop, (v) => {
            hook.shop = v;
            markDirty();
            refreshLight();
          }),
        );
        row.appendChild(el('span', 'muted', 'on a good ending'));
      } else {
        row.appendChild(el('span', 'hook-kind', 'posts bounty'));
        row.appendChild(
          el('span', 'muted', 'points at the nearest standing trouble within the watch'),
        );
      }
      const del = el('button', 'mini danger', '×') as HTMLButtonElement;
      del.title = 'remove hook';
      del.onclick = () => {
        hooks.splice(hi, 1);
        node.hooks = hooks.length > 0 ? hooks : undefined;
        markDirty();
        rebuild();
      };
      row.appendChild(del);
      box.appendChild(row);
    }
    if (hooks.length < 4) {
      const adds = el('div', 'hook-adds');
      const mk = (label: string, title: string, make: () => DialogueHook): void => {
        const b = el('button', 'mini', label) as HTMLButtonElement;
        b.title = title;
        b.onclick = () => {
          node.hooks = [...hooks, make()];
          markDirty();
          rebuild();
        };
        adds.appendChild(b);
      };
      mk('+ flag', 'set a per-character flag the moment this beat is spoken', () => ({
        kind: 'flag',
        flag: 'my_flag',
      }));
      mk('+ gift', 'hand the player items on this beat', () => ({
        kind: 'give',
        item: state.items[0]?.id ?? 'coins',
        qty: 1,
      }));
      mk('+ shop', 'open a shop when the conversation ends well', () => ({
        kind: 'shop',
        shop: [...SHOPS.keys()][0] ?? '',
      }));
      mk(
        '+ bounty',
        'plant the waypoint at the nearest standing camp and stamp the bounty (pays when it breaks)',
        () => ({ kind: 'bounty' }),
      );
      box.appendChild(adds);
    }
    return box;
  };

  const nodeTargetOptions = (): ComboOption[] =>
    draft.nodes.map((n) => ({
      id: n.id,
      label: n.id,
      sub: stripDialogueMarkup(n.text).slice(0, 42),
    }));

  const choiceEditor = (node: DialogueNode): HTMLElement => {
    const box = el('div', 'choice-list');
    const choices = node.choices ?? [];
    for (const [ci, c] of choices.entries()) {
      const row = el('div', 'choice-row');
      row.draggable = true;
      row.addEventListener('dragstart', (ev) => {
        ev.stopPropagation();
        ev.dataTransfer?.setData('text/plain', `choice:${node.id}:${ci}`);
        row.classList.add('dragging');
      });
      row.addEventListener('dragend', () => row.classList.remove('dragging'));
      row.addEventListener('dragover', (ev) => {
        if (!ev.dataTransfer?.types.includes('text/plain')) return;
        ev.preventDefault();
        ev.stopPropagation();
        row.classList.add('drop-here');
      });
      row.addEventListener('dragleave', () => row.classList.remove('drop-here'));
      row.addEventListener('drop', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        row.classList.remove('drop-here');
        const data = ev.dataTransfer?.getData('text/plain') ?? '';
        const m = /^choice:([^:]+):(\d+)$/.exec(data);
        if (!m || m[1] !== node.id) return;
        const from = Number(m[2]);
        if (from === ci) return;
        const [moved] = choices.splice(from, 1);
        choices.splice(ci, 0, moved!);
        markDirty();
        rebuild();
      });

      const grip = el('span', 'beat-grip', '⠿');
      grip.title = 'drag to reorder';
      row.appendChild(grip);

      const main = el('div', 'choice-main');
      const textRow = el('div', 'choice-text-row');
      const input = document.createElement('input');
      input.value = c.text;
      input.maxLength = 90;
      input.placeholder = 'the player’s spoken line…';
      input.oninput = () => {
        c.text = input.value;
        markDirty();
        refreshLight();
      };
      textRow.appendChild(input);
      textRow.appendChild(el('span', 'choice-arrow', '→'));
      textRow.appendChild(
        combobox(
          () =>
            [
              { id: '', label: 'farewell — completes', sub: 'ends the talk well' } as ComboOption,
              { id: '+new', label: '+ new beat', sub: 'continue into a fresh beat' },
            ].concat(nodeTargetOptions()),
          c.next ?? '',
          (v) => {
            if (v === '+new') {
              const fresh = addNode(draft.nodes.indexOf(node));
              c.next = fresh.id;
              rebuild();
              pickBeat(fresh.id);
              return;
            }
            if (v === '') delete c.next;
            else c.next = v;
            markDirty();
            rebuild();
          },
          'farewell — completes',
        ),
      );
      main.appendChild(textRow);

      const gates = el('div', 'choice-gates');
      const gate = (label: string, cls: string, get: () => string[] | undefined, set: (v: string[] | undefined) => void, allowDlg = true): void => {
        const block = el('div', 'gate-block');
        block.appendChild(el('span', 'gate-label', label));
        block.appendChild(flagChips(cls, get, set, refreshLight, allowDlg));
        gates.appendChild(block);
      };
      gate('shown if', 'req', () => c.requires, (v) => (c.requires = v));
      gate('hidden if', 'forb', () => c.forbids, (v) => (c.forbids = v));
      gate('picking sets', 'sets', () => c.set, (v) => (c.set = v), false);
      main.appendChild(gates);
      row.appendChild(main);

      const del = el('button', 'mini danger', '×') as HTMLButtonElement;
      del.title = 'remove this choice';
      del.onclick = () => {
        choices.splice(ci, 1);
        node.choices = choices.length > 0 ? choices : undefined;
        markDirty();
        rebuild();
      };
      row.appendChild(del);
      box.appendChild(row);
    }
    if (choices.length < 4) {
      const add = el('button', 'mini', '+ choice') as HTMLButtonElement;
      add.onclick = () => {
        node.choices = [...choices, { text: 'Very well.' }];
        markDirty();
        rebuild();
      };
      box.appendChild(add);
    }
    return box;
  };

  const beatCard = (node: DialogueNode, idx: number): HTMLElement => {
    const card = el('div', 'beat-card');
    card.dataset.beat = node.id;
    card.draggable = true;
    card.addEventListener('dragstart', (ev) => {
      ev.dataTransfer?.setData('text/plain', `beat:${idx}`);
      card.classList.add('dragging');
    });
    card.addEventListener('dragend', () => card.classList.remove('dragging'));
    card.addEventListener('dragover', (ev) => {
      ev.preventDefault();
      card.classList.add('drop-here');
    });
    card.addEventListener('dragleave', () => card.classList.remove('drop-here'));
    card.addEventListener('drop', (ev) => {
      ev.preventDefault();
      card.classList.remove('drop-here');
      const m = /^beat:(\d+)$/.exec(ev.dataTransfer?.getData('text/plain') ?? '');
      if (!m) return;
      const from = Number(m[1]);
      if (from === idx) return;
      const [moved] = draft.nodes.splice(from, 1);
      draft.nodes.splice(idx, 0, moved!);
      markDirty();
      rebuild();
    });

    // ---- head: grip · speaker · id · role chips · delete
    const head = el('div', 'beat-head');
    const grip = el('span', 'beat-grip', '⠿');
    grip.title = 'drag to reorder the authored list (flow is unchanged)';
    head.appendChild(grip);

    const speaker = node.speaker ?? 'npc';
    const seg = el('div', 'seg-row mini-seg');
    for (const [v, label, tip] of [
      ['npc', npcName(), 'spoken by the bound actor'],
      ['player', 'You', 'spoken by the player — an iron-tray beat in the cinema'],
    ] as const) {
      const b = el('button', 'opt-btn' + (speaker === v ? ' active' : ''), label) as HTMLButtonElement;
      b.title = tip;
      b.onclick = () => {
        if (v === 'npc') delete node.speaker;
        else node.speaker = 'player';
        markDirty();
        rebuild();
      };
      seg.appendChild(b);
    }
    head.appendChild(seg);

    const idIn = document.createElement('input');
    idIn.className = 'beat-id';
    idIn.value = node.id;
    idIn.title = 'beat id — references retarget automatically on rename';
    idIn.onchange = () => {
      const v = idIn.value.trim();
      const old = node.id;
      if (v === old) return;
      if (!SLUG_RE.test(v) || v.length > 48) {
        toast('beat ids are lowercase slugs (max 48 chars)', 3600, 'error');
        idIn.value = old;
        return;
      }
      if (draft.nodes.some((n) => n !== node && n.id === v)) {
        toast(`a beat named '${v}' already exists`, 3600, 'error');
        idIn.value = old;
        return;
      }
      renameNode(old, v);
      node.id = v;
      if (sel === old) {
        sel = v;
        selByDlg.set(id, v);
      }
      markDirty();
      rebuild();
    };
    head.appendChild(idIn);

    if (node.id === draft.start) head.appendChild(el('span', 'bn-chip start', 'start'));
    else {
      const mk = el('button', 'mini ghosted', 'make start') as HTMLButtonElement;
      mk.title = 'the conversation opens on this beat';
      mk.onclick = () => {
        draft.start = node.id;
        markDirty();
        rebuild();
      };
      head.appendChild(mk);
    }

    const del = el('button', 'mini danger beat-del') as HTMLButtonElement;
    del.appendChild(iconImg('trash', 14));
    del.title = 'remove this beat (references to it become dangling until re-aimed)';
    del.disabled = draft.nodes.length <= 1;
    del.onclick = () => {
      if (!window.confirm(`Remove beat '${node.id}'?`)) return;
      draft.nodes.splice(draft.nodes.indexOf(node), 1);
      for (const n of draft.nodes) {
        if (n.next === node.id) delete n.next;
        for (const c of n.choices ?? []) if (c.next === node.id) delete c.next;
      }
      if (draft.start === node.id) draft.start = draft.nodes[0]!.id;
      markDirty();
      rebuild();
    };
    head.appendChild(del);
    card.appendChild(head);

    // ---- the spoken line with its live preview
    const ta = document.createElement('textarea');
    ta.className = 'beat-text';
    ta.value = node.text;
    ta.rows = 2;
    ta.maxLength = 480;
    ta.placeholder = 'the spoken line — *warm emphasis*, _grim weight_, {item:bread}';
    const previewHost = el('div', 'beat-preview-host');
    previewHost.appendChild(markupPreview(node.text));
    const count = el('span', 'mk-count', `${node.text.length}/480`);
    ta.oninput = () => {
      node.text = ta.value;
      count.textContent = `${ta.value.length}/480`;
      previewHost.innerHTML = '';
      previewHost.appendChild(markupPreview(ta.value));
      markDirty();
      refreshLight();
    };
    card.appendChild(ta);
    const pvRow = el('div', 'beat-pv-row');
    pvRow.appendChild(previewHost);
    pvRow.appendChild(count);
    card.appendChild(pvRow);

    // ---- the recording (voiceover Phase 5): a full line, or the
    // fallback pill showing what the throat would do on this beat.
    if (state.voice) {
      const vRow = el('div', 'beat-voice-row');
      vRow.appendChild(el('span', 'beat-voice-label', '🎙'));
      const boundActor = boundActorOf(draft);
      const options = (): ComboOption[] => {
        const clips = state.voice?.clips ?? [];
        const mine = clips.filter(
          (c) => c.def.actor === undefined || c.def.actor === boundActor || c.def.id === node.voice,
        );
        return [
          { id: '', label: 'no recorded line', sub: 'the fallback throat speaks (or silence)' },
          ...mine.map((c) => ({
            id: c.def.id,
            label: c.def.id,
            sub: `${c.def.actor ?? 'shared'}${c.def.transcript ? ` · “${c.def.transcript.slice(0, 44)}”` : ''}`,
          })),
        ];
      };
      const statusHost = el('span', 'beat-voice-status');
      const refreshStatus = (): void => {
        statusHost.innerHTML = '';
        if (node.voice !== undefined) {
          const clip = state.voice?.clips.find((c) => c.def.id === node.voice);
          if (!clip) {
            statusHost.appendChild(pill('unknown clip — silence', 'the ledger holds no such recording; the beat plays unvoiced', 'danger'));
          } else if (
            clip.def.transcript &&
            clip.def.transcript.trim() !== stripDialogueMarkup(node.text).trim()
          ) {
            statusHost.appendChild(
              pill('transcript drifts', `recorded: “${clip.def.transcript}”`, 'brass'),
            );
          }
        } else {
          const first = node.id === draft.start;
          const wire = rehearseVoice(draft, node, first);
          const last = node.next === undefined && (node.choices ?? []).length === 0;
          const slot = first ? 'greet' : last ? 'farewell' : 'ack';
          statusHost.appendChild(
            pill(
              wire ? `fallback: ${slot} speaks` : `fallback: ${slot} → silence`,
              wire
                ? 'no full line — the bank slot answers this beat'
                : 'no full line and the bound throat has nothing in this slot',
              wire ? 'ok' : 'ink',
            ),
          );
        }
      };
      vRow.appendChild(
        combobox(options, node.voice ?? '', (id) => {
          if (id === '') delete node.voice;
          else node.voice = id;
          markDirty();
          refreshLight();
          refreshStatus();
        }),
      );
      const play = el('button', 'voice-play', '▶') as HTMLButtonElement;
      play.title = 'audition this beat as the resolver would speak it';
      play.onclick = () => {
        const wire = rehearseVoice(draft, node, node.id === draft.start);
        if (wire) audition(wire.url);
        else toast('this beat plays silent', 2200);
      };
      vRow.appendChild(play);
      vRow.appendChild(statusHost);
      refreshStatus();
      card.appendChild(vRow);
    }

    // ---- flow: continues → / asks → / ends
    const mode = node.choices !== undefined ? 'asks' : node.next !== undefined ? 'continues' : 'ends';
    const flow = el('div', 'flow-row');
    const flowSeg = el('div', 'seg-row mini-seg');
    for (const [v, label, tip] of [
      ['continues', 'continues ▸', 'linear — one beat flows into the next'],
      ['asks', 'asks', 'a question — the player answers with a choice plate'],
      ['ends', 'ends', 'the conversation completes on this beat'],
    ] as const) {
      const b = el('button', 'opt-btn' + (mode === v ? ' active' : ''), label) as HTMLButtonElement;
      b.title = tip;
      b.onclick = () => {
        if (v === mode) return;
        if (mode === 'asks' && node.choices) choiceStash.set(node.id, node.choices);
        if (v === 'continues') {
          delete node.choices;
          node.next = draft.nodes.find((n) => n !== node)?.id;
          if (node.next === undefined) {
            const fresh = addNode(draft.nodes.indexOf(node));
            node.next = fresh.id;
          }
        } else if (v === 'asks') {
          delete node.next;
          node.choices = choiceStash.get(node.id) ?? [{ text: 'Very well.' }];
        } else {
          delete node.next;
          delete node.choices;
        }
        markDirty();
        rebuild();
      };
      flowSeg.appendChild(b);
    }
    flow.appendChild(flowSeg);
    if (mode === 'continues') {
      flow.appendChild(
        combobox(
          () =>
            [{ id: '+new', label: '+ new beat', sub: 'continue into a fresh beat' } as ComboOption].concat(
              nodeTargetOptions().filter((o) => o.id !== node.id),
            ),
          node.next,
          (v) => {
            if (v === '+new') {
              const fresh = addNode(draft.nodes.indexOf(node));
              node.next = fresh.id;
              rebuild();
              pickBeat(fresh.id);
              return;
            }
            node.next = v;
            markDirty();
            rebuild();
          },
        ),
      );
    } else if (mode === 'ends') {
      flow.appendChild(el('span', 'muted', `completing records ${dialogueDoneFlag(draft.id)}`));
    }
    card.appendChild(flow);
    if (mode === 'asks') card.appendChild(choiceEditor(node));

    // ---- hooks
    card.appendChild(hookEditor(node));
    return card;
  };

  // ------------------------------------------------------------ build

  const build = (): void => {
    // The shared flag-suggestion datalist rides the detail body.
    flagList = document.createElement('datalist');
    flagList.id = 'dlg-flag-universe';
    body.appendChild(flagList);

    // ------------------------------------------------------- hero
    const head = el('div', 'hero');
    const speaker = primarySpeaker();
    const frame = el('div', 'hero-portrait');
    const bust = speaker ? actorBust(speaker, 64) : null;
    if (bust) frame.appendChild(bust);
    else frame.appendChild(iconImg('speech', 40));
    head.appendChild(frame);

    const mid = el('div', 'hero-mid');
    const nameRow = el('div', 'hero-name');
    nameRow.appendChild(el('h1', '', draft.id));
    nameRow.appendChild(
      el('span', 'sub', speaker ? `spoken by ${speaker.name}` : 'unbound conversation'),
    );
    mid.appendChild(nameRow);
    const pills = el('div', 'hero-pills');
    const choiceCount = draft.nodes.reduce((n, x) => n + (x.choices?.length ?? 0), 0);
    pills.appendChild(pill(`${draft.nodes.length} beats`, 'nodes in the tree', 'ink'));
    if (choiceCount > 0) pills.appendChild(pill(`${choiceCount} choices`, 'player answers across all beats', 'ink'));
    pills.appendChild(
      pill(
        draft.once ? 'one-time' : 'evergreen',
        draft.once
          ? `after completion (${dialogueDoneFlag(draft.id)}) it is never offered again`
          : 'offered whenever it is the highest eligible voice',
        draft.once ? 'brass' : 'ink',
      ),
    );
    if ((draft.requires?.length ?? 0) + (draft.forbids?.length ?? 0) > 0) {
      pills.appendChild(pill('gated', `requires ${draft.requires?.join(', ') ?? '—'}${draft.forbids?.length ? ` · forbids ${draft.forbids.join(', ')}` : ''}`, 'brass'));
    }
    const giftCount = draft.nodes.reduce(
      (n, x) => n + (x.hooks?.filter((h) => h.kind === 'give').length ?? 0),
      0,
    );
    if (giftCount > 0) pills.appendChild(pill(`${giftCount} gift${giftCount === 1 ? '' : 's'}`, 'give hooks in the tree', 'ok'));
    if (draft.nodes.some((n) => n.hooks?.some((h) => h.kind === 'shop'))) {
      pills.appendChild(pill('opens a shop', 'a shop hook arms on some beat', 'ok'));
    }
    if ((draft.bindings?.length ?? 0) === 0) pills.appendChild(pill('unbound', 'no actor offers this tree yet', 'danger'));
    mid.appendChild(pills);
    const origin = el('p', 'origin-note');
    origin.innerHTML = !entry.authored
      ? 'Created in the studio — <b>tool-owned</b>, no shipped twin.'
      : entry.edited
        ? '<b>Edited</b> — the database version overrides the shipped tree.'
        : 'Matches the shipped tree — edits become database truth and survive reboots.';
    mid.appendChild(origin);
    head.appendChild(mid);

    const actions = el('div', 'hero-actions');
    const dup = el('button', '', 'Duplicate') as HTMLButtonElement;
    dup.title = 'Clone this tree under a new id (unbound, so voices never collide)';
    dup.onclick = () => {
      const nid = window.prompt('New dialogue id for the copy:', `${draft.id}_copy`);
      if (!nid) return;
      if (!SLUG_RE.test(nid) || state.dialogues.some((d) => d.def.id === nid)) {
        toast('need a fresh lowercase id', 3600, 'error');
        return;
      }
      const copy = clone(draft);
      copy.id = nid;
      delete copy.bindings;
      state.dialogues.push({ def: copy, edited: true, authored: false });
      setSection('dialogues', nid);
      markDirty();
      toast(`drafted '${nid}' — bind it when it is ready to speak`, 3600);
    };
    const exp = el('button', '', 'Export') as HTMLButtonElement;
    exp.title = 'Download the interchange JSON (re-importable via the dialogues CLI)';
    exp.onclick = () => {
      const res = validateDialogue(draft, { actorIds: actorIds() });
      const doc = res.ok ? res.dialogue : draft;
      const a = document.createElement('a');
      a.href = `data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(doc, null, 2))}`;
      a.download = `${draft.id}.json`;
      a.click();
    };
    const revert = el('button', 'danger', entry.authored ? 'Revert to shipped' : 'Delete') as HTMLButtonElement;
    revert.title = entry.authored
      ? 'Discard database edits; the tree shipped in code returns'
      : 'Remove this tool-created tree entirely';
    revert.disabled = entry.authored && !entry.edited;
    revert.onclick = () => {
      if (window.confirm(`${revert.textContent} '${draft.id}'?`)) {
        void persistence.revertDialogueDef(draft.id).catch((err: Error) => toast(err.message, 5200, 'error'));
      }
    };
    const saveBtn = el('button', 'primary', 'Save ▸ Live') as HTMLButtonElement;
    saveBtn.title = 'Validate, store in the database, and hot-swap the running registry (⌘S)';
    saveBtn.onclick = save;
    actions.append(dup, exp, revert, saveBtn);
    head.appendChild(actions);
    body.appendChild(head);

    // ------------------------------------------------ health strip
    healthBox = el('div', 'dlg-health');
    body.appendChild(healthBox);

    // -------------------------------------------------- the map
    graphHost = el('div');
    body.appendChild(
      sect(
        'The conversation, laid out',
        'Brass lines continue, steel lines are choices (dashed when gated). Click a beat to jump to its card.',
        graphHost,
      ),
    );

    // ------------------------------------------- opening conditions
    const cond = el('div', 'dlg-cond');
    const onceSeg = el('div', 'seg-row mini-seg');
    for (const [v, label, tip] of [
      [false, 'evergreen', 'offered whenever it is the highest-priority eligible voice'],
      [true, 'one-time', `retires after completion — ${dialogueDoneFlag(draft.id)} gates it out and the next voice takes over`],
    ] as const) {
      const b = el('button', 'opt-btn' + ((draft.once ?? false) === v ? ' active' : ''), label) as HTMLButtonElement;
      b.title = tip;
      b.onclick = () => {
        if (v) draft.once = true;
        else delete draft.once;
        markDirty();
        rebuild();
      };
      onceSeg.appendChild(b);
    }
    cond.appendChild(onceSeg);
    const condGates = el('div', 'choice-gates wide');
    const defGate = (label: string, cls: string, get: () => string[] | undefined, set: (v: string[] | undefined) => void): void => {
      const block = el('div', 'gate-block');
      block.appendChild(el('span', 'gate-label', label));
      block.appendChild(flagChips(cls, get, set, refreshLight));
      condGates.appendChild(block);
    };
    defGate('offered only if', 'req', () => draft.requires, (v) => (draft.requires = v));
    defGate('never while', 'forb', () => draft.forbids, (v) => (draft.forbids = v));
    cond.appendChild(condGates);
    body.appendChild(
      sect(
        'When it is offered',
        'The selection law: of a target’s eligible trees, the highest binding priority speaks (ties break by id).',
        cond,
      ),
    );

    // ------------------------------------------------- who offers it
    const bindBox = el('div', 'bind-box');
    const bindings = (draft.bindings ??= []);
    for (const [bi, b] of bindings.entries()) {
      const row = el('div', 'bind-row');
      const url = (() => {
        const actor = state.actors.find((a) => a.def.id === b.target);
        return actor ? actorBustUrl(actor.def) : null;
      })();
      if (url) {
        const img = document.createElement('img');
        img.className = 'ico';
        img.src = url;
        row.appendChild(img);
      } else {
        row.appendChild(iconImg('actor', 20));
      }
      row.appendChild(
        combobox(actorOptions, b.target, (v) => {
          b.target = v;
          markDirty();
          rebuild();
        }),
      );
      const pr = el('label', 'bind-pr');
      pr.append('priority');
      const num = document.createElement('input');
      num.type = 'number';
      num.min = '-1000';
      num.max = '1000';
      num.value = String(b.priority ?? 0);
      num.title = 'higher speaks first among this actor’s eligible trees';
      num.oninput = () => {
        const v = Math.max(-1000, Math.min(1000, Math.round(Number(num.value) || 0)));
        if (v === 0) delete b.priority;
        else b.priority = v;
        markDirty();
        renderLinkage();
      };
      pr.appendChild(num);
      row.appendChild(pr);
      const del = el('button', 'mini danger', '×') as HTMLButtonElement;
      del.title = 'unbind — the tree stays, this voice forgets it';
      del.onclick = () => {
        bindings.splice(bi, 1);
        if (bindings.length === 0) delete draft.bindings;
        markDirty();
        rebuild();
      };
      row.appendChild(del);
      bindBox.appendChild(row);
    }
    if (bindings.length < 8) {
      const addRow = el('div', 'bind-add');
      addRow.appendChild(el('span', 'muted', 'bind to'));
      addRow.appendChild(
        combobox(
          () => actorOptions().filter((o) => !bindings.some((b) => b.target === o.id)),
          undefined,
          (v) => {
            bindings.push({ kind: 'actor', target: v });
            markDirty();
            rebuild();
          },
          'choose an actor…',
        ),
      );
      bindBox.appendChild(addRow);
    }
    body.appendChild(
      sect(
        'Who offers it',
        'One tree, many voices: each binding gives an actor this conversation at a priority. The rail shows each actor’s full voice ladder.',
        bindBox,
      ),
    );

    // ---------------------------------------------------- the beats
    const beats = el('div', 'beat-list');
    draft.nodes.forEach((n, i) => beats.appendChild(beatCard(n, i)));
    const addBeat = el('button', '', '+ Add beat') as HTMLButtonElement;
    addBeat.onclick = () => {
      const fresh = addNode();
      rebuild();
      pickBeat(fresh.id);
    };
    beats.appendChild(addBeat);
    body.appendChild(
      sect(
        'The beats',
        'Authored order (drag to shelve; flow is what the map shows). *word* speaks warm, _word_ lands grim, {item:slug} sets the item into the line.',
        beats,
      ),
    );

    // ---------------------------------------------------- rehearsal
    rhBox = el('div', 'rehearsal');
    body.appendChild(
      sect(
        'Rehearsal',
        'Play the tree against a scratch ledger — toggle flags and watch gates open, gifts land, and the voice ladder change. Nothing touches the live world.',
        rhBox,
      ),
    );

    // -------------------------------------------------- JSON drawer
    const adv = document.createElement('details');
    adv.className = 'adv';
    const sum = document.createElement('summary');
    sum.textContent = 'Interchange JSON (advanced)';
    adv.appendChild(sum);
    const ta = document.createElement('textarea');
    ta.rows = 14;
    ta.value = JSON.stringify(draft, null, 2);
    adv.appendChild(ta);
    const applyRow = el('div', 'dialog-actions');
    const apply = el('button', '', 'Apply to draft') as HTMLButtonElement;
    apply.onclick = () => {
      try {
        const parsed = JSON.parse(ta.value) as DialogueDef;
        parsed.id = draft.id; // the id is the row key — pinned
        const res = validateDialogue(parsed, { actorIds: actorIds() });
        if (!res.ok) {
          toast(res.errors[0]!, 5200, 'error');
          return;
        }
        Object.keys(draft).forEach((k) => delete (draft as unknown as Record<string, unknown>)[k]);
        Object.assign(draft, res.dialogue);
        markDirty();
        rebuild();
        toast('applied — review and save', 2600);
      } catch (err) {
        toast((err as Error).message, 5200, 'error');
      }
    };
    applyRow.appendChild(apply);
    adv.appendChild(applyRow);
    body.appendChild(adv);

    // ----------------------------------------------------- the rail
    renderFlagUniverse();
    renderHealth();
    renderGraph();
    renderRehearsal();
    renderLinkage();
  };

  build();
}

/** Local copy of editors.ts' section frame (kept module-pure). */
function sect(title: string, subtitle: string, ...children: HTMLElement[]): HTMLElement {
  const box = el('div', 'fsect');
  box.appendChild(el('h3', '', title));
  if (subtitle) box.appendChild(el('p', 'sect-sub', subtitle));
  for (const c of children) box.appendChild(c);
  return box;
}
