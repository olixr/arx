/**
 * THE CASTING OFFICE — shared loader for the voice recording pipeline.
 *
 * Reads the shipped dialogue trees and actor rosters and folds in the
 * hand-authored quip slate (quips.json) and direction notes
 * (characters.json) to produce ONE line manifest. Everything downstream
 * rides this manifest: the recording sheet a human reads from, the
 * Chatterbox batch generator, and the ledger importer. One list, three
 * consumers — the sheet you read IS the file the machine speaks.
 *
 * Line identity: every utterance gets a clip slug that is also its
 * filename stem in voicework/ —
 *   dialogue node   <dialogueId>__<nodeId>
 *   ambient bark    <actorId>__bark_<n>       (matches actor.lines[n-1])
 *   quip            <actorId>__<slot>_<n>
 * The slug is the contract across recording, generation, and import.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { stripDialogueMarkup } from '../../packages/content/src/dialogues/markup.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
export const REPO = join(HERE, '..', '..');
const DLG_DIR = join(REPO, 'packages/content/src/dialogues/defs');
const ACTOR_DIR = join(REPO, 'packages/content/src/actors/defs');

/** Clip id law from packages/content/src/voice.ts — mirrored, not imported,
 * to keep this tool runnable without the whole content graph. */
const SLUG_RE = /^[a-z][a-z0-9_]*$/;
const SLUG_MAX = 48;

export interface DlgChoice {
  text: string;
  next?: string;
}
export interface DlgNode {
  id: string;
  text: string;
  speaker?: 'npc' | 'player';
  voice?: string;
  mood?: string;
  next?: string;
  choices?: DlgChoice[];
}
export interface DlgDef {
  id: string;
  start: string;
  requires?: string[];
  bindings?: Array<{ kind: string; target: string; priority?: number }>;
  nodes: DlgNode[];
}
export interface ActorDef {
  id: string;
  name: string;
  examine?: string;
  lines?: string[];
}

export interface CharacterNote {
  /** Region grouping for the sheet; must be one of REGION_ORDER. */
  where: string;
  /** Backstory + delivery direction, read before recording. */
  direction: string;
  /** Chatterbox voice sample id (voicelab voices/<id>.wav); null = casting unassigned, generator skips. */
  ttsVoice: string | null;
  /**
   * Chatterbox base-model emotion intensity 0..1. OPTIONAL: omit to inherit
   * the voice's own tuning from voices.json, and set it only when this
   * character wants a performance the voice does not give by default.
   */
  exaggeration?: number;
  /** Chatterbox style-adherence weight 0..1 (lower = looser, more natural drift). Optional, as above. */
  cfgWeight?: number;
  /** First-wave cast: appears at the top of the sheet, quips authored. */
  firstWave?: boolean;
}

/** Per-voice delivery tuning — one row per sample in the pool. See voices.json. */
export interface VoiceTuning {
  /** Median fundamental frequency, measured by audition.mts. Reference only. */
  f0?: number | null;
  /** Chatterbox base-model emotion intensity 0..1; omit to inherit the global default. */
  exaggeration?: number;
  /** Chatterbox style-adherence weight 0..1; omit to inherit the global default. */
  cfgWeight?: number;
  /** Why this voice is tuned the way it is. */
  note?: string;
}

export interface GlobalTuning {
  tempo: number;
  temperature: number;
  defaultExaggeration: number;
  defaultCfgWeight: number;
}

export interface Delivery {
  exaggeration: number;
  cfgWeight: number;
  /** Which layer supplied each knob, for honest reporting. */
  from: { exaggeration: 'character' | 'voice' | 'global'; cfgWeight: 'character' | 'voice' | 'global' };
}

export function loadTuning(): GlobalTuning {
  return JSON.parse(readFileSync(join(HERE, 'tuning.json'), 'utf8')) as GlobalTuning;
}
export function loadVoiceTuning(): Record<string, VoiceTuning> {
  const raw = JSON.parse(readFileSync(join(HERE, 'voices.json'), 'utf8')) as Record<string, unknown>;
  // The file carries a _comment block the way tuning.json does; it is prose,
  // not a voice, and must never be mistaken for one.
  const out: Record<string, VoiceTuning> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (k.startsWith('_')) continue;
    out[k] = v as VoiceTuning;
  }
  return out;
}

