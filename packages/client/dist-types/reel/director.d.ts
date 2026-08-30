import type { ClientGame } from '../game/clientGame.js';
import type { InputManager } from '../input/inputManager.js';
import type { Renderer } from '../render/renderer.js';
import { Recorder, type TakeStats } from './recorder.js';
import type { Shot } from './types.js';
export interface Deps {
    game: ClientGame;
    renderer: Renderer;
    input: InputManager;
    canvas: HTMLCanvasElement;
}
export declare class Director {
    private readonly d;
    private readonly puppet;
    private readonly rig;
    readonly marks: Record<string, number>;
    /** Progress the driver polls while the lane waits. */
    phase: 'idle' | 'staging' | 'settling' | 'rolling' | 'done' | 'error';
    note: string;
    recorder: Recorder | null;
    constructor(d: Deps);
    /**
     * Every live FOE, nearest first.
     *
     * The filter matters more than it looks. The game's aim-assist roster
     * is the honest definition of "a thing you are fighting", and a
     * camera that picks anything looser will, the moment the last
     * juggernaut falls, lock onto a chicken and sail across the village
     * with the shot still rolling. (It did. That is why this is a copy of
     * main.ts's assistMark and not a guess.) The radius is the second
     * half of the same lesson: a foe thirty tiles away is scenery.
     */
    private foes;
    private pickFoe;
    /** THE PRE-ROLL. Wall-clock, unwatched, allowed to be slow. */
    stage(shot: Shot): Promise<void>;
    private runStage;
    /** THE PERFORMANCE. Frame-locked, recorded, exactly `seconds` long. */
    perform(shot: Shot): Promise<TakeStats>;
    /**
     * THE CHASE. A fight is two bodies negotiating a distance, and the
     * distance changes every frame — so closing on a foe is a per-frame
     * decision, never a walk vector written in the shot file.
     */
    private steerChase;
    private stepRig;
    private foePick;
    /** THE PERFORMER WENT DOWN. A death mid-take respawns the body at the
     *  town waystone, and the camera dutifully follows it there — which
     *  is how a boss reel ends in a market square. Watched every frame,
     *  reported, and never quietly shipped. */
    private died;
    private lastPos;
    /** A live closeOn/backOff: re-steered every frame while it stands. */
    private chase;
    private act;
    /** Hand the game back: no puppet, no borrowed camera, no dress. */
    release(): void;
}
//# sourceMappingURL=director.d.ts.map