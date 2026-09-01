import { ChunkStore, ExploredMask, type ChestKind, type EntityId, type EntityMeta, type EquipSlot, type BuffInfo, type ChargeInfo, type PetInfo, type InputFrame, type BuildOrient, type InvSlot, type ItemRoll, type KeyLore, type DiscoveryWire, type TrophyWire, type S2CPoiCleared, type QuestAvailWire, type QuestDoneWire, type QuestRewardsWire, type QuestWire, type RepStandingWire, type EquippedItem, type PartyMemberWire, type PartyRunWire, type S2CFx, type S2CPartyEvent, type SignInfo, type SkillXp, type StationType, type Vec2 } from '@arx/shared';
import { type WorkStation } from '@arx/content';
import type { AbilityDef, AbilitySlot, CompanionInfo, DangerAnchor, Look, PlaneWire } from '@arx/shared';
import type { S2CArenaBoard, S2CArenaState } from '@arx/shared';
/**
 * A zero-latency predicted shot (v8). Spawned the instant the local
 * fire gate passes (the same mirrored gate the server applies), flown
 * client-side, and handed off to the authoritative projectile entity
 * when it enters — matched by (ownerEid, firing seq). An unmatched
 * tracer (misprediction: ammo desync, server-side cancel) fades out in
 * a quarter second instead of lying about a hit.
 */
export interface OwnShot {
    /** Input-frame seq at the predicted fire — the matching key. */
    seq: number;
    /** Same defId the server will broadcast ('archery', 'arx:ember'…). */
    defId: string;
    x: number;
    y: number;
    dirX: number;
    dirY: number;
    dir: number;
    /** Tiles per second. */
    speed: number;
    /** Max flight distance, tiles. */
    range: number;
    /**
     * Flight distance to the first solid along the ray, ≤ range (v9).
     * The tracer's draw holds at this face instead of sailing through
     * the wall while the real shot's death notice is in transit.
     */
    wallAt: number;
    /** performance.now() at spawn. */
    bornAt: number;
}
export type InteractTarget = {
    kind: 'node';
    tx: number;
    ty: number;
} | {
    kind: 'station';
    tx: number;
    ty: number;
    station: StationType;
} | {
    kind: 'bank';
    tx: number;
    ty: number;
} | {
    kind: 'stable';
    tx: number;
    ty: number;
} | {
    kind: 'shop';
    tx: number;
    ty: number;
} | {
    kind: 'portal';
    tx: number;
    ty: number;
} | {
    kind: 'plot';
    tx: number;
    ty: number;
} | {
    kind: 'crop';
    tx: number;
    ty: number;
    mature: boolean;
} | {
    kind: 'bin';
    tx: number;
    ty: number;
} | {
    kind: 'trough';
    tx: number;
    ty: number;
} | {
    kind: 'work';
    tx: number;
    ty: number;
    work: WorkStation;
} | {
    kind: 'apiary';
    tx: number;
    ty: number;
} | {
    kind: 'npc';
    tx: number;
    ty: number;
    eid: EntityId;
    verb: string;
} | {
    kind: 'loot';
    tx: number;
    ty: number;
    eid: EntityId;
} | {
    kind: 'chest';
    tx: number;
    ty: number;
    chest: ChestKind;
} | {
    kind: 'door';
    tx: number;
    ty: number;
    open: boolean;
    gate: boolean;
} | {
    kind: 'candle';
    tx: number;
    ty: number;
    lit: boolean;
} | {
    kind: 'seat';
    tx: number;
    ty: number;
} | {
    kind: 'bed';
    tx: number;
    ty: number;
} | {
    kind: 'sign';
    tx: number;
    ty: number;
    mine: boolean;
    blank: boolean;
};
import { WORD_LIFE_MS } from './wordLife.js';
import { InterpBuffer } from '../net/interpolation.js';
import { Predictor } from '../net/prediction.js';
import type { InputManager } from '../input/inputManager.js';
export interface RemoteEntity {
    meta: EntityMeta;
    buffer: InterpBuffer;
    /** Hit-flash timer (performance.now ms). */
    hurtUntil?: number;
    /** The last damaging hit — direction and force launch the death ragdoll. */
    lastKnock?: {
        kx: number;
        ky: number;
        at: number;
        crit: boolean;
        dmg: number;
    };
}
export interface Floaty {
    x: number;
    y: number;
    text: string;
    color: string;
    bornAt: number;
    /** Font-size multiplier (crits go big, xp drips go small). */
    sizeMul?: number;
}
/**
 * THE RISEN WORD: an interaction's answer standing in the world —
 * "LOCKED" over the chest, "PACK FULL" over your head — so nobody has
 * to read the corner log to learn why nothing happened. A separate
 * lane from damage floaties: words live longer, rise slower, and obey
 * the dedupe law (mashing the verb re-bumps the standing word instead
 * of stacking copies into mush).
 */
