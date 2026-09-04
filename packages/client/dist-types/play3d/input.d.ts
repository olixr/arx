import { InputManager } from '../input/inputManager.js';
export declare class PointerRig {
    private readonly canvas;
    private dragX;
    private dragY;
    private wheel;
    private down;
    private pointerId;
    private startX;
    private startY;
    private lastX;
    private lastY;
    private travelled;
    /** A left click landed (screen CSS px). */
    onClick: ((sx: number, sy: number) => void) | null;
    /** The left button rose (after a click or a drag). */
    onRelease: (() => void) | null;
    private readonly onPointerDown;
    private readonly onPointerMove;
    private readonly onPointerUp;
    private readonly onWheel;
    private readonly onContext;
    private readonly onBlur;
    constructor(canvas: HTMLCanvasElement);
    /** Read-and-zero the accumulated drag/wheel into `out`. */
    consume(out: {
        dragX: number;
        dragY: number;
        wheel: number;
    }): void;
    dispose(): void;
}
export declare class LiveInput extends InputManager {
    /** The orbit yaw the keys follow (set by the frame loop). */
    cameraYaw: number;
    /** A left press on a foe, held until release (the click-attack). */
    attackHeld: boolean;
    private readonly turned;
    moveAxes(): {
        mx: number;
        my: number;
    };
    buttons(): number;
}
//# sourceMappingURL=input.d.ts.map