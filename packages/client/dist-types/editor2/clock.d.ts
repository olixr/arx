/**
 * THE CLOCK INSTRUMENT — scrub the world's hour and the whole frame
 * answers: shadows swing, lamplight pools, windows warm (the entire
 * true viewport keys off one daylightAt sample). Presets ride the
 * command registry too, so ⌘K "dusk" lands the golden hour.
 */
import type { EditorStage } from './stage.js';
export declare class ClockInstrument {
    private readonly stage;
    private readonly range;
    private readonly readout;
    private readonly presetBtns;
    constructor(host: HTMLElement, stage: EditorStage);
    set(hours: number): void;
    private paint;
}
//# sourceMappingURL=clock.d.ts.map