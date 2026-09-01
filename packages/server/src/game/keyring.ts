/**
 * THE KEY RING — minting, labeling, forging, wearing out and using the keys a life collects.
 * Moved verbatim off GameServer (foundations F4); the class keeps
 * one-line delegators so every caller and test slate reads unchanged.
 */
import { dungeonDiscoveryId } from './exploration.js';
import { countItem, removeItem } from './inventory.js';
import { DUNGEON_KEY_ITEM, EntityId, ItemRoll, dungeonSpecFromRoll, keyForgePrice, keyUsesForTier, keyUsesLeft, mintKeyPower, sanitizeKeyLabel } from '@arx/shared';
import type { GameServer, PlayerComp } from './gameServer.js';

/**
 * Mint a whole fresh key roll: common tier, a dungeon nobody has
 * ever walked, full use budget. The landing place for every legacy
 * roll-less key (pre-ring shop stock, /give, counted bank stacks) —
 * a shelf of seed-0 twins becomes real, distinct dungeons.
 */
export function mintFreshKeyRoll(srv: GameServer, ): ItemRoll {
  const seed = Math.floor(Math.random() * 0x100000000) >>> 0;
  return { rar: 'common', seed, pwr: mintKeyPower('common', seed), uses: keyUsesForTier('common') };
}

/**
 * A dungeon key lands on the ring — never in the pack. The ring has
 * no cap, so this cannot fail: a key found in the field always has
 * a place to go. Returns the new ring row.
 */
export function addKeyToRing(srv: GameServer, 
  player: PlayerComp,
  roll: ItemRoll | undefined,
  sync = true, // batch callers land many, then send the mirror once
): { id: number; roll: ItemRoll } {
  const row = { id: srv.nextKeyRingId++, roll: roll ? { ...roll } : srv.mintFreshKeyRoll() };
  player.keyRing.push(row);
  player.keyRingDirty = true;
  // THE KEY LEDGER: the moment a door is held, it is known forever.
  srv.recordKeyLore(player, row.roll, sync);
  if (sync) srv.sendKeyRing(player);
  return row;
}

/**
 * THE MARGIN NOTE: name (or clear) a ledgered door. The label is the
 * reader's own — it never rides a traded key, and the server re-runs
 * the shared sanitizer whatever the client showed.
 */
export function keyLabel(srv: GameServer, eid: EntityId, seed: number, label: string | undefined): void {
  const player = srv.players.get(eid);
  if (!player) return;
  const lore = player.keyLore.get(seed >>> 0);
  if (!lore) return;
  const clean = label === undefined || label.trim() === '' ? null : sanitizeKeyLabel(label);
  if (clean === null && label !== undefined && label.trim() !== '') {
    player.session?.sendJson({
      t: 'chat',
      channel: 'system',
      text: 'That label will not take — 2 to 24 plain characters.',
    });
    return;
  }
  if (clean === null) delete lore.label;
  else lore.label = clean;
  if (player.characterId > 0) srv.accounts.labelKeyLore(player.characterId, lore.seed, clean);
  srv.sendKeyLore(player);
}

/**
 * THE KEYWRIGHT CLOSES THE LOOP: pay the fee, and a ledgered door is
 * cut again — full fresh budget of turns, the same halls to the last
 * stalagmite (the seed IS the dungeon). Refusals are spoken: away
 * from the bench, an unknown door, a copy still on the ring (THE ONE
 * COPY — the forge is a safety net, never a duplicator), or a light
 * purse. The wear economy stands; a loved door is only expensive,
 * never lost.
 */
export function keyForge(srv: GameServer, eid: EntityId, seed: number): void {
  const player = srv.players.get(eid);
  if (!player || player.session === null) return;
  if (!srv.keywrightNear(eid)) {
    srv.speak(player, 'Needs the Keywright', 'Only the Keywright can cut a remembered door.');
    return;
  }
  const lore = player.keyLore.get(seed >>> 0);
  if (!lore) {
    srv.speak(player, 'Unknown door', 'You have never held that key — the ledger holds only what your hands have known.');
    return;
  }
  if (player.keyRing.some((k) => (k.roll.seed >>> 0) === lore.seed)) {
    srv.speak(player, 'Already on your ring', 'That key still hangs on your ring — the forge cuts lost doors, not copies.');
    return;
  }
  const price = keyForgePrice(lore.rar);
  const coins = countItem(player.inventory, 'coins');
  if (coins < price) {
    srv.speak(player, `Needs ${price} coins`, `The Keywright asks ${price} coins for that cut — you carry ${coins}.`);
    return;
  }
  removeItem(player.inventory, 'coins', price);
  const roll: ItemRoll = { rar: lore.rar, seed: lore.seed, uses: keyUsesForTier(lore.rar) };
  if (lore.pwr !== undefined) roll.pwr = lore.pwr;
  srv.addKeyToRing(player, roll);
  player.session.sendJson({ t: 'inv', slots: player.inventory });
  const spec = dungeonSpecFromRoll(roll);
  player.session.sendJson({
    t: 'chat',
    channel: 'system',
    text: `The Keywright's file sings. ${spec.name} (${spec.sigil}) hangs whole on your ring again — ${price} coins, fairly cut.`,
  });
}

/**
 * THE WORN WARD's last beat: a key at zero uses crumbles once the
 * run it paid for no longer stands. Called after every teardown and
 * at login (a run never survives a restart). Spares the key whose
 * seed matches the character's LIVE instance — the door it opened
 * is still open, and it must keep working until that door closes.
 */
