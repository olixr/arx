import type { WebSocket } from 'ws';
import {
  MAX_CHAT_LENGTH,
  MAX_NAME_LENGTH,
  PROTOCOL_VERSION,
  parseC2S,
  sanitizeInputFrame,
  type C2SMessage,
  type EntityId,
  type S2CMessage,
} from '@arx/shared';
import type { PlaneId } from '@arx/content';
import { config } from '../config.js';
import { log } from '../log.js';
import * as metrics from '../metrics.js';
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
  /**
   * THE LIVE WIRE, server side: ws never times a peer out on its own,
   * so a client that vanished without a FIN (dead route, closed
   * laptop) would stand its body in the world until TCP gave up —
   * minutes of a ghost holding aggro, blocking doorways, and eating
   * snapshot writes. A ping already goes out every 3s; now the
   * silence is counted, and three unanswered rounds (~9-12s) is the
   * verdict. terminate() (not close — the peer can't handshake) fires
   * the ordinary 'close' path, so the body enters the same reconnect
   * grace an honest disconnect gets. The client's own 5s watchdog
   * reconnects first and bindSession kicks this ghost anyway; this is
   * the backstop for clients that never come back.
   */
  private awaitingPong = false;
  private missedPongs = 0;

  /** Entities this client currently knows about (interest set). */
  readonly knownEntities = new Set<EntityId>();

  /**
   * THE QUIET WIRE: per-entity wire-quantized state as last sent in a
   * snapshot — [xq, yq, dirq, pose, hpPct, status, alert]. An entity
   * whose row is identical is SKIPPED this tick: TCP is ordered and
   * reliable, so the client's newest sample for it stays true without
   * ack machinery, and a town of idle bodies stops re-shipping itself
   * 20 times a second. Rows die with interest (leave) or the session.
   */
  readonly sentSnapSig = new Map<EntityId, Int32Array>();

  /** Chunk keys currently streamed to this client. */
  readonly knownChunks = new Set<string>();

  /**
   * The player's own chunk last tick — discovery checks run on this
   * edge (a 32-tile cadence), never per tick. Null forces a check on
   * the first interest pass after a bind.
   */
  lastCenterChunk: string | null = null;

  /**
   * THE SETTLED WINDOW (Band B): the packed center cell and the
   * knownChunks size as the last interest pass left them. While both
   * hold, no chunk can be new and none can fall out of the ring, so
   * the pass skips the window walk. -1 forces the walk on a fresh
   * socket; a crossing nulls lastCenterChunk, which reopens it too.
   */
  centerCell = -1;
  knownChunksSettled = -1;

  /**
   * THE PLANE ROLL (Band B): the plane this session is filed under in
   * GameServer.sessionsByPlane — the tile patches and the farm
   * mirrors fan out to one plane's sessions, never the whole house.
   * Written only by GameServer.refileSession.
   */
  streamPlane: PlaneId | null = null;

  /**
   * Input frames refill at a hair over the 20Hz tick rate — the burst
   * absorbs jitter, but SUSTAINED overrate must not clear the tick
   * rate: the drain's 2-per-tick catch-up converts a standing backlog
   * into real extra movement (a 25/s refill let a hostile client walk
   * at 1.25x forever). 21/s leaves honest clock skew room and caps
   * the exploit at a meaningless 1.05x.
   */
  private readonly inputBucket = new TokenBucket(21, 50);
  private readonly chatBucket = new TokenBucket(1, 4);
  private readonly miscBucket = new TokenBucket(10, 20);
  private readonly authBucket = new TokenBucket(0.3, 5);
  private abuseStrikes = 0;
  private closed = false;
  /**
   * ONE KNOCK AT A TIME: a hello/login/register is answered by ~20 DB
   * awaits before the body stands; a second one in that window used
   * to be accepted and run its own arrival against the first. Held
   * from the send until the attempt settles — a second knock is a
   * strike.
   */
  private authInFlight = false;

  /**
   * True once ws 'close' has fired. bindSession reads it: a socket
   * that closed while its arrival was loading is never seated (the
   * body enters the reconnect grace instead of standing as a ghost).
   */
  get isClosed(): boolean {
    return this.closed;
  }

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
      // Always through the game's door: a bound body enters its grace;
      // a socket that closed mid-arrival (playerEid still null) has
      // `closed` set for bindSession to read when the loads land.
      this.game.onSessionClosed(this);
    });
    ws.on('error', () => ws.close());
    // Protocol-level ping/pong rides UNDER the fake-lag simulator, so
    // it measures the true socket RTT; viewRttMs adds the simulated
    // part back so lag comp behaves the same in fake-lag testing.
    ws.on('pong', () => {
      this.awaitingPong = false;
      this.missedPongs = 0;
      if (this.pingSentAt === 0) return;
      const rtt = performance.now() - this.pingSentAt;
      this.rttMs = this.rttMs === 0 ? rtt : this.rttMs * 0.7 + rtt * 0.3;
    });
    this.pingTimer = setInterval(() => {
      if (ws.readyState !== ws.OPEN) return;
      // Still waiting on the last round: the wire owes an answer.
      if (this.awaitingPong && ++this.missedPongs >= 3) {
        ws.terminate();
        return;
      }
      this.awaitingPong = true;
      this.pingSentAt = performance.now();
      ws.ping();
    }, 3000);
  }

  /** RTT as the CLIENT experiences it (real + simulated fake lag). */
  get viewRttMs(): number {
    return this.rttMs + (config.fakeLagMs > 0 ? config.fakeLagMs + config.fakeJitterMs : 0);
  }

  /**
   * BACKPRESSURE: bytes the OS/ws stack is still holding for this
   * socket. A stalled receiver (backgrounded phone, dying route) can't
   * drain — piling 20Hz snapshots onto that queue only deepens how far
   * behind the client will be when it wakes. Snapshots are superseded
   * data: while this reads true the tick skips them (latest-state-only
   * law) and the next delivered snapshot carries the current truth.
   * Reliable one-shot messages (JSON events, chunks) still queue.
   */
  get congested(): boolean {
    return this.ws.bufferedAmount > 256 * 1024;
  }

  /** THE FRAME NEVER TAKES THE SERVER DOWN: one malformed or hostile
   *  frame is that session's problem — a throw anywhere in the dispatch
   *  is logged once per session and answered with a strike, never
   *  allowed out to the socket loop (where it would be a process exit). */
  private handleRaw(raw: string): void {
    metrics.inc('msgs.in');
    try {
      this.handleRawInner(raw);
    } catch (err) {
      if (!this.loggedDispatchError) {
        this.loggedDispatchError = true;
        log('error', 'session', 'dispatch threw', { raw: raw.slice(0, 80), error: String(err) });
      }
      this.strike();
    }
  }

  private loggedDispatchError = false;

  private handleRawInner(raw: string): void {
    if (this.closed) return;
    const msg = parseC2S(raw);
    if (msg === null) return this.strike();

    (Session.C2S_DISPATCH[msg.t] as (s: Session, m: C2SMessage) => void)(this, msg);
  }

  /**
   * THE WIRE'S TABLE, server side (the client's S2C_HANDLERS mirrored):
   * one row per message type, TOTAL over the C2S union — a new
   * parseC2S row fails to compile until it is answered here. Static,
   * so rows reach the session's private rooms; each row is one former
   * switch arm, moved verbatim with its guards.
   */
  static readonly C2S_DISPATCH: {
    readonly [K in C2SMessage['t']]: (s: Session, msg: Extract<C2SMessage, { t: K }>) => void;
  } = {
    hello: (s, msg) => {
      if (s.playerEid !== null) return s.strike();
      if (s.authInFlight) return s.strike();
      if (msg.v !== PROTOCOL_VERSION) {
        s.sendJson({ t: 'reject', reason: `protocol version mismatch (server ${PROTOCOL_VERSION})` });
        s.ws.close();
        return;
      }
      // A hello with a token or name does DB/spawn work — budgeted
      // like any auth attempt. A bare hello just gets authRequired.
      if ((msg.token || msg.name) && !s.allowAuthAttempt()) return;
      s.authInFlight = true;
      void s.game.hello(s, { name: msg.name, token: msg.token })
        .catch((err: Error) => console.error('[auth]', err.message))
        .finally(() => (s.authInFlight = false));
      return;
    },
    login: (s, msg) => {
      if (s.playerEid !== null) return s.strike();
      if (s.authInFlight) return s.strike();
      if (!s.allowAuthAttempt()) return;
      s.authInFlight = true;
      void s.game.login(s, msg.user, msg.pass)
        .catch((err: Error) => console.error('[auth]', err.message))
        .finally(() => (s.authInFlight = false));
      return;
    },
    register: (s, msg) => {
      if (s.playerEid !== null) return s.strike();
      if (s.authInFlight) return s.strike();
      if (!s.allowAuthAttempt()) return;
      s.authInFlight = true;
      void s.game.register(s, msg.user, msg.pass, msg.name, msg.invite)
        .catch((err: Error) => console.error('[auth]', err.message))
        .finally(() => (s.authInFlight = false));
      return;
    },
    logout: (s, msg) => {
      if (s.playerEid === null) return;
      void s.game.logout(s).catch((err: Error) => console.error('[auth]', err.message));
      return;
    },
    input: (s, msg) => {
      if (s.playerEid === null) return;
      if (!s.inputBucket.consume()) return; // drop silently; TCP bursts happen
      s.game.queueInput(s.playerEid, sanitizeInputFrame(msg.frame), msg.viewMs);
      return;
    },
    chat: (s, msg) => {
      if (s.playerEid === null) return;
      if (!s.chatBucket.consume()) {
        s.sendJson({ t: 'chat', channel: 'system', text: 'You are talking too fast.' });
        return;
      }
      const text = msg.text.trim().slice(0, MAX_CHAT_LENGTH);
      if (text.length === 0) return;
      s.game.chat(s.playerEid, text);
      return;
    },
    ping: (s, msg) => {
      if (!s.miscBucket.consume()) return;
      s.sendJson({ t: 'pong', ct: msg.ct, tick: s.game.tickCount });
      return;
    },
    interact: (s, msg) => {
      if (s.playerEid === null) return;
      if (!s.miscBucket.consume()) return;
      s.game.interact(s.playerEid, msg.tx, msg.ty);
      return;
    },
    social: (s, msg) => {
      if (s.playerEid === null) return;
      if (!s.miscBucket.consume()) return;
      s.game.socialSnapshot(s.playerEid, s);
      return;
    },
    friendsearch: (s, msg) => {
      if (s.playerEid === null) return;
      if (!s.miscBucket.consume()) return;
      s.game.friendSearch(s.playerEid, s, msg.query);
      return;
    },
    friendrequest: (s, msg) => {
      if (s.playerEid === null) return;
      if (!s.miscBucket.consume()) return;
      s.game.friendRequest(s.playerEid, s, msg.name);
      return;
    },
    friendaccept: (s, msg) => {
      if (s.playerEid === null) return;
      if (!s.miscBucket.consume()) return;
      s.game.friendAccept(s.playerEid, s, msg.name);
      return;
    },
    frienddecline: (s, msg) => {
      if (s.playerEid === null) return;
      if (!s.miscBucket.consume()) return;
      s.game.friendDecline(s.playerEid, s, msg.name);
      return;
    },
    friendremove: (s, msg) => {
      if (s.playerEid === null) return;
      if (!s.miscBucket.consume()) return;
      s.game.friendRemove(s.playerEid, s, msg.name);
      return;
    },
    party: (s, msg) => {
      if (s.playerEid === null) return;
      if (!s.miscBucket.consume()) return;
      s.game.partySnapshot(s.playerEid, s);
      return;
    },
    partyinvite: (s, msg) => {
      if (s.playerEid === null) return;
      if (!s.miscBucket.consume()) return;
      s.game.partyInvite(s.playerEid, s, msg.name);
      return;
    },
    partyaccept: (s, msg) => {
      if (s.playerEid === null) return;
      if (!s.miscBucket.consume()) return;
      s.game.partyAccept(s.playerEid, s, msg.name);
      return;
    },
    partydecline: (s, msg) => {
      if (s.playerEid === null) return;
      if (!s.miscBucket.consume()) return;
      s.game.partyDecline(s.playerEid, s, msg.name);
      return;
    },
    partyleave: (s, msg) => {
      if (s.playerEid === null) return;
      if (!s.miscBucket.consume()) return;
      s.game.partyLeave(s.playerEid, s);
      return;
    },
    partykick: (s, msg) => {
      if (s.playerEid === null) return;
      if (!s.miscBucket.consume()) return;
      s.game.partyKick(s.playerEid, s, msg.name);
      return;
    },
    partydisband: (s, msg) => {
      if (s.playerEid === null) return;
      if (!s.miscBucket.consume()) return;
      s.game.partyDisband(s.playerEid, s);
      return;
    },
    partyjoinrun: (s, msg) => {
      if (s.playerEid === null) return;
      if (!s.miscBucket.consume()) return;
      s.game.partyJoinRun(s.playerEid, s, msg.name);
      return;
    },
    arenaqueue: (s, msg) => {
      if (s.playerEid === null) return;
      if (!s.miscBucket.consume()) return;
      s.game.arenaQueue(s.playerEid, msg.match);
      return;
    },
    arenaleave: (s, msg) => {
      if (s.playerEid === null) return;
      if (!s.miscBucket.consume()) return;
      s.game.arenaLeave(s.playerEid);
      return;
    },
    use: (s, msg) => {
      if (s.playerEid === null) return;
      if (!s.miscBucket.consume()) return;
      s.game.useItem(s.playerEid, msg.slot, msg.stow, msg.off);
      return;
    },
    signedit: (s, msg) => {
      if (s.playerEid === null) return;
      if (!s.miscBucket.consume()) return;
      s.game.signEdit(s.playerEid, msg.tx, msg.ty, msg.title, msg.lines);
      return;
    },
    unequip: (s, msg) => {
      if (s.playerEid === null) return;
      if (!s.miscBucket.consume()) return;
      s.game.unequip(s.playerEid, msg.slot);
      return;
    },
    invmove: (s, msg) => {
      if (s.playerEid === null) return;
      if (!s.miscBucket.consume()) return;
      s.game.invMove(s.playerEid, msg.from, msg.to, msg.merge === true);
      return;
    },
    dropitem: (s, msg) => {
      if (s.playerEid === null) return;
      if (!s.miscBucket.consume()) return;
      s.game.dropItem(s.playerEid, msg.slot, msg.qty);
      return;
    },
    unmake: (s, msg) => {
      if (s.playerEid === null) return;
      if (!s.miscBucket.consume()) return;
      // THE BULK BREAKING rides one message and one bucket token:
      // the batch is a single working, not a burst of presses.
      if (msg.slots !== undefined) s.game.unmakeMany(s.playerEid, msg.slots);
      else if (msg.slot !== undefined) s.game.unmake(s.playerEid, msg.slot);
      return;
    },
    sunder: (s, msg) => {
      if (s.playerEid === null) return;
      if (!s.miscBucket.consume()) return;
      s.game.sunder(s.playerEid, msg.slot, msg.worn, msg.seat);
      return;
    },
    craft: (s, msg) => {
      if (s.playerEid === null) return;
      if (!s.miscBucket.consume()) return;
      s.game.craft(s.playerEid, msg.recipe, msg.qty);
      return;
    },
    craftstop: (s, msg) => {
      if (s.playerEid === null) return;
      if (!s.miscBucket.consume()) return;
      s.game.craftStop(s.playerEid);
      return;
    },
    bank: (s, msg) => {
      if (s.playerEid === null) return;
      if (!s.miscBucket.consume()) return;
      void s.game.bankOp(s.playerEid, msg.op, msg.item, msg.qty, msg.slot, msg.gearId)
        .catch((err: Error) => console.error('[bank]', err.message));
      return;
    },
    shop: (s, msg) => {
      if (s.playerEid === null) return;
      if (!s.miscBucket.consume()) return;
      s.game.shopOp(s.playerEid, msg.op, msg.item, msg.qty, msg.slot, msg.shop);
      return;
    },
    build: (s, msg) => {
      if (s.playerEid === null) return;
      if (!s.miscBucket.consume()) return;
      s.game.build(s.playerEid, msg.buildable, msg.tx, msg.ty, msg.orient, msg.dye);
      return;
    },
    demolish: (s, msg) => {
      if (s.playerEid === null) return;
      if (!s.miscBucket.consume()) return;
      s.game.demolish(s.playerEid, msg.tx, msg.ty);
      return;
    },
    ownbuilt: (s, msg) => {
      if (s.playerEid === null) return;
      if (!s.miscBucket.consume()) return;
      s.game.sendOwnBuilt(s.playerEid);
      return;
    },
    plant: (s, msg) => {
      if (s.playerEid === null) return;
      if (!s.miscBucket.consume()) return;
      s.game.plant(s.playerEid, msg.tx, msg.ty, msg.seed);
      return;
    },
    fertilize: (s, msg) => {
      if (s.playerEid === null) return;
      if (!s.miscBucket.consume()) return;
      s.game.fertilize(s.playerEid, msg.tx, msg.ty);
      return;
    },
    mulch: (s, msg) => {
      if (s.playerEid === null) return;
      if (!s.miscBucket.consume()) return;
      s.game.mulch(s.playerEid, msg.tx, msg.ty);
      return;
    },
    prune: (s, msg) => {
      if (s.playerEid === null) return;
      if (!s.miscBucket.consume()) return;
      s.game.prune(s.playerEid, msg.tx, msg.ty);
      return;
    },
    compostadd: (s, msg) => {
      if (s.playerEid === null) return;
      if (!s.miscBucket.consume()) return;
      s.game.compostAdd(s.playerEid, msg.tx, msg.ty, msg.slot);
      return;
    },
    troughadd: (s, msg) => {
      if (s.playerEid === null) return;
      if (!s.miscBucket.consume()) return;
      s.game.troughAdd(s.playerEid, msg.tx, msg.ty, msg.slot);
      return;
    },
    stockname: (s, msg) => {
      if (s.playerEid === null) return;
      if (!s.miscBucket.consume()) return;
      s.game.stockName(s.playerEid, msg.slot, msg.name);
      return;
    },
    workstart: (s, msg) => {
      if (s.playerEid === null) return;
      if (!s.miscBucket.consume()) return;
      s.game.workStart(s.playerEid, msg.tx, msg.ty, msg.recipe, msg.qty);
      return;
    },
    interactnpc: (s, msg) => {
      if (s.playerEid === null) return;
      if (!s.miscBucket.consume()) return;
      s.game.interactNpc(s.playerEid, msg.eid);
      return;
    },
    petname: (s, msg) => {
      if (s.playerEid === null) return;
      if (!s.miscBucket.consume()) return;
      s.game.petRename(s.playerEid, msg.slot, msg.name);
      return;
    },
    stable: (s, msg) => {
      if (s.playerEid === null) return;
      if (!s.miscBucket.consume()) return;
      s.game.stableOp(s.playerEid, msg.op, msg.slot);
      return;
    },
    petarts: (s, msg) => {
      if (s.playerEid === null) return;
      if (!s.miscBucket.consume()) return;
      s.game.petArtsOp(s.playerEid, msg.slot, msg.arts);
      return;
    },
    companionop: (s, msg) => {
      if (s.playerEid === null) return;
      if (!s.miscBucket.consume()) return;
      s.game.companionOp(s.playerEid, msg.op, msg.slot);
      return;
    },
    companionname: (s, msg) => {
      if (s.playerEid === null) return;
      if (!s.miscBucket.consume()) return;
      s.game.companionRename(s.playerEid, msg.slot, msg.name);
      return;
    },
    pickup: (s, msg) => {
      if (s.playerEid === null) return;
      if (!s.miscBucket.consume()) return;
      s.game.pickupDrop(s.playerEid, msg.eid);
      return;
    },
    takeall: (s, msg) => {
      if (s.playerEid === null) return;
      if (!s.miscBucket.consume()) return;
      s.game.takeAllDrops(s.playerEid);
      return;
    },
    lootpref: (s, msg) => {
      if (s.playerEid === null) return;
      if (!s.miscBucket.consume()) return;
      s.game.setLootPref(s.playerEid, msg.auto);
      return;
    },
    technique: (s, msg) => {
      if (s.playerEid === null) return;
      if (!s.miscBucket.consume()) return;
      s.game.setTechnique(s.playerEid, msg.ability, msg.slot);
      return;
    },
    calling: (s, msg) => {
      if (s.playerEid === null) return;
      if (!s.miscBucket.consume()) return;
      s.game.setCalling(s.playerEid, msg.calling, msg.on, msg.rank);
      return;
    },
    waypoint: (s, msg) => {
      if (s.playerEid === null) return;
      if (!s.miscBucket.consume()) return;
      // The pin names its plane (post-ship audit: dropping the tag
      // here silently migrated every underworld waypoint onto the
      // surface chart at relog). setWaypoint still owns the law —
      // persistent planes only, garbage refused.
      s.game.setWaypoint(s.playerEid, msg.x, msg.y, msg.plane);
      return;
    },
    questabandon: (s, msg) => {
      if (s.playerEid === null) return;
      if (!s.miscBucket.consume()) return;
      s.game.abandonQuest(s.playerEid, msg.quest);
      return;
    },
    setlook: (s, msg) => {
      if (s.playerEid === null) return;
      if (!s.miscBucket.consume()) return;
      s.game.setLook(s.playerEid, msg.look);
      return;
    },
    carrystyle: (s, msg) => {
      if (s.playerEid === null) return;
      if (!s.miscBucket.consume()) return;
      s.game.setCarryStyle(s.playerEid, msg.style, msg.hand ?? 'main');
      return;
    },
    usekey: (s, msg) => {
      if (s.playerEid === null) return;
      if (!s.miscBucket.consume()) return;
      s.game.useKey(s.playerEid, msg.key);
      return;
    },
    keydrop: (s, msg) => {
      if (s.playerEid === null) return;
      if (!s.miscBucket.consume()) return;
      s.game.keyDrop(s.playerEid, msg.key);
      return;
    },
    keylabel: (s, msg) => {
      if (s.playerEid === null) return;
      if (!s.miscBucket.consume()) return;
      s.game.keyLabel(s.playerEid, msg.seed, msg.label);
      return;
    },
    keyforge: (s, msg) => {
      if (s.playerEid === null) return;
      if (!s.miscBucket.consume()) return;
      s.game.keyForge(s.playerEid, msg.seed);
      return;
    },
    dlgadv: (s, msg) => {
      if (s.playerEid === null) return;
      if (!s.miscBucket.consume()) return;
      s.game.dialogueAdvance(s.playerEid);
      return;
    },
    dlgchoice: (s, msg) => {
      if (s.playerEid === null) return;
      if (!s.miscBucket.consume()) return;
      s.game.dialogueChoose(s.playerEid, msg.idx);
      return;
    },
    dlgend: (s, msg) => {
      if (s.playerEid === null) return;
      if (!s.miscBucket.consume()) return;
      s.game.dialogueEnd(s.playerEid);
      return;
    },
  };

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

  /**
   * Send an ALREADY-STRINGIFIED S2C message. The broadcast paths
   * stringify their payload once and fan the same string to every
   * receiving session — a busy fight's fx used to pay one
   * JSON.stringify per fx per session for byte-identical output.
   * Callers own the contract that the string came from an S2CMessage.
   */
  sendJsonRaw(json: string): void {
    this.sendRaw(json);
  }

  sendBinary(buf: ArrayBuffer): void {
    this.sendRaw(buf);
  }

  private sendRaw(data: string | ArrayBuffer): void {
    if (this.closed || this.ws.readyState !== this.ws.OPEN) return;
    // The wire's tally (string length ≈ bytes: the protocol is ASCII JSON).
    metrics.inc('msgs.out');
    metrics.inc('bytes.out', typeof data === 'string' ? data.length : data.byteLength);
    // A receiver this far gone (4MB ≈ minutes of traffic) is a dead
    // route the TCP stack hasn't given up on yet. Cut it — the
    // reconnect grace window holds the body for an honest rejoin, and
    // every byte queued here is memory held hostage until then.
    if (this.ws.bufferedAmount > 4 * 1024 * 1024) {
      this.ws.close();
      return;
    }
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

/** The dispatch table by name — the exhaustiveness pin imports it. */
export const C2S_DISPATCH = Session.C2S_DISPATCH;

function fakeDelay(): number {
  return config.fakeLagMs / 2 + Math.random() * config.fakeJitterMs;
}

export function sanitizeName(name: string | undefined): string | null {
  if (!name) return null;
  const clean = name.trim().replace(/[^\p{L}\p{N} _-]/gu, '').slice(0, MAX_NAME_LENGTH);
  return clean.length >= 2 ? clean : null;
}
