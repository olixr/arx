/**
 * THE SPOKEN WORLD'S ENGINE — the flag answerers, the tree walker, the voice draw, and the hook that lets a conversation reach the world.
 * Moved verbatim off GameServer (foundations F4); the class keeps
 * one-line delegators so every caller and test slate reads unchanged.
 */
import { pickQuipClip, quipIsRationed, quipSlotForBeat, quipWire, voiceWireForNode } from '../voice/resolve.js';
import { PoiSite } from '../world/pois.js';
import { addItem } from './inventory.js';
import { answerQuestFlag } from './quests.js';
import { DialogueHook, DialogueNode, FRONTIER, POI_DEFS, STRONGHOLD_DEFS, VOICE, VoiceSlot, bountyFlag, dialogueDoneFlag, isFactionFlag, isQuestFlag, isWorldFlag, itemDef, parseQuestFlag } from '@arx/content';
import { EntityId, VoiceWire } from '@arx/shared';
import { compass8 } from './formulas.js';
import type { ActiveDialogue, GameServer, PlayerComp } from './gameServer.js';

/**
 * THE WORLD ANSWERS (living-frontier Phase 3.1): the flag predicate
 * every dialogue gate consults. Plain flags read the character's
 * durable ledger; flags in the reserved `world:` namespace are
 * answered LIVE from the frontier around the SPEAKER — the guard
 * knows what stands within a watch of her post, never what stands
 * anywhere. Nothing synthetic is ever stored.
 */
export function dialogueHas(srv: GameServer, player: PlayerComp, targetEid: EntityId): (flag: string) => boolean {
  return (flag) => {
    // The quest ledger answers its namespace live — never stored,
    // so an offer appears the tick it opens and a spent turn-in
    // choice retires itself mid-conversation.
    if (isQuestFlag(flag)) {
      const parsed = parseQuestFlag(flag);
      if (!parsed) return false;
      return answerQuestFlag(
        srv.questDefs.get(parsed.quest),
        player.quests.get(parsed.quest),
        parsed.state,
        parsed.stage,
        srv.questCtx(player),
      );
    }
    // The standing bands answer their namespace live — speakerless,
    // because the name is the player's, not the speaker's.
    if (isFactionFlag(flag)) return srv.answerFactionGate(player, flag);
    if (!isWorldFlag(flag)) return player.flags.has(flag);
    const npos = srv.positions.get(targetEid);
    return npos ? srv.worldFlagAnswer(flag, player, npos.x, npos.y) : false;
  };
}

export function worldFlagAnswer(srv: GameServer, flag: string, player: PlayerComp, sx: number, sy: number): boolean {
  if (flag === 'world:bounty_open') {
    // Reads through openBounties so a mark whose camp dissolved
    // without the player lifts itself the next time anyone asks.
    return srv.openBounties(player).length > 0;
  }
  if (flag === 'world:peddler_near') {
    // Fortune within the marches: a parked cart still counts while
    // its ember runs — she is there until she is not.
    const reach = FRONTIER.marchTiles;
    for (const r of srv.poiLedger.values()) {
      if (r.site?.defId !== 'peddler_rest') continue;
      const dx = r.site.anchorX - sx;
      const dy = r.site.anchorY - sy;
      if (dx * dx + dy * dy <= reach * reach) return true;
    }
    return false;
  }
  const watch = srv.watchSurvey(sx, sy);
  switch (flag) {
    case 'world:threat_near':
      return watch.near;
    case 'world:threat_bold':
      return watch.bold;
    case 'world:toll_near':
      return watch.toll;
    case 'world:calm':
      return !watch.near;
    case 'world:relief':
      // Calm AND a relax window still running within the marches —
      // word of a broken camp travels farther than sight.
      return !watch.near && srv.calmWithinTiles(sx, sy, FRONTIER.marchTiles);
    default:
      return false;
  }
}

