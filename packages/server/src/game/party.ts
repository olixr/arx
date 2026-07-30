import { PARTY_CAP } from '@arx/shared';
import type { S2CMessage } from '@arx/shared';
import type { AccountStore } from '../db/accounts.js';

/** An unanswered invite goes cold after this long. */
export const INVITE_TTL_MS = 120_000;

/**
 * What the party system needs from the live world. Kept narrow so the
 * system tests against a stub instead of the whole GameServer.
 */
export interface PartyHost {
  /** Non-null while that character stands in the world. */
  isOnline(characterId: number): boolean;
  /** Zone name for an online character; null when they can't be placed. */
  zoneOfCharacter(characterId: number): string | null;
  /** Deliver a message to that character's session; false if offline. */
  sendToCharacter(characterId: number, msg: S2CMessage): boolean;
  /** Live position of an online character; null when they can't be placed. */
  positionOfCharacter(characterId: number): { x: number; y: number } | null;
  /**
   * A character just stopped being party to `ofPartyWith` (left, kicked,
   * or the party dissolved) — the world evicts them from any fellow's
   * dungeon they were guesting in.
   */
  onMemberSevered(characterId: number): void;
}

/** The runtime picture of one party. Join order decides succession. */
interface PartyRecord {
  id: number;
  leaderId: number;
  /** Character ids in join order — index 0 is the longest-sworn. */
  members: number[];
}

/**
 * Fellowships. Membership is durable (survives logout — it ends only by
 * a deliberate leave/kick/disband, or a party thinning to one); invites
 * are in-memory and die with the evening. Memory is the runtime
 * authority: state loads once per character (ensureLoaded) and every
 * mutation writes through to the ledger the moment it happens. Clients
 * follow the social law — thin `partyevent` pushes, then a snapshot
 * refetch; they never patch membership from events.
 */
export class PartySystem {
  /** partyId -> record. */
  private readonly parties = new Map<number, PartyRecord>();
  /** characterId -> partyId, for everyone in a loaded party. */
  private readonly memberIndex = new Map<number, number>();
  /** Characters whose durable party state has been pulled into memory. */
  private readonly loaded = new Set<number>();
  /** toId -> (fromId -> expiry ms). */
  private readonly invites = new Map<number, Map<number, number>>();

  constructor(
    private readonly accounts: AccountStore,
    private readonly host: PartyHost,
    private readonly now: () => number = Date.now,
  ) {}

  /** Pull a character's durable party into memory, once. */
  async ensureLoaded(characterId: number): Promise<void> {
    if (this.loaded.has(characterId)) return;
    this.loaded.add(characterId);
    if (this.memberIndex.has(characterId)) return;
    const stored = await this.accounts.loadPartyOf(characterId);
    if (!stored) return;
    // A member may have loaded this party already from another door.
    if (this.parties.has(stored.id)) return;
    const record: PartyRecord = {
      id: stored.id,
      leaderId: stored.leaderId,
      members: stored.members.map((m) => m.id),
    };
    this.parties.set(record.id, record);
    for (const id of record.members) {
      this.memberIndex.set(id, record.id);
      this.loaded.add(id);
    }
  }

  /** The party this character is sworn to, or null. Memory-only — callers ensureLoaded first. */
  partyOf(characterId: number): PartyRecord | null {
    const pid = this.memberIndex.get(characterId);
    return pid === undefined ? null : (this.parties.get(pid) ?? null);
  }

  /** Fellow member ids (self excluded); [] when partyless. */
  fellowsOf(characterId: number): number[] {
    const party = this.partyOf(characterId);
    if (!party) return [];
    return party.members.filter((id) => id !== characterId);
  }

  /** Full snapshot: members decorated with presence, plus both invite lists. */
  async snapshot(selfId: number, send: (msg: S2CMessage) => void): Promise<void> {
    await this.ensureLoaded(selfId);
    this.pruneInvites();
    const party = this.partyOf(selfId);
    const members = (party?.members ?? []).map((id) => {
      const online = this.host.isOnline(id);
      return {
        name: this.accounts.characterName(id) ?? 'Unknown',
        online,
        leader: party!.leaderId === id ? true : undefined,
        zone: online ? (this.host.zoneOfCharacter(id) ?? undefined) : undefined,
      };
    });
    const invites: string[] = [];
    for (const fromId of this.invites.get(selfId)?.keys() ?? []) {
      const name = this.accounts.characterName(fromId);
      if (name) invites.push(name);
    }
    const outgoing: string[] = [];
    for (const [toId, froms] of this.invites) {
      if (froms.has(selfId)) {
        const name = this.accounts.characterName(toId);
        if (name) outgoing.push(name);
      }
    }
    send({ t: 'party', members, invites, outgoing });
  }

