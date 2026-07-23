import { ChunkStore, type ChestKind, type EntityId, type EntityMeta, type EquipSlot, type BuffInfo, type InvSlot, type ItemRoll, type EquippedItem, type S2CFx, type SkillXp, type StationType, type Vec2 } from '@devcraft/shared';
import type { AbilityDef, AbilitySlot, Look } from '@devcraft/shared';
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
    /** Same defId the server will broadcast ('archery', 'magic:ember'…). */
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
};
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
export interface ChatLine {
    channel: 'local' | 'system';
    from?: string;
    text: string;
}
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
    /** The Riftgate answered an interact — open the key panel over these pack slots. */
    onRiftgate?(keySlots: number[]): void;
    /** Crossed into a dungeon — everything the entry banner tells. */
    onDungeon?(d: {
        name: string;
        sigil: string;
        tier: string;
        theme: string;
        power: number;
    }): void;
    onHit(hit: {
        x: number;
        y: number;
        dmg: number;
        isOwn: boolean;
        crit: boolean;
        backstab?: boolean;
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
    /** A conversation began — raise the cinematic frame around `eid`. */
    onDialogueOpen?(o: {
        eid: EntityId;
        name: string;
        title?: string;
    }): void;
    /** One beat of conversation — typewriter it out. */
    onDialogueNode?(n: {
        speaker: 'npc' | 'player';
        text: string;
        choices?: string[];
        last?: boolean;
    }): void;
    /** The conversation is over — tear the frame down. */
    onDialogueClose?(): void;
}
export declare class ClientGame {
    private readonly input;
    private readonly events;
    /** World tiles streamed from the server; also the collision source. */
    readonly world: ChunkStore;
    /** Bumped whenever chunk data changes so the renderer can re-bake. */
    worldVersion: number;
    readonly entities: Map<number, RemoteEntity>;
    readonly predictor: Predictor;
    ownEid: EntityId | null;
    ownName: string;
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
    skills: SkillXp;
    equipment: Partial<Record<string, EquippedItem>>;
    /** Cosmetic idle weapon-carry preference (server-confirmed). */
    carryStyle: 'normal' | 'rogue';
    /** Off-fist grip preference — each hand carries its own way. */
    carryOff: 'normal' | 'rogue';
    /** Running gather action, for the progress bar. */
    action: {
        startedAt: number;
        durationMs: number;
    } | null;
    /** Damage numbers floating up; pruned by the renderer. */
    readonly floaties: Floaty[];
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
     * offset on the entity's first draw and decays it (~90ms), so the
     * predicted flight blends into the authoritative one seamlessly.
     */
    readonly projHandoffs: Map<number, {
        shot: OwnShot;
        ox: number;
        oy: number;
        capturedAt: number;
    }>;
    /** Local staff-cadence mirror (bolt-bolt-HEAVY, same shared laws). */
    private staffReadyAt;
    private boltStageLocal;
    private boltGraceUntilMs;
    /** Local mirror of the cast commitment window (holds basics back). */
    private castFreezeUntilMs;
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
    }>;
    /** Combat effects in flight; pruned by the renderer. */
    readonly fx: ActiveFx[];
    /** Hotbar state: performance.now() when each slot comes off cooldown. */
    readonly abilityReadyAt: [number, number, number, number];
    /** Full cooldowns in ticks (0 = nothing equipped in that slot). */
    abilityMax: [number, number, number, number];
    /** Chosen technique ability per combat style (server-confirmed). */
    techniques: Record<string, string>;
    /** Active consumable buffs (tonic/food) for the HUD chip row. */
    buffs: BuffInfo[];
    /** performance.now() when the buffs snapshot arrived (chips count down). */
    buffsAt: number;
    /** Fires when the buff list changes (HUD refresh). */
    onBuffs: (() => void) | null;
    /** Fires when the local player commits a cast (FX + audio hooks). */
    onCastFx: ((slot: AbilitySlot, ab: AbilityDef) => void) | null;
    /** Fires when the technique loadout changes (UI refresh). */
    onTechniques: (() => void) | null;
    /** Fires for every arriving combat effect (audio/shake hooks). */
    onFx: ((fx: ActiveFx) => void) | null;
    /** Buttons of the previous outgoing frame — press-edge detection. */
    private prevSentButtons;
    /** Local player's status bits from the latest snapshot. */
    ownStatus: number;
    /** Crouch latch — mirrors the input toggle for HUD/render. */
    get isSneaking(): boolean;
    /** Server-confirmed full stealth (own snapshot bit). */
    get isHidden(): boolean;
    /** A hostile NPC is currently chasing us (own snapshot bit). */
    get isDetected(): boolean;
    /** Tap-to-move autopilot; cancelled by any manual movement input. */
    private autoPath;
    /** Drop entity to take the moment the auto-walk brings it in reach. */
    private pendingPickup;
    /** Own hit-flash timer. */
    ownHurtUntil: number;
    ownHpPct: number;
    /** Authoritative pose for the local player (from snapshots). */
    ownPose: number;
    /** Dodge FX hook (the predictor's onDodge is owned internally). */
    onDodgeFx: ((x: number, y: number, mx: number, my: number) => void) | null;
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
    constructor(input: InputManager, events: GameEvents);
    /** 0..1 charge of the local player's in-progress bow draw. */
    get ownDrawT(): number;
    private equippedWeaponDef;
    /** The combat style of the equipped weapon (bare fists = melee). */
    currentStyle(): string;
    /** The ability granted by a hotbar slot: Art, relic, technique, sigil. */
    slotAbilityDef(slot: AbilitySlot): AbilityDef | null;
    /** Choose a technique for a style (server validates the unlock). */
    sendTechnique(style: string, ability: string): void;
    /** Remaining cooldown fraction for a hotbar slot, 0 = ready. */
    abilityCdFraction(slot: AbilitySlot, now?: number): number;
    /**
     * Local press-edge cast mirror: starts the radial instantly, roots the
     * predictor for the commitment window, and applies dash Arts so the
     * server's authoritative version lands where we already are.
     */
    private trackOwnCasts;
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
    /** Spawn a predicted tracer at the body, capped to a small roster. */
    private predictShot;
    /** Connect; the server answers welcome (valid token) or authRequired. */
    connect(token: string | null): void;
    sendLogin(user: string, pass: string): void;
    sendRegister(user: string, pass: string, name: string): void;
    private openConnection;
    get sessionToken(): string | null;
    private handleMessage;
    private handleChunk;
    /** Fires with (tx, ty, previous, next) whenever a tile mutates. */
    onTileChange: ((tx: number, ty: number, prev: number | undefined, next: number) => void) | null;
    private handleTilePatch;
    /** Bump neighboring chunks' revs so organic borders re-bake. */
    private touchNeighbors;
    /** Send an interact intent for a specific world tile. */
    interact(tx: number, ty: number): void;
    /** Use (equip/eat) the item in an inventory slot. */
    useSlot(slot: number): void;
    /** Set one fist's grip style (optimistic; server confirms). */
    setCarryStyle(style: 'normal' | 'rogue', hand?: 'main' | 'off'): void;
    unequip(slot: EquipSlot): void;
    /** Classify what an interact on this tile would do, if anything. */
    targetAt(tx: number, ty: number): InteractTarget | null;
    /** The nearest interactable tile (or gatherable animal) in reach. */
    findNearbyTarget(): InteractTarget | null;
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
     * Click a distant bag: auto-walk toward it and take exactly that
     * bag on arrival — not whatever the walk-over vacuum happens to
     * cross first. Manual movement input cancels the errand.
     */
    pickupWalk(eid: EntityId): boolean;
    /** Pathfind and auto-walk to a tile. Returns false if unreachable. */
    walkTo(tx: number, ty: number): boolean;
    get isAutoWalking(): boolean;
    craft(recipe: string, qty: number): void;
    /** Plant a seed into a tilled plot. */
    plantSend(tx: number, ty: number, seed: string): void;
    /** Interact with a living NPC (talk to an actor, milk a cow). */
    interactNpc(eid: EntityId): void;
    /** Advance the current dialogue beat (the server owns the walk). */
    dialogueAdvance(): void;
    /** Answer the current dialogue question by choice index. */
    dialogueChoose(idx: number): void;
    /** Excuse yourself from the conversation early. */
    dialogueEnd(): void;
    bankSend(op: 'deposit' | 'withdraw', item: string, qty: number, slot?: number, gearId?: number): void;
    invMove(from: number, to: number): void;
    /** Drop a pack slot onto the ground where you stand. */
    dropSend(slot: number, qty: number): void;
    /** Turn the dungeon key in this pack slot — only heard at a riftgate. */
    useKeySend(slot: number): void;
    /** Confirm character creation (optimistic — the server locks it). */
    setLookSend(look: Look): void;
    shopSend(op: 'buy' | 'sell', item: string, qty: number, slot?: number): void;
    buildSend(buildable: string, tx: number, ty: number): void;
    demolishSend(tx: number, ty: number): void;
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