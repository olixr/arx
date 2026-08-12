/**
 * ⌘K — THE COMMAND LENS. One field over every verb the studio knows:
 * tools, layers, file ops, view toggles, lenses, and dynamic entries
 * (zones by name) from providers. Recents float; every row teaches its
 * shortcut. The registry is the only source — a command reachable
 * anywhere in the chrome is reachable here by construction.
 */
import type { Command, StudioMode } from './commands.js';
export declare class CommandPalette {
    private readonly getCommands;
    private readonly getMode;
    private readonly providers;
    private readonly host;
    private readonly input;
    private readonly list;
    private rows;
    private sel;
    constructor(getCommands: () => Command[], getMode: () => StudioMode, providers?: Array<() => Command[]>);
    get isOpen(): boolean;
    open(): void;
    close(): void;
    toggle(): void;
    private recents;
    private noteRecent;
    private allCommands;
    private rebuild;
    private paintSel;
    private move;
    private runSelected;
    private run;
}
//# sourceMappingURL=cmdk.d.ts.map