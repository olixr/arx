import { ChunkStore, type EntityId, type EntityMeta, type EquipSlot, type InvSlot, type SkillXp, type StationType } from '@devcraft/shared';
import type { AbilityDef, AbilitySlot } from '@devcraft/shared';
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
};
import { InterpBuffer } from '../net/interpolation.js';
import { Predictor } from '../net/prediction.js';
import type { InputManager } from '../input/inputManager.js';
export interface RemoteEntity {
    meta: EntityMeta;
    buffer: InterpBuffer;
    /** Hit-flash timer (performance.now ms). */
    hurtUntil?: number;
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
    kind: 'nova' | 'telegraph' | 'blast' | 'reaction' | 'summon';
    x: number;
    y: number;
    radius: number;
    /** telegraph: fuse length in server ticks. */
    ticks?: number;
    color?: string;
    text?: string;
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
    onEquipment(equipment: Partial<Record<string, string>>): void;
    onBank(items: Record<string, number>): void;
    onHit(hit: {
        x: number;
        y: number;
        dmg: number;
        isOwn: boolean;
        crit: boolean;
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
    aim: number;
    rttMs: number;
    serverTick: number;
    /** World-clock offset in ticks (dev /time); see sim/daylight. */
    timeOfs: number;
    inventory: InvSlot[];
    skills: SkillXp;
    equipment: Partial<Record<string, string>>;
    /** Running gather action, for the progress bar. */
    action: {
        startedAt: number;
        durationMs: number;
    } | null;
    /** Damage numbers floating up; pruned by the renderer. */
    readonly floaties: Floaty[];
    /** Combat effects in flight; pruned by the renderer. */
    readonly fx: ActiveFx[];
    /** Hotbar state: performance.now() when each slot comes off cooldown. */
    readonly abilityReadyAt: [number, number, number, number];
    /** Full cooldowns in ticks (0 = nothing equipped in that slot). */
    abilityMax: [number, number, number, number];
    /** Chosen technique ability per combat style (server-confirmed). */
    techniques: Record<string, string>;
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
    /** Tap-to-move autopilot; cancelled by any manual movement input. */
    private autoPath;
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
    unequip(slot: EquipSlot): void;
    /** Classify what an interact on this tile would do, if anything. */
    targetAt(tx: number, ty: number): InteractTarget | null;
    /** The nearest interactable tile within reach, or null. */
    findNearbyTarget(): InteractTarget | null;
    /** Pathfind and auto-walk to a tile. Returns false if unreachable. */
    walkTo(tx: number, ty: number): boolean;
    get isAutoWalking(): boolean;
    craft(recipe: string, qty: number): void;
    bankSend(op: 'deposit' | 'withdraw', item: string, qty: number): void;
    invMove(from: number, to: number): void;
    /** Drop a pack slot onto the ground where you stand. */
    dropSend(slot: number, qty: number): void;
    shopSend(op: 'buy' | 'sell', item: string, qty: number): void;
    buildSend(buildable: string, tx: number, ty: number): void;
    demolishSend(tx: number, ty: number): void;
    private handleSnapshot;
    /**
     * Smooth game-clock hours for the sky. Rides the same slewed
     * clockOffset as entity interpolation, so the sun never stutters
     * on snapshot arrival.
     */
    clockHoursNow(): number;
    /** Server-timeline timestamp remote entities should be rendered at. */
    renderTime(): number;
    sendChat(text: string): void;
    /** Fixed-timestep input sampling + prediction; called every frame. */
    update(now: number): void;
}
//# sourceMappingURL=clientGame.d.ts.map