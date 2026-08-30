import type { ClientGame } from '../game/clientGame.js';
import type { InputManager } from '../input/inputManager.js';
import type { Button } from './types.js';
export declare class Puppet {
    private readonly game;
    private readonly input;
    /** Held-button release deadlines, ms on the performance clock. */
    private releases;
    private tokens;
    private lastRefill;
    /** A live `goto`: steer here every frame until we are inside. */
    private goal;
    /** Commands the bucket could not afford yet. */
    private queue;
    /** Every command that had to wait — the take report reads this. */
    readonly overspend: string[];
    constructor(game: ClientGame, input: InputManager);
    /** Analog walk, world axes. Magnitude ≤ 1 sets the pace. */
    move(x: number, y: number): void;
    /** Walk toward a world point and stop there. */
    goto(x: number, y: number, speed?: number, within?: number): void;
    /** True once a `goto` has arrived (or there was never one). */
    get arrived(): boolean;
    /** The eyes. */
    look(rad: number): void;
    lookAt(x: number, y: number): void;
    lookFree(): void;
    /** Hold a button. `ms` measured on the performance clock. */
    press(btn: Button, ms: number, now: number): void;
    /** Dev chat, bucket-aware. Anything over budget waits its turn. */
    cmd(text: string, now: number): void;
    private refill;
    private set;
    /** One frame of upkeep: releases, steering, the command queue. */
    step(now: number): void;
    /** Drop everything: no held buttons, no walk, no borrowed eyes. */
    release(): void;
}
//# sourceMappingURL=puppet.d.ts.map