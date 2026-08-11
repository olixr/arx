import { dangerAt } from '@arx/shared';
import {
  elevationAt,
  replaceGeography,
  replaceZoneEdgeProfiles,
  unpackZoneEdgeProfile,
  validateGeographyDef,
  geographyWarnings,
  type GeographyDef,
  type PackedZoneEdgeProfile,
} from '@arx/content';
import {
  adoptPoiCell,
  fetchActorSites,
  fetchFactions,
  fetchFrontierDef,
  fetchWorld,
  listMaps,
  poiCellAction,
  revertGeography,
  saveGeography,
} from '../api.js';
import { WorldState, sameSel, type WorldSel, type WorldTool } from './worldState.js';
import { WorldView, type PickHit } from './worldView.js';
import { buildWorldPanel, freshId, type WorldPanelActions } from './worldPanel.js';

/**
 * THE WORLD CONTROLLER — everything the World view does: the pointer
 * machine over the world canvas, the tools that lay roads and pin
 * landmarks, the save that regenerates the running world, and the
 * frontier administration. The editor shell only mounts it, routes
 * keys to it while the world is up, and lends it toast/modal/status.
 *
 * THE DRAFT-PREVIEW LAW: the editor bundle carries its own live
 * geography registry, so every draft edit lands in replaceGeography
 * HERE and the canvas re-carves through the REAL worldgen — the road
 * you drag previews exactly the cut the server will make. Nothing
 * touches the server until Save.
 */

export interface WorldModeDeps {
  canvas: HTMLCanvasElement;
  panelHost: HTMLElement;
  toast(text: string, ms?: number, kind?: 'info' | 'success' | 'error'): void;
  /** Open a zone in the zone editor (switches mode). */
  openZone(id: string): void;
  /** Create a fresh zone at a world rect and open it. */
  newZone(spec: { id: string; name: string; x: number; y: number; w: number; h: number }): void;
  showModal(build: (body: HTMLElement, close: () => void) => void): void;
  setHint(text: string): void;
  setCoords(text: string): void;
  setZoom(text: string): void;
  /** The zone list changed (adopt) — the shell re-reads /dev/maps. */
  refreshMaps(): Promise<void>;
}

type Drag =
  | { kind: 'none' }
  | { kind: 'pan'; startX: number; startY: number; panX: number; panY: number }
  | {
      kind: 'gesture';
      label: string;
      started: boolean;
      startMx: number;
      startMy: number;
      terrain: boolean;
      danger: boolean;
      move: (tx: number, ty: number) => void;
    };

const TOOL_HINTS: Record<WorldTool, string> = {
  select: 'Click to inspect · drag things to move them · drag empty land to pan · double-click a zone to enter it · Alt-click a road to add a waypoint',
  route: 'Click to lay waypoints · double-click or Enter to open the road · Esc abandons it',
  trail: 'Click to lay waypoints · double-click or Enter to cut the trail · Esc abandons it',
  site: 'Click the land to pin a landmark (a waystation, a den, a lamp)',
  anchor: 'Click to light a hearth — its ring is the safe ground',
  planned: 'Drag out the ground a future town will claim',
};

export class WorldMode {
  readonly ws = new WorldState();
  readonly view: WorldView;
  private drag: Drag = { kind: 'none' };
  private spaceHeld = false;
  private booted = false;
  /** Fit deferred until the canvas has real pixels (it may boot hidden). */
  private needsFit = false;

  constructor(private readonly deps: WorldModeDeps) {
    this.view = new WorldView(deps.canvas, this.ws);
    this.ws.onChange(() => this.rebuildPanel());
    this.attach();
  }

  // ----------------------------------------------------------- boot

  async boot(): Promise<void> {
    try {
      const [snap, maps] = await Promise.all([fetchWorld(), listMaps()]);
      this.ws.setZones(maps.zones);
      this.ws.adopt(snap);
      void this.readPolitics();
      replaceGeography(snap.geography);
      this.adoptEdgeProfiles(snap.edgeProfiles);
      this.view.invalidateTerrain();
      this.view.invalidateDanger();
      this.view.invalidateTerritory();
      this.needsFit = true;
      this.booted = true;
    } catch (err) {
      this.ws.offline = true;
      this.ws.changed();
      this.deps.toast(`world view offline: ${(err as Error).message}`, 5200, 'error');
    }
  }