/**
 * What stands within the speaker's watch. Only PROCEDURAL sites
 * count — authored landmarks are the land's permanent character, not
 * news, and counting them would leave some posts uneasy forever.
 * Standing = staffed: cleared trophies and scattered embers are over.
 */
export function watchSurvey(srv: GameServer, sx: number, sy: number): { near: boolean; bold: boolean; toll: boolean } {
  const authored = srv.authoredCells();
  const watch = FRONTIER.watchTiles;
  const out = { near: false, bold: false, toll: false };
  for (const [key, row] of srv.poiLedger) {
    if (row.site === null || row.clearedAt !== null || row.emberUntil !== null) continue;
    if (authored.has(key)) continue;
    if (!srv.poiThreatens(row.site.defId)) continue;
    const dx = row.site.anchorX - sx;
    const dy = row.site.anchorY - sy;
    if (dx * dx + dy * dy > watch * watch) continue;
    out.near = true;
    if (row.stage >= FRONTIER.satelliteStage) out.bold = true;
    if (row.site.defId === 'road_toll') out.toll = true;
  }
  // THE LONG WAR: a standing capital in the watch is news — and a
  // STAGED one is the loudest worry a post can carry. (Defensive
  // read: hand-built slates without the capital fields see none.)
  for (const row of srv.strongholdLedger?.values() ?? []) {
    if (row.clearedAt !== null || row.emberUntil !== null || row.fallowUntil !== null) continue;
    const dx = row.anchorX - sx;
    const dy = row.anchorY - sy;
    if (dx * dx + dy * dy > watch * watch) continue;
    out.near = true;
    if (row.stage >= 1) out.bold = true;
  }
  return out;
}

/**
 * Enter a node: fire its hooks, filter its choices against the
 * player's flags, and send the beat. Reaching an authored ending
 * (no continuation, no offerable choices) records completion —
 * walking away never does.
 */
