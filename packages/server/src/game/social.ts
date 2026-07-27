import type { S2CMessage } from '@devcraft/shared';
import type { AccountStore } from '../db/accounts.js';

/** The most friends one ledger holds — a growth guard, not a feature. */
export const FRIEND_CAP = 100;

/**
 * What the social system needs from the live world. Kept narrow so the
 * system tests against a stub instead of the whole GameServer.
 */
export interface SocialHost {
  /** Non-null while that character stands in the world. */
  isOnline(characterId: number): boolean;
  /** Zone name for an online character; null when they can't be placed. */
  zoneOfCharacter(characterId: number): string | null;
  /** Deliver a message to that character's session; false if offline. */
  sendToCharacter(characterId: number, msg: S2CMessage): boolean;
}

/**
 * Friendships and requests. Every mutation writes the DB the moment it
 * happens (the durable-at-the-handler house rule), then pushes a thin
 * `friendevent` to the counterpart if they're online — clients refetch
 * the snapshot rather than patching state from events.
 *
 * Requests are directional; a request meeting an existing request from
 * the other side auto-accepts, so between two characters at most one
 * pending direction ever exists — which is what lets `decline` also
 * serve as "cancel my outgoing ask" without ambiguity.
 */
export class SocialSystem {
  constructor(
    private readonly accounts: AccountStore,
    private readonly host: SocialHost,
  ) {}

  /** Full snapshot: friends decorated with presence, plus both request lists. */
  snapshot(selfId: number, send: (msg: S2CMessage) => void): void {
    const friends = this.accounts.loadFriends(selfId).map((f) => {
      const online = this.host.isOnline(f.id);
      const zone = online ? (this.host.zoneOfCharacter(f.id) ?? undefined) : undefined;
      return { name: f.name, online, zone };
    });
    const requests = this.accounts.loadFriendRequests(selfId);
    send({
      t: 'social',
      friends,
      incoming: requests.incoming.map((r) => r.name),
      outgoing: requests.outgoing.map((r) => r.name),
    });
  }

  search(selfId: number, query: string, send: (msg: S2CMessage) => void): void {
    const q = query.trim();
    if (q.length < 2) {
      send({ t: 'friendsearch', results: [] });
      return;
    }
    const results = this.accounts.searchCharacters(q, selfId, 10).map((c) => ({
      name: c.name,
      online: this.host.isOnline(c.id),
    }));
    send({ t: 'friendsearch', results });
  }

  request(selfId: number, selfName: string, name: string, send: (msg: S2CMessage) => void): void {
    const notice = (text: string) => send({ t: 'chat', channel: 'system', text });
    const target = this.accounts.findCharacterByName(name.trim());
    if (!target) return notice('No one by that name.');
    if (target.id === selfId) return notice("That's you.");
    if (this.accounts.areFriends(selfId, target.id)) {
      return notice(`You are already friends with ${target.name}.`);
    }
    if (this.accounts.countFriends(selfId) >= FRIEND_CAP) {
      return notice('Your friend ledger is full.');
    }
    if (this.accounts.countFriends(target.id) >= FRIEND_CAP) {
      return notice(`${target.name}'s friend ledger is full.`);
    }
    if (this.accounts.hasFriendRequest(selfId, target.id)) {
      return notice(`You have already asked ${target.name}.`);
    }
    if (this.accounts.hasFriendRequest(target.id, selfId)) {
      // They asked first — two open hands make a handshake.
      this.accounts.addFriendship(selfId, target.id);
      notice(`You are now friends with ${target.name}.`);
      this.host.sendToCharacter(target.id, { t: 'friendevent', kind: 'accepted', name: selfName });
      return;
    }
    this.accounts.createFriendRequest(selfId, target.id);
    notice(`Friend request sent to ${target.name}.`);
    this.host.sendToCharacter(target.id, { t: 'friendevent', kind: 'request', name: selfName });
  }

  accept(selfId: number, selfName: string, name: string, send: (msg: S2CMessage) => void): void {
    const notice = (text: string) => send({ t: 'chat', channel: 'system', text });
    const target = this.accounts.findCharacterByName(name.trim());
    if (!target) return notice('No one by that name.');
    // The gate doubles as the withdrawn-moments-ago race guard.
    if (!this.accounts.hasFriendRequest(target.id, selfId)) {
      return notice(`No pending request from ${target.name}.`);
    }
    this.accounts.addFriendship(selfId, target.id);
    notice(`You are now friends with ${target.name}.`);
    this.host.sendToCharacter(target.id, { t: 'friendevent', kind: 'accepted', name: selfName });
  }

  /** Decline an incoming ask — or withdraw your own outgoing one. */
  decline(selfId: number, selfName: string, name: string, send: (msg: S2CMessage) => void): void {
    const notice = (text: string) => send({ t: 'chat', channel: 'system', text });
    const target = this.accounts.findCharacterByName(name.trim());
    if (!target) return notice('No one by that name.');
    if (this.accounts.deleteFriendRequest(target.id, selfId)) {
      // Declined quietly on their side — the event only refreshes their ledger.
      this.host.sendToCharacter(target.id, { t: 'friendevent', kind: 'declined', name: selfName });
      return;
    }
    if (this.accounts.deleteFriendRequest(selfId, target.id)) {
      notice(`Request to ${target.name} withdrawn.`);
      this.host.sendToCharacter(target.id, { t: 'friendevent', kind: 'declined', name: selfName });
    }
  }

  remove(selfId: number, selfName: string, name: string, send: (msg: S2CMessage) => void): void {
    const notice = (text: string) => send({ t: 'chat', channel: 'system', text });
    const target = this.accounts.findCharacterByName(name.trim());
    if (!target) return notice('No one by that name.');
    if (!this.accounts.areFriends(selfId, target.id)) {
      return notice(`${target.name} is not on your friend ledger.`);
    }
    this.accounts.removeFriendship(selfId, target.id);
    notice(`${target.name} removed from your friends.`);
    this.host.sendToCharacter(target.id, { t: 'friendevent', kind: 'removed', name: selfName });
  }

  /** Tell every online friend this character just truly arrived. */
  notifyOnline(characterId: number, name: string): void {
    for (const f of this.accounts.loadFriends(characterId)) {
      this.host.sendToCharacter(f.id, { t: 'friendevent', kind: 'online', name });
    }
  }

  /** Tell every online friend this character truly left (post-grace). */
  notifyOffline(characterId: number, name: string): void {
    for (const f of this.accounts.loadFriends(characterId)) {
      this.host.sendToCharacter(f.id, { t: 'friendevent', kind: 'offline', name });
    }
  }

  /** Pending incoming count, for the login nudge line. */
  pendingCount(characterId: number): number {
    return this.accounts.loadFriendRequests(characterId).incoming.length;
  }
}