  /** Re-read ledger + zone list (after cell actions / zone saves). */
  async refresh(): Promise<void> {
    try {
      const keepSel = this.ws.sel;
      const keepTool = this.ws.tool;
      const [snap, maps] = await Promise.all([fetchWorld(), listMaps()]);
      this.ws.setZones(maps.zones);
      this.ws.adopt(snap, { keepDraft: this.ws.dirty });
      void this.readPolitics();
      if (!this.ws.dirty && this.ws.geo) replaceGeography(this.ws.geo);
      // A zone save can change its border's intentions — re-mirror the
      // edge registry, and re-carve the terrain only if it moved.
      if (this.adoptEdgeProfiles(snap.edgeProfiles)) this.view.invalidateTerrain();
      this.ws.sel = keepSel;
      this.ws.tool = keepTool;
      this.view.invalidateAllZones();
      this.ws.changed();
    } catch {
      /* transient — the next action retries */
    }
  }

  /**
   * THE STANDING LENS's reads (factions Phase 6): the political
   * ledger, the marches, and the live actor posts — quiet on failure
   * (the lens simply stays unlit until a read lands).
   */
  private async readPolitics(): Promise<void> {
    try {
      const [factions, frontier, sites] = await Promise.all([
        fetchFactions(),
        fetchFrontierDef(),
        fetchActorSites(),
      ]);
      this.ws.factions = factions;
      this.ws.marchTiles = frontier.marchTiles;
      this.ws.actorSites = sites;
      this.ws.changed();
    } catch {
      /* transient — the next refresh retries */
    }
  }

  /** Mirror the server's edge-harmony registry; true when it changed. */
  private edgeProfilesJson = '';
  private adoptEdgeProfiles(packed: PackedZoneEdgeProfile[] | undefined): boolean {
    const list = packed ?? [];
    const json = JSON.stringify(list);
    if (json === this.edgeProfilesJson) return false;
    this.edgeProfilesJson = json;
    replaceZoneEdgeProfiles(list.map(unpackZoneEdgeProfile));
    return true;
  }

  /** Whether boot() ever reached the server. */
  get online(): boolean {
    return this.booted;
  }

  // ----------------------------------------------------- draft law

  /** One undoable draft mutation + honest preview. */
  edit(
    label: string,
    mutate: (geo: GeographyDef) => void,
    opts: { terrain?: boolean; danger?: boolean } = {},
  ): void {
    if (!this.ws.geo) return;
    this.ws.beginOp(label);
    mutate(this.ws.geo);
    this.preview(opts);
    this.ws.changed();
  }

  /** Push the draft into the live registry + invalidate what moved. */
  private preview(opts: { terrain?: boolean; danger?: boolean }): void {
    if (!this.ws.geo) return;
    replaceGeography(this.ws.geo);
    if (opts.terrain) this.view.invalidateTerrain();
    if (opts.danger) this.view.invalidateDanger();
  }

  // ----------------------------------------------------------- save

  async save(): Promise<void> {
    const geo = this.ws.geo;
    if (!geo) return;
    const res = validateGeographyDef(geo);
    if (!res.ok) {
      this.deps.toast(res.errors[0]!, 5200, 'error');
      return;
    }
    try {
      const ack = await saveGeography(res.def);
      this.ws.markSaved(ack.warnings ?? []);
      const swept = ack.swept;
      const churn =
        swept && swept.evicted + swept.orphaned > 0
          ? ` · ${swept.evicted + swept.orphaned} frontier cell(s) re-rolled`
          : '';
      this.deps.toast(`The plan is live — the world regenerates under it${churn}.`, 3600, 'success');
      await this.refresh();
      // Server-side terrain changed for real: zones re-fetch, blocks rebake.
      this.view.invalidateTerrain();
      this.view.invalidateDanger();
    } catch (err) {
      this.deps.toast(`save refused: ${(err as Error).message}`, 5200, 'error');
    }
  }

  /** The Validate button's world verse: laws + counsel, no save. */
  validate(): { ok: boolean; text: string } {
    if (!this.ws.geo) return { ok: false, text: 'no plan loaded' };
    const res = validateGeographyDef(this.ws.geo);
    if (!res.ok) return { ok: false, text: res.errors.join(' · ') };
    // The span law needs terrain: the editor runs the same worldgen,
    // so the Validate button judges drafts against the real water.
    const warnings = geographyWarnings(res.def, this.ws.seed, (x, y) =>
      elevationAt(this.ws.seed, x, y),
    );
    return {
      ok: true,
      text:
        warnings.length === 0
          ? 'the plan holds — no counsel to give'
          : `the plan holds · ${warnings.length} counsel: ${warnings[0]}${warnings.length > 1 ? ' …' : ''}`,
    };
  }

