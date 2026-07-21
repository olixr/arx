/**
 * The sound menu — four sliders (master, music, effects, ambience)
 * over the engine's user-volume layer, persisted to localStorage, and
 * a now-playing line for the track player. Volumes multiply the tuned
 * bus mix; 100% is exactly the shipped balance.
 */
import type { AudioEngine } from '../audio/engine.js';
import type { TrackPlayer } from '../audio/tracks.js';
export declare class AudioMenu {
    private engine;
    private tracks;
    private panel;
    private nowLine;
    private nowTimer;
    constructor(engine: AudioEngine, tracks: TrackPlayer);
    private save;
    toggle(): void;
}
//# sourceMappingURL=audioMenu.d.ts.map