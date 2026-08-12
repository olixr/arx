/**
 * THE ROUTINE INTERPRETER — Map Studio v2 Phase 3. A pure, client-side
 * reading of RoutineDef: given the placement (THE POST IS THE ORIGIN),
 * the scrubbed hour, and a time parameter, where does the body stand
 * and which way does it face? No server sim — waypoint legs are
 * parametrized by seconds so path walkers move along their rounds and
 * wanderers drift, deterministically per post (two guards on the same
 * round never sync-step).
 *
 * Faithful to the schedule law: the FIRST slot containing the hour
 * wins, `from > to` wraps midnight, the base task fills unclaimed
 * hours. Position truth only — work/sit/lie POSES are a later phase
 * (bodies stand at their stops).
 */
import type { RoutineDef, RoutineTask } from '@arx/content';
export interface RoutinePose {
    /** WORLD tile coords (post-relative offsets already applied). */
    x: number;
    y: number;
    /** Facing, radians. */
    dir: number;
    /** True mid-leg — the body is walking (drives the gait). */
    moving: boolean;
    kind: RoutineTask['kind'];
}
/** Does an [from,to) hours window contain this hour? from>to wraps. */
export declare function hoursContain(from: number, to: number, hour: number): boolean;
/** The task owning this hour — first matching slot, else base. */
export declare function activeTask(def: RoutineDef, hour: number): RoutineTask;
interface Post {
    x: number;
    y: number;
    dir?: number;
}
/**
 * The one entry: where the routine puts a body posted at `post` when
 * the clock reads `hour`, with `tSec` parametrizing motion (LIVING
 * MODE feeds real seconds; the still frame derives a deterministic
 * parameter from the hour so scrubbing advances the rounds).
 */
export declare function routinePoseAt(def: RoutineDef | undefined, post: Post, hour: number, tSec: number): RoutinePose;
export {};
//# sourceMappingURL=routines.d.ts.map