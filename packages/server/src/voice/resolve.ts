import type {
  DialogueDef,
  DialogueNode,
  VoiceBankDef,
  VoiceClipDef,
  VoiceMood,
  VoiceSlot,
} from '@arx/content';
import { VOICE_STREAM_MS, voiceClipUrl } from '@arx/content';
import type { VoiceWire } from '@arx/shared';

/**
 * THE ONE RESOLVER's pure half (voiceover-plan Phases 3-4): what
 * plays for a beat, and what a frame should warm. The server owns
 * clip choice; the wire carries URLs only (THE WIRE STAYS BLIND).
 * The chain: node line → the speaker's bank slot for the MOMENT
 * (greet on the first beat, farewell on the last, ack between,
 * bark at the overworld one-liners) → silence.
 *
 * SILENCE IS VALID at this layer too: a node naming a clip the ledger
 * doesn't hold resolves to nothing, never to an error at a player —
 * the delete guard keeps the DB consistent, so a miss here is a
 * transient (mid-edit) state, not a broken world.
 */

/** The full spoken line for a node, when it has one the ledger holds. */
export function voiceWireForNode(
  node: Pick<DialogueNode, 'voice'>,
  clips: ReadonlyMap<string, VoiceClipDef>,
): VoiceWire | undefined {
  if (node.voice === undefined) return undefined;
  const clip = clips.get(node.voice);
  if (!clip) return undefined;
  return { url: voiceClipUrl(clip), durMs: clip.durMs, kind: 'line' };
}

/**
 * Which bank slot a conversation beat draws from when it has no full
 * line: a mood mark speaks its own slot (the designer's word beats
 * position); else the first beat is the hello, the terminal beat the
 * goodbye, everything between an acknowledgement.
 */
export function quipSlotForBeat(isFirst: boolean, isLast: boolean, mood?: VoiceMood): VoiceSlot {
  if (mood !== undefined) return mood;
  if (isFirst) return 'greet';
  if (isLast) return 'farewell';
  return 'ack';
}

/**
 * Whether the moment is diced (quipChance + cooldown) or spoken
 * unconditionally: the door, the goodbye, and every authored mood
 * mark speak when they can — only the anonymous in-between acks are
 * rationed, so quips punctuate instead of chattering.
 */
export function quipIsRationed(isFirst: boolean, isLast: boolean, mood?: VoiceMood): boolean {
  return !isFirst && !isLast && mood === undefined;
}

/**
 * Weighted pick from a bank slot, avoiding the previous pick whenever
 * the slot holds an alternative (the no-repeat cursor's pure half).
 * `roll` is the caller's 0..1 die — kept outside so tests can pin
 * every branch. Undefined when the slot is empty or unknown clips.
 */
export function pickQuipClip(
  bank: VoiceBankDef | undefined,
  slot: VoiceSlot,
  lastClip: string | undefined,
  roll: number,
): string | undefined {
  const entries = bank?.slots[slot];
  if (!entries || entries.length === 0) return undefined;
  const pool = entries.length > 1 ? entries.filter((e) => e.clip !== lastClip) : entries;
  const source = pool.length > 0 ? pool : entries;
  const total = source.reduce((a, e) => a + (e.weight ?? 1), 0);
  let mark = Math.max(0, Math.min(0.999999, roll)) * total;
  for (const e of source) {
    mark -= e.weight ?? 1;
    if (mark < 0) return e.clip;
  }
  return source[source.length - 1]!.clip;
}

/** A bank quip as the wire speaks it — quips never duck the music. */
export function quipWire(
  clipId: string,
  clips: ReadonlyMap<string, VoiceClipDef>,
): VoiceWire | undefined {
  const clip = clips.get(clipId);
  if (!clip) return undefined;
  return { url: voiceClipUrl(clip), durMs: clip.durMs, kind: 'quip' };
}

/**
 * The warm list for a dialogue frame: the speaker's bank quips first
 * (the greet fires on the very first beat — it needs warmth most),
 * then every voiced beat reachable from the start, breadth-first so
 * the beats a player meets soonest decode first, deduped, capped by
 * the prefetchCap dial. Undefined when the conversation is wholly
 * silent — the wire stays clean.
 */
export function collectVoicePrefetch(
  def: DialogueDef,
  clips: ReadonlyMap<string, VoiceClipDef>,
  cap: number,
  bank?: VoiceBankDef,
): string[] | undefined {
  if (cap <= 0) return undefined;
  const urls: string[] = [];
  const seenUrls = new Set<string>();
  const add = (url: string): void => {
    if (urls.length < cap && !seenUrls.has(url)) {
      seenUrls.add(url);
      urls.push(url);
    }
  };
  if (bank) {
    const slotOrder: VoiceSlot[] = ['greet', 'ack', 'farewell', 'yes', 'no', 'hm'];
    for (const slot of slotOrder) {
      for (const e of bank.slots[slot] ?? []) {
        const clip = clips.get(e.clip);
        if (clip) add(voiceClipUrl(clip));
      }
    }
  }
  const byId = new Map(def.nodes.map((n) => [n.id, n]));
  const seenNodes = new Set<string>();
  const queue: string[] = [def.start];
  while (queue.length > 0 && urls.length < cap) {
    const node = byId.get(queue.shift()!);
    if (!node || seenNodes.has(node.id)) continue;
    seenNodes.add(node.id);
    // Reel-length lines stream on demand — decoding one into the
    // buffer cache would waste the whole warm budget on a cutscene.
    const clip = node.voice !== undefined ? clips.get(node.voice) : undefined;
    if (clip && clip.durMs < VOICE_STREAM_MS) add(voiceClipUrl(clip));
    if (node.next !== undefined) queue.push(node.next);
    for (const c of node.choices ?? []) {
      if (c.next !== undefined) queue.push(c.next);
    }
  }
  return urls.length > 0 ? urls : undefined;
}
