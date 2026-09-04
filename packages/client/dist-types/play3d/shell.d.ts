/**
 * THE CHROME ON THE SECOND DOOR (play3d S2) — the DOM pieces that make
 * the live world playable, mounted from the SAME scaffolding index.html
 * carries (play3d.html copies the #login overlay and the #hud block
 * verbatim) and driven by the SAME ui modules: THE DOOR REMEMBERS
 * (loginFlow), ChatUI, Hotbar, the Character case (Panels: pack, worn
 * kit, skills), the dock rail, the Display bench, speech bubbles and
 * the waypoint/party pointers through the ViewAdapter, the net pill
 * and the crossing veil. main.ts owns ~4000 lines of this wiring; the
 * shell forks only what S2 needs and names what it does not mount.
 *
 * S3: THE DIALOGUE CINEMA is mounted (a talk NPC in reach opens a
 * server-side conversation the player must be able to read, answer
 * and close — an unmounted cinema left the body held in an invisible
 * talk). It reads only ClientGame and its own DOM; its cues play
 * through a real Sfx over a lazy AudioEngine (no context until a
 * gesture). The rest of audio (music, ambience, voice, world sfx) is
 * not mounted; voiced lines fall back to the paced typewriter.
 *
 * The Display bench mounts WITHOUT the canvas2d lane rows (stage /
 * lean / resolution / water): those switches govern nothing on this
 * door and would write the keys Classic reads on its next load.
 *
 * Not mounted (S2 ledger): station/bank/shop/build screens, the pad UI
 * ring (UiNav), touch controls, audio beyond the cinema's cues, banners
 * and ceremonies, loot panel, map, quest journal, social, arena, keys.
 *
 * Local chat commands (never reach the wire): `/3d night|day`,
 * `/3d post`, `/3d ink`, `/3d tilt`, `/3d hud`.
 */
import type { GameEvents } from '../game/clientGame.js';
import type { ClientGame } from '../game/clientGame.js';
import type { InputManager } from '../input/inputManager.js';
import { ChatUI } from '../ui/chat.js';
import { Hotbar } from '../ui/hotbar.js';
import { Panels } from '../ui/panels.js';
import { type LoginFlow } from '../ui/loginFlow.js';
import { SpeechBubbles } from '../ui/speechBubbles.js';
import { WaypointHud } from '../ui/waypointHud.js';
import { PartyHud } from '../ui/partyHud.js';
import { LookCreator } from '../ui/lookCreator.js';
import { DialogueCinema } from '../ui/dialogueCinema.js';
import type { ViewAdapter } from '../ui/viewAdapter.js';
import { Vitals } from './vitals.js';
export interface ShellHooks {
    /** A `/3d …` chat command (the word after `/3d`). */
    onLocal: (cmd: string) => void;
    /** THE CROSSING: the body moved planes — drop the world under it. */
    onPlane: () => void;
}
export declare class Shell {
    private readonly input;
    private readonly hooks;
    readonly chat: ChatUI;
    readonly hotbar: Hotbar;
    readonly panels: Panels;
    readonly looks: LookCreator;
    readonly cinema: DialogueCinema;
    readonly waypointHud: WaypointHud;
    readonly partyHud: PartyHud;
    readonly vitals: Vitals;
    readonly loginFlow: LoginFlow;
    speech: SpeechBubbles | null;
    private view;
    private game;
    private authReady;
    private pendingUser;
    private sessionUser;
    private netPill;
    private readonly hud;
    private readonly loginOverlay;
    private readonly loginStatus;
    private readonly loginError;
    private readonly veil;
    private veilHoldUntil;
    private veilWaiting;
    private walkoverBox;
    constructor(input: InputManager, hooks: ShellHooks);
    /** Bind the game and the view once both exist. */
    attach(game: ClientGame, view: ViewAdapter): void;
    private get settingsPanel();
    toggleScreen(which: 'inv' | 'skills' | 'settings'): void;
    closeScreens(): void;
    get screenOpen(): boolean;
    /** A conversation holds the stage: no world clicks, no aim, no screens. */
    get cinemaOpen(): boolean;
    private setNetPill;
    private showLoginError;
    /** The GameEvents ClientGame is built with. */
    events(): GameEvents;
    private onStatus;
    /** Per-frame chrome: the pointers, bubbles, vitals, hotbar, veil, pill. */
    frame(now: number, groundIn: () => boolean): void;
    system(text: string): void;
}
//# sourceMappingURL=shell.d.ts.map