/**
 * THE ONE DELIVERY DOOR. Three layers, most specific first:
 *
 *   character (characters.json)  a performance this character wants
 *   voice     (voices.json)      how this sample reads by default
 *   global    (tuning.json)      the pool-wide fallback
 *
 * Exaggeration is the pace AND expression knob on this pool and it does not
 * behave identically across samples — the same setting measured +11% words per
 * second on one voice and +3% on another. That variance is a property of the
 * SAMPLE, which is why the voice layer exists: it is the right place to fix a
 * voice that reads slow or flat, and fixing it there moves every character cast
 * on it at once.
 *
 * Every caller must resolve through here rather than reading the knobs
 * directly, because the resumption stamps are built from the RESOLVED values.
 * A tuning change that the stamp cannot see leaves finished takes marked done
 * in the old delivery, which is the exact failure the stamps exist to prevent.
 */
export function resolveDelivery(
  voiceId: string | null,
  note: Pick<CharacterNote, 'exaggeration' | 'cfgWeight'> | undefined,
  globals: GlobalTuning,
  voices: Record<string, VoiceTuning>,
): Delivery {
  const v = voiceId !== null ? voices[voiceId] : undefined;
  const exaggeration = note?.exaggeration ?? v?.exaggeration ?? globals.defaultExaggeration;
  const cfgWeight = note?.cfgWeight ?? v?.cfgWeight ?? globals.defaultCfgWeight;
  return {
    exaggeration,
    cfgWeight,
    from: {
      exaggeration:
        note?.exaggeration !== undefined ? 'character' : v?.exaggeration !== undefined ? 'voice' : 'global',
      cfgWeight:
        note?.cfgWeight !== undefined ? 'character' : v?.cfgWeight !== undefined ? 'voice' : 'global',
    },
  };
}

/**
 * The resumption stamp: speaker AND performance. Written to
 * voicework/generated/<actor>/.voice, and compared on every pass — anything
 * that changes what a take sounds like has to appear in this string or the
 * take will be kept when it should be re-spoken.
 */
export function deliverySignature(voiceId: string, d: Delivery, globals: GlobalTuning): string {
  return `${voiceId} ex=${d.exaggeration} cfg=${d.cfgWeight}`
    + ` tempo=${globals.tempo} temp=${globals.temperature}`;
}

export type QuipSlot = 'greet' | 'ack' | 'yes' | 'no' | 'hm' | 'farewell' | 'bark';
export type QuipSlate = Partial<Record<QuipSlot, string[]>>;

export interface ManifestLine {
  clipId: string;
  actor: string;
  kind: 'node' | 'bark' | 'quip';
  /** Plain spoken text — markup stripped; this is the TTS input AND the clip transcript. */
  text: string;
  /** node lines only */
  dialogue?: string;
  node?: string;
  mood?: string;
  /** how the conversation arrives at this line — delivery context for the reader */
  context?: string[];
  /** bark/quip only */
  slot?: QuipSlot;
  index?: number;
}

export interface Manifest {
  actors: Map<string, ActorDef>;
  dialogues: DlgDef[];
  notes: Record<string, CharacterNote>;
  quips: Record<string, QuipSlate>;
  /** actor id → their lines, in sheet order */
  byActor: Map<string, ManifestLine[]>;
  lines: ManifestLine[];
}

function readJsonDir<T>(dir: string): T[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')) as T);
}

/** Squeeze a dialogue/node pair into the 48-char clip slug law. The
 * dialogue id keeps its tail (the distinctive part of quest slugs);
 * a collision is a hard error — rename the node, don't ship a mystery. */
export function nodeClipId(dlgId: string, nodeId: string): string {
  const node = nodeId.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  let dlg = dlgId.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  const room = SLUG_MAX - node.length - 2;
  if (dlg.length > room) dlg = dlg.slice(dlg.length - room).replace(/^_+/, '');
  const id = `${dlg}__${node}`;
  if (!SLUG_RE.test(id)) throw new Error(`clip id '${id}' escapes the slug law`);
  return id;
}

export function loadNotes(): Record<string, CharacterNote> {
  return JSON.parse(readFileSync(join(HERE, 'characters.json'), 'utf8'));
}
export function loadQuips(): Record<string, QuipSlate> {
  return JSON.parse(readFileSync(join(HERE, 'quips.json'), 'utf8'));
}

