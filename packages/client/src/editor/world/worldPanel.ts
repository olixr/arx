import { territoryAt, type GeographyDef } from '@arx/content';
import type { WorldCell } from '../api.js';
import type { WorldSel, WorldState, WorldTool } from './worldState.js';

/**
 * THE WORLD PANEL — the sidebar while the studio holds the whole
 * plan: a live inspector for the selected thing, the plan's ledgers
 * (routes / landmarks / hearths / planned ground), the frontier's
 * decided cells, and the overlay lenses. Pure DOM assembly under the
 * panels.ts law; the world controller supplies every action.
 */

export interface WorldPanelActions {
  setTool(tool: WorldTool): void;
  select(sel: WorldSel | null): void;
  centerOn(sel: WorldSel): void;
  /** Mutate the draft inside one undoable op + preview refresh. */
  edit(label: string, mutate: (geo: GeographyDef) => void, opts?: { terrain?: boolean; danger?: boolean }): void;
  removeSelected(): void;
  save(): void;
  revert(): void;
  openZone(id: string): void;
  newZoneAt(rectId: string): void;
  cellAction(cx: number, cy: number, action: 'reroll' | 'dissolve' | 'force' | 'stage' | 'ember', defId?: string): void;
  adoptCell(cx: number, cy: number): void;
  openCellSite(cx: number, cy: number): void;
  toggleShow(key: keyof WorldState['show']): void;
}