  /** Import a local geography JSON as the working draft. */
  importDraft(raw: unknown): void {
    const res = validateGeographyDef(raw);
    if (!res.ok) {
      this.deps.toast(`plan refused: ${res.errors[0]}`, 5200, 'error');
      return;
    }
    this.ws.beginOp('import plan');
    this.ws.geo = res.def;
    this.preview({ terrain: true, danger: true });
    this.ws.changed();
  }

  revert(): void {
    this.deps.showModal((body, close) => {
      body.appendChild(head('Return to the shipped plan?'));
      const p = document.createElement('p');
      p.className = 'muted';
      p.textContent =
        'Every geography edit — roads, landmarks, hearths, planned ground — reverts to the authored plan and the world regenerates. Zone files are untouched.';
      body.appendChild(p);
      const rowEl = document.createElement('div');
      rowEl.className = 'wp-btnrow';
      const yes = document.createElement('button');
      yes.className = 'danger';
      yes.textContent = 'Revert the plan';
      yes.onclick = () => {
        close();
        void revertGeography()
          .then(async () => {
            this.deps.toast('The shipped plan stands again.', 3000, 'success');
            await this.boot();
          })
          .catch((err: Error) => this.deps.toast(err.message, 5000, 'error'));
      };
      const no = document.createElement('button');
      no.textContent = 'Keep my plan';
      no.onclick = close;
      rowEl.append(yes, no);
      body.appendChild(rowEl);
    });
  }

  // ----------------------------------------------- frontier actions

  async cellAction(
    cx: number,
    cy: number,
    action: 'reroll' | 'dissolve' | 'force' | 'stage' | 'ember',
    defId?: string,
  ): Promise<void> {
    try {
      const res = await poiCellAction(cx, cy, action, defId);
      this.deps.toast(
        action === 'stage'
          ? 'The camp grows bolder — it recomposes as the world streams back.'
          : action === 'ember'
            ? 'The ember is lit — the site dissolves when its linger runs (dignity permitting).'
            : res.site
              ? `${res.site.defId} stands at ${res.site.anchorX},${res.site.anchorY}.`
              : action === 'dissolve'
                ? 'The cell is quiet ground now.'
                : 'The cell rolled empty.',
        2800,
        'success',
      );
      await this.refresh();
    } catch (err) {
      this.deps.toast((err as Error).message, 5000, 'error');
    }
  }

  adoptCell(cx: number, cy: number): void {
    const cell = this.ws.cellAt(cx, cy);
    const suggested = freshId(cell?.site?.defId ?? 'site', (id) =>
      this.ws.zones.some((z) => z.id === id),
    );
    this.deps.showModal((body, close) => {
      body.appendChild(head('Adopt this site as an authored zone'));
      const p = document.createElement('p');
      p.className = 'muted';
      p.textContent =
        'The composed tiles, spawns, and props freeze into a zone file you curate tile-by-tile. The frontier cell dissolves — nothing ever re-rolls under the new zone.';
      body.appendChild(p);
      const idRow = document.createElement('div');
      idRow.className = 'wp-row';
      const idLabel = document.createElement('label');
      idLabel.className = 'wp-label';
      idLabel.textContent = 'Zone id';
      const idInput = document.createElement('input');
      idInput.type = 'text';
      idInput.value = suggested;
      idRow.append(idLabel, idInput);
      body.appendChild(idRow);
      const nameRow = document.createElement('div');
      nameRow.className = 'wp-row';
      const nameLabel = document.createElement('label');
      nameLabel.className = 'wp-label';
      nameLabel.textContent = 'Name';
      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.value = cell?.defName ?? '';
      nameRow.append(nameLabel, nameInput);
      body.appendChild(nameRow);
      const btns = document.createElement('div');
      btns.className = 'wp-btnrow';
      const go = document.createElement('button');
      go.className = 'primary';
      go.textContent = 'Adopt';
      go.onclick = () => {
        const id = idInput.value.trim();
        close();
        void adoptPoiCell(cx, cy, id, nameInput.value.trim() || undefined)
          .then(async () => {
            this.deps.toast(`'${id}' is yours now — opening it.`, 3000, 'success');
            await this.deps.refreshMaps();
            await this.refresh();
            this.deps.openZone(id);
          })
          .catch((err: Error) => this.deps.toast(err.message, 5200, 'error'));
      };
      const no = document.createElement('button');
      no.textContent = 'Not yet';
      no.onclick = close;
      btns.append(go, no);
      body.appendChild(btns);
    });
  }

