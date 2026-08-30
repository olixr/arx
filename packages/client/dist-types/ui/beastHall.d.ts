/**
 * THE COMPANION'S HALL (docs/pet-arts-plan.md LAW 8) — the pet menu
 * rebuilt whole as a standing screen on the Proving Hall grammar:
 * gamepad-first, zero scrollable columns, instruments never cards.
 *
 * Five mounts (index.html order: rail → standing|shelf|reading →
 * collars):
 * - THE STALL RAIL: one crest stop per kept companion.
 * - THE STANDING: the hero band — portrait in a vigor ring, serif
 *   name with the faceted level gem, the species' own flavor line,
 *   THE ROPE (bond as a knotted cord), and the fight instruments
 *   measured against a ROSTER envelope at level parity (the bar IS
 *   the comparison — the no-best-in-slot law made visible), with THE
 *   JOURNEY written underneath in the game's voice.
 * - THE REPERTOIRE: the species' shelf as a plate ribbon — focus pips
 *   priced on every plate, the slotted words collared.
 * - THE READING: the focused art told whole — tale, price, pacing,
 *   and the proving-ground diagram for actives / the measured lean
 *   for passives — with the one verb (slot or set down).
 * - THE THREE COLLARS: the loadout sockets and the focus ledger as
 *   brass coins, the next coin's unlock lettered under it.
 *
 * The server computes every rule (PetInfo carries bond/rank/focus/
 * budget); this room re-derives NOTHING — its courtesy checks only
 * choose which refusal to letter before the wire renders the true
 * verdict aloud.
 */
import { type PetInfo } from '@arx/shared';
interface HallGame {
    ownPets: PetInfo[];
}
export declare class BeastHall {
    private readonly root;
    private readonly rail;
    private readonly standing;
    private readonly shelf;
    private readonly reading;
    private readonly collars;
    private readonly ground;
    private groundMounted;
    /** The stall the hall is telling, and the word under the glass. */
    private selSlot;
    private selArt;
    /** THE THREE COLLARS' wire: the whole loadout, re-proven server-side. */
    onArts: ((slot: number, arts: string[]) => void) | null;
    constructor();
    get isOpen(): boolean;
    open(game: HallGame): void;
    close(): void;
    /** The mirror moved (S2CPet): retell whatever is on stage. */
    refresh(game: HallGame): void;
    private pet;
    private render;
    private renderRail;
    private renderStanding;
    private renderShelf;
    private renderReading;
    private mountGround;
    private renderCollars;
    private lastPets;
    private rerenderPet;
    private sendToggle;
}
export {};
//# sourceMappingURL=beastHall.d.ts.map