export function dialogueEnterNode(srv: GameServer, eid: EntityId, player: PlayerComp, nodeId: string, first = false): void {
  const dlg = player.dialogue;
  if (!dlg || player.session === null) return;
  const node = srv.dialogueNodes.get(dlg.def.id)?.get(nodeId);
  if (!node) {
    srv.dialogueClose(player);
    return;
  }
  dlg.nodeId = nodeId;
  for (const hook of node.hooks ?? []) srv.runDialogueHook(eid, player, hook);
  // Choice gates consult the same predicate as tree selection, so a
  // `world:` answer holds mid-conversation exactly as it did at the door.
  const has = srv.dialogueHas(player, dlg.targetEid);
  const eligible = (node.choices ?? []).filter(
    (c) => !c.requires?.some((f) => !has(f)) && !c.forbids?.some((f) => has(f)),
  );
  dlg.choices = eligible;
  const last = node.next === undefined && eligible.length === 0;
  if (last) srv.setPlayerFlag(player, dialogueDoneFlag(dlg.def.id));
  // Gifts ride the beat itself so the cinema can stage the moment —
  // the pack update travels separately (runDialogueHook already sent it).
  const gifts = (node.hooks ?? [])
    .filter((h): h is Extract<DialogueHook, { kind: 'give' }> => h.kind === 'give')
    .map((h) => ({ item: h.item, qty: h.qty }));
  // The quest offer rides the beat like a gift: the cinema stages
  // the ask (name, pay) beside the line, before the choice plates.
  const offerHook = (node.hooks ?? []).find(
    (h): h is Extract<DialogueHook, { kind: 'quest_offer' }> => h.kind === 'quest_offer',
  );
  const offerDef = offerHook ? srv.questDefs.get(offerHook.quest) : undefined;
  // Quest-weighted plates wear the overhead mark's grammar: a choice
  // whose next beat swears a quest gets the gold !, one that hands a
  // quest in gets the gold ?. Resolved against the live ledger with
  // the same predicate the hooks themselves are guarded by, so a
  // badge is a promise the press will keep — never a costume.
  const questChoices: Array<{ idx: number; kind: 'accept' | 'turnin' }> = [];
  eligible.forEach((c, idx) => {
    if (c.next === undefined) return;
    const dest = srv.dialogueNodes.get(dlg.def.id)?.get(c.next);
    for (const h of dest?.hooks ?? []) {
      if (h.kind === 'quest_accept' && has(`quest:${h.quest}:available`)) {
        questChoices.push({ idx, kind: 'accept' });
        return;
      }
      if (h.kind === 'quest_turnin' && has(`quest:${h.quest}:ready`)) {
        questChoices.push({ idx, kind: 'turnin' });
        return;
      }
    }
  });
  // A trade-weighted plate wears the counter's coin: a choice whose
  // press arms the shop hook — directly or through linear beats the
  // player only pages past — gets the coin chip. The walk stops at
  // the next question: another decision in between means the shelf
  // is that press's consequence, not this one's.
  const shopChoices: number[] = [];
  // A ring-weighted plate wears the sand's emblem by the same walk:
  // a choice whose press ends at the ringmaster's counter (the
  // arena hook) gets the gold crossed swords — the board-opening
  // answer must read apart from small talk BEFORE the press.
  const arenaChoices: number[] = [];
  eligible.forEach((c, idx) => {
    const seen = new Set<string>();
    let cur = c.next;
    while (cur !== undefined && !seen.has(cur)) {
      seen.add(cur);
      const dest = srv.dialogueNodes.get(dlg.def.id)?.get(cur);
      if (!dest) break;
      if (dest.hooks?.some((h) => h.kind === 'shop')) {
        shopChoices.push(idx);
        break;
      }
      if (dest.hooks?.some((h) => h.kind === 'arena')) {
        arenaChoices.push(idx);
        break;
      }
      if (dest.choices && dest.choices.length > 0) break;
      cur = dest.next;
    }
  });
  player.session.sendJson({
    t: 'dlgnode',
    speaker: node.speaker ?? 'npc',
    text: node.text,
    choices: eligible.length > 0 ? eligible.map((c) => c.text) : undefined,
    last: last || undefined,
    gifts: gifts.length > 0 ? gifts : undefined,
    quest: offerDef
      ? { id: offerDef.id, name: offerDef.name, rewards: srv.questRewardsWire(offerDef) }
      : undefined,
    questChoices: questChoices.length > 0 ? questChoices : undefined,
    shopChoices: shopChoices.length > 0 ? shopChoices : undefined,
    arenaChoices: arenaChoices.length > 0 ? arenaChoices : undefined,
    // THE ONE RESOLVER's answer for this beat: the node's full line,
    // else the speaker's bank slot for the moment, else silence.
    voice: srv.resolveBeatVoice(dlg.targetEid, node, first, last),
  });
}

/**
 * THE THROAT CLEARS (voiceover-plan Phase 4): the fallback chain
 * under the full line. Greet speaks on the first beat and farewell
 * on the terminal one unconditionally (the door and the goodbye ARE
 * the moments); acks between are rationed by the quipChance and
 * quipCooldownMs dials so they punctuate instead of chattering.
 * Player-spoken beats never draw from the NPC's throat.
 */
export function resolveBeatVoice(srv: GameServer, 
  targetEid: EntityId,
  node: DialogueNode,
  first: boolean,
  last: boolean,
): VoiceWire | undefined {
  const line = voiceWireForNode(node, srv.voiceClips);
  if (line) return line;
  if ((node.speaker ?? 'npc') === 'player') return undefined;
  const actor = srv.actors.get(targetEid)?.actor;
  if (!actor) return undefined;
  return srv.drawQuip(
    `actor:${actor.id}`,
    quipSlotForBeat(first, last, node.mood),
    quipIsRationed(first, last, node.mood),
  );
}