export function sweepWornKeys(srv: GameServer, player: PlayerComp): void {
  const liveSeed = srv.dungeons.get(player.characterId)?.seed;
  let crumbled = 0;
  for (let i = player.keyRing.length - 1; i >= 0; i--) {
    const row = player.keyRing[i]!;
    if (keyUsesLeft(row.roll) > 0) continue;
    if (row.roll.seed === liveSeed) continue;
    player.keyRing.splice(i, 1);
    crumbled++;
  }
  if (crumbled === 0) return;
  player.keyRingDirty = true;
  srv.sendKeyRing(player);
  srv.speak(
    player,
    crumbled === 1 ? 'A key crumbles' : `${crumbled} keys crumble`,
    crumbled === 1
      ? 'A worn-through dungeon key crumbles from your ring — its last door has closed.'
      : `${crumbled} worn-through dungeon keys crumble from your ring — their last doors have closed.`,
  );
}

/**
 * THE KEY LEAVES THE RING: drop a key at the feet as an ordinary
 * ground item — the ONE way keys trade hands. The parcel carries
 * the full roll, worn uses included; whoever picks it up receives
 * it straight onto their own ring.
 */
export function keyDrop(srv: GameServer, eid: EntityId, keyId: number): void {
  const player = srv.players.get(eid);
  const pos = srv.positions.get(eid);
  if (!player || !pos) return;
  const idx = player.keyRing.findIndex((k) => k.id === keyId);
  if (idx === -1) return;
  const [row] = player.keyRing.splice(idx, 1);
  player.keyRingDirty = true;
  srv.sendKeyRing(player);
  // Land the key a step ahead of the player, dropItem's own grammar —
  // a wall in the way puts it at their feet instead of in the masonry.
  let dx = pos.x + Math.cos(pos.dir) * 0.9;
  let dy = pos.y + Math.sin(pos.dir) * 0.9;
  if (srv.worldOf(pos.plane).isSolid(Math.floor(dx), Math.floor(dy))) {
    dx = pos.x;
    dy = pos.y;
  }
  srv.placeDrop(pos.plane, DUNGEON_KEY_ITEM, 1, dx, dy, {
    ownerEid: null,
    ownerUntil: 0,
    despawnAt: Date.now() + 12 * 60_000,
    pickupAfter: Date.now() + 2000,
    roll: row!.roll,
  });
  const spec = dungeonSpecFromRoll(row!.roll);
  player.session?.sendJson({
    t: 'chat',
    channel: 'system',
    text: `You set down the key to ${spec.name} (${spec.sigil}).`,
  });
}

/**
 * Turn the key named by ring id. Re-entering the run this key
 * already paid for is free — the door is open. A different key (or
 * a fresh turn of the same key after its run closed) is a FRESH
 * CUT: the old instance dies, the new one is cut from the seed, and
 * THE WORN WARD spends one use. A key at zero uses can only walk
 * back through its own standing door; once that door closes, it
 * crumbles (sweepWornKeys).
 */
export function useKey(srv: GameServer, eid: EntityId, keyId: number): void {
  const player = srv.players.get(eid);
  const pos = srv.positions.get(eid);
  if (!player || !pos || player.session === null) return;
  const sys = (text: string) =>
    player.session!.sendJson({ t: 'chat', channel: 'system', text });
  const gate = srv.riftgateNear(pos);
  if (!gate) {
    srv.speak(player, 'Needs a Riftgate', 'You need to stand at a Riftgate to turn a dungeon key.');
    return;
  }
  const row = player.keyRing.find((k) => k.id === keyId);
  if (!row) {
    sys('That key is not on your ring.');
    return;
  }
  const spec = dungeonSpecFromRoll(row.roll);
  const inst = srv.dungeons.get(player.characterId);
  const reenter =
    !!inst && inst.seed === spec.seed && inst.tier === spec.tier && inst.power === spec.power;
  if (!reenter && keyUsesLeft(row.roll) <= 0) {
    srv.speak(
      player,
      'The key is spent',
      `The key to ${spec.name} is worn through — its ward has nothing left to open.`,
    );
    return;
  }
  // A gate a key has turned at is a place worth keeping: pin it on
  // the map forever. The threshold banner is the ceremony here — the
  // client shows no discovery splash for the 'dungeon' kind.
  const gateId = dungeonDiscoveryId(gate.x, gate.y);
  if (!player.discoveries.has(gateId)) {
    srv.recordDiscovery(player, {
      id: gateId,
      kind: 'dungeon',
      name: 'Riftgate',
      x: gate.x,
      y: gate.y,
      // The gate pins on the chart of the plane it stands on — the
      // first underworld-authored riftgate must not misfile onto
      // the surface's parchment.
      plane: pos.plane,
    });
  }
  srv.enterDungeon(eid, player, spec, { plane: pos.plane, x: pos.x, y: pos.y });
  if (!reenter) {
    // THE WORN WARD: the fresh cut spends one use, stamped onto the
    // roll so the wear rides every save, drop, and trade.
    row.roll.uses = Math.max(0, keyUsesLeft(row.roll) - 1);
    player.keyRingDirty = true;
    srv.sendKeyRing(player);
    // The key swap tore the previous run down — any key that was
    // only alive because that door stood open crumbles now.
    srv.sweepWornKeys(player);
  }
}
