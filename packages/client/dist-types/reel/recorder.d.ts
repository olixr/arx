/**
 * THE RECORDER — the canvas, taped.
 *
 * `captureStream` on the game's own canvas is the only honest tap: it
 * takes the composited frames the renderer actually presented, at the
 * moment it presents them, with no second render path to drift. What
 * lands here is a VFR mezzanine at a deliberately absurd bitrate; the
 * lane re-encodes it to a constant-rate delivery ladder afterwards.
 * Quality is spent here and saved later, never the other way round.
 *
 * The bytes come out through `read()` in slices because a five-second
 * 1080p60 mezzanine is tens of megabytes and no driver should try to
 * lift that across the bridge in one string.
 */
export interface TakeStats {
    /** Frames the director stepped while the tape rolled. */
    frames: number;
    /** Wall time the tape rolled, ms. */
    ms: number;
    /** Median frame interval, ms — 16.7 is a clean 60. */
    medianDt: number;
    /** Frames that took longer than 1.8 intervals: visible hitches. */
    hitches: number;
    /** The worst single frame, ms. */
    worstDt: number;
    /** Commands a shot asked for faster than the server's bucket allows. */
    overspend: string[];
    /** Marks the shot planted, seconds from the first recorded frame. */
    marks: Record<string, number>;
    /** The performer went down mid-take. Whatever the tape shows, the
     *  shot did not happen the way it was written. */
    died: boolean;
}
export declare class Recorder {
    private readonly canvas;
    private readonly fps;
    private rec;
    private stream;
    private chunks;
    private joined;
    private startedAt;
    private dts;
    /** 'idle' | 'rolling' | 'sealing' | 'done' | 'error' */
    state: 'idle' | 'rolling' | 'sealing' | 'done' | 'error';
    error: string;
    constructor(canvas: HTMLCanvasElement, fps: number);
    start(): void;
    /** Called once per director frame while rolling. */
    note(dt: number): void;
    stop(): Promise<void>;
    stats(overspend: string[], marks: Record<string, number>, died: boolean): TakeStats;
    get bytes(): number;
    /** A base64 slice of the sealed tape — the bridge across to node. */
    read(offset: number, length: number): string;
}
//# sourceMappingURL=recorder.d.ts.map