/** Pick from an owner's bank slot through the shared quip memory. */
export function drawQuip(srv: GameServer, ownerKey: string, slot: VoiceSlot, rationed: boolean): VoiceWire | undefined {
  const bank = srv.voiceBanks.get(ownerKey);
  if (!bank) return undefined;
  const mem = srv.voiceQuipMemory.get(ownerKey) ?? { lastAt: 0, lastBySlot: new Map() };
  if (rationed) {
    const now = Date.now();
    if (now - mem.lastAt < VOICE.quipCooldownMs) return undefined;
    if (Math.random() >= VOICE.quipChance) return undefined;
  }
  const clipId = pickQuipClip(bank, slot, mem.lastBySlot.get(slot), Math.random());
  if (clipId === undefined) return undefined;
  const wire = quipWire(clipId, srv.voiceClips);
  if (!wire) return undefined;
  mem.lastAt = Date.now();
  mem.lastBySlot.set(slot, clipId);
  srv.voiceQuipMemory.set(ownerKey, mem);
  return wire;
}

/** Advance a linear beat (questions are answered, never skipped). */
export function dialogueAdvance(srv: GameServer, eid: EntityId): void {
  const player = srv.players.get(eid);
  const dlg = player?.dialogue;
  if (!player || !dlg || !srv.dialogueGuard(eid, player, dlg)) return;
  if (dlg.choices.length > 0) return;
  const node = srv.dialogueNodes.get(dlg.def.id)?.get(dlg.nodeId);
  if (node?.next !== undefined) {
    srv.dialogueEnterNode(eid, player, node.next);
  } else {
    // A good ending first offers the mark's business (the chain),
    // then completion stands as recorded on entry; an armed shop
    // opens as the frame drops — "have a look, then" becomes the shelf.
    if (srv.dialogueChainOffer(eid, player)) return;
    const shop = dlg.shop;
    const keyforge = dlg.keyforge;
    const arena = dlg.arena;
    srv.dialogueClose(player);
    if (shop !== undefined) {
      player.session?.sendJson({ t: 'shopopen', shop, priceMult: srv.shopPriceMultFor(player, shop) });
    }
    if (keyforge) player.session?.sendJson({ t: 'keyforgeopen' });
    if (arena !== undefined) srv.arenaBoardOpen(eid, player, arena);
  }
}

/** Answer the current question by sent-choice index. */
export function dialogueChoose(srv: GameServer, eid: EntityId, idx: number): void {
  const player = srv.players.get(eid);
  const dlg = player?.dialogue;
  if (!player || !dlg || !srv.dialogueGuard(eid, player, dlg)) return;
  const choice = dlg.choices[idx];
  if (!choice) return;
  for (const f of choice.set ?? []) srv.setPlayerFlag(player, f);
  if (choice.next !== undefined) {
    srv.dialogueEnterNode(eid, player, choice.next);
  } else {
    // An authored farewell is a real ending, not an interruption —
    // and a real ending keeps the mark's promise before the frame drops.
    srv.setPlayerFlag(player, dialogueDoneFlag(dlg.def.id));
    if (srv.dialogueChainOffer(eid, player)) return;
    const shop = dlg.shop;
    const keyforge = dlg.keyforge;
    const arena = dlg.arena;
    srv.dialogueClose(player);
    if (shop !== undefined) {
      player.session?.sendJson({ t: 'shopopen', shop, priceMult: srv.shopPriceMultFor(player, shop) });
    }
    if (keyforge) player.session?.sendJson({ t: 'keyforgeopen' });
    if (arena !== undefined) srv.arenaBoardOpen(eid, player, arena);
  }
}

/** The player excuses themselves (Esc) — no completion recorded. */
export function dialogueEnd(srv: GameServer, eid: EntityId): void {
  const player = srv.players.get(eid);
  if (player?.dialogue) srv.dialogueClose(player);
}

