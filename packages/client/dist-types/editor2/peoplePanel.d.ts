/**
 * THE PEOPLE LIBRARY — Map Studio v2 Phase 3. The bestiary and the
 * actor roster with their TRUE portraits (the game's own painters, the
 * no-placeholder law), grouped and searchable. Click a card and the
 * matching placement tool arms with that identity — the next click on
 * the map plants exactly who you picked.
 */
import { type NpcActorDef } from '@arx/content';
import type { EditorState } from '../editor/state.js';
export interface PeoplePanelDeps {
    state: EditorState;
    actorDefs: ReadonlyMap<string, NpcActorDef>;
    armCluster(npcId: string): void;
    armActor(slug: string): void;
}
/** CMS edits can redraw a face — drop the caches with the defs. */
export declare function invalidatePeopleThumbs(): void;
export declare function buildPeoplePanel(root: HTMLElement, deps: PeoplePanelDeps): void;
//# sourceMappingURL=peoplePanel.d.ts.map