  // ------------------------------------------------------ selection

  select(sel: WorldSel | null): void {
    this.ws.sel = sel;
    this.ws.changed();
  }

  centerOn(sel: WorldSel): void {
    const geo = this.ws.geo;
    if (!geo) return;
    const cell = this.ws.poiCell;
    let x: number | null = null;
    let y: number | null = null;
    let scale: number | undefined;
    switch (sel.kind) {
      case 'waypoint': {
        const p = geo.routes.find((r) => r.id === sel.route)?.pts[sel.idx];
        if (p) ({ x, y } = p);
        break;
      }
      case 'route': {
        const r = geo.routes.find((rr) => rr.id === sel.route);
        if (r) {
          const xs = r.pts.map((p) => p.x);
          const ys = r.pts.map((p) => p.y);
          x = (Math.min(...xs) + Math.max(...xs)) / 2;
          y = (Math.min(...ys) + Math.max(...ys)) / 2;
        }
        break;
      }
      case 'site': {
        const s = geo.sites.find((ss) => ss.id === sel.id);
        if (s) {
          x = s.cell ? (s.cell[0] + 0.5) * cell : s.x!;
          y = s.cell ? (s.cell[1] + 0.5) * cell : s.y!;
        }
        break;
      }
      case 'anchor': {
        const a = geo.anchors[sel.idx];
        if (a) ({ x, y } = a);
        break;
      }
      case 'planned': {
        const p = geo.planned.find((pp) => pp.id === sel.id);
        if (p) {
          x = p.x + p.w / 2;
          y = p.y + p.h / 2;
        }
        break;
      }
      case 'zone': {
        const z = this.ws.zones.find((zz) => zz.id === sel.id);
        if (z) {
          x = z.origin.x + z.width / 2;
          y = z.origin.y + z.height / 2;
          scale = Math.max(this.view.scale, 1.5);
        }
        break;
      }
      case 'cell': {
        const c = this.ws.cellAt(sel.cx, sel.cy);
        x = c?.site ? c.site.anchorX : (sel.cx + 0.5) * cell;
        y = c?.site ? c.site.anchorY : (sel.cy + 0.5) * cell;
        break;
      }
    }
    if (x !== null && y !== null) this.view.centerOn(x, y, scale);
  }

  removeSelected(): void {
    const sel = this.ws.sel;
    const geo = this.ws.geo;
    if (!sel || !geo) return;
    switch (sel.kind) {
      case 'waypoint': {
        const route = geo.routes.find((r) => r.id === sel.route);
        if (!route) return;
        if (route.pts.length <= 2) {
          this.edit('remove route', (g) => {
            g.routes = g.routes.filter((r) => r.id !== sel.route);
          }, { terrain: true });
        } else {
          this.edit('remove waypoint', (g) => {
            g.routes.find((r) => r.id === sel.route)!.pts.splice(sel.idx, 1);
          }, { terrain: true });
        }
        this.ws.sel = null;
        break;
      }
      case 'route':
        this.edit('remove route', (g) => {
          g.routes = g.routes.filter((r) => r.id !== sel.route);
        }, { terrain: true });
        this.ws.sel = null;
        break;
      case 'site':
        this.edit('remove landmark', (g) => {
          g.sites = g.sites.filter((s) => s.id !== sel.id);
        });
        this.ws.sel = null;
        break;
      case 'anchor':
        this.edit('remove anchor', (g) => {
          g.anchors.splice(sel.idx, 1);
        }, { danger: true });
        this.ws.sel = null;
        break;
      case 'planned':
        this.edit('remove planned rect', (g) => {
          g.planned = g.planned.filter((p) => p.id !== sel.id);
        }, { terrain: true });
        this.ws.sel = null;
        break;
      case 'zone':
      case 'cell':
        // The map can't delete server truth — the panel's actions do.
        return;
    }
    this.ws.changed();
  }

