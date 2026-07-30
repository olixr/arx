import type { DialogueDef, DialogueNode, VoiceClipDef } from '@arx/content';
import { voiceClipUrl } from '@arx/content';
import type { VoiceWire } from '@arx/shared';

/**
 * THE ONE RESOLVER's pure half (voiceover-plan Phase 3): what plays
 * for a beat, and what a frame should warm. The server owns clip
 * choice; the wire carries URLs only (THE WIRE STAYS BLIND). Phase 4
 * adds the bank-slot fallback rung under the node line.
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
 * The warm list for a dialogue frame: every voiced beat reachable
 * from the start, breadth-first so the beats a player meets soonest
 * decode first, deduped, capped by the prefetchCap dial. Undefined
 * when the tree is wholly silent — the wire stays clean.
 */
export function collectVoicePrefetch(
  def: DialogueDef,
  clips: ReadonlyMap<string, VoiceClipDef>,
  cap: number,
): string[] | undefined {
  if (cap <= 0) return undefined;
  const byId = new Map(def.nodes.map((n) => [n.id, n]));
  const urls: string[] = [];
  const seenUrls = new Set<string>();
  const seenNodes = new Set<string>();
  const queue: string[] = [def.start];
  while (queue.length > 0 && urls.length < cap) {
    const node = byId.get(queue.shift()!);
    if (!node || seenNodes.has(node.id)) continue;
    seenNodes.add(node.id);
    const wire = voiceWireForNode(node, clips);
    if (wire && !seenUrls.has(wire.url)) {
      seenUrls.add(wire.url);
      urls.push(wire.url);
    }
    if (node.next !== undefined) queue.push(node.next);
    for (const c of node.choices ?? []) {
      if (c.next !== undefined) queue.push(c.next);
    }
  }
  return urls.length > 0 ? urls : undefined;
}