export function buildManifest(): Manifest {
  const actorDefs = readJsonDir<ActorDef>(ACTOR_DIR);
  const dialogues = readJsonDir<DlgDef>(DLG_DIR);
  const notes = loadNotes();
  const quips = loadQuips();
  const actors = new Map(actorDefs.map((a) => [a.id, a]));

  const lines: ManifestLine[] = [];
  const byActor = new Map<string, ManifestLine[]>();
  const seen = new Map<string, string>();
  const push = (l: ManifestLine): void => {
    const prior = seen.get(l.clipId);
    if (prior !== undefined) throw new Error(`clip id collision: '${l.clipId}' (${prior})`);
    seen.set(l.clipId, l.kind === 'node' ? `${l.dialogue}/${l.node}` : `${l.actor} ${l.kind}`);
    lines.push(l);
    const bucket = byActor.get(l.actor) ?? [];
    bucket.push(l);
    byActor.set(l.actor, bucket);
  };

  // Quips lead each actor's session: short lines warm a throat up.
  for (const [actor, slate] of Object.entries(quips)) {
    if (!actors.has(actor)) throw new Error(`quips.json speaks for unknown actor '${actor}'`);
    for (const [slot, texts] of Object.entries(slate) as Array<[QuipSlot, string[]]>) {
      // 'fill' stem keeps filler breaths clear of the verbatim
      // <actor>__bark_<n> ambient-line clips below.
      const stem = slot === 'bark' ? 'fill' : slot;
      texts.forEach((text, i) => {
        push({ clipId: `${actor}__${stem}_${i + 1}`, actor, kind: 'quip', slot, index: i + 1, text });
      });
    }
  }

  // Ambient barks — the rotating one-liners an actor says in passing.
  // Their transcripts matter: the server matches the spoken clip to the
  // displayed bark by transcript, so the text is recorded verbatim.
  for (const a of actorDefs) {
    (a.lines ?? []).forEach((text, i) => {
      push({
        clipId: `${a.id}__bark_${i + 1}`,
        actor: a.id,
        kind: 'bark',
        slot: 'bark',
        index: i + 1,
        text: stripDialogueMarkup(text),
      });
    });
  }

  // Dialogue trees, grouped under the bound actor. Player-spoken beats
  // never draw an NPC throat and are skipped whole.
  for (const dlg of dialogues) {
    const actorBind = (dlg.bindings ?? []).find((b) => b.kind === 'actor');
    if (!actorBind) continue;
    const actor = actorBind.target;
    // entry cues: which player words (or flow) lead into each node
    const entries = new Map<string, string[]>();
    const addEntry = (node: string, cue: string): void => {
      const arr = entries.get(node) ?? [];
      if (arr.length < 3 && !arr.includes(cue)) arr.push(cue);
      entries.set(node, arr);
    };
    addEntry(dlg.start, 'opens the conversation');
    for (const n of dlg.nodes) {
      if (n.next) addEntry(n.next, `follows straight on from "${n.id}"`);
      for (const c of n.choices ?? []) {
        if (c.next) addEntry(c.next, `player says: "${c.text}"`);
      }
    }
    for (const n of dlg.nodes) {
      if ((n.speaker ?? 'npc') === 'player') continue;
      push({
        clipId: nodeClipId(dlg.id, n.id),
        actor,
        kind: 'node',
        dialogue: dlg.id,
        node: n.id,
        mood: n.mood,
        context: entries.get(n.id) ?? [],
        text: stripDialogueMarkup(n.text),
      });
    }
  }

  return { actors, dialogues, notes, quips, byActor, lines };
}

/**
 * Sheet + pipeline ordering: first wave first, then by region, then name.
 *
 * ONE ROW PER PLACE THE PLAYER GOES. This list was written when the world
 * ended at Silverfall, and four towns have opened since (Pinewatch, Saltmere,
 * Hartfell, the Low Hall). A region missing from here does not warn: indexOf
 * returns -1, which sorts ABOVE every named region, so the newest town
 * silently jumps the queue in the recording sheet. Any zone in
 * packages/content/src/maps that places actors belongs here, in roughly the
 * order a player meets it; 'roads' holds everyone the map files do not place.
 */
export const REGION_ORDER = [
  'dawnmead',
  'roads',
  'amberford',
  'silverfall',
  'undercroft',
  'pinewatch',
  'saltmere',
  'hartfell',
  'lowhall',
];
export function orderedActors(m: Manifest): string[] {
  const ids = [...m.byActor.keys()].filter((id) => m.actors.has(id));
  return ids.sort((a, b) => {
    const na = m.notes[a];
    const nb = m.notes[b];
    const wave = Number(nb?.firstWave ?? false) - Number(na?.firstWave ?? false);
    if (wave !== 0) return wave;
    const ra = REGION_ORDER.indexOf(na?.where ?? '');
    const rb = REGION_ORDER.indexOf(nb?.where ?? '');
    if (ra !== rb) return ra - rb;
    return a.localeCompare(b);
  });
}
