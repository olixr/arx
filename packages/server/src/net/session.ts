import type { WebSocket } from 'ws';
import {
  MAX_CHAT_LENGTH,
  MAX_NAME_LENGTH,
  PROTOCOL_VERSION,
  parseC2S,
  sanitizeInputFrame,
  type EntityId,
  type S2CMessage,
} from '@devcraft/shared';
import { config } from '../config.js';
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
        this.game.hello(this, { name: msg.name, token: msg.token });
        return;
      }
      case 'login': {
        if (this.playerEid !== null) return this.strike();
        if (!this.authBucket.consume()) {
          this.sendJson({ t: 'authErr', reason: 'Too many attempts — wait a moment' });
          return;
        }
        this.game.login(this, msg.user, msg.pass);
        return;
      }
      case 'register': {
        if (this.playerEid !== null) return this.strike();
        if (!this.authBucket.consume()) {
          this.sendJson({ t: 'authErr', reason: 'Too many attempts — wait a moment' });
          return;
        }
        this.game.register(this, msg.user, msg.pass, msg.name);
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
      case 'use': {
        if (this.playerEid === null) return;
        if (!this.miscBucket.consume()) return;
        this.game.useItem(this.playerEid, msg.slot);
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
      case 'craft': {
        if (this.playerEid === null) return;
        if (!this.miscBucket.consume()) return;
        this.game.craft(this.playerEid, msg.recipe, msg.qty);
        return;
      }
      case 'bank': {
        if (this.playerEid === null) return;
        if (!this.miscBucket.consume()) return;
        this.game.bankOp(this.playerEid, msg.op, msg.item, msg.qty, msg.slot, msg.gearId);
        return;
      }
      case 'shop': {
        if (this.playerEid === null) return;
        if (!this.miscBucket.consume()) return;
        this.game.shopOp(this.playerEid, msg.op, msg.item, msg.qty, msg.slot);
        return;
      }
      case 'build': {
        if (this.playerEid === null) return;
        if (!this.miscBucket.consume()) return;
        this.game.build(this.playerEid, msg.buildable, msg.tx, msg.ty);
        return;
      }
      case 'demolish': {
        if (this.playerEid === null) return;
        if (!this.miscBucket.consume()) return;
        this.game.demolish(this.playerEid, msg.tx, msg.ty);
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
        this.game.setTechnique(this.playerEid, msg.style, msg.ability);
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
