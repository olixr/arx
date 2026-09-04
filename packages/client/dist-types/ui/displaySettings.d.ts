/**
 * THE DISPLAY BENCH — the Display settings rows: the accelerated-stage
 * toggle, water and footprint switches, interface motion, walk-over
 * looting, and the interface-size chips. Moved verbatim from main.ts
 * (foundations F5.1); returns the walk-over box the frame loop keeps
 * honest to the server's pref.
 *
 * `lanes` is the canvas2d lane switch-board (the 2D Renderer). A door
 * with no such lanes passes null and the stage / lean / resolution /
 * water rows are NOT built — a bench must never show a switch that
 * governs nothing here yet writes the keys another door reads.
 */
import type { ViewDisplayFlags } from './viewAdapter.js';
export declare function initDisplaySettings(lanes: ViewDisplayFlags | null, setLootPref: (on: boolean) => void): HTMLInputElement | null;
//# sourceMappingURL=displaySettings.d.ts.map