/** A conversation needs a living partner within earshot. */
export function dialogueGuard(srv: GameServer, eid: EntityId, player: PlayerComp, dlg: ActiveDialogue): boolean {
  const pos = srv.positions.get(eid);
  const npos = srv.positions.get(dlg.targetEid);
  // Earshot never spans planes: a stair crossing keeps near-
  // identical coordinates, and the bare distance used to let the
  // conversation keep running through the rock.
  if (!pos || !npos || npos.plane !== pos.plane || !srv.actors.has(dlg.targetEid)) {
    srv.dialogueClose(player);
    return false;
  }
  const dx = npos.x - pos.x;
  const dy = npos.y - pos.y;
  if (dx * dx + dy * dy > 4 * 4) {
    srv.dialogueClose(player);
    return false;
  }
  return true;
}

export function dialogueClose(srv: GameServer, player: PlayerComp): void {
  if (!player.dialogue) return;
  player.dialogue = null;
  player.session?.sendJson({ t: 'dlgclose' });
}

/**
 * Node effects — the open socket future systems plug into (quest
 * grants, faction shifts). Always server-side, always idempotent
 * per node entry.
 */
export function runDialogueHook(srv: GameServer, eid: EntityId, player: PlayerComp, hook: DialogueHook): void {
  switch (hook.kind) {
    case 'flag':
      srv.setPlayerFlag(player, hook.flag);
      break;
    case 'shop':
      // Armed now, fired at a good ending (see dialogueAdvance).
      if (player.dialogue) player.dialogue.shop = hook.shop;
      break;
    case 'keyforge':
      // The Keywright's bench: same arming law as the shop.
      if (player.dialogue) player.dialogue.keyforge = true;
      break;
    case 'arena':
      // The stakes board: same arming law as the shop.
      if (player.dialogue) player.dialogue.arena = hook.venue;
      break;
    case 'bounty':
      srv.postBounty(eid, player);
      break;
    case 'standing':
      // Authored story delta — never auto-pays the opposition
      // matrix (an author states both sides explicitly).
      srv.creditStanding(player, hook.faction, hook.delta);
      break;
    case 'fine':
      srv.runFine(player, hook.faction, hook.quote === true);
      break;
    case 'quest_offer':
      // Pure presentation: dialogueEnterNode stages the chip on the
      // beat itself (the gifts pattern). Nothing happens here.
      break;
    case 'quest_accept':
      srv.questAccept(eid, player, hook.quest);
      break;
    case 'quest_turnin':
      srv.questTurnIn(eid, player, hook.quest);
      break;
    case 'give': {
      // THE KEY RING: a gifted key clips onto the ring, minted whole.
      if (itemDef(hook.item)?.dungeonKey) {
        for (let i = 0; i < hook.qty; i++) srv.addKeyToRing(player, srv.mintFreshKeyRoll(), false);
        srv.sendKeyRing(player);
        const name = itemDef(hook.item)?.name ?? hook.item;
        player.session?.sendJson({
          t: 'chat',
          channel: 'system',
          text: `You receive ${hook.qty > 1 ? `${hook.qty} × ` : ''}${name}.`,
        });
        break;
      }
      const added = addItem(player.inventory, hook.item, hook.qty);
      if (added > 0) {
        player.session?.sendJson({ t: 'inv', slots: player.inventory });
        const name = itemDef(hook.item)?.name ?? hook.item;
        player.session?.sendJson({
          t: 'chat',
          channel: 'system',
          text: `You receive ${added > 1 ? `${added} × ` : ''}${name}.`,
        });
      }
      if (added < hook.qty) {
        // A full pack never eats a gift — the rest lands at your feet.
        const pos = srv.positions.get(eid);
        if (pos) srv.spawnDrop(pos.plane, hook.item, hook.qty - added, pos.x, pos.y, eid);
      }
      break;
    }
  }
}

/**
 * THE ASK MADE CONCRETE (Phase 3.2): the speaker points the player
 * at the worst standing trouble within their watch — boldest rung
 * first, then nearest. The waypoint lands on the chart live, the
 * bounty mark stamps, and the quartermaster confirms with a bearing.
 * Nothing pays until the camp breaks.
 */