  async invite(selfId: number, selfName: string, name: string, send: (msg: S2CMessage) => void): Promise<void> {
    const notice = (text: string) => send({ t: 'chat', channel: 'system', text });
    const target = await this.accounts.findCharacterByName(name.trim());
    if (!target) return notice('No one by that name.');
    if (target.id === selfId) return notice("That's you.");
    if (!this.host.isOnline(target.id)) return notice(`${target.name} is not in the world right now.`);
    await this.ensureLoaded(selfId);
    await this.ensureLoaded(target.id);
    if (this.partyOf(target.id)) return notice(`${target.name} already walks with a party.`);
    const party = this.partyOf(selfId);
    if (party && party.members.length >= PARTY_CAP) return notice('Your party is full.');
    this.pruneInvites();
    const pending = this.invites.get(target.id);
    if (pending?.has(selfId)) return notice(`You have already asked ${target.name}.`);
    const froms = pending ?? new Map<number, number>();
    froms.set(selfId, this.now() + INVITE_TTL_MS);
    this.invites.set(target.id, froms);
    notice(`Party invite sent to ${target.name}.`);
    this.host.sendToCharacter(target.id, { t: 'partyevent', kind: 'invite', name: selfName });
    await this.snapshot(selfId, send);
  }

  async accept(selfId: number, selfName: string, name: string, send: (msg: S2CMessage) => void): Promise<void> {
    const notice = (text: string) => send({ t: 'chat', channel: 'system', text });
    const inviter = await this.accounts.findCharacterByName(name.trim());
    if (!inviter) return notice('No one by that name.');
    this.pruneInvites();
    const pending = this.invites.get(selfId);
    if (!pending?.has(inviter.id)) return notice(`No party invite from ${inviter.name}.`);
    await this.ensureLoaded(selfId);
    if (this.partyOf(selfId)) return notice('Leave your party first.');
    pending.delete(inviter.id);
    if (pending.size === 0) this.invites.delete(selfId);
    await this.ensureLoaded(inviter.id);
    let party = this.partyOf(inviter.id);
    if (party) {
      if (party.members.length >= PARTY_CAP) return notice(`${inviter.name}'s party is full.`);
      if (!(await this.accounts.addPartyMember(party.id, selfId))) {
        return notice('The party would not have you — try again.');
      }
      party.members.push(selfId);
      this.memberIndex.set(selfId, party.id);
    } else {
      const id = await this.accounts.createParty(inviter.id, selfId);
      if (id === null) return notice('The party would not form — try again.');
      party = { id, leaderId: inviter.id, members: [inviter.id, selfId] };
      this.parties.set(id, party);
      this.memberIndex.set(inviter.id, id);
      this.memberIndex.set(selfId, id);
    }
    // Anyone who was courting the newly-sworn stops being answerable.
    this.invites.delete(selfId);
    notice(`You walk with ${inviter.name}'s party now.`);
    for (const id of party.members) {
      if (id === selfId) continue;
      this.host.sendToCharacter(id, { t: 'partyevent', kind: 'joined', name: selfName });
    }
    // Mutations await ledger writes, so a client's follow-up snapshot
    // ask can slip in FRONT of the change (unlike social, whose writes
    // are synchronous fires). The action answers with its own fresh
    // snapshot instead — the ask-again law still holds for observers.
    await this.snapshot(selfId, send);
  }

  async decline(selfId: number, selfName: string, name: string, send: (msg: S2CMessage) => void): Promise<void> {
    const notice = (text: string) => send({ t: 'chat', channel: 'system', text });
    const inviter = await this.accounts.findCharacterByName(name.trim());
    if (!inviter) return notice('No one by that name.');
    const pending = this.invites.get(selfId);
    if (!pending?.delete(inviter.id)) return;
    if (pending.size === 0) this.invites.delete(selfId);
    // Quiet on their side — the event only refreshes their ledger.
    this.host.sendToCharacter(inviter.id, { t: 'partyevent', kind: 'declined', name: selfName });
    await this.snapshot(selfId, send);
  }

  async leave(selfId: number, selfName: string, send: (msg: S2CMessage) => void): Promise<void> {
    const notice = (text: string) => send({ t: 'chat', channel: 'system', text });
    await this.ensureLoaded(selfId);
    const party = this.partyOf(selfId);
    if (!party) return notice('You walk alone already.');
    this.sever(party, selfId);
    notice('You leave the party.');
    this.afterSever(party, selfId, selfName, 'left');
    await this.snapshot(selfId, send);
  }

