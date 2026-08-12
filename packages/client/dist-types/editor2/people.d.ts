/**
 * THE PEOPLE OF THE STAGE — Map Studio v2 Phase 3. Every placement
 * synthesizes a REAL entity: actors wear their true look and worn
 * gear through the server's own actorAppearance composition; creature
 * clusters scatter deterministic bodies inside their wander rings;
 * routine-bound actors stand exactly where their day puts them at the
 * scrubbed hour (scrub the clock and the town watch changes shift).
 *
 * Bodies ride the renderer's no-sample fallback — meta.x/y/dir is the
 * position, mutated in place each frame, so LIVING MODE walking gets
 * its gait from the renderer's own frame-delta animation. Clusters
 * outside their hours window leave the entity set and ghost at 25%
 * in the overlay instead — AUTHORED IS ALWAYS VISIBLE, never gone.
 *
 * Position truth only in this phase: work/sit/lie stops stand their
 * bodies at the stop (pose fidelity rides a later phase).
 */
import { type NpcActorDef, type ZoneDef } from '@arx/content';
import type { EditorStage } from './stage.js';
interface OverlayHelpers {
    ctx: CanvasRenderingContext2D;
    sx: (lx: number) => number;
    sy: (ly: number) => number;
    s: number;
    ys: number;
}
export declare class StagePeople {
    private readonly stage;
    private readonly getZone;
    /** LIVING MODE: paths walk in real time; off = the settled hour frame. */
    living: boolean;
    /** Entities owned by other systems (ghost walk) — never swept. */
    readonly external: Set<number>;
    /** DB-first actor defs (fetched); bundle registry stands in offline. */
    private actorDefs;
    private stale;
    private readonly ghostSprites;
    private liveT0;
    constructor(stage: EditorStage, getZone: () => ZoneDef);
    adoptActorDefs(defs: ReadonlyMap<string, NpcActorDef>): void;
    markStale(): void;
    actorDef(slug: string): NpcActorDef | undefined;
    /**
     * The motion parameter: LIVING MODE walks real seconds; the still
     * frame derives a deterministic parameter from the scrubbed hour so
     * dragging the clock advances every round through its legs.
     */
    private timeParam;
    /** Deterministic scatter inside a cluster ring (golden-angle spiral). */
    private scatter;
    /** Cluster body positions at the current hour (patrol walks its loop). */
    private clusterBodies;
    /**
     * The frame hook: (re)build the entity set when stale, then pose
     * every body for the hour. Mutating meta in place rides the
     * renderer's no-sample fallback; a moving meta animates the gait.
     */
    update(): void;
    private ghostSprite;
    /**
     * The people plane over the true frame: out-of-hours cluster ghosts
     * at quarter-light with their window told plainly.
     */
    drawGhosts(h: OverlayHelpers): void;
    /**
     * THE DAY MADE VISIBLE: the selected actor's routine geometry —
     * the active task lit, off-hour tasks faint; posts, rounds, wander
     * rings, all offset from the post (moving the post moves the day).
     */
    drawRoutineProjection(h: OverlayHelpers, actorIndex: number): void;
}
export {};
//# sourceMappingURL=people.d.ts.map