  // -------------------------------------------------------- pointer

  private attach(): void {
    const c = this.deps.canvas;
    c.addEventListener('mousedown', (e) => this.onDown(e));
    window.addEventListener('mousemove', (e) => this.onMove(e));
    window.addEventListener('mouseup', () => this.onUp());
    c.addEventListener('dblclick', (e) => this.onDblClick(e));
    c.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.escape();
    });
    c.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        const rect = c.getBoundingClientRect();
        this.view.zoomAt(
          e.clientX - rect.left,
          e.clientY - rect.top,
          Math.pow(1.0016, -e.deltaY),
        );
        this.syncZoom();
      },
      { passive: false },
    );
  }

  private mouse(e: MouseEvent): { mx: number; my: number } {
    const rect = this.deps.canvas.getBoundingClientRect();
    return { mx: e.clientX - rect.left, my: e.clientY - rect.top };
  }

  private onDown(e: MouseEvent): void {
    if (e.button === 2) return;
    const { mx, my } = this.mouse(e);
    if (e.button === 1 || this.spaceHeld) {
      this.drag = { kind: 'pan', startX: mx, startY: my, panX: this.view.panX, panY: this.view.panY };
      return;
    }
    const geo = this.ws.geo;
    if (!geo) return;
    const t = this.view.tileAt(mx, my);
    const tf = this.view.tileAtFloat(mx, my);

    // Route laying tools swallow every click.
    if (this.ws.tool === 'route' || this.ws.tool === 'trail') {
      const kind = this.ws.tool === 'trail' ? 'trail' : 'road';
      this.ws.routeDraft ??= { kind, pts: [] };
      this.ws.routeDraft.pts.push({ x: t.x, y: t.y });
      this.ws.changed();
      return;
    }
    if (this.ws.tool === 'site') {
      const defId =
        this.ws.poiDefs.find((d) => d.id === 'waystation')?.id ??
        this.ws.poiDefs.find((d) => d.weight > 0)?.id ??
        this.ws.poiDefs[0]?.id ??
        'waystation';
      const id = freshId('landmark', (x) => geo.sites.some((s) => s.id === x));
      this.edit('pin landmark', (g) => {
        g.sites.push({ id, defId, x: t.x, y: t.y });
      });
      this.ws.sel = { kind: 'site', id };
      this.ws.tool = 'select';
      this.ws.changed();
      return;
    }
    if (this.ws.tool === 'anchor') {
      this.edit('light hearth', (g) => {
        g.anchors.push({ x: t.x, y: t.y, safeR: 48 });
      }, { danger: true });
      this.ws.sel = { kind: 'anchor', idx: geo.anchors.length - 1 };
      this.ws.tool = 'select';
      this.ws.changed();
      return;
    }
    if (this.ws.tool === 'planned') {
      const id = freshId('new_town', (x) => geo.planned.some((p) => p.id === x) || this.ws.zones.some((z) => z.id === x));
      this.edit('plan ground', (g) => {
        g.planned.push({ id, x: t.x, y: t.y, w: 1, h: 1 });
      }, { terrain: true });
      this.ws.sel = { kind: 'planned', id };
      // The rest of the drag stretches the rect to its far corner.
      this.drag = {
        kind: 'gesture',
        label: 'plan ground',
        started: true,
        startMx: mx,
        startMy: my,
        terrain: true,
        danger: false,
        move: (tx, ty) => {
          const p = this.ws.geo!.planned.find((pp) => pp.id === id)!;
          p.w = Math.max(1, Math.min(512, tx - p.x + 1));
          p.h = Math.max(1, Math.min(512, ty - p.y + 1));
        },
      };
      this.ws.changed();
      return;
    }

    // Select tool: pick, then arm the right gesture.
    const hit = this.view.pick(mx, my);
    if (!hit) {
      this.ws.sel = null;
      this.ws.changed();
      this.drag = { kind: 'pan', startX: mx, startY: my, panX: this.view.panX, panY: this.view.panY };
      return;
    }
    // Alt-click a segment: birth a waypoint under the cursor and drag it.
    if (hit.handle === 'segment' && e.altKey && hit.sel.kind === 'route' && hit.segIdx !== undefined) {
      const routeId = hit.sel.route;
      const idx = hit.segIdx + 1;
      this.edit('insert waypoint', (g) => {
        g.routes.find((r) => r.id === routeId)!.pts.splice(idx, 0, { x: t.x, y: t.y });
      }, { terrain: true });
      this.ws.sel = { kind: 'waypoint', route: routeId, idx };
      this.armGesture(mx, my, 'move waypoint', true, false, (tx, ty) => {
        const p = this.ws.geo!.routes.find((r) => r.id === routeId)!.pts[idx]!;
        p.x = tx;
        p.y = ty;
      }, true);
      this.ws.changed();
      return;
    }

    this.ws.sel = hit.sel;
    this.ws.changed();
    this.armFromPick(hit, mx, my, tf);
  }

  private armFromPick(hit: PickHit, mx: number, my: number, tf: { x: number; y: number }): void {
    const geo = this.ws.geo!;
    const sel = hit.sel;
    switch (sel.kind) {
      case 'waypoint': {
        this.armGesture(mx, my, 'move waypoint', true, false, (tx, ty) => {
          const p = this.ws.geo!.routes.find((r) => r.id === sel.route)?.pts[sel.idx];
          if (p) {
            p.x = tx;
            p.y = ty;
          }
        });
        break;
      }
      case 'site': {
        const site = geo.sites.find((s) => s.id === sel.id);
        if (!site) break;
        if (site.cell) {
          this.armGesture(mx, my, 'move landmark cell', false, false, (tx, ty) => {
            const s = this.ws.geo!.sites.find((x) => x.id === sel.id)!;
            s.cell = [Math.floor(tx / this.ws.poiCell), Math.floor(ty / this.ws.poiCell)];
          });
        } else {
          this.armGesture(mx, my, 'move landmark', false, false, (tx, ty) => {
            const s = this.ws.geo!.sites.find((x) => x.id === sel.id)!;
            s.x = tx;
            s.y = ty;
          });
        }
        break;
      }
      case 'anchor': {
        if (hit.handle === 'radius') {
          this.armGesture(mx, my, 'safe radius', false, true, (tx, ty) => {
            const a = this.ws.geo!.anchors[sel.idx]!;
            a.safeR = Math.max(8, Math.min(192, Math.round(Math.hypot(tx - a.x, ty - a.y))));
          });
        } else {
          this.armGesture(mx, my, 'move anchor', false, true, (tx, ty) => {
            const a = this.ws.geo!.anchors[sel.idx]!;
            a.x = tx;
            a.y = ty;
          });
        }
        break;
      }
      case 'planned': {
        const p = geo.planned.find((x) => x.id === sel.id);
        if (!p) break;
        if (hit.handle === 'corner' && hit.corner !== undefined) {
          const fixed = {
            x: hit.corner === 0 || hit.corner === 3 ? p.x + p.w : p.x,
            y: hit.corner === 0 || hit.corner === 1 ? p.y + p.h : p.y,
          };
          this.armGesture(mx, my, 'resize planned rect', true, false, (tx, ty) => {
            const t = this.ws.geo!.planned.find((x) => x.id === sel.id)!;
            t.x = Math.min(tx, fixed.x - 1);
            t.y = Math.min(ty, fixed.y - 1);
            t.w = Math.max(1, Math.min(512, Math.abs(fixed.x - tx)));
            t.h = Math.max(1, Math.min(512, Math.abs(fixed.y - ty)));
          });
        } else {
          const grabX = tf.x - p.x;
          const grabY = tf.y - p.y;
          this.armGesture(mx, my, 'move planned rect', true, false, (tx, ty) => {
            const t = this.ws.geo!.planned.find((x) => x.id === sel.id)!;
            t.x = Math.round(tx - grabX);
            t.y = Math.round(ty - grabY);
          });
        }
        break;
      }
      case 'route':
      case 'zone':
      case 'cell':
        break;
    }
  }

  /** Arm a lazy gesture: beginOp fires on the first real movement. */
  private armGesture(
    mx: number,
    my: number,
    label: string,
    terrain: boolean,
    danger: boolean,
    move: (tx: number, ty: number) => void,
    started = false,
  ): void {
    this.drag = { kind: 'gesture', label, started, startMx: mx, startMy: my, terrain, danger, move };
  }

  private onMove(e: MouseEvent): void {
    const { mx, my } = this.mouse(e);
    const t = this.view.tileAt(mx, my);
    this.ws.hoverTile = t;
    this.syncCoords(t);

    if (this.drag.kind === 'pan') {
      this.view.panX = this.drag.panX + (mx - this.drag.startX);
      this.view.panY = this.drag.panY + (my - this.drag.startY);
      this.deps.canvas.style.cursor = 'grabbing';
      return;
    }
    if (this.drag.kind === 'gesture') {
      if (!this.drag.started) {
        if (Math.hypot(mx - this.drag.startMx, my - this.drag.startMy) < 3) return;
        this.ws.beginOp(this.drag.label);
        this.drag.started = true;
      }
      this.drag.move(t.x, t.y);
      // Cheap layers preview live; the terrain carve waits for the drop.
      if (this.drag.danger) this.preview({ danger: true });
      else replaceGeography(this.ws.geo!);
      this.ws.changed();
      return;
    }

    // Idle hover: affordances.
    if (this.ws.tool === 'select') {
      const hit = this.view.pick(mx, my);
      const next = hit?.sel ?? null;
      if (!sameSel(this.ws.hover, next)) {
        this.ws.hover = next;
        this.ws.changed();
      }
      this.deps.canvas.style.cursor =
        hit?.handle === 'radius'
          ? 'ew-resize'
          : hit?.handle === 'corner'
            ? 'nwse-resize'
            : hit
              ? 'pointer'
              : 'grab';
    } else {
      this.deps.canvas.style.cursor = 'crosshair';
      if (this.ws.routeDraft) this.ws.changed();
    }
  }

  private onUp(): void {
    if (this.drag.kind === 'gesture' && this.drag.started) {
      // THE ROAD LEARNS THE LAND when you set it down: the heavy
      // terrain re-carve happens once, at the end of the gesture.
      this.preview({ terrain: this.drag.terrain, danger: this.drag.danger });
      this.ws.changed();
    }
    if (this.drag.kind !== 'none') this.drag = { kind: 'none' };
    this.deps.canvas.style.cursor = this.ws.tool === 'select' ? 'grab' : 'crosshair';
  }

  private onDblClick(e: MouseEvent): void {
    const { mx, my } = this.mouse(e);
    if (this.ws.routeDraft) {
      this.commitRouteDraft();
      return;
    }
    const hit = this.view.pick(mx, my);
    if (hit?.sel.kind === 'cell') {
      this.deps.openZone(`poi:${hit.sel.cx},${hit.sel.cy}`);
      return;
    }
    // Step into whatever zone lies under the cursor — a pin or ring
    // sharing the spot must not bar the door.
    const t = this.view.tileAtFloat(mx, my);
    let best: { id: string; area: number } | null = null;
    for (const z of this.ws.zones) {
      if (z.origin.y >= 512) continue;
      if (
        t.x >= z.origin.x &&
        t.x < z.origin.x + z.width &&
        t.y >= z.origin.y &&
        t.y < z.origin.y + z.height
      ) {
        const area = z.width * z.height;
        if (!best || area < best.area) best = { id: z.id, area };
      }
    }
    if (best) this.deps.openZone(best.id);
  }

  commitRouteDraft(): void {
    const draft = this.ws.routeDraft;
    const geo = this.ws.geo;
    if (!draft || !geo) return;
    if (draft.pts.length < 2) {
      this.ws.routeDraft = null;
      this.ws.changed();
      return;
    }
    const id = freshId(draft.kind === 'trail' ? 'new_trail' : 'new_road', (x) =>
      geo.routes.some((r) => r.id === x),
    );
    const pts = draft.pts;
    this.edit(draft.kind === 'trail' ? 'cut trail' : 'open road', (g) => {
      g.routes.push({
        id,
        name: draft.kind === 'trail' ? 'A new trail' : 'A new road',
        kind: draft.kind,
        pts,
      });
    }, { terrain: true });
    this.ws.routeDraft = null;
    this.ws.sel = { kind: 'route', route: id };
    this.ws.tool = 'select';
    this.ws.changed();
  }

  // ------------------------------------------------------- keyboard

  /** Returns true when the key was the world's to spend. */
  keydown(e: KeyboardEvent): boolean {
    const mod = e.metaKey || e.ctrlKey;
    if (e.code === 'Space') {
      this.spaceHeld = true;
      return false; // shared with pan behavior; never swallow typing
    }
    if (mod && e.key.toLowerCase() === 'z') {
      const label = e.shiftKey ? this.ws.redo() : this.ws.undo();
      if (label) {
        this.preview({ terrain: true, danger: true });
        this.deps.toast(`${e.shiftKey ? 'redid' : 'undid'} ${label}`, 1400);
      }
      return true;
    }
    if (mod && e.key.toLowerCase() === 's') {
      void this.save();
      return true;
    }
    switch (e.key) {
      case 'Escape':
        this.escape();
        return true;
      case 'Enter':
        if (this.ws.routeDraft) {
          this.commitRouteDraft();
          return true;
        }
        return false;
      case 'Delete':
      case 'Backspace':
        this.removeSelected();
        return true;
      case '0':
        this.view.fitWorld();
        this.syncZoom();
        return true;
    }
    switch (e.key.toLowerCase()) {
      case 'v':
        this.setTool('select');
        return true;
      case 'r':
        this.setTool('route');
        return true;
      case 't':
        this.setTool('trail');
        return true;
      case 'n':
        this.setTool('site');
        return true;
      case 'a':
        this.setTool('anchor');
        return true;
      case 'p':
        this.setTool('planned');
        return true;
    }
    return false;
  }

  keyup(e: KeyboardEvent): void {
    if (e.code === 'Space') this.spaceHeld = false;
  }

  /** The one-cancel-per-press cascade (the Esc law, world verse). */
  escape(): void {
    if (this.ws.routeDraft) {
      this.ws.routeDraft = null;
      this.ws.changed();
      return;
    }
    if (this.ws.tool !== 'select') {
      this.setTool('select');
      return;
    }
    if (this.ws.sel) {
      this.ws.sel = null;
      this.ws.changed();
    }
  }

  setTool(tool: WorldTool): void {
    this.ws.tool = tool;
    if (tool !== 'route' && tool !== 'trail') this.ws.routeDraft = null;
    this.deps.setHint(TOOL_HINTS[tool]);
    this.deps.canvas.style.cursor = tool === 'select' ? 'grab' : 'crosshair';
    this.ws.changed();
  }

  // ---------------------------------------------------------- panel

  private rebuildPanel(): void {
    buildWorldPanel(this.deps.panelHost, {
      ws: this.ws,
      actions: this.panelActions(),
    });
  }

  private panelActions(): WorldPanelActions {
    return {
      setTool: (t) => this.setTool(t),
      select: (sel) => this.select(sel),
      centerOn: (sel) => this.centerOn(sel),
      edit: (label, mutate, opts) => this.edit(label, mutate, opts),
      removeSelected: () => this.removeSelected(),
      save: () => void this.save(),
      revert: () => this.revert(),
      openZone: (id) => this.deps.openZone(id),
      newZoneAt: (rectId) => {
        const p = this.ws.geo?.planned.find((x) => x.id === rectId);
        if (!p) return;
        this.deps.newZone({
          id: p.id,
          name: p.name ?? p.id,
          x: p.x,
          y: p.y,
          w: p.w,
          h: p.h,
        });
      },
      cellAction: (cx, cy, action, defId) => void this.cellAction(cx, cy, action, defId),
      adoptCell: (cx, cy) => this.adoptCell(cx, cy),
      openCellSite: (cx, cy) => this.deps.openZone(`poi:${cx},${cy}`),
      toggleShow: (key) => {
        this.ws.show[key] = !this.ws.show[key];
        this.ws.changed();
      },
    };
  }

  // --------------------------------------------------------- status

  private syncCoords(t: { x: number; y: number }): void {
    const geo = this.ws.geo;
    const cell = `cell ${Math.floor(t.x / this.ws.poiCell)},${Math.floor(t.y / this.ws.poiCell)}`;
    const tier = geo ? ` · tier ${dangerAt(this.ws.seed, t.x, t.y, geo.anchors)}` : '';
    this.deps.setCoords(`${t.x}, ${t.y} · ${cell}${tier}`);
  }

  syncZoom(): void {
    // 8 px/tile reads as 100% at world scale (the zone editor's 32 is
    // a different lens — the world is four times as far away).
    this.deps.setZoom(`${Math.round((this.view.scale * 100) / 8)}%`);
  }

  frame(): void {
    if (this.needsFit && this.deps.canvas.clientWidth > 0 && this.ws.geo) {
      this.view.fitWorld();
      this.needsFit = false;
      this.syncZoom();
    }
    this.view.render();
  }
}

function head(text: string): HTMLElement {
  const h = document.createElement('h3');
  h.textContent = text;
  return h;
}
