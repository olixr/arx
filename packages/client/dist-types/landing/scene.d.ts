export interface SceneOptions {
    /** prefers-reduced-motion: paint one dusk frame and stand down. */
    reduced: boolean;
    /** Fires when the scene clock crosses into a new named hour. */
    onClock?: (label: string, hours: number) => void;
}
export interface ArxScene {
    setRunning(run: boolean): void;
    destroy(): void;
}
export declare function createScene(canvas: HTMLCanvasElement, opts: SceneOptions): ArxScene;
//# sourceMappingURL=scene.d.ts.map