export interface WorldPanelDeps {
  ws: WorldState;
  actions: WorldPanelActions;
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  cls?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

function row(label: string, ...controls: HTMLElement[]): HTMLElement {
  const r = el('div', 'wp-row');
  r.appendChild(el('label', 'wp-label', label));
  const box = el('div', 'wp-controls');
  for (const c of controls) box.appendChild(c);
  r.appendChild(box);
  return r;
}

function numInput(
  value: number,
  onCommit: (v: number) => void,
  opts: { min?: number; max?: number; step?: number; width?: number } = {},
): HTMLInputElement {
  const input = el('input') as HTMLInputElement;
  input.type = 'number';
  input.value = String(value);
  if (opts.min !== undefined) input.min = String(opts.min);
  if (opts.max !== undefined) input.max = String(opts.max);
  input.step = String(opts.step ?? 1);
  if (opts.width) input.style.width = `${opts.width}px`;
  input.onchange = () => {
    const v = Number(input.value);
    if (Number.isFinite(v)) onCommit(Math.round(v));
  };
  return input;
}

function textInput(value: string, onCommit: (v: string) => void, placeholder = ''): HTMLInputElement {
  const input = el('input') as HTMLInputElement;
  input.type = 'text';
  input.value = value;
  input.placeholder = placeholder;
  input.onchange = () => onCommit(input.value);
  return input;
}

function selectInput(
  options: Array<{ value: string; label: string }>,
  value: string,
  onCommit: (v: string) => void,
): HTMLSelectElement {
  const sel = el('select') as HTMLSelectElement;
  for (const o of options) {
    const opt = el('option') as HTMLOptionElement;
    opt.value = o.value;
    opt.textContent = o.label;
    sel.appendChild(opt);
  }
  sel.value = value;
  sel.onchange = () => onCommit(sel.value);
  return sel;
}

function button(text: string, onClick: () => void, cls = ''): HTMLButtonElement {
  const b = el('button', cls, text) as HTMLButtonElement;
  b.onclick = onClick;
  return b;
}

/** Auto-slug helper for new ids born in the panel. */
export function freshId(base: string, taken: (id: string) => boolean): string {
  const slug = base.toLowerCase().replace(/[^a-z0-9_-]+/g, '_').replace(/^[^a-z]+/, '') || 'entry';
  if (!taken(slug)) return slug;
  for (let i = 2; ; i++) {
    if (!taken(`${slug}_${i}`)) return `${slug}_${i}`;
  }
}

export function buildWorldPanel(root: HTMLElement, deps: WorldPanelDeps): void {
  const { ws } = deps;
  root.innerHTML = '';
  if (!ws.geo) {
    const note = el('p', 'muted');
    note.textContent = ws.offline
      ? 'The world is asleep — start the game server to open the plan.'
      : 'Reading the plan…';
    root.appendChild(note);
    return;
  }

  buildPlanHead(root, deps);
  buildInspector(root, deps);
  buildWarnings(root, deps);
  buildLedgers(root, deps);
  buildFrontier(root, deps);
  buildLenses(root, deps);
}

/** The plan's own row: state pills + save/revert, always at hand. */
function buildPlanHead(root: HTMLElement, deps: WorldPanelDeps): void {
  const { ws, actions } = deps;
  const head = el('div', 'panel-head', 'The plan');
  root.appendChild(head);
  const facts = el('div', 'wp-facts');
  if (ws.dirty) facts.appendChild(el('span', 'pill gold', 'unsaved draft'));
  if (ws.edited) facts.appendChild(el('span', 'pill brass', 'diverges from shipped'));
  if (!ws.dirty && !ws.edited) facts.appendChild(el('span', 'pill', 'the shipped plan, untouched'));
  root.appendChild(facts);
  const btns = el('div', 'wp-btnrow');
  const save = button('Save ▸ regenerate world', () => actions.save(), 'primary');
  save.disabled = !ws.dirty;
  save.title = ws.dirty
    ? 'PUT the plan; the server redraws terrain, restreams every client, and re-surveys the frontier'
    : 'No draft changes to save';
  btns.appendChild(save);
  if (ws.edited) {
    const rev = button('Revert to shipped…', () => actions.revert());
    rev.title = 'Discard every geography edit; the authored plan returns';
    btns.appendChild(rev);
  }
  root.appendChild(btns);
}

// ------------------------------------------------------- inspector

function buildInspector(root: HTMLElement, deps: WorldPanelDeps): void {
  const { ws, actions } = deps;
  const geo = ws.geo!;
  const sel = ws.sel;
  const head = el('div', 'panel-head', 'Inspector');
  root.appendChild(head);
  const box = el('div', 'wp-inspector');
  root.appendChild(box);

  if (!sel) {
    box.appendChild(
      el(
        'p',
        'muted',
        'Nothing chosen. Click a road, landmark, hearth ring, planned rect, frontier pin, or zone — or lay new ones with the tools on the left.',
      ),
    );
    return;
  }

  switch (sel.kind) {
    case 'waypoint': {
      const route = geo.routes.find((r) => r.id === sel.route);
      if (!route) break;
      const p = route.pts[sel.idx];
      if (!p) break;
      box.appendChild(el('div', 'wp-title', `${route.name} · waypoint ${sel.idx + 1}/${route.pts.length}`));
      box.appendChild(
        row(
          'At',
          numInput(p.x, (v) => actions.edit('move waypoint', (g) => {
            g.routes.find((r) => r.id === sel.route)!.pts[sel.idx]!.x = v;
          }, { terrain: true })),
          numInput(p.y, (v) => actions.edit('move waypoint', (g) => {
            g.routes.find((r) => r.id === sel.route)!.pts[sel.idx]!.y = v;
          }, { terrain: true })),
        ),
      );
      const actionsRow = el('div', 'wp-btnrow');
      actionsRow.appendChild(
        button('Split after', () => {
          const next = route.pts[sel.idx + 1] ?? { x: p.x + 16, y: p.y };
          actions.edit('insert waypoint', (g) => {
            const r = g.routes.find((rr) => rr.id === sel.route)!;
            r.pts.splice(sel.idx + 1, 0, {
              x: Math.round((p.x + next.x) / 2),
              y: Math.round((p.y + next.y) / 2),
            });
          }, { terrain: true });
          actions.select({ kind: 'waypoint', route: sel.route, idx: sel.idx + 1 });
        }),
      );
      actionsRow.appendChild(
        button('Remove point', () => actions.removeSelected(), 'danger'),
      );
      box.appendChild(actionsRow);
      box.appendChild(el('p', 'muted', 'Drag the handle on the map; the carve re-cuts when you set it down.'));
      // Fall through to route facts below the waypoint context.
      appendRouteFacts(box, deps, sel.route);
      break;
    }
    case 'route': {
      appendRouteFacts(box, deps, sel.route);
      break;
    }
    case 'site': {
      const site = geo.sites.find((s) => s.id === sel.id);
      if (!site) break;
      box.appendChild(el('div', 'wp-title', `Landmark · ${site.id}`));
      box.appendChild(
        row(
          'Stands as',
          selectInput(
            ws.poiDefs.map((d) => ({
              value: d.id,
              label: `${d.name}${d.weight === 0 ? ' (authored-only)' : ''}`,
            })),
            site.defId,
            (v) => actions.edit('site archetype', (g) => {
              g.sites.find((s) => s.id === sel.id)!.defId = v;
            }),
          ),
        ),
      );
      const pinned = site.cell === undefined;
      box.appendChild(
        row(
          'Placement',
          selectInput(
            [
              { value: 'pin', label: 'pinned — exactly here (nudged to honest ground)' },
              { value: 'cell', label: 'cell — the scan picks a spot in this macro-cell' },
            ],
            pinned ? 'pin' : 'cell',
            (v) => {
              actions.edit('site placement mode', (g) => {
                const s = g.sites.find((x) => x.id === sel.id)!;
                if (v === 'cell') {
                  const cx = Math.floor((s.x ?? 0) / ws.poiCell);
                  const cy = Math.floor((s.y ?? 0) / ws.poiCell);
                  delete s.x;
                  delete s.y;
                  s.cell = [cx, cy];
                } else {
                  const [cx, cy] = s.cell ?? [0, 0];
                  delete (s as { cell?: unknown }).cell;
                  s.x = Math.round((cx + 0.5) * ws.poiCell);
                  s.y = Math.round((cy + 0.5) * ws.poiCell);
                }
              });
            },
          ),
        ),
      );
      if (pinned) {
        box.appendChild(
          row(
            'At',
            numInput(site.x!, (v) => actions.edit('move site', (g) => {
              g.sites.find((s) => s.id === sel.id)!.x = v;
            })),
            numInput(site.y!, (v) => actions.edit('move site', (g) => {
              g.sites.find((s) => s.id === sel.id)!.y = v;
            })),
          ),
        );
      } else {
        box.appendChild(
          row(
            'Cell',
            numInput(site.cell![0], (v) => actions.edit('move site cell', (g) => {
              const s = g.sites.find((x) => x.id === sel.id)!;
              s.cell = [v, s.cell![1]];
            })),
            numInput(site.cell![1], (v) => actions.edit('move site cell', (g) => {
              const s = g.sites.find((x) => x.id === sel.id)!;
              s.cell = [s.cell![0], v];
            })),
          ),
        );
      }
      const btns = el('div', 'wp-btnrow');
      btns.appendChild(button('Remove landmark', () => actions.removeSelected(), 'danger'));
      box.appendChild(btns);
      box.appendChild(
        el('p', 'muted', 'Landmarks are the plan’s fixed points — the seeder stands them in the ledger on save, and sweeps never evict them.'),
      );
      break;
    }
    case 'anchor': {
      const a = geo.anchors[sel.idx];
      if (!a) break;
      box.appendChild(el('div', 'wp-title', a.haven ? 'Haven lamp' : 'Settled hearth'));
      box.appendChild(
        row(
          'At',
          numInput(a.x, (v) => actions.edit('move anchor', (g) => {
            g.anchors[sel.idx]!.x = v;
          }, { danger: true })),
          numInput(a.y, (v) => actions.edit('move anchor', (g) => {
            g.anchors[sel.idx]!.y = v;
          }, { danger: true })),
        ),
      );
      const safe = numInput(a.safeR, (v) => actions.edit('safe radius', (g) => {
        g.anchors[sel.idx]!.safeR = Math.max(8, Math.min(192, v));
      }, { danger: true }), { min: 8, max: 192 });
      box.appendChild(row('Safe radius', safe));
      box.appendChild(
        row(
          'Voice',
          selectInput(
            [
              { value: 'hearth', label: 'hearth — joins the danger band march' },
              { value: 'haven', label: 'haven — a lamp; relieves, never re-centers' },
            ],
            a.haven ? 'haven' : 'hearth',
            (v) => actions.edit('anchor voice', (g) => {
              if (v === 'haven') g.anchors[sel.idx]!.haven = true;
              else delete g.anchors[sel.idx]!.haven;
            }, { danger: true }),
          ),
        ),
      );
      const btns = el('div', 'wp-btnrow');
      btns.appendChild(button('Remove anchor', () => actions.removeSelected(), 'danger'));
      box.appendChild(btns);
      box.appendChild(
        el('p', 'muted', 'Tier 0 inside the ring. Hearths push the whole danger march out; havens only calm their own ground (the walk stays the game).'),
      );
      break;
    }
    case 'planned': {
      const p = geo.planned.find((x) => x.id === sel.id);
      if (!p) break;
      const zone = ws.zones.find((z) => z.id === p.id);
      box.appendChild(el('div', 'wp-title', `Planned ground · ${p.name ?? p.id}`));
      box.appendChild(row('Name', textInput(p.name ?? '', (v) => actions.edit('rename planned rect', (g) => {
        const t = g.planned.find((x) => x.id === sel.id)!;
        if (v.trim()) t.name = v.trim();
        else delete t.name;
      }))));
      box.appendChild(
        row(
          'Origin',
          numInput(p.x, (v) => actions.edit('move planned rect', (g) => {
            g.planned.find((x) => x.id === sel.id)!.x = v;
          }, { terrain: true })),
          numInput(p.y, (v) => actions.edit('move planned rect', (g) => {
            g.planned.find((x) => x.id === sel.id)!.y = v;
          }, { terrain: true })),
        ),
      );
      box.appendChild(
        row(
          'Size',
          numInput(p.w, (v) => actions.edit('resize planned rect', (g) => {
            g.planned.find((x) => x.id === sel.id)!.w = Math.max(1, Math.min(512, v));
          }, { terrain: true })),
          numInput(p.h, (v) => actions.edit('resize planned rect', (g) => {
            g.planned.find((x) => x.id === sel.id)!.h = Math.max(1, Math.min(512, v));
          }, { terrain: true })),
        ),
      );
      box.appendChild(
        row(
          'Terrain apron',
          selectInput(
            [
              { value: 'on', label: 'held clear — flat canvas guaranteed at the border' },
              { value: 'off', label: 'none — worldgen runs to the edge' },
            ],
            p.apron ? 'on' : 'off',
            (v) => actions.edit('apron', (g) => {
              const t = g.planned.find((x) => x.id === sel.id)!;
              if (v === 'on') t.apron = true;
              else delete t.apron;
            }, { terrain: true }),
          ),
        ),
      );
      const btns = el('div', 'wp-btnrow');
      if (zone) btns.appendChild(button('Open zone', () => actions.openZone(zone.id)));
      else btns.appendChild(button('Build zone here…', () => actions.newZoneAt(p.id)));
      btns.appendChild(button('Remove plan', () => actions.removeSelected(), 'danger'));
      box.appendChild(btns);
      box.appendChild(
        el('p', 'muted', 'The frontier keeps out of planned ground: no POI ever rolls into tomorrow’s streets.'),
      );
      break;
    }
    case 'zone': {
      const z = ws.zones.find((x) => x.id === sel.id);
      if (!z) break;
      box.appendChild(el('div', 'wp-title', `Zone · ${z.name}`));
      const facts = el('div', 'wp-facts');
      facts.appendChild(el('span', 'pill', `${z.width}×${z.height}`));
      facts.appendChild(el('span', 'pill', `@ ${z.origin.x},${z.origin.y}`));
      if (z.builtin) facts.appendChild(el('span', 'pill', 'built-in'));
      if (z.hasFile) facts.appendChild(el('span', 'pill brass', 'file'));
      if (z.poi) facts.appendChild(el('span', 'pill blue', 'frontier site'));
      facts.appendChild(el('span', 'pill', `${z.npcSpawns} spawns · ${z.actorSpawns} actors · ${z.portals} portals`));
      box.appendChild(facts);
      const btns = el('div', 'wp-btnrow');
      btns.appendChild(button(z.poi ? 'Open (read-only)' : 'Open in zone editor', () => actions.openZone(z.id)));
      box.appendChild(btns);
      if (z.poi) {
        const m = /^poi:(-?\d+),(-?\d+)$/.exec(z.id);
        if (m) {
          const cx = Number(m[1]);
          const cy = Number(m[2]);
          const btns2 = el('div', 'wp-btnrow');
          btns2.appendChild(button('Adopt as authored zone…', () => actions.adoptCell(cx, cy)));
          box.appendChild(btns2);
        }
        box.appendChild(el('p', 'muted', 'The scaffold owns this ground. Adopt it to curate every tile by hand — the frontier will never re-roll under it.'));
      } else {
        box.appendChild(el('p', 'muted', 'Double-click a zone on the map to step inside.'));
      }
      break;
    }
    case 'cell': {
      const c = ws.cellAt(sel.cx, sel.cy);
      const now = Date.now();
      const left = (until: number): string => {
        const ms = until - now;
        if (ms <= 0) return 'due';
        if (ms < 3_600_000) return `~${Math.max(1, Math.round(ms / 60_000))}m`;
        if (ms < 86_400_000) return `~${+(ms / 3_600_000).toFixed(1)}h`;
        return `~${+(ms / 86_400_000).toFixed(1)}d`;
      };
      box.appendChild(el('div', 'wp-title', `Frontier cell ${sel.cx},${sel.cy}`));
      if (!c || !c.site) {
        box.appendChild(
          el(
            'p',
            'muted',
            c
              ? c.fallowUntil !== null && c.fallowUntil > now
                ? `Resting fallow (epoch ${c.epoch}) — may host again in ${left(c.fallowUntil)}.`
                : `Decided empty (epoch ${c.epoch}).`
              : 'Undecided — the frontier rolls it when someone walks near.',
          ),
        );
        const btns = el('div', 'wp-btnrow');
        btns.appendChild(button('Roll it now', () => actions.cellAction(sel.cx, sel.cy, 'reroll')));
        box.appendChild(btns);
        appendForceRow(box, deps, sel.cx, sel.cy);
        break;
      }
      const facts = el('div', 'wp-facts');
      facts.appendChild(el('span', 'pill brass', c.defName ?? c.site.defId));
      facts.appendChild(el('span', 'pill', `tier ${c.site.tier}`));
      facts.appendChild(el('span', 'pill', `epoch ${c.epoch}`));
      facts.appendChild(el('span', 'pill', `@ ${c.site.anchorX},${c.site.anchorY}`));
      if (c.authoredId) facts.appendChild(el('span', 'pill gold', `landmark: ${c.authoredId}`));
      if (c.zoneId) facts.appendChild(el('span', 'pill green', 'standing'));
      if (c.clearedAt) facts.appendChild(el('span', 'pill', 'cleared'));
      // THE LIVING STATE (Phase 6): the cell's clocks and family ties.
      if (c.stage > 0) {
        facts.appendChild(el('span', 'pill brass', `stage ${c.stage}`));
      }
      if (c.emberUntil !== null) {
        facts.appendChild(el('span', 'pill', `ember — dissolves ${left(c.emberUntil)}`));
      }
      if (c.originCell) {
        facts.appendChild(
          el(
            'span',
            'pill',
            c.originCell.startsWith('hearth:')
              ? `covets hearth ${c.originCell.slice(7)}`
              : `family of ${c.originCell}`,
          ),
        );
      }
      const calmHere = ws.calm.find(
        (k) => Math.abs(k.cellX - sel.cx) <= 2 && Math.abs(k.cellY - sel.cy) <= 2,
      );
      if (calmHere) {
        facts.appendChild(el('span', 'pill green', `calm ${left(calmHere.calmUntil)}`));
      }
      // THE LIVED-IN LAND (Phase 6): the war-ground rank, the standing
      // texture, and whose country the cell sits in.
      if (ws.poiDefs.find((d) => d.id === c.site?.defId)?.compound) {
        facts.appendChild(el('span', 'pill brass', 'war-ground'));
      }
      if (c.finds && c.finds.count > 0) {
        const clearedBits = ((): number => {
          let n = 0;
          for (let i = 0; i < 16; i++) if ((c.finds!.cleared >>> i) & 1) n++;
          return n;
        })();
        facts.appendChild(
          el(
            'span',
            'pill',
            `${c.finds.count} find${c.finds.count === 1 ? '' : 's'}` +
              (clearedBits > 0 ? ` (${clearedBits} cleared)` : ''),
          ),
        );
      }
      const country = territoryAt(
        ws.seed,
        sel.cx * ws.poiCell + ws.poiCell / 2,
        sel.cy * ws.poiCell + ws.poiCell / 2,
        ws.families,
      );
      if (country !== null) {
        facts.appendChild(el('span', 'pill', `${country} country`));
      }
      box.appendChild(facts);
      const btns = el('div', 'wp-btnrow');
      btns.appendChild(button('Open site', () => actions.openCellSite(sel.cx, sel.cy)));
      btns.appendChild(button('Re-roll', () => actions.cellAction(sel.cx, sel.cy, 'reroll')));
      box.appendChild(btns);
      // The lifecycle verbs: play the whole living frontier from here.
      const btns15 = el('div', 'wp-btnrow');
      btns15.appendChild(button('Stage +1', () => actions.cellAction(sel.cx, sel.cy, 'stage')));
      btns15.appendChild(
        button('Light the ember', () => actions.cellAction(sel.cx, sel.cy, 'ember')),
      );
      box.appendChild(btns15);
      const btns2 = el('div', 'wp-btnrow');
      btns2.appendChild(button('Adopt as zone…', () => actions.adoptCell(sel.cx, sel.cy)));
      btns2.appendChild(button('Dissolve', () => actions.cellAction(sel.cx, sel.cy, 'dissolve'), 'danger'));
      box.appendChild(btns2);
      appendForceRow(box, deps, sel.cx, sel.cy);
      if (c.authoredId) {
        box.appendChild(el('p', 'muted', 'This cell hosts an authored landmark — re-rolls will stand the same landmark back up on the next save or boot.'));
      }
      break;
    }
  }
}

function appendRouteFacts(box: HTMLElement, deps: WorldPanelDeps, routeId: string): void {
  const { ws, actions } = deps;
  const geo = ws.geo!;
  const route = geo.routes.find((r) => r.id === routeId);
  if (!route) return;
  box.appendChild(el('div', 'wp-title', `Route · ${route.name}`));
  box.appendChild(row('Name', textInput(route.name, (v) => actions.edit('rename route', (g) => {
    g.routes.find((r) => r.id === routeId)!.name = v || routeId;
  }))));
  box.appendChild(
    row(
      'Kind',
      selectInput(
        [
          { value: 'road', label: 'road — packed way, graded ribbon, bridges' },
          { value: 'trail', label: 'trail — bare dirt scuff, unlit, barely cleared' },
        ],
        route.kind,
        (v) => actions.edit('route kind', (g) => {
          g.routes.find((r) => r.id === routeId)!.kind = v as 'road' | 'trail';
        }, { terrain: true }),
      ),
    ),
  );
  const facts = el('div', 'wp-facts');
  let len = 0;
  for (let i = 0; i < route.pts.length - 1; i++) {
    len += Math.hypot(
      route.pts[i + 1]!.x - route.pts[i]!.x,
      route.pts[i + 1]!.y - route.pts[i]!.y,
    );
  }
  facts.appendChild(el('span', 'pill', `${route.pts.length} waypoints`));
  facts.appendChild(el('span', 'pill', `~${Math.round(len)} tiles`));
  box.appendChild(facts);
  const btns = el('div', 'wp-btnrow');
  btns.appendChild(
    button('Remove route', () => {
      actions.select({ kind: 'route', route: routeId });
      actions.removeSelected();
    }, 'danger'),
  );
  box.appendChild(btns);
  box.appendChild(el('p', 'muted', 'Alt-click a segment to add a waypoint mid-route. Wild spawns keep off the carve; POI cues aim their approach paths at it.'));
}

function appendForceRow(box: HTMLElement, deps: WorldPanelDeps, cx: number, cy: number): void {
  const { ws, actions } = deps;
  const pickRow = el('div', 'wp-btnrow');
  const sel = selectInput(
    ws.poiDefs.map((d) => ({ value: d.id, label: d.name })),
    ws.poiDefs[0]?.id ?? '',
    () => undefined,
  );
  pickRow.appendChild(sel);
  pickRow.appendChild(
    button('Force', () => {
      if (sel.value) actions.cellAction(cx, cy, 'force', sel.value);
    }),
  );
  box.appendChild(pickRow);
}

// -------------------------------------------------------- warnings

function buildWarnings(root: HTMLElement, deps: WorldPanelDeps): void {
  const { ws } = deps;
  if (ws.warnings.length === 0) return;
  const head = el('div', 'panel-head', `The surveyor's counsel (${ws.warnings.length})`);
  root.appendChild(head);
  const box = el('div', 'wp-warnings');
  for (const w of ws.warnings) {
    box.appendChild(el('div', 'wp-warning', w));
  }
  root.appendChild(box);
}

// --------------------------------------------------------- ledgers

function buildLedgers(root: HTMLElement, deps: WorldPanelDeps): void {
  const { ws, actions } = deps;
  const geo = ws.geo!;

  const section = (
    title: string,
    entries: Array<{ sel: WorldSel; label: string; sub: string }>,
    empty: string,
  ): void => {
    const head = el('div', 'panel-head', title);
    root.appendChild(head);
    if (entries.length === 0) {
      root.appendChild(el('p', 'muted', empty));
      return;
    }
    const list = el('div', 'wp-list');
    for (const e of entries) {
      const isSel = ws.sel !== null && JSON.stringify(ws.sel) === JSON.stringify(e.sel);
      const rowEl = el('button', 'wp-item' + (isSel ? ' active' : ''));
      rowEl.appendChild(el('b', undefined, e.label));
      rowEl.appendChild(el('span', 'muted', e.sub));
      rowEl.onclick = () => {
        actions.select(e.sel);
        actions.centerOn(e.sel);
      };
      list.appendChild(rowEl);
    }
    root.appendChild(list);
  };

  section(
    `Routes (${geo.routes.length})`,
    geo.routes.map((r) => ({
      sel: { kind: 'route', route: r.id } as WorldSel,
      label: r.name,
      sub: `${r.kind} · ${r.pts.length} pts`,
    })),
    'No routes yet — press R and click the land to lay the first one.',
  );

  section(
    `Landmarks (${geo.sites.length})`,
    geo.sites.map((s) => ({
      sel: { kind: 'site', id: s.id } as WorldSel,
      label: s.id,
      sub: s.cell ? `${s.defId} · cell ${s.cell[0]},${s.cell[1]}` : `${s.defId} · ${s.x},${s.y}`,
    })),
    'No authored landmarks — press N to pin a waystation, den, or lamp.',
  );

  section(
    `Hearths & havens (${geo.anchors.length})`,
    geo.anchors.map((a, i) => ({
      sel: { kind: 'anchor', idx: i } as WorldSel,
      label: a.haven ? 'haven' : 'hearth',
      sub: `${a.x},${a.y} · safe ${a.safeR}`,
    })),
    'No anchors — the whole world would run wild.',
  );

  section(
    `Planned ground (${geo.planned.length})`,
    geo.planned.map((p) => ({
      sel: { kind: 'planned', id: p.id } as WorldSel,
      label: p.name ?? p.id,
      sub: `${p.w}×${p.h} @ ${p.x},${p.y}${p.apron ? ' · apron' : ''}${ws.zones.some((z) => z.id === p.id) ? ' · built' : ' · unbuilt'}`,
    })),
    'No planned rects — drag one out with P before building a town.',
  );

  // Zones (the world's actual overlays, surface first).
  const surface = ws.zones.filter((z) => !z.poi && z.origin.y < 512);
  const dark = ws.zones.filter((z) => !z.poi && z.origin.y >= 512);
  const zoneEntries = [...surface, ...dark].map((z) => ({
    sel: { kind: 'zone', id: z.id } as WorldSel,
    label: z.name,
    sub: `${z.width}×${z.height} @ ${z.origin.x},${z.origin.y}${z.origin.y >= 512 ? ' · dark band' : ''}${z.hasFile ? ' · file' : ''}`,
  }));
  section(`Zones (${zoneEntries.length})`, zoneEntries, 'No authored zones on the server.');
}

// -------------------------------------------------------- frontier

function buildFrontier(root: HTMLElement, deps: WorldPanelDeps): void {
  const { ws, actions } = deps;
  const decided = ws.cells.filter((c) => c.site);
  const standing = decided.filter((c) => c.zoneId);
  const cleared = decided.filter((c) => c.clearedAt !== null);
  const head = el('div', 'panel-head', `The frontier (${decided.length} sites)`);
  root.appendChild(head);
  const facts = el('div', 'wp-facts');
  facts.appendChild(el('span', 'pill green', `${standing.length} standing`));
  facts.appendChild(el('span', 'pill', `${decided.length - standing.length} decided`));
  facts.appendChild(el('span', 'pill', `${cleared.length} cleared`));
  // THE LIVING STATE (Phase 6): the weather's gauges at a glance.
  const staged = decided.filter((c) => c.stage > 0 && !c.originCell).length;
  const families = decided.filter((c) => c.originCell !== null).length;
  const embers = decided.filter((c) => c.emberUntil !== null).length;
  const fallow = ws.cells.filter((c) => !c.site && c.fallowUntil !== null && c.fallowUntil > Date.now()).length;
  if (staged > 0) facts.appendChild(el('span', 'pill brass', `${staged} staged`));
  if (families > 0) facts.appendChild(el('span', 'pill brass', `${families} family camps`));
  if (embers > 0) facts.appendChild(el('span', 'pill', `${embers} embering`));
  if (fallow > 0) facts.appendChild(el('span', 'pill', `${fallow} fallow`));
  facts.appendChild(el('span', 'pill gold', `debt ${ws.credits}`));
  if (ws.calm.length > 0) facts.appendChild(el('span', 'pill green', `${ws.calm.length} calm`));
  if (ws.claimRings.length > 0) facts.appendChild(el('span', 'pill', `${ws.claimRings.length} claimed yard${ws.claimRings.length === 1 ? '' : 's'}`));
  root.appendChild(facts);
  const byDef = new Map<string, WorldCell[]>();
  for (const c of decided) {
    const key = c.defName ?? c.site!.defId;
    let list = byDef.get(key);
    if (!list) byDef.set(key, (list = []));
    list.push(c);
  }
  const list = el('div', 'wp-list');
  for (const [name, cells] of [...byDef.entries()].sort((a, b) => b[1].length - a[1].length)) {
    const rowEl = el('button', 'wp-item');
    rowEl.appendChild(el('b', undefined, name));
    rowEl.appendChild(el('span', 'muted', `×${cells.length}`));
    rowEl.onclick = () => {
      const first = cells[0]!;
      actions.select({ kind: 'cell', cx: first.cellX, cy: first.cellY });
      actions.centerOn({ kind: 'cell', cx: first.cellX, cy: first.cellY });
    };
    list.appendChild(rowEl);
  }
  root.appendChild(list);
  root.appendChild(
    el('p', 'muted', 'Every diamond on the map is a decided cell — click one to administer it. The ledger is the truth; the land only wears it.'),
  );
}

// ---------------------------------------------------------- lenses

function buildLenses(root: HTMLElement, deps: WorldPanelDeps): void {
  const { ws, actions } = deps;
  const head = el('div', 'panel-head', 'Lenses');
  root.appendChild(head);
  const box = el('div', 'wp-lenses');
  const lens = (key: keyof WorldState['show'], label: string): void => {
    const b = el('button', 'wp-lens' + (ws.show[key] ? ' active' : ''), label);
    b.onclick = () => actions.toggleShow(key);
    box.appendChild(b);
  };
  lens('zones', 'Zones');
  lens('roads', 'Roads');
  lens('sites', 'Landmarks');
  lens('anchors', 'Hearths');
  lens('cells', 'Frontier');
  lens('rings', 'Claims');
  lens('danger', 'Danger');
  lens('standing', 'Standing');
  lens('territory', 'Territory');
  lens('finds', 'Finds');
  lens('growth', 'Growth');
  root.appendChild(box);
}