  async kick(selfId: number, selfName: string, name: string, send: (msg: S2CMessage) => void): Promise<void> {
    const notice = (text: string) => send({ t: 'chat', channel: 'system', text });
    await this.ensureLoaded(selfId);
    const party = this.partyOf(selfId);
    if (!party) return notice('You walk alone.');
    if (party.leaderId !== selfId) return notice('Only the party leader may do that.');
    const target = await this.accounts.findCharacterByName(name.trim());
    if (!target || !party.members.includes(target.id)) return notice('No such member.');
    if (target.id === selfId) return notice('Use disband, or hand the party its leave.');
    this.sever(party, target.id);
    notice(`${target.name} removed from the party.`);
    this.host.sendToCharacter(target.id, { t: 'partyevent', kind: 'kicked', name: selfName });
    this.afterSever(party, target.id, target.name, 'left');
    await this.snapshot(selfId, send);
  }

  async disband(selfId: number, send: (msg: S2CMessage) => void): Promise<void> {
    const notice = (text: string) => send({ t: 'chat', channel: 'system', text });
    await this.ensureLoaded(selfId);
    const party = this.partyOf(selfId);
    if (!party) return notice('You walk alone.');
    if (party.leaderId !== selfId) return notice('Only the party leader may do that.');
    this.dissolve(party, selfId);
    notice('The party is disbanded.');
    await this.snapshot(selfId, send);
  }

  /** Cut one member out of the record + ledger (no pushes — callers narrate). */
  private sever(party: PartyRecord, characterId: number): void {
    party.members = party.members.filter((id) => id !== characterId);
    this.memberIndex.delete(characterId);
    this.accounts.removePartyMember(characterId);
    this.host.onMemberSevered(characterId);
  }

  /**
   * After a sever: tell the remnant, hand the reins on if the leader
   * left, and fold a party of one — a fellowship needs two.
   */
  private afterSever(party: PartyRecord, goneId: number, goneName: string, kind: 'left'): void {
    if (party.members.length < 2) {
      this.dissolve(party, null);
      return;
    }
    if (party.leaderId === goneId) {
      party.leaderId = party.members[0]!;
      this.accounts.setPartyLeader(party.id, party.leaderId);
    }
    for (const id of party.members) {
      this.host.sendToCharacter(id, { t: 'partyevent', kind, name: goneName });
    }
  }

  /** End the whole party. `quietId` already got their answer as a notice. */
  private dissolve(party: PartyRecord, quietId: number | null): void {
    for (const id of party.members) {
      this.memberIndex.delete(id);
      this.host.onMemberSevered(id);
      if (id !== quietId) {
        this.host.sendToCharacter(id, { t: 'partyevent', kind: 'disbanded', name: '' });
      }
    }
    party.members = [];
    this.parties.delete(party.id);
    this.accounts.disbandParty(party.id);
  }

  /** Tell the fellowship this character just truly arrived. */
  async notifyOnline(characterId: number, name: string): Promise<void> {
    await this.ensureLoaded(characterId);
    for (const id of this.fellowsOf(characterId)) {
      this.host.sendToCharacter(id, { t: 'partyevent', kind: 'online', name });
    }
  }

  /** Tell the fellowship this character truly left (post-grace). */
  async notifyOffline(characterId: number, name: string): Promise<void> {
    for (const id of this.fellowsOf(characterId)) {
      this.host.sendToCharacter(id, { t: 'partyevent', kind: 'offline', name });
    }
  }

  /** A member cut a dungeon open — offer the fellowship the door. */
  notifyDelve(characterId: number, name: string, dungeonName: string): void {
    for (const id of this.fellowsOf(characterId)) {
      this.host.sendToCharacter(id, { t: 'partyevent', kind: 'delve', name, detail: dungeonName });
    }
  }

  /**
   * The slow position ticker: every online member learns where their
   * online fellows stand. Navigation state only — never gameplay truth.
   */
  tickPositions(): void {
    for (const party of this.parties.values()) {
      const placed: Array<{ id: number; name: string; x: number; y: number }> = [];
      for (const id of party.members) {
        if (!this.host.isOnline(id)) continue;
        const pos = this.host.positionOfCharacter(id);
        const name = this.accounts.characterName(id);
        if (!pos || !name) continue;
        placed.push({ id, name, x: Math.round(pos.x * 10) / 10, y: Math.round(pos.y * 10) / 10 });
      }
      if (placed.length < 2) continue;
      for (const self of placed) {
        this.host.sendToCharacter(self.id, {
          t: 'partypos',
          members: placed.filter((m) => m.id !== self.id).map(({ name, x, y }) => ({ name, x, y })),
        });
      }
    }
  }

  /** Sweep cold invites. */
  private pruneInvites(): void {
    const now = this.now();
    for (const [toId, froms] of this.invites) {
      for (const [fromId, expiry] of froms) {
        if (expiry <= now) froms.delete(fromId);
      }
      if (froms.size === 0) this.invites.delete(toId);
    }
  }
}
