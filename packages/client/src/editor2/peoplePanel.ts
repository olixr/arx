/**
 * THE PEOPLE LIBRARY — Map Studio v2 Phase 3. The bestiary and the
 * actor roster with their TRUE portraits (the game's own painters, the
 * no-placeholder law), grouped and searchable. Click a card and the
 * matching placement tool arms with that identity — the next click on
 * the map plants exactly who you picked.
 */

import { NPCS, type NpcActorDef, type NpcDef } from '@arx/content';
import { creatureRender } from '../cms/gameRender.js';
import { actorBust } from '../cms/portraits.js';
import type { EditorState } from '../editor/state.js';
import { el } from '../studio2/kit.js';

export interface PeoplePanelDeps {
  state: EditorState;
  actorDefs: ReadonlyMap<string, NpcActorDef>;
  armCluster(npcId: string): void;
  armActor(slug: string): void;
}

const LEVEL_BANDS: Array<[string, number, number]> = [
  ['Meadow (lv 1–5)', 1, 5],
  ['Frontier (lv 6–12)', 6, 12],
  ['Deepwood (lv 13–25)', 13, 25],
  ['Champions (lv 26+)', 26, 999],
];

/** Portrait caches — the painters are real renders, paint once. */
const creatureThumbs = new Map<string, HTMLCanvasElement | null>();
const actorThumbs = new Map<string, HTMLCanvasElement | null>();

function creatureThumb(def: NpcDef): HTMLCanvasElement | null {
  if (!creatureThumbs.has(def.id)) {
    try {
      creatureThumbs.set(def.id, creatureRender(def, 56));
    } catch {
      creatureThumbs.set(def.id, null);
    }
  }
  return creatureThumbs.get(def.id) ?? null;
}

function actorThumb(def: NpcActorDef): HTMLCanvasElement | null {
  if (!actorThumbs.has(def.id)) {
    try {
      actorThumbs.set(
        def.id,
        def.model.kind === 'creature'
          ? creatureRender(NPCS.get(def.model.creature) ?? ({ id: def.id, name: def.name } as NpcDef), 56)
          : actorBust(def, 56),
      );
    } catch {
      actorThumbs.set(def.id, null);
    }
  }
  return actorThumbs.get(def.id) ?? null;
}

/** CMS edits can redraw a face — drop the caches with the defs. */
export function invalidatePeopleThumbs(): void {
  actorThumbs.clear();
}

export function buildPeoplePanel(root: HTMLElement, deps: PeoplePanelDeps): void {
  const { state } = deps;
  root.innerHTML = '';

  const search = el('input');
  search.type = 'search';
  search.className = 'people-search';
  search.placeholder = 'Search people and creatures…';
  root.appendChild(search);

  const listHost = el('div');
  root.appendChild(listHost);

  const card = (
    thumb: HTMLCanvasElement | null,
    name: string,
    sub: string,
    armed: boolean,
    onPick: () => void,
    title: string,
  ): HTMLElement => {
    const b = el('button', 'people-card' + (armed ? ' armed' : ''));
    b.title = title;
    const pic = el('span', 'people-pic');
    if (thumb) pic.appendChild(thumb);
    b.appendChild(pic);
    const cap = el('span', 'people-cap');
    cap.appendChild(el('b', undefined, name));
    cap.appendChild(el('span', undefined, sub));
    b.appendChild(cap);
    b.onclick = onPick;
    return b;
  };

  const rebuild = (): void => {
    const q = search.value.trim().toLowerCase();
    listHost.innerHTML = '';
    const match = (s: string): boolean => q === '' || s.toLowerCase().includes(q);

    // ------------------------------------------------------ actors
    const actors = [...deps.actorDefs.values()]
      .filter((a) => match(a.name) || match(a.id) || match(a.title ?? ''))
      .sort((a, b) => a.name.localeCompare(b.name));
    if (actors.length > 0) {
      const head = el('div', 'panel-head', 'Actors — named townsfolk');
      head.appendChild(el('span', 'count', String(actors.length)));
      listHost.appendChild(head);
      const grid = el('div', 'people-grid');
      for (const a of actors) {
        grid.appendChild(
          card(
            actorThumb(a),
            a.name,
            a.title ?? a.disposition,
            state.pendingActor === a.id,
            () => deps.armActor(a.id),
            `Arm the actor tool with ${a.name} — the next click posts them`,
          ),
        );
      }
      listHost.appendChild(grid);
    }

    // ---------------------------------------------------- bestiary
    const creatures = [...NPCS.values()].filter((n) => match(n.name) || match(n.id));
    for (const [band, lo, hi] of LEVEL_BANDS) {
      const rows = creatures
        .filter((n) => n.level >= lo && n.level <= hi)
        .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
      if (rows.length === 0) continue;
      const head = el('div', 'panel-head', band);
      head.appendChild(el('span', 'count', String(rows.length)));
      listHost.appendChild(head);
      const grid = el('div', 'people-grid');
      for (const n of rows) {
        grid.appendChild(
          card(
            creatureThumb(n),
            n.name,
            `lv ${n.level}`,
            state.pendingNpc === n.id,
            () => deps.armCluster(n.id),
            `Arm the cluster tool with ${n.name} — the next click plants the camp`,
          ),
        );
      }
      listHost.appendChild(grid);
    }

    if (listHost.childElementCount === 0) {
      listHost.appendChild(el('p', 'muted', 'Nobody matches — try a name, a slug, or a title.'));
    }
  };
  search.oninput = rebuild;
  rebuild();
}
