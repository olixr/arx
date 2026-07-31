import type { WebSocket } from 'ws';
import {
  MAX_CHAT_LENGTH,
  MAX_NAME_LENGTH,
  PROTOCOL_VERSION,
  parseC2S,
  sanitizeInputFrame,
  type EntityId,
  type S2CMessage,
} from '@arx/shared';
import { config } from '../config.js';
import { ipGuard } from './ipGuard.js';
import { TokenBucket } from './rateLimiter.js';
import type { GameServer } from '../game/gameServer.js';

let nextSessionId = 1;

/**
 * One WebSocket connection. Handles handshake, message validation, and
 * per-connection rate limiting; hands validated intents to the GameServer.
 */
export class Session {
  readonly id = nextSessionId++;
  playerEid: EntityId | null = null;

  /**
   * Transport RTT measured with ws protocol pings (EWMA, ms). Feeds
   * melee lag compensation — no game-protocol message involved.
   */
  rttMs = 0;
  private pingSentAt = 0;
  private pingTimer: ReturnType<typeof setInterval> | null = null;

  /** Entities this client currently knows about (interest set). */
  readonly knownEntities = new Set<EntityId>();

  /** Chunk keys currently streamed to this client. */
  readonly knownChunks = new Set<string>();

  /**
   * The player's own chunk last tick — discovery checks run on this
   * edge (a 32-tile cadence), never per tick. Null forces a check on
   * the first interest pass after a bind.
   */
  lastCenterChunk: string | null = null;

  private readonly inputBucket = new TokenBucket(25, 50);
  private readonly chatBucket = new TokenBucket(1, 4);
  private readonly miscBucket = new TokenBucket(10, 20);
  private readonly authBucket = new TokenBucket(0.3, 5);
  private abuseStrikes = 0;
  private closed = false;

  // Fake-lag scheduling must stay monotonic per direction — real TCP
  // never reorders, so the simulator must not either.
  private lastInAt = 0;
  private lastOutAt = 0;

  constructor(
    private readonly ws: WebSocket,
    private readonly game: GameServer,
    private readonly ip: string = 'local',
  ) {
    ws.on('message', (data, isBinary) => {
      if (isBinary) return; // clients only send JSON control messages
      const raw = data.toString();
      if (raw.length > 4096) return this.strike();
      if (config.fakeLagMs > 0) {
        const at = Math.max(performance.now() + fakeDelay(), this.lastInAt);
        this.lastInAt = at;
        setTimeout(() => this.handleRaw(raw), at - performance.now());
      } else {
        this.handleRaw(raw);
      }
    });
    ws.on('close', () => {
      this.closed = true;
      if (this.pingTimer) clearInterval(this.pingTimer);
      if (this.playerEid !== null) this.game.onSessionClosed(this);
    });
    ws.on('error', () => ws.close());
    // Protocol-level ping/pong rides UNDER the fake-lag simulator, so
    // it measures the true socket RTT; viewRttMs adds the simulated
    // part back so lag comp behaves the same in fake-lag testing.
    ws.on('pong', () => {
      if (this.pingSentAt === 0) return;
      const rtt = performance.now() - this.pingSentAt;
      this.rttMs = this.rttMs === 0 ? rtt : this.rttMs * 0.7 + rtt * 0.3;
    });
    this.pingTimer = setInterval(() => {
      if (ws.readyState === ws.OPEN) {
        this.pingSentAt = performance.now();
        ws.ping();
      }
    }, 3000);
  }

  /** RTT as the CLIENT experiences it (real + simulated fake lag). */
  get viewRttMs(): number {
    return this.rttMs + (config.fakeLagMs > 0 ? config.fakeLagMs + config.fakeJitterMs : 0);
  }

  private handleRaw(raw: string): void {
    if (this.closed) return;
    const msg = parseC2S(raw);
    if (msg === null) return this.strike();

    switch (msg.t) {
      case 'hello': {
        if (this.playerEid !== null) return this.strike();
        if (msg.v !== PROTOCOL_VERSION) {
          this.sendJson({ t: 'reject', reason: `protocol version mismatch (server ${PROTOCOL_VERSION})` });
          this.ws.close();
          return;
        }
        // A hello with a token or name does DB/spawn work — budgeted
        // like any auth attempt. A bare hello just gets authRequired.
        if ((msg.token || msg.name) && !this.allowAuthAttempt()) return;
        void this.game.hello(this, { name: msg.name, token: msg.token })
          .catch((err: Error) => console.error('[auth]', err.message));
        return;
      }
      case 'login': {
        if (this.playerEid !== null) return this.strike();
        if (!this.allowAuthAttempt()) return;
        void this.game.login(this, msg.user, msg.pass)
          .catch((err: Error) => console.error('[auth]', err.message));
        return;
      }
      case 'register': {
        if (this.playerEid !== null) return this.strike();
        if (!this.allowAuthAttempt()) return;
        void this.game.register(this, msg.user, msg.pass, msg.name, msg.invite)
          .catch((err: Error) => console.error('[auth]', err.message));
        return;
      }
      case 'input': {
        if (this.playerEid === null) return;
        if (!this.inputBucket.consume()) return; // drop silently; TCP bursts happen
        this.game.queueInput(this.playerEid, sanitizeInputFrame(msg.frame), msg.viewMs);
        return;
      }
      case 'chat': {
        if (this.playerEid === null) return;
        if (!this.chatBucket.consume()) {
          this.sendJson({ t: 'chat', channel: 'system', text: 'You are talking too fast.' });
          return;
        }
        const text = msg.text.trim().slice(0, MAX_CHAT_LENGTH);
        if (text.length === 0) return;
        this.game.chat(this.playerEid, text);
        return;
      }
      case 'ping': {
        if (!this.miscBucket.consume()) return;
        this.sendJson({ t: 'pong', ct: msg.ct, tick: this.game.tickCount });
        return;
      }
      case 'interact': {
        if (this.playerEid === null) return;
        if (!this.miscBucket.consume()) return;
        this.game.interact(this.playerEid, msg.tx, msg.ty);
        return;
      }
      case 'social': {
        if (this.playerEid === null) return;
        if (!this.miscBucket.consume()) return;
        this.game.socialSnapshot(this.playerEid, this);
        return;
      }
      case 'friendsearch': {
        if (this.playerEid === null) return;
        if (!this.miscBucket.consume()) return;
        this.game.friendSearch(this.playerEid, this, msg.query);
        return;
      }
      case 'friendrequest': {
        if (this.playerEid === null) return;
        if (!this.miscBucket.consume()) return;
        this.game.friendRequest(this.playerEid, this, msg.name);
        return;
      }
      case 'friendaccept': {
        if (this.playerEid === null) return;
        if (!this.miscBucket.consume()) return;
        this.game.friendAccept(this.playerEid, this, msg.name);
        return;
      }
      case 'frienddecline': {
        if (this.playerEid === null) return;
        if (!this.miscBucket.consume()) return;
        this.game.friendDecline(this.playerEid, this, msg.name);
        return;
      }
      case 'friendremove': {
        if (this.playerEid === null) return;
        if (!this.miscBucket.consume()) return;
        this.game.friendRemove(this.playerEid, this, msg.name);
        return;
      }
      case 'party': {
        if (this.playerEid === null) return;
        if (!this.miscBucket.consume()) return;
        this.game.partySnapshot(this.playerEid, this);
        return;
      }
      case 'partyinvite': {
        if (this.playerEid === null) return;
        if (!this.miscBucket.consume()) return;
        this.game.partyInvite(this.playerEid, this, msg.name);
        return;
      }
      case 'partyaccept': {
        if (this.playerEid === null) return;
        if (!this.miscBucket.consume()) return;
        this.game.partyAccept(this.playerEid, this, msg.name);
        return;
      }
      case 'partydecline': {
        if (this.playerEid === null) return;
        if (!this.miscBucket.consume()) return;
        this.game.partyDecline(this.playerEid, this, msg.name);
        return;
      }
      case 'partyleave': {
        if (this.playerEid === null) return;
        if (!this.miscBucket.consume()) return;
        this.game.partyLeave(this.playerEid, this);
        return;
      }
      case 'partykick': {
        if (this.playerEid === null) return;
        if (!this.miscBucket.consume()) return;
        this.game.partyKick(this.playerEid, this, msg.name);
        return;
      }
      case 'partydisband': {
        if (this.playerEid === null) return;
        if (!this.miscBucket.consume()) return;
        this.game.partyDisband(this.playerEid, this);
        return;
      }
      case 'partyjoinrun': {
        if (this.playerEid === null) return;
        if (!this.miscBucket.consume()) return;
        this.game.partyJoinRun(this.playerEid, this, msg.name);
        return;
      }
      case 'use': {
        if (this.playerEid === null) return;
        if (!this.miscBucket.consume()) return;
        this.game.useItem(this.playerEid, msg.slot);
        return;
      }
      case 'signedit': {
        if (this.playerEid === null) return;
        if (!this.miscBucket.consume()) return;
        this.game.signEdit(this.playerEid, msg.tx, msg.ty, msg.title, msg.lines);
        return;
      }
      case 'unequip': {
        if (this.playerEid === null) return;
        if (!this.miscBucket.consume()) return;
        this.game.unequip(this.playerEid, msg.slot);
        return;
      }
      case 'invmove': {
        if (this.playerEid === null) return;
        if (!this.miscBucket.consume()) return;
        this.game.invMove(this.playerEid, msg.from, msg.to);
        return;
      }
      case 'dropitem': {
        if (this.playerEid === null) return;
        if (!this.miscBucket.consume()) return;
        this.game.dropItem(this.playerEid, msg.slot, msg.qty);
        return;
      }
      case 'unmake': {
        if (this.playerEid === null) return;
        if (!this.miscBucket.consume()) return;
        this.game.unmake(this.playerEid, msg.slot);
        return;
      }
      case 'sunder': {
        if (this.playerEid === null) return;
        if (!this.miscBucket.consume()) return;
        this.game.sunder(this.playerEid, msg.slot, msg.worn, msg.seat);
        return;
      }
      case 'craft': {
        if (this.playerEid === null) return;
        if (!this.miscBucket.consume()) return;
        this.game.craft(this.playerEid, msg.recipe, msg.qty);
        return;
      }
      case 'craftstop': {
        if (this.playerEid === null) return;
        if (!this.miscBucket.consume()) return;
        this.game.craftStop(this.playerEid);
        return;
      }
      case 'bank': {
        if (this.playerEid === null) return;
        if (!this.miscBucket.consume()) return;
        void this.game.bankOp(this.playerEid, msg.op, msg.item, msg.qty, msg.slot, msg.gearId)
          .catch((err: Error) => console.error('[bank]', err.message));
        return;
      }
      case 'shop': {
        if (this.playerEid === null) return;
        if (!this.miscBucket.consume()) return;
        this.game.shopOp(this.playerEid, msg.op, msg.item, msg.qty, msg.slot, msg.shop);
        return;
      }
      case 'build': {
        if (this.playerEid === null) return;
        if (!this.miscBucket.consume()) return;
        this.game.build(this.playerEid, msg.buildable, msg.tx, msg.ty, msg.orient);
        return;
      }
      case 'demolish': {
        if (this.playerEid === null) return;
        if (!this.miscBucket.consume()) return;
        this.game.demolish(this.playerEid, msg.tx, msg.ty);
        return;
      }
      case 'ownbuilt': {
        if (this.playerEid === null) return;
        if (!this.miscBucket.consume()) return;
        this.game.sendOwnBuilt(this.playerEid);
        return;
      }
      case 'plant': {
        if (this.playerEid === null) return;
        if (!this.miscBucket.consume()) return;
        this.game.plant(this.playerEid, msg.tx, msg.ty, msg.seed);
        return;
      }
      case 'interactnpc': {
        if (this.playerEid === null) return;
        if (!this.miscBucket.consume()) return;
        this.game.interactNpc(this.playerEid, msg.eid);
        return;
      }
      case 'pickup': {
        if (this.playerEid === null) return;
        if (!this.miscBucket.consume()) return;
        this.game.pickupDrop(this.playerEid, msg.eid);
        return;
      }
      case 'technique': {
        if (this.playerEid === null) return;
        if (!this.miscBucket.consume()) return;
        this.game.setTechnique(this.playerEid, msg.ability);
        return;
      }
      case 'calling': {
        if (this.playerEid === null) return;
        if (!this.miscBucket.consume()) return;
        this.game.setCalling(this.playerEid, msg.calling, msg.on);
        return;
      }
      case 'waypoint': {
        if (this.playerEid === null) return;
        if (!this.miscBucket.consume()) return;
        this.game.setWaypoint(this.playerEid, msg.x, msg.y);
        return;
      }
      case 'questabandon': {
        if (this.playerEid === null) return;
        if (!this.miscBucket.consume()) return;
        this.game.abandonQuest(this.playerEid, msg.quest);
        return;
      }
      case 'setlook': {
        if (this.playerEid === null) return;
        if (!this.miscBucket.consume()) return;
        this.game.setLook(this.playerEid, msg.look);
        return;
      }
      case 'carrystyle': {
        if (this.playerEid === null) return;
        if (!this.miscBucket.consume()) return;
        this.game.setCarryStyle(this.playerEid, msg.style, msg.hand ?? 'main');
        return;
      }
      case 'usekey': {
        if (this.playerEid === null) return;
        if (!this.miscBucket.consume()) return;
        this.game.useKey(this.playerEid, msg.slot);
        return;
      }
      case 'dlgadv': {
        if (this.playerEid === null) return;
        if (!this.miscBucket.consume()) return;
        this.game.dialogueAdvance(this.playerEid);
        return;
      }
      case 'dlgchoice': {
        if (this.playerEid === null) return;
        if (!this.miscBucket.consume()) return;
        this.game.dialogueChoose(this.playerEid, msg.idx);
        return;
      }
      case 'dlgend': {
        if (this.playerEid === null) return;
        if (!this.miscBucket.consume()) return;
        this.game.dialogueEnd(this.playerEid);
        return;
      }
    }
  }

  /**
   * One auth attempt clears BOTH throttles or neither: the
   * per-connection bucket stops single-socket hammering, the per-IP
   * bucket (shared across this address's sockets, surviving
   * reconnects) stops the reconnect-and-retry workaround.
   */
  private allowAuthAttempt(): boolean {
    if (this.authBucket.consume() && ipGuard.allowAuth(this.ip)) return true;
    this.sendJson({ t: 'authErr', reason: 'Too many attempts — wait a moment' });
    return false;
  }

  /** Malformed/abusive traffic: three strikes and the socket closes. */
  private strike(): void {
    this.abuseStrikes++;
    if (this.abuseStrikes >= 3) this.ws.close();
  }

  sendJson(msg: S2CMessage): void {
    this.sendRaw(JSON.stringify(msg));
  }

  sendBinary(buf: ArrayBuffer): void {
    this.sendRaw(buf);
  }

  private sendRaw(data: string | ArrayBuffer): void {
    if (this.closed || this.ws.readyState !== this.ws.OPEN) return;
    if (config.fakeLagMs > 0) {
      const at = Math.max(performance.now() + fakeDelay(), this.lastOutAt);
      this.lastOutAt = at;
      setTimeout(() => {
        if (!this.closed && this.ws.readyState === this.ws.OPEN) this.ws.send(data);
      }, at - performance.now());
    } else {
      this.ws.send(data);
    }
  }

  close(): void {
    this.ws.close();
  }
}

function fakeDelay(): number {
  return config.fakeLagMs / 2 + Math.random() * config.fakeJitterMs;
}

export function sanitizeName(name: string | undefined): string | null {
  if (!name) return null;
  const clean = name.trim().replace(/[^\p{L}\p{N} _-]/gu, '').slice(0, MAX_NAME_LENGTH);
  return clean.length >= 2 ? clean : null;
}