export function postBounty(srv: GameServer, eid: EntityId, player: PlayerComp): void {
  const dlg = player.dialogue;
  const pos = srv.positions.get(eid);
  if (!dlg || !pos) return;
  const spos = srv.positions.get(dlg.targetEid);
  if (!spos) return;
  const authored = srv.authoredCells();
  const watch = FRONTIER.watchTiles;
  let best: { key: string; site: PoiSite; stage: number; d2: number } | null = null;
  for (const [key, row] of srv.poiLedger) {
    if (row.site === null || row.clearedAt !== null || row.emberUntil !== null) continue;
    if (authored.has(key)) continue;
    if (!srv.poiThreatens(row.site.defId)) continue; // never a bounty on a friend
    const dx = row.site.anchorX - spos.x;
    const dy = row.site.anchorY - spos.y;
    const d2 = dx * dx + dy * dy;
    if (d2 > watch * watch) continue;
    if (!best || row.stage > best.stage || (row.stage === best.stage && d2 < best.d2)) {
      best = { key, site: row.site, stage: row.stage, d2 };
    }
  }
  // A standing capital in the watch outranks every camp — the seat
  // of the trouble is always the mark worth posting (priority reads
  // as rung 3 + its own stage, above any camp's ladder).
  let bestCap: { key: string; x: number; y: number; stage: number; name: string; d2: number } | null =
    null;
  for (const [ckey, row] of srv.strongholdLedger ?? []) {
    if (row.clearedAt !== null || row.emberUntil !== null || row.fallowUntil !== null) continue;
    const dx = row.anchorX - spos.x;
    const dy = row.anchorY - spos.y;
    const d2 = dx * dx + dy * dy;
    if (d2 > watch * watch) continue;
    const layoutName =
      srv.strongholdLive.get(ckey) !== undefined
        ? srv.surface.zoneById(srv.strongholdLive.get(ckey)!.zoneId)?.name
        : undefined;
    const capStage = 3 + row.stage;
    if (!bestCap || capStage > bestCap.stage || (capStage === bestCap.stage && d2 < bestCap.d2)) {
      bestCap = {
        key: ckey,
        x: row.anchorX,
        y: row.anchorY,
        stage: capStage,
        name: layoutName ?? STRONGHOLD_DEFS.get(row.layoutId)?.name ?? 'the stronghold',
        d2,
      };
    }
  }
  const sys = (text: string) =>
    player.session?.sendJson({ t: 'chat', channel: 'system', text });
  if (bestCap && (!best || bestCap.stage >= best.stage)) {
    const wx = Math.round(bestCap.x);
    const wy = Math.round(bestCap.y);
    srv.setWaypoint(eid, wx, wy);
    player.session?.sendJson({ t: 'waypoint', x: wx, y: wy });
    srv.setPlayerFlag(player, bountyFlag(`sh:${bestCap.key}`));
    sys(
      `Your chart takes the mark: ${bestCap.name}, ` +
        `${compass8(wx - pos.x, wy - pos.y)}, ${Math.round(Math.hypot(wx - pos.x, wy - pos.y))} paces out.`,
    );
    return;
  }
  if (!best) {
    // The gate said threat, but it broke mid-conversation — honest.
    sys('Nothing stands within the watch now — the word was stale.');
    return;
  }
  const wx = Math.round(best.site.anchorX);
  const wy = Math.round(best.site.anchorY);
  srv.setWaypoint(eid, wx, wy);
  player.session?.sendJson({ t: 'waypoint', x: wx, y: wy });
  srv.setPlayerFlag(player, bountyFlag(best.key));
  const def = POI_DEFS.get(best.site.defId);
  sys(
    `Your chart takes the mark: ${def?.name ?? 'the camp'}, ` +
      `${compass8(wx - pos.x, wy - pos.y)}, ${Math.round(Math.hypot(wx - pos.x, wy - pos.y))} paces out.`,
  );
}