export interface RisenWord {
    x: number;
    y: number;
    word: string;
    tone: 'deny' | 'note' | 'good';
    bornAt: number;
    /** Re-asks while alive; the renderer re-pops instead of stacking. */
    bumpedAt: number;
}
export interface ChatLine {
    channel: 'local' | 'system' | 'xp';
    from?: string;
    /** The speaker's entity, when the line was said aloud IN the world —
     *  what lets THE SPOKEN AIR stand the words over the right head. */
    eid?: EntityId;
    text: string;
}
export { WORD_LIFE_MS };
/** A combat effect in flight (nova ring, telegraph, blast, reaction). */
export interface ActiveFx {
    kind: S2CFx['kind'];
    x: number;
    y: number;
    radius: number;
    /** telegraph: fuse length in server ticks; field/summon: lifetime. */
    ticks?: number;
    color?: string;
    text?: string;
    /** Ability id — keys the bespoke layered visual identity. */
    id?: string;
    /** arc: aim angle. */
    dir?: number;
    /** dash/bolt/beam: segment endpoint. */
    x2?: number;
    y2?: number;
    bornAt: number;
}
export interface GameEvents {
    onChat(line: ChatLine): void;
    onStatus(status: 'connecting' | 'ingame' | 'reconnecting' | 'rejected' | 'authRequired' | 'authErr', detail?: string): void;
    onInventory(slots: InvSlot[]): void;
    onSkills(xp: SkillXp): void;
    onXp(msg: {
        skill: string;
        gained: number;
        level: number;
        levelledUp: boolean;
    }): void;
    onEquipment(equipment: Partial<Record<string, EquippedItem>>): void;
    onBank(items: Record<string, number>, gear?: Array<{
        id: number;
        item: string;
        roll: ItemRoll;
    }>): void;
    /** The Riftgate answered an interact — open the key panel (keys come from the ring mirror). */
    onRiftgate?(live?: {
        seed: number;
        tier: string;
        power: number;
    }, partyRuns?: PartyRunWire[]): void;
    /** THE KEY RING's full mirror arrived — repaint whatever shows keys. */
    onKeyRing?(keys: Array<{
        id: number;
        roll: ItemRoll;
    }>): void;
    /** THE KEY LEDGER's mirror arrived — repaint the ledger wing. */
    onKeyLore?(known: KeyLore[]): void;
    /** The Keywright's bench opened — raise the ledger with the forge lit. */
    onKeyForgeOpen?(): void;
    /** A board's words arrived or changed — repaint whatever shows them. */
    onSignChanged?(tx: number, ty: number): void;
    /** Crossed into a dungeon — everything the entry banner tells. */
    onDungeon?(d: {
        name: string;
        sigil: string;
        tier: string;
        theme: string;
        power: number;
        mods?: string[];
    }): void;
    /** THE COURT FALLS: the run's champion is down — the run is cleared. */
    onDungeonClear?(d: {
        name: string;
        sigil: string;
        sec: number;
    }): void;
    /** THE SAND AND THE ROAR: the ringmaster's stakes board opened. */
    onArenaBoard?(b: S2CArenaBoard): void;
    /** The match's state turned a phase (state itself sits on game.arenaMatch). */
    onArenaState?(s: S2CArenaState): void;
    /**
     * THE CROSSING: the body just moved to another plane. ClientGame has
     * already dropped its own world state (chunks, prediction, entities,
     * versions); this event is where the renderer, chart, and audio drop
     * theirs and the veil covers the cut.
     */
    onPlane?(p: PlaneWire): void;
    onHit(hit: {
        x: number;
        y: number;
        dmg: number;
        isOwn: boolean;
        crit: boolean;
        backstab?: boolean;
        /** Set on DoT pulses — the wound that ticked (tints the hurt edge). */
        via?: 'burn' | 'bleed' | 'venom';
    }): void;
    onDeath(death: {
        x: number;
        y: number;
        defId: string;
    }): void;
    /** A damaging blow with a knock direction — directional impact FX. */
    onImpact?(impact: {
        x: number;
        y: number;
        kx: number;
        ky: number;
        crit: boolean;
        isOwnTarget: boolean;
    }): void;
    /** This character has never chosen a look — open the creator. */
    onNeedLook?(): void;
    /** A timed action began — `ticks` server ticks to completion; craft
     *  starts carry the recipe and the batch tally for the work card. */
    onActionStart?(ticks: number, craft?: {
        recipe: string;
        made: number;
        total: number;
    }): void;
    /** The own-built ledger arrived — feed the overlay. */
    onOwnBuilt?(keys: ReadonlySet<string>): void;
    /** The running action ended — `reason` says why ('done', 'blocked', 'occupied',
     *  'materials', 'moved', 'stopped', …); craft ends carry the batch tally. */
    onActionEnd?(reason?: string, made?: number): void;
    /** A conversation began — raise the cinematic frame around `eid`. */
    onDialogueOpen?(o: {
        eid: EntityId;
        name: string;
        title?: string;
        /** Clip URLs to warm before the first voiced beat lands. */
        prefetch?: string[];
        /** The live duck dials riding the frame. */
        voiceDials?: {
            duckLine: number;
            duckAmbience: number;
            duckReleaseMs: number;
        };
    }): void;
    /** One beat of conversation — typewriter it out. */
    onDialogueNode?(n: {
        speaker: 'npc' | 'player';
        text: string;
        choices?: string[];
        last?: boolean;
        gifts?: Array<{
            item: string;
            qty: number;
        }>;
        quest?: {
            id: string;
            name: string;
            rewards?: QuestRewardsWire;
        };
        questChoices?: Array<{
            idx: number;
            kind: 'accept' | 'turnin';
        }>;
        shopChoices?: number[];
        arenaChoices?: number[];
        voice?: {
            url: string;
            durMs: number;
            kind: 'line' | 'quip';
        };
    }): void;
    /** The conversation is over — tear the frame down. */
    onDialogueClose?(): void;
    /** A spoken breath from a place in the world (a bark's voice). */
    onVoiceQuip?(q: {
        x: number;
        y: number;
        url: string;
    }): void;
    /** A trainer opened their wares — render the named shop's shelf. */
    onShopOpen?(shop: string, priceMult: number): void;
    /** The full social snapshot answered a request. */
    onSocial?(snap: {
        friends: Array<{
            name: string;
            online: boolean;
            zone?: string;
        }>;
        incoming: string[];
        outgoing: string[];
    }): void;
    /** Name-search results came back. */
    onFriendSearch?(results: Array<{
        name: string;
        online: boolean;
    }>): void;
    /** Something social happened involving `name` — refetch, maybe announce. */
    onFriendEvent?(ev: {
        kind: 'request' | 'accepted' | 'declined' | 'removed' | 'online' | 'offline';
        name: string;
    }): void;
    /** The full party snapshot answered a request (or a login push). */
    onParty?(snap: {
        members: PartyMemberWire[];
        invites: string[];
        outgoing: string[];
    }): void;
    /** Something party-shaped happened involving `name` — refetch, maybe announce. */
    onPartyEvent?(ev: {
        kind: S2CPartyEvent['kind'];
        name: string;
        detail?: string;
    }): void;
    /** A LIVE first-ever discovery — the one trigger for the splash. */
    onDiscovery?(d: DiscoveryWire): void;
    /**
     * THE CHAMPION'S MARK: you stood among a broken camp's champions —
     * the one trigger for the full-screen CLEARED ceremony.
     */
    onPoiCleared?(e: S2CPoiCleared): void;
    /** A fresh victory banner was staked somewhere on the shard. */
    onTrophyStaked?(t: TrophyWire): void;
    /** A LIVE quest ceremony — the ONLY trigger for banners and fanfare. */
    onQuestEvent?(e: {
        kind: 'accepted' | 'completed';
        id: string;
        name: string;
        rewards?: QuestRewardsWire;
    }): void;
    /** The quest ledger changed shape (quiet) — repaint journal surfaces. */
    onQuestsChanged?(): void;
    /** A band crossing — the ONLY trigger for standing ceremonies. */
    onRepEvent?(e: {
        faction: string;
        name: string;
        band: string;
        rose: boolean;
    }): void;
    /** The standing ledger moved (quiet) — repaint the Standing screen. */
    onRepChanged?(): void;
}
export declare class ClientGame {
    private readonly input;
    private readonly events;
    /** World tiles streamed from the server; also the collision source. */
    readonly world: ChunkStore;
    /** Bumped whenever chunk data changes so the renderer can re-bake. */
    worldVersion: number;
    /**
     * The interior-region cache's own clock: bumps with worldVersion
     * EXCEPT for door toggles. Open and shut doorways are both interior
     * boundaries (and gates are non-boundaries in both postures), so a
     * posture swap can never reshape a room — but living towns toggle
     * doors constantly, and wiping the region cache for each one forced
     * town-wide re-floods mid-stroll.
     */
    interiorsVersion: number;
    readonly entities: Map<number, RemoteEntity>;
    readonly predictor: Predictor;
    ownEid: EntityId | null;
    ownName: string;
    /** World seed from the welcome — the danger field's client-side key. */
    worldSeed: number | null;
    /**
     * The live danger anchors: content's settled lights merged with the
     * server's runtime havens (waystations). Rebuilt whenever the haven
     * list arrives — every client danger read (music mood, map tint)
     * uses this array so it stays in lockstep with the server's field.
     */
    dangerAnchors: readonly DangerAnchor[];
    /** Chosen base look; null until creation completes. */
    ownLook: Look | null;
    aim: number;
    rttMs: number;
    serverTick: number;
    /** Snapshots folded into the clock (young clocks converge faster). */
    private clockSamples;
    /** EWMA of snapshot arrival deviation — what the delay must absorb. */
    private jitterEwma;
    /** Consecutive >300ms clock deviations (sustained ⇒ real step). */
    private bigDevRun;
    /**
     * ADAPTIVE interpolation delay, slewed toward the jitter-derived
     * target (see targetInterpDelay). A fixed 120ms taxed every clean
     * connection ~40ms of unnecessary remote-player lag; a jittery one
     * needs MORE than 120 to stop freeze-jump. Slew ≤15ms/s: the remote
     * timeline may stretch, never snap.
     */
    private interpDelayMs;
    /** World-clock offset in ticks (dev /time); see sim/daylight. */
    timeOfs: number;
    inventory: InvSlot[];
    /** THE KEY RING mirror — every dungeon key held, outside the pack. */
    keyRing: Array<{
        id: number;
        roll: ItemRoll;
    }>;
    /** THE KEY LEDGER mirror — every door ever held, with margin notes. */
    keyLore: KeyLore[];
    skills: SkillXp;
    /** Recipes known beyond the core set (server-owned; see 'recipes'). */
    knownRecipes: ReadonlySet<string>;
    /**
     * THE WORLDS APART: the law of the plane the body stands on —
     * ambience, cutaway, chart behavior, and fog persistence all read
     * from here instead of any y-line. Set by the welcome and by every
     * S2CPlane crossing.
     */
    plane: PlaneWire;
    /**
     * THE CHART: persistent fog-of-war, ONE MASK PER PLANE (coordinates
     * across planes legitimately overlap). Seeded by the login snapshot
     * and cleared locally with the shared deterministic disc — the
     * server marks the identical cells, so no reveal ever travels the
     * wire. Scratch planes chart into dungeonExplored instead.
     */
    private readonly exploredByPlane;
    /** The per-run scratch chart (rift planes) — never persisted. */
    readonly dungeonExplored: ExploredMask;
    /** The named plane's persistent mask, materialized on first touch. */
    exploredFor(planeId: string): ExploredMask;
    /**
     * The CURRENT plane's chart — the mask every reader (map, reveal)
     * sees. Persistent planes read their own mask; scratch planes read
     * the per-run chart. The getter keeps the one-mask call sites honest
     * across every crossing.
     */
    get explored(): ExploredMask;
    /** The place ledger, keyed by discovery id. */
    readonly discoveries: Map<string, DiscoveryWire>;
    /**
     * THE CHAMPION'S MARK: every victory banner standing on the shard,
     * by cell key. Whole-list replaced by the wire (the havens dialect);
     * the renderer stakes a living standard at each anchor.
     */
    readonly trophies: Map<string, TrophyWire>;
    /**
     * Local fly-in clocks: banner id → performance.now() when its
     * `fresh` cue arrived. Banners without an entry stand settled (a
     * welcome-time roster never replays its ceremonies).
     */
    readonly trophyBorn: Map<string, number>;
    /** The one active waypoint (optimistic; server keeps the durable copy). */
    waypoint: {
        x: number;
        y: number;
        plane?: string;
    } | null;
    /** Where the reader last fell — the spilled pack's skull on the
     *  chart. `until` is a local clock stamp built from the wire's
     *  duration; the server clears it on arrival or expiry. */
    deathMark: {
        x: number;
        y: number;
        until: number;
        plane?: string;
    } | null;
    /**
     * THE SAND AND THE ROAR: the live match card, null when no card
     * holds this soul. `deadlineAt` is a LOCAL clock (performance.now
     * base) derived from the wire's remainMs duration — the HUD counts
     * against it without ever trusting a wall clock off the wire.
     */
    arenaMatch: {
        phase: S2CArenaState['phase'];
        venue?: string;
        name?: string;
        round?: number;
        rounds?: number;
        deadlineAt: number | null;
        foes?: number;
        /** Set on a spectator-tagged state; the HUD self-clears when stale. */
        specAt?: number;
        /** Set when the wipe lands; the HUD holds the lost beat 2.6 s. */
        wipeAt?: number;
    } | null;
    /** THE QUEST LEDGER: active quests by id (status 'ready' = turn in). */
    readonly quests: Map<string, QuestWire>;
    /** The done shelf, by id. */
    readonly questsDone: Map<string, QuestDoneWire>;
    /** Offerable quests — the "!" over each giver resolves from this. */
    questAvailable: QuestAvailWire[];
    /** Bumped on every ledger change — journal surfaces re-read on it. */
    questVersion: number;
    /**
     * THE LEDGER OF NAMES: own standings by faction id, plus the LIVE
     * membership tables (actor slug / bestiary prefix -> faction) from
     * the bind push — per-viewer resolution (tints, marks) reads these,
     * never the shipped content seed (the questMarkFor law).
     */
    readonly repStandings: Map<string, RepStandingWire>;
    repMembers: Record<string, string>;
    repPrefixes: Record<string, string>;
    /** Actor slugs that police their faction (from the bind push). */
    repEnforcers: Set<string>;
    /** The band at which a hostile faction holds its fire. */
    repPeaceBand: string;
    /** Live band price multipliers — the Standing screen's legend. */
    repPrices: {
        champion: number;
        trusted: number;
        known: number;
        neutral: number;
        suspect: number;
    } | null;
    /** The most recent standing move per faction (client-side ledger). */
    readonly repLastDelta: Map<string, {
        delta: number;
        at: number;
    }>;
    /** Bumped on every standing change — the Standing screen re-reads. */
    repVersion: number;
    /** The party snapshot — empty members = partyless. Refetched on events. */
    party: {
        members: PartyMemberWire[];
        invites: string[];
        outgoing: string[];
    } | null;
    /** Fellow positions from the partypos ticker, keyed by name. */
    readonly partyPos: Map<string, {
        x: number;
        y: number;
        plane: string;
        at: number;
    }>;
    /** Bumped whenever fog, discoveries, or the waypoint change — map surfaces re-draw on it. */
    chartVersion: number;
    private lastRevealAt;
    equipment: Partial<Record<string, EquippedItem>>;
    /** Cosmetic idle weapon-carry preference (server-confirmed). */
    carryStyle: 'normal' | 'rogue';
    /** Off-fist grip preference — each hand carries its own way. */
    carryOff: 'normal' | 'rogue';
    /** Running timed action, for the progress bar. Craft actions carry
     *  their recipe and batch tally so the HUD can speak for the work. */
    action: {
        startedAt: number;
        durationMs: number;
        recipe?: string;
        made?: number;
        total?: number;
        /** THE HELD NOTE: the channeled art (bar tint + singing well). */
        ability?: string;
        slot?: number;
    } | null;
    /** "tx,ty" keys of this character's own built tiles (THE OWN-WORK OVERLAY). */
    ownBuilt: ReadonlySet<string>;
    /** Damage numbers floating up; pruned by the renderer. */
    readonly floaties: Floaty[];
    /** Overhead interaction words (THE RISEN WORD); pruned by the renderer. */
    readonly words: RisenWord[];
    /**
     * Projectiles that just ended flight (hit, expired, or left view) —
     * consumed by the renderer for impact bursts and stuck arrows.
     */
    readonly projectileEnds: Array<{
        x: number;
        y: number;
        dir: number;
        style: string;
    }>;
    /** Predicted own shots in flight, awaiting their server entity (v8). */
    readonly ownShots: OwnShot[];
    /**
     * Matched tracer → entity handoffs. The renderer captures the visual
     * gap on the entity's first draw and splits it by axis (v10, THE
     * LEAD IS REPAID IN FLIGHT): the cross-track offset `ox/oy` and the
     * heading delta `od` decay together in ~120ms — the v9 steer, nose
     * leading the turn — while the along-track lead `along` is repaid
     * LINEARLY over `repayMs` (the flight remaining at capture), so the
     * spawn latency never reads as a brake-then-sprint; the shot flies a
     * hair slow the whole way and lands exactly on the server's impact.
     */
    readonly projHandoffs: Map<number, {
        shot: OwnShot;
        ox: number;
        oy: number;
        od: number;
        along: number;
        repayMs: number;
        capturedAt: number;
    }>;
    /**
     * Local staff-cadence mirror (bolt-bolt-HEAVY, same shared laws).
     * Gated in the SEQ domain, not wall-clock ms: one input frame is one
     * server tick, and the server re-arms in ticks. A ms-based gate can
     * only ever fire a frame LATE (rAF jitter), so its fire-seq drifts
     * monotonically behind the server's until the ±2 handoff window
     * breaks and every bolt draws twice — tracer plus real entity.
     */
    private staffReadySeq;
    /**
     * THE ONE RHYTHM ENGINE's client mirror (seq units, not ticks): the
     * predicted staff string advances through the same ComboTrack law the
     * server swings by — including THE STRING BELONGS TO THE WEAPON (a
     * staff swap resets the mirrored stage exactly as the server resets).
     */
    private readonly comboLocal;
    /**
     * THE SPOKEN BEAT, as last spoken by the server: the stage the last
     * basic played at, the string's length, and when the string dies
     * (local clock, ms). Phase 2's beat UI reads this; until then it is
     * the honest record.
     */
    ownCombo: {
        stage: number;
        len: number;
        run: number;
        bornMs: number;
        graceUntilMs: number;
    } | null;
    /**
     * THE PREDICTED BLOW: the melee swing mirror. On the press edge the
     * mirror advances the SAME ComboTrack the staff mirror rides and
     * feeds the predicted pose value to the renderer early — the anim
     * clock keys on pose CHANGE, and the server's confirming byte
     * carries the same value, so the choreography starts at the press
     * and never double-plays. A mispredicted swing simply expires
     * (cosmetic only — damage was never client-side).
     */
    private ownSwing;
    private meleeReadySeq;
    private meleeBufferedUntilSeq;
    private staffBufferedUntilSeq;
    private prevLocalButtons;
    /** Local mirror of the cast commitment window (holds basics back). */
    private castFreezeUntilSeq;
    /** NPC deaths this frame — drives the ragdoll + stuck-arrow scatter. */
    readonly npcDeaths: Array<{
        eid: EntityId;
        x: number;
        y: number;
        defId: string;
        /** Facing at the moment of death — the ragdoll snapshot's pose. */
        dir: number;
        /** Knock direction of the killing blow (0,0 = unknown). */
        kx: number;
        ky: number;
        crit: boolean;
        /** Damage of the killing blow — scales the ragdoll launch. */
        dmg: number;
        /** Humanoid actors: the base look, so the corpse keeps its face. */
        look?: Look;
        /** Worn gear ids by slot — the corpse keeps its armor and steel. */
        equip?: Partial<Record<EquipSlot, string>>;
        /** Enchant ids riding the gear — a flaming blade burns beside the body. */
        ench?: Partial<Record<EquipSlot, string>>;
    }>;
    /** Combat effects in flight; pruned by the renderer. */
    readonly fx: ActiveFx[];
    /**
     * THE FOE'S BREATH: live enemy wind-ups by entity id, fed by
     * `charge` fx carrying an eid. The renderer draws the overhead
     * cast pip from this ledger and prunes what has ended; brokeAt
     * marks a fizzled breath (the pip gutters dark instead of filling).
     */
    readonly npcCasts: Map<number, {
        startAt: number;
        endsAt: number;
        color?: string;
        id?: string;
        brokeAt?: number;
    }>;
    /** Hotbar state: performance.now() when each slot comes off cooldown. */
    readonly abilityReadyAt: [number, number, number, number];
    /** Full cooldowns in ticks (0 = nothing equipped in that slot). */
    abilityMax: [number, number, number, number];
    /** THE SECOND HAND: the seated techniques, [Q, R] (server-confirmed). */
    techniques: [string | null, string | null];
    /** Earned arts: deed pages and mastered secrets alike (server truth). */
    earnedArts: string[];
    /** THE LESSON LAW's banks: mirrored XP per still-learning secret. */
    lessons: Record<string, number>;
    /** Answered Callings (server truth; Focus derives from skills). */
    callings: string[];
    /** APPLIED ranks past I by id (callings-v2 Phase 4; absent = Rank I). */
    callingRanks: Record<string, number>;
    /** Active consumable buffs (tonic/food) for the HUD chip row. */
    buffs: BuffInfo[];
    /**
     * THE SWING CHANNEL's live multiplier, mirrored off S2CBuffs so the
     * prediction lanes pay the SAME recovery the server pays (absent on
     * the wire = the trained 1). Never derived locally — the server's
     * fold is the truth and this is its mirror.
     */
    swingMult: number;
    /** THE STANDING SHELL: the own live ward total (0 = no dome). */
    ownWard: number;
    /** When the last standing ward crossed to nothing (0 = never). */
    wardShatteredAt: number;
    /** performance.now() when the buffs snapshot arrived (chips count down). */
    buffsAt: number;
    /** Fires when the buff list changes (HUD refresh). */
    onBuffs: (() => void) | null;
    /** THE LIVING SOIL: fires after any farm-care mirror change. */
    onFarm: (() => void) | null;
    /** THE ANIMALS OF THE YARD: a fresh release asks for its name. */
    onStockCeremony: ((slot: number, species: string) => void) | null;
    /**
     * THE METER SHOWS ITS HAND: the own body's stacking-working meters
     * (proc id, banked count, count asked). Name, school, and icon are
     * resolved from the roster by id at render time.
     */
    charges: ChargeInfo[];
    /** The saddle: active mount def id (server truth), null afoot. */
    ownMount: string | null;
    /** Mount def ids this character owns — the stable row's truth. */
    ownedMounts: string[];
    /** Fires when saddle state changes (HUD / stable row refresh). */
    onRide: (() => void) | null;
    /** THE OPEN HAND: the household mirror — every kept companion. */
    ownPets: PetInfo[];
    /** THE QUIET HEEL: slot → local ms when the bond moment reopens. */
    private petBondReadyAt;
    /** Fires when the household changes (HUD refresh). */
    onPet: (() => void) | null;
    /** Fires once per fresh tame: raise the naming card for this slot. */
    onPetCeremony: ((slot: number, currentName: string) => void) | null;
    /** THE COMPANY YOU KEEP: the company mirror — every befriended friend. */
    ownCompanions: CompanionInfo[];
    /** Fires when the company changes (panel / chip refresh). */
    onCompanions: (() => void) | null;
    /** Fires once per fresh befriending: raise the naming card for this slot. */
    onCompanionCeremony: ((slot: number, currentName: string) => void) | null;
    /** Fires when the local player commits a cast (FX + audio hooks). */
    onCastFx: ((slot: AbilitySlot, ab: AbilityDef) => void) | null;
    /**
     * THE DRAWN BREATH: the local wind-up, for the cast bar and the
     * winding well. Predicted on the press edge from the same content
     * def the server reads; the server's own S2CCast start/fire/break
     * keeps it honest within a round trip. `rate` is the last frame's
     * accrual (1 or CAST_STILL_FACTOR) so the bar renders smooth
     * between 20 Hz ticks.
     */
    ownCast: {
        slot: AbilitySlot;
        ab: AbilityDef;
        progress: number;
        total: number;
        rate: number;
    } | null;
    /** Fires when the local player begins a wind-up (cue hooks). */
    onCastStart: ((slot: AbilitySlot, ab: AbilityDef) => void) | null;
    /** Fires when the technique loadout changes (UI refresh). */
    onTechniques: (() => void) | null;
    onCallings: (() => void) | null;
    /** Fires for every arriving combat effect (audio/shake hooks). */
    onFx: ((fx: ActiveFx) => void) | null;
    /** Buttons of the previous outgoing frame — press-edge detection. */
    private prevSentButtons;
    /**
     * THE HELD SIGIL: the hold-to-aim layer (main.ts owns it) rewrites
     * each outgoing frame — withholding a held point-art's bit, then
     * raising it for one frame with the aimed `tx`/`ty` on release. Runs
     * BEFORE the cast mirror so the radial and freeze track the release,
     * exactly like the server will.
     */
    groundAim: {
        filterFrame(frame: InputFrame): void;
    } | null;
    /** Local player's status bits from the latest snapshot. */
    ownStatus: number;
    /** Crouch latch — mirrors the input toggle for HUD/render. */
    get isSneaking(): boolean;
    /** Server-confirmed full stealth (own snapshot bit). */
    get isHidden(): boolean;
    /** A hostile NPC is currently chasing us (own snapshot bit). */
    get isDetected(): boolean;
    /** Weapons stowed on the body (own snapshot bit, server-owned). */
    get isSheathed(): boolean;
    /**
     * ONE LAW, TWO MIRRORS — the predicted sheathe state. The snapshot
     * bit is a round trip stale; a fire mirror reading it would happily
     * loose a tracer for the press the server spends DRAWING (THE
     * SAFETY converts a sheathed combat press into a draw, no shot).
     * Toggles are deterministic per press, so the mirror leads and the
     * snapshot confirms: null = trust the server bit; a set value wins
     * until the bit agrees (or the claim goes stale — a dropped frame —
     * and the server bit takes back the truth).
     */
    private ownSheathed;
    /** performance.now() when ownSheathed was last asserted. */
    private ownSheathedAt;
    /**
     * No local swing/bolt/draw/cast until this input seq — the mirror of
     * the server's drawLockUntilSeq, fed by the same three verbs (the
     * sheathed combat press's auto-draw, and the swap beat). The server
     * gates on this seq AND its own tick twin (ONE LAW, TWO CLOCKS);
     * for a healthy 20Hz stream both expire on the same press. When a
     * jitter catch-up briefly holds the server's tick floor past this
     * mirror, the press rides the held bit / armBuffer a tick or two
     * and the tracer marriage's ±2 window + angle fallback absorb it.
     */
    private drawLockUntilSeq;
    /** The sheathe state the fire mirrors must judge by. */
    private effectiveSheathed;
    /**
     * The server's weaponsAway gate, mirrored: stowed steel or a
     * mid-draw lock refuses every fire mirror — no tracer, no predicted
     * swing, no radial, exactly the presses the server refuses.
     */
    private weaponsAway;
    /** The predicted sheathe truth, for UI consumers (the aim ring). */
    sheathedNow(): boolean;
    /**
     * ONE LAW, TWO MIRRORS for the aim ring: true while the NEXT cast
     * press would be refused (weapons away, cast freeze, a winding
     * breath). The ring must not arm-and-swallow a press the server
     * would refuse anyway — the refusal shape should be the same one
     * every other lane shows.
     */
    castGateClosed(): boolean;
    /** Tap-to-move autopilot; cancelled by any manual movement input. */
    private autoPath;
    /** Drop entity to take the moment the auto-walk brings it in reach. */
    private pendingPickup;
    /**
     * THE CHOSEN HAND (looting v2): whether the walk-over vacuum serves
     * this character. Mirrors the server's persisted truth (welcome
     * carries it; setLootPref writes it optimistically).
     */
    lootAuto: boolean;
    /** Own hit-flash timer. */
    ownHurtUntil: number;
    ownHpPct: number;
    /** Authoritative pose for the local player (from snapshots). */
    ownPose: number;
    /** Server-confirmed own facing (radians) — the seat-locked dir while
     *  mounted on furniture; the live aim everywhere else. */
    ownDirServer: number;
    /**
     * THE PREDICTED TRADE: performance.now() when the local swap verb
     * last fired with something waiting at the back; 0 = never. The
     * renderer stows the own body through the beat's first half off this
     * clock, and main.ts hangs the stow/draw voice on its edge. Cosmetic
     * only — the server's exchange and beat lock are the authority.
     */
    ownSwapAt: number;
    /**
     * True through the first half of the local swap beat — the outgoing
     * weapon riding to its rest. The back half is the standing sheathe
     * ease falling home with the incoming set (the equip echo lands
     * while the hand is at the hip, so the trade reads as one motion).
     */
    swapStowing(now?: number): boolean;
    /** Dodge FX hook (the predictor's onDodge is owned internally). */
    onDodgeFx: ((x: number, y: number, mx: number, my: number) => void) | null;
    /**
     * THE GUARD SWEEP's client eye: injected by main (which owns the
     * entity scan) — true when a living foe stands within `range` tiles.
     * The staff mirror uses it to hold its bolt tracer when the server
     * will strike with the pole instead.
     */
    foeWithin: ((range: number) => boolean) | null;
    /** Fires the instant the local player releases a valid draw. */
    onLoose: ((charge: number, aim: number) => void) | null;
    /** performance.now() when the local bow draw began; 0 = not drawing. */
    private drawStartAt;
    /** Local estimate of the attack cooldown, for draw-start gating. */
    private drawReadyAt;
    private conn;
    private token;
    private inputSeq;
    private accumulator;
    private lastUpdate;
    private clockOffset;
    private pingTimer;
    private reconnectDelay;
    private stopped;
    /**
     * THE LIVE WIRE: performance.now() of the last byte the server spoke
     * — any message, snapshot, or chunk. In-game a healthy wire is never
     * silent longer than one tick (the own body ships in every snapshot,
     * THE QUIET WIRE notwithstanding), so this clock going stale IS the
     * connection dying — including the death TCP never reports: a route
     * change or dropped Wi-Fi leaves the socket reading "open" for
     * minutes while the world stands frozen at its last sample. The
     * watchdog in update() reads this and forces the reconnect the
     * close event would never have delivered.
     */
    private lastS2CAt;
    /**
     * Arrival stamp of the previous snapshot — the clock discipline's
     * burst detector (see handleSnapshot): back-to-back arrivals are a
     * stalled queue draining, not evidence about the remote clock.
     */
    private lastSnapArrivalAt;
    constructor(input: InputManager, events: GameEvents);
    /**
     * THE OVERCHARGE: true once the held draw has pulled past full into
     * the volley band — the HUD's second click and the release's fan.
     */
    get ownOvercharged(): boolean;
    /** 0..1 charge of the local player's in-progress bow draw. */
    get ownDrawT(): number;
    private equippedWeaponDef;
    /** The combat style of the equipped weapon (bare fists = melee). */
    currentStyle(): string;
    /**
     * THE LOAN LAW's teaching hands, mirrored: the arts the held weapons
     * lend — main hand and offhand both (a dual wielder hears both
     * blades).
     */
    equippedArtIds(): Set<string>;
    /** A mastered or deed-earned art is owned outright (server truth). */
    ownsArt(ability: string): boolean;
    /**
     * THE LESSON LAW's meter, 0..1, for a still-learning secret art —
     * null when nothing is banked or the art is already owned. Cost
     * derives from the shared masteryXp dial; the wire carries the bank.
     */
    lessonProgress(ability: string): number | null;
    /**
     * Resolve a technique seat (0 = Q, 1 = R), mirroring the server:
     * THE FREE HAND ignores the equipped weapon; THE HONED-ART LAW ranks
     * by the BASE skill level; THE LOAN LAW keeps an unmastered secret
     * at Rank I.
     */
    private seatAbilityDef;
    /**
     * THE LOAN LAW's dormancy, mirrored for the tray: an unmastered
     * secret sleeps while no teaching weapon is in hand.
     */
    seatDormant(slot: AbilitySlot): boolean;
    /** The ability in a hotbar slot: two technique seats, relic, sigil. */
    slotAbilityDef(slot: AbilitySlot): AbilityDef | null;
    /** Seat a technique on Q (slot 0) or R (slot 2); server validates. */
    sendTechnique(ability: string, slot: 0 | 2): void;
    /**
     * Answer, deepen, or set down a Calling (server enforces THE FOCUS
     * LAW and the rank entitlement). `rank` = the applied rank to hold.
     */
    sendCalling(calling: string, on: boolean, rank?: number): void;
    /** Remaining cooldown fraction for a hotbar slot, 0 = ready. */
    abilityCdFraction(slot: AbilitySlot, now?: number): number;
    /**
     * Local press-edge cast mirror: starts the radial instantly, roots the
     * predictor for the commitment window, and applies dash Arts so the
     * server's authoritative version lands where we already are.
     */
    private trackOwnCasts;
    /**
     * THE CROSSING, mirrored: the movement a cast carries, for the
     * predictor. Every transport art is predicted now — dashes and
     * charges walk the same seq-window road the server's transit
     * walks, blinks leave through the SAME shared teleport resolver,
     * and a road released on an aimed ring travels exactly the
     * clamped distance the server will (one reach ruler, one clamp
     * law). A locked charge's live curve toward a moving mark stays
     * server-side — the straight-line mirror is the recorded bounded
     * drift and folds through the error offset.
     */
    private castImpulse;
    /**
     * THE PREDICTED TRADE: the swap's choreography starts on the press
     * edge (the PREDICTED BLOW insight — feed the stow early, let the
     * standing sheathe ease play it), and the mirror clocks clamp
     * FORWARD so the predicted body never swings a blow the server's
     * beat lock will refuse. Fires only when the local pack knows
     * something waits at the back — the empty press stays silent here
     * and the server speaks the refusal. Cosmetic on mispredict: a
     * stale local view plays a beat over nothing and touches no
     * authority. Dodge stays free through the beat, like the server.
     */
    /**
     * THE SAFETY, mirrored — the sheathe toggle and the auto-draw. The
     * server flips `sheathed` on the Sheathe press edge and converts a
     * sheathed combat press into a DRAW behind DRAW_LOCK_TICKS; the
     * mirror plays both on the same edges so no fire mirror ever
     * predicts a shot for a press the server spends pulling steel.
     * Runs FIRST in the frame pipeline (the server reads its buttons in
     * this order too: sheathe → swap → auto-draw → casts → attacks).
     */
    private trackOwnSheathe;
    private trackOwnSwap;
    /**
     * Local mirror of the server's draw state machine, driven by the same
     * input frames — gives zero-latency draw/release feedback while the
     * server stays authoritative about the arrow itself.
     */
    private trackOwnDraw;
    /**
     * Staff bolts fire while Attack is HELD, cadence-gated — mirror the
     * server's bolt-bolt-HEAVY rhythm with the same shared functions so
     * the predicted bolt and the real one agree on stage, speed, and
     * recovery. A mispredicted bolt (rare cadence drift) simply never
     * matches an entity and fades.
     */
    private trackOwnStaff;
    /**
     * THE PREDICTED BLOW: mirror the server's melee door on the press
     * edge — same ComboTrack, same buffer law, same recovery clocks, in
     * seq units. The mirror only gates on what it can see (sheathed
     * status, own cast, the channel rail); a rare misprediction plays a
     * cosmetic swing that expires, exactly the staff-tracer philosophy.
     */
    private trackOwnMelee;
    /**
     * The own body's pose as the renderer and the sound chain should see
     * it: the predicted swing wins while it lives, the server's byte
     * otherwise. Pose-change clocks downstream never double-fire because
     * the confirmed value equals the predicted one.
     */
    effectiveOwnPose(now: number): number;
    /** Spawn a predicted tracer at the body, capped to a small roster. */
    private predictShot;
    /**
     * The live connection status, mirrored from every onStatus emit —
     * the renderer reads it so a reconnect blip can keep visual state
     * (occluder fades) armed instead of snapping the world for a beat.
     */
    connStatus: 'connecting' | 'ingame' | 'reconnecting' | 'rejected' | 'authRequired' | 'authErr';
    private emitStatus;
    /** Connect; the server answers welcome (valid token) or authRequired. */
    connect(token: string | null): void;
    sendLogin(user: string, pass: string): void;
    sendRegister(user: string, pass: string, name: string, invite?: string): void;
    /**
     * Sign out: tell the server to burn the session, then hang up for
     * good. `stopped` first, so the socket's close does NOT wake the
     * reconnect backoff and walk straight back into the world.
     */
    logout(): void;
    private openConnection;
    get sessionToken(): string | null;
    /**
     * The settled anchors as last pushed by the server — the geography
     * is live data there, so the wire wins over the bundled constants.
     */
    private settledAnchors;
    /** Merge the server's haven triples with the settled anchors. */
    private setHavens;
    /**
     * THE CROSSING's reset work (docs/planes-plan.md §2.4), shared by
     * BOTH doors — the 'plane' message and a reconnect welcome that
     * wakes on a different plane than the one on screen. Everything
     * streamed before this moment belongs to a space that no longer
     * surrounds the player: drop it all and let the fresh plane stream
     * in behind the veil. POST-SHIP AUDIT: ephemeral matter is world
     * matter too — a queued death, a floating word, a spent shaft all
     * carry old-plane coordinates.
     *
     * `at` is the carried standing point; the welcome door passes none
     * (welcome carries no coordinates — the own body's 'enter' seats
     * the predictor, exactly as every welcome always has).
     */
    private crossPlane;
    /**
     * True once a welcome has seated this client in a world — the gate
     * that keeps THE SECOND DOOR shut over the login screen (a first
     * welcome's caches are empty; no veil is wanted there).
     */
    private stoodInWorld;
    private handleMessage;
    private handleChunk;
    /** Wall/door flags per streamed chunk key — the interiors gate. */
    private readonly chunkWallFlags;
    private neighborhoodHasWalls;
    /** Fires with (tx, ty, previous, next) whenever a tile mutates. */
    onTileChange: ((tx: number, ty: number, prev: number | undefined, next: number) => void) | null;
    private handleTilePatch;
    /**
     * THE TENDING HAND: what one press on a growing crop will do, in
     * priority order — water if the stage is thirsty and a can is
     * carried, feed the soil if compost is carried and the ground can
     * take it, mulch if fibre is carried and no blanket lies — else the
     * plain status touch. The prompt shows this same word, so the hand
     * always knows what it is about to do.
     */
    cropVerb(tx: number, ty: number): 'Harvest' | 'Water' | 'Prune' | 'Fertilize' | 'Mulch' | 'Tend';
    prune(tx: number, ty: number): void;
    fertilize(tx: number, ty: number): void;
    mulch(tx: number, ty: number): void;
    compostAdd(tx: number, ty: number, slot: number): void;
    troughAdd(tx: number, ty: number, slot: number): void;
    stockRename(slot: number, name: string): void;
    workStart(tx: number, ty: number, recipe: string, qty: number): void;
    /** Fires with (tx, ty, previous, next) whenever a detail mutates. */
    onDetailChange: ((tx: number, ty: number, prev: number, next: number) => void) | null;
    /**
     * THE SECOND LAYER: a detail-layer mutation (a hanging goes up or
     * comes down). Rooms are ground geography, so interiors never
     * re-derive — but the bake neighborhood refreshes like any patch
     * (wall painters read the detail live; ground details are baked).
     */
    private handleDetailPatch;
    /** Bump ONE chunk's rev — for mutations that never route through
     *  setGround/setDetail (farm care state lives in a side table) but
     *  still change that chunk's own paint. */
    private touchChunk;
    /** Bump neighboring chunks' revs so organic borders re-bake. */
    private touchNeighbors;
    /**
     * The tile of the last interact we sent. The server never names the
     * tile a gather action works, so the renderer squares the OWN rig up
     * to this one — standing between two nodes must never swing the tool
     * at the wrong neighbor.
     */
    lastInteract: {
        tx: number;
        ty: number;
    } | null;
    /**
     * What every board in the streamed world says, by "tx,ty". Filled by
     * the S2CSigns push that rides in with each chunk, so the words are
     * already here when the player walks up — the approach plaque never
     * waits on a round-trip.
     */
    readonly signs: Map<string, SignInfo>;
    /** The words on the board at this tile, if any have arrived. */
    signAt(tx: number, ty: number): SignInfo | undefined;
    /**
     * The nearest readable board within approach range, for the plaque.
     *
     * Deliberately NOT findNearbyTarget: reading is passive and must not
     * compete for the interact slot. A shingle nailed beside a door
     * still reads itself while the door owns the F key, and a blank
     * board answers nobody but the hand that raised it.
     *
     * The range is wider than arm's reach (2.2) so the words arrive as
     * you walk up rather than when you bump the post.
     */
    /**
     * The nearest standing victory banner within approach range, for
     * the champions plaque — the nearestSign law applied to trophies
     * (reading is passive, never competes for the interact slot; the
     * range is generous because the mark is meant to be read from the
     * road). Surface-plane only: the banners stand on the overworld.
     */
    nearestTrophy(radius?: number): TrophyWire | null;
    nearestSign(radius?: number): SignInfo | null;
    /** Rewrite one of your own boards (the server judges ownership). */
    editSign(tx: number, ty: number, title: string, lines: string[]): void;
    /** Pin the one active waypoint (optimistic; the server keeps the durable copy). */
    setWaypoint(x: number, y: number): void;
    /** Walk away from an active quest (the journal's Abandon button). */
    abandonQuest(id: string): void;
    /**
     * The overhead mark an actor wears FOR THIS PLAYER: 'ready' (a
     * finished quest hands in here — the strongest pull) beats 'offer'
     * (an offerable quest starts here). Resolved wholly client-side
     * from the pushed ledger against EntityMeta.actor.
     */
    questMarkFor(actor: string | undefined): 'offer' | 'ready' | null;
    /**
     * How would this body receive ME? Resolved per-viewer from the
     * pushed ledger + live membership tables against the static actor
     * slug / bestiary id — the questMarkFor law: nothing personal ever
     * rides the shared EntityMeta. 'hostile' = an enforcer who will
     * attack on sight (outlaw and below); 'peace' = a hostile faction
     * body holding its fire for a friend at the peace band.
     */
    repTintFor(actor: string | undefined, defId: string | undefined): 'hostile' | 'peace' | null;
    clearWaypoint(): void;
    /** Send an interact intent for a specific world tile. */
    interact(tx: number, ty: number): void;
    /** Use (equip/eat) the item in an inventory slot. */
    useSlot(slot: number, stow?: boolean, off?: boolean): void;
    /** Set one fist's grip style (optimistic; server confirms). */
    setCarryStyle(style: 'normal' | 'rogue', hand?: 'main' | 'off'): void;
    unequip(slot: EquipSlot): void;
    /** Classify what an interact on this tile would do, if anything. */
    targetAt(tx: number, ty: number): InteractTarget | null;
    /** The nearest interactable tile (or gatherable animal) in reach. */
    findNearbyTarget(): InteractTarget | null;
    /**
     * THE QUIET HEEL: the bond moment is worth a prompt only when the
     * press would land it — clock open AND the species' own lure in
     * the pack. (The server also wants the pet out of a fight; we
     * cannot see its target, but a mid-fight press just lands a plain
     * pat without spending the lure or the clock, so the prompt is
     * never a lie — it simply keeps offering until the offer takes.)
     */
    private petOfferReady;
    /**
     * THE ASKING SHOWN — the overhead lure badge's one truth source.
     * While Gentle the Wild is seated, a wild living tamable wears the
     * very treat it wants above its head, marked with what the words in
     * the chat could only spell out: an amber bang when its wild level
     * still outreaches the keeper's beastcraft (fetching the treat
     * would not help yet), a red cross when the treat is missing from
     * the pack, a green check when the asking would land. Little
     * keepers read the picture, never the refusal line.
     */
    tameBadge(defId: string, level: number | undefined, ownerEid: number | undefined): {
        lure: string;
        state: 'ready' | 'lure' | 'level';
    } | null;
    /** Is the bond moment open for this stall? (Counts down locally.) */
    petBondReady(slot: number): boolean;
    /**
     * THE OFFERED HAND — the overhead treat badge's one truth source
     * (the tameBadge law, spoken for company): a wild companion body
     * wears the very morsel it wants, green-checked when the treat is
     * packed and a place stands open, red-crossed when the treat is
     * missing. No level state exists — the befriending has no ladder.
     */
    befriendBadge(defId: string, ownerEid: number | undefined): {
        lure: string;
        state: 'ready' | 'lure';
    } | null;
    /** The walking beast's live body, if it is spawned right now.
     *  (A befriended companion also wears my ownerEid — the `company`
     *  mark is what keeps the two heels from answering for each other.) */
    ownPetEid(): EntityId | null;
    /** THE COMPANY YOU KEEP: the afield companion's live body, if any. */
    ownCompanionEid(): EntityId | null;
    /**
     * Your own companion (befriended) near this tile's center — the
     * same deliberate pat channel as the beast below.
     */
    companionAtTile(tx: number, ty: number): EntityId | null;
    /**
     * Your own beast near this tile's center — the deliberate pat
     * channel (THE QUIET HEEL: the body is the button, not the prompt).
     */
    petAtTile(tx: number, ty: number): EntityId | null;
    private friendAtTile;
    /** The drop nearest this tile's center (touch taps land on tiles). */
    lootAtTile(tx: number, ty: number): EntityId | null;
    /** Where a ground drop lies, if it is still in view. */
    dropPos(eid: EntityId): Vec2 | null;
    /** All ground drops within `radius` tiles of the player, nearest first. */
    nearbyLoot(radius: number): Array<{
        eid: EntityId;
        x: number;
        y: number;
        d: number;
        itemId: string;
        qty: number;
        roll?: ItemRoll;
    }>;
    /** Take a specific ground drop (server validates reach and claim). */
    pickup(eid: EntityId): void;
    /**
     * ONE SWEEP, ONE ANSWER: take everything within reach on one
     * message — the server runs the sweep and coalesces the refusals.
     */
    takeAll(): void;
    /** THE CHOSEN HAND: set the walk-over preference (persisted). */
    setLootPref(auto: boolean): void;
    /** Whether a walk-and-take errand (ONWARD, far click) is in flight. */
    get hasPickupErrand(): boolean;
    /**
     * Click a distant bag: auto-walk toward it and take exactly that
     * bag on arrival — not whatever the walk-over vacuum happens to
     * cross first. Manual movement input cancels the errand.
     */
    pickupWalk(eid: EntityId): boolean;
    /** Pathfind and auto-walk to a tile. Returns false if unreachable. */
    walkTo(tx: number, ty: number): boolean;
    get isAutoWalking(): boolean;
    craft(recipe: string, qty: number): void;
    /** THE UNMAKING: break the gear in a pack slot down for its dust. */
    unmakeSend(slot: number): void;
    /**
     * THE BULK BREAKING: the marked batch comes apart as ONE working —
     * one message, one payout, one voice line (all or nothing serverside).
     */
    unmakeManySend(slots: number[]): void;
    /** SUNDERING: draw the working back out of a pack slot's gear. */
    sunderSend(slot: number, worn?: EquipSlot, seat?: 'ward' | 'art'): void;
    /** Set the tools down: stop the running craft batch, keeping what's made. */
    craftStop(): void;
    /** Plant a seed into a tilled plot. */
    plantSend(tx: number, ty: number, seed: string): void;
    /** Interact with a living NPC (talk to an actor, milk a cow). */
    interactNpc(eid: EntityId): void;
    /** Name (or rename) a companion by stall slot — the server judges. */
    petRename(slot: number, name: string): void;
    /** A stable-door act — the server re-proves the pen tile. */
    stableOp(op: 'heel' | 'stable' | 'release', slot: number): void;
    /** THE THREE COLLARS: set a stall's slotted arts whole — the
     *  server re-proves repertoire, budget, and the fight gate aloud. */
    petArts(slot: number, arts: string[]): void;
    /** THE COMPANY YOU KEEP: a company-roster act — honored anywhere. */
    companionOp(op: 'heel' | 'home' | 'part', slot: number): void;
    /** Name (or rename) a kept companion — the server judges. */
    companionRename(slot: number, name: string): void;
    /** Advance the current dialogue beat (the server owns the walk). */
    dialogueAdvance(): void;
    /** Answer the current dialogue question by choice index. */
    dialogueChoose(idx: number): void;
    /** Excuse yourself from the conversation early. */
    dialogueEnd(): void;
    bankSend(op: 'deposit' | 'withdraw', item: string, qty: number, slot?: number, gearId?: number): void;
    requestSocial(): void;
    friendSearch(query: string): void;
    friendRequest(name: string): void;
    friendAccept(name: string): void;
    friendDecline(name: string): void;
    friendRemove(name: string): void;
    requestParty(): void;
    partyInvite(name: string): void;
    partyAccept(name: string): void;
    partyDecline(name: string): void;
    partyLeave(): void;
    partyKick(name: string): void;
    partyDisband(): void;
    partyJoinRun(name: string): void;
    /** THE SAND AND THE ROAR: buy a card off the open stakes board. */
    arenaQueue(match: string): void;
    /** Walk away from the claim (muster cancel or mid-card forfeit). */
    arenaLeave(): void;
    /**
     * Fellows the wayfinder may point at: party members with a fresh
     * ticker position, self excluded. Entries older than two beats are
     * dropped — a stopped ticker must never leave ghosts on the chart.
     */
    partyFellowsPlaced(now?: number): Array<{
        name: string;
        x: number;
        y: number;
        plane: string;
    }>;
    /**
     * The players standing inside our interest window right now, nearest
     * first. Pure client knowledge — the entities map only ever holds
     * remotes, so our own rig never appears.
     */
    nearbyPlayers(): Array<{
        eid: EntityId;
        name: string;
        dist: number;
        meta: EntityMeta;
    }>;
    invMove(from: number, to: number, merge?: boolean): void;
    /** Drop a pack slot onto the ground where you stand. */
    dropSend(slot: number, qty: number): void;
    /** Turn a key by ring id — only heard at a riftgate. */
    useKeySend(key: number): void;
    /** Set a key from the ring down at your feet (the trade verb). */
    keyDropSend(key: number): void;
    /** Write (or clear) the margin note on a ledgered door. */
    keyLabelSend(seed: number, label: string | undefined): void;
    /** Pay the Keywright to cut a remembered door again. */
    keyForgeSend(seed: number): void;
    /** Confirm character creation (optimistic — the server locks it). */
    setLookSend(look: Look): void;
    shopSend(op: 'buy' | 'sell', item: string, qty: number, slot?: number, shop?: string): void;
    buildSend(buildable: string, tx: number, ty: number, orient?: BuildOrient, dye?: number): void;
    demolishSend(tx: number, ty: number): void;
    /** Ask for the own-built ledger (THE OWN-WORK OVERLAY refresh). */
    ownBuiltRequest(): void;
    private handleSnapshot;
    /**
     * Smooth game-clock hours for the sky. Rides the same slewed
     * clockOffset as entity interpolation, so the sun never stutters
     * on snapshot arrival.
     */
    clockHoursNow(): number;
    /**
     * The delay target: one snapshot interval of bracketing room plus
     * headroom scaled by measured arrival jitter. Clean local play sits
     * at the 80ms floor; a 30ms-jitter connection rides ~200.
     */
    private targetInterpDelay;
    /** Server-timeline timestamp remote entities should be rendered at. */
    renderTime(): number;
    /**
     * THE LIVE WIRE, read aloud: milliseconds since the server last
     * spoke, while we believe ourselves in-game on an open socket — 0
     * whenever that belief doesn't hold (login, reconnect, shutdown).
     * The HUD reads this to name a stall the moment it starts
     * (~1.5s), well before the 5s watchdog rules the wire dead: the
     * frozen world should never be anonymous.
     */
    wireSilenceMs(now?: number): number;
    /**
     * Server-NOW estimate — the projectile timeline. Arrows and bolts
     * render extrapolated to where the server actually HAS them, not
     * 100+ms in the past: your shot leaves the bow tracking its true
     * flight, and an incoming shot is exactly as far along as it really
     * is. Straight-line flight is what makes this safe (the interp
     * buffer's bounded extrapolation does the projection).
     */
    projectileTime(): number;
    sendChat(text: string): void;
    /** Fixed-timestep input sampling + prediction; called every frame. */
    update(now: number): void;
}
//# sourceMappingURL=clientGame.d.ts.map