export interface FallEar {
    /** 0..1 gate for the fall voice — 0 is out of earshot. */
    near: number;
    /** Stereo seat of the falls' acoustic center, -1..1. */
    pan: number;
    /** 0..1 heft — stacked/tall drops lean the voice onto its rumble. */
    heft: number;
}
/** The silence every quiet scan returns (treat as frozen). */
export declare const SILENT_EAR: FallEar;
/** Tiles at which a fall fades to nothing — also the scan radius, so
 *  closeness reaches exactly 0 at the scan edge and can never pop. */
export declare const FALL_EARSHOT = 16;
type Sampler = (tx: number, ty: number) => number | undefined;
export declare function scanFallEar(ground: Sampler, elev: Sampler, px: number, py: number): FallEar;
export {};
//# sourceMappingURL=falls.d.ts.map