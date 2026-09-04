/**
 * THE HAND ON THE CAMERA (play3d S1) — keyboard + pointer for the
 * skeleton. Drag orbits (yaw/pitch), wheel dollies, WASD walks the
 * target body camera-relative. Deltas ACCUMULATE between frames and
 * are consumed once per frame by the engine, so input never touches
 * the camera outside the frame loop (no mid-frame tearing of the
 * orbit pose) and a burst of wheel events lands as one dolly.
 *
 * S2 mounts the real InputManager / touch.ts adapter; this stays the
 * dev-page fallback.
 */
export declare class Input3D {
    private readonly canvas;
    readonly keys: Set<string>;
    private dragX;
    private dragY;
    private wheel;
    private dragging;
    private lastX;
    private lastY;
    private readonly onKeyDown;
    private readonly onKeyUp;
    private readonly onPointerDown;
    private readonly onPointerMove;
    private readonly onPointerUp;
    private readonly onWheel;
    private readonly onBlur;
    /** Single-press hook (toggles). */
    onKey: ((code: string) => void) | null;
    constructor(canvas: HTMLCanvasElement);
    /** Read-and-zero the accumulated drag/wheel into `out`. */
    consume(out: {
        dragX: number;
        dragY: number;
        wheel: number;
    }): void;
    /** WASD/arrows → (strafe, advance) in -1..1. */
    axes(out: {
        strafe: number;
        advance: number;
    }): void;
    dispose(): void;
}
//# sourceMappingURL=input.d.ts.map