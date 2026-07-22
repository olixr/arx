import {
  levelForXp,
  tileDef,
  type InvSlot,
  type ItemRoll,
  type SkillXp,
  type StationType,
} from '@devcraft/shared';
import {
  BUILDABLES,
  CROP_BY_SEED,
  GENERAL_STORE,
  instanceName,
  itemDef,
  recipesForStation,
  type RecipeDef,
} from '@devcraft/content';
import { buildableIconUrl, itemIconUrl, uiIconUrl } from '../render/icons.js';
import { bigButton, iconTile, levelBadge, needChip, sectionHead } from './panel.js';

/**
 * The station screens: Workshop (craft), Vault (bank), Store (shop)
 * and the Builder's Table. Opened by interacting with the matching
 * world tile; every action is validated server-side — these are views.
 *
 * Design laws:
 * - EVERY STATION HAS A FACE. The Workshop wears the station's own
 *   name, icon, accent color and craft VERB ("Smelt", "Weave") — the
 *   screen tells you where you're standing without reading a word.
 * - LEDGER LEFT, WORK RIGHT. The Workshop is master–detail: a recipe
 *   ledger you run your eye down, and the chosen work laid out large —
 *   portrait, level, xp, the material story in full rows, and the
 *   make buttons. No more squinting at chip strips.
 * - COUNTS ARE LIVE. The pack feeds every have/need figure through
 *   `getInventory`; `refreshOpen` re-renders the open screen whenever
 *   the pack changes. Focus survives re-renders by nav key (pad law).
 * - A world-anchored screen (bank chest, station, shop counter)
 *   belongs to its tile: walk out of reach and it closes itself,
 *   exactly when the server would start refusing its actions.
 */

/** Every crafting station's face: name, icon, accent, and craft verb. */
const STATION_FACE: Record<
  string,
  { label: string; icon: string | null; accent: string; verb: string; hint: string }
> = {
  fire: {
    label: 'Cooking',
    icon: 'trout',
    accent: '#e8944a',
    verb: 'Cook',
    hint: 'The fire is lit — raw makings come straight from your pack.',
  },
  furnace: {
    label: 'Smelting',
    icon: 'bronze_bar',
    accent: '#ff8a4a',
    verb: 'Smelt',
    hint: 'Ore in, bars out — the furnace does not negotiate.',
  },
  anvil: {
    label: 'Smithing',
    icon: 'bronze_sword',
    accent: '#9aa2ac',
    verb: 'Forge',
    hint: 'Bars become blades here. Bring metal and intent.',
  },
  workbench: {
    label: 'Handiwork',
    icon: null,
    accent: '#d9a441',
    verb: 'Make',
    hint: 'Work that needs only your two hands.',
  },
  alembic: {
    label: 'Herbalism',
    icon: 'sagewort',
    accent: '#7ac4a0',
    verb: 'Brew',
    hint: 'Leaf and root, distilled to their useful truth.',
  },
  tanning_rack: {
    label: 'Leatherworking',
    icon: 'leather',
    accent: '#b08a5c',
    verb: 'Cure',
    hint: 'Hides cure into armor under patient hands.',
  },
  loom: {
    label: 'Tailoring',
    icon: 'cloth',
    accent: '#c9a8e8',
    verb: 'Weave',
    hint: 'Thread crosses thread until it counts as cloth.',
  },
  carving_bench: {
    label: 'Woodworking',
    icon: 'oak_log',
    accent: '#a8794a',
    verb: 'Carve',
    hint: 'Lumber shaped to purpose, one pass at a time.',
  },
  enchanting_table: {
    label: 'Enchanting',
    icon: 'arcane_dust',
    accent: '#b49af0',
    verb: 'Bind',
    hint: 'Power pressed into gear — permanently.',
  },
};

const HANDIWORK_FACE = STATION_FACE.workbench!;

export class StationPanels {
  private readonly craftPanel = document.getElementById('craft-panel')!;
  private readonly craftTitle = document.getElementById('craft-title')!;
  private readonly craftList = document.getElementById('craft-list')!;
  private readonly craftDetail = document.getElementById('craft-detail')!;
  private readonly bankPanel = document.getElementById('bank-panel')!;
  private readonly bankList = document.getElementById('bank-list')!;
  private readonly bankArmory = document.getElementById('bank-armory')!;
  private readonly bankDetail = document.getElementById('bank-detail')!;
  private readonly shopPanel = document.getElementById('shop-panel')!;
  private readonly shopList = document.getElementById('shop-list')!;
  private readonly buildPanel = document.getElementById('build-panel')!;
  private readonly buildList = document.getElementById('build-list')!;

  /** dressPanel handles for the Workshop head — set from main. */
  private craftDressHandles: { setHint: (t: string) => void; setIcon: (u: string) => void } | null =
    null;

  private lastBank: Record<string, number> = {};
  /** Rolled gear instances stored in the vault (withdraw by row id). */
  private lastBankGear: Array<{ id: number; item: string; roll: ItemRoll }> = [];
  /** The vault's selected pile — the detail strip's subject. */
  private bankSel: string | null = null;
  /** World tile center the open panel is bound to (null = untethered). */
  private anchor: { x: number; y: number } | null = null;
  /** What the open maker screen is showing — refreshOpen re-renders it. */
  private showing:
    | { kind: 'craft'; station: StationType | null; skills: SkillXp; sel: string | null }
    | { kind: 'plant'; tx: number; ty: number; skills: SkillXp; sel: string | null }
    | { kind: 'build'; skills: SkillXp }
    | null = null;

  constructor(
    private readonly onCraft: (recipe: string, qty: number) => void,
    private readonly onBank: (
      op: 'deposit' | 'withdraw',
      item: string,
      qty: number,
      gearId?: number,
    ) => void,
    private readonly onShop: (op: 'buy' | 'sell', item: string, qty: number) => void,
    private readonly onPickBuildable: (id: string) => void,
    /** The live pack — feeds every have/need figure. */
    private readonly getInventory: () => InvSlot[] = () => [],
  ) {}
  // Close chips + header dressing come from ui/panel.ts (dressPanel),
  // wired in main — one anatomy for every screen in the game.

  /** Main hands over the Workshop head's dress handles once, at boot. */
  setCraftDress(handles: { setHint: (t: string) => void; setIcon: (u: string) => void }): void {
    this.craftDressHandles = handles;
  }

  get bankOpen(): boolean {
    return !this.bankPanel.classList.contains('hidden');
  }

  get shopOpen(): boolean {
    return !this.shopPanel.classList.contains('hidden');
  }

  get anyOpen(): boolean {
    return (
      this.bankOpen ||
      this.shopOpen ||
      !this.craftPanel.classList.contains('hidden') ||
      !this.buildPanel.classList.contains('hidden')
    );
  }

  /**
   * The open panel's anchor tile — the station being talked to. The
   * renderer heats that station's interaction choreography off this
   * (chest lid open, furnace stoked) for exactly as long as the
   * conversation lasts.
   */
  get anchorTile(): { tx: number; ty: number } | null {
    if (!this.anchor || !this.anyOpen) return null;
    return { tx: Math.floor(this.anchor.x), ty: Math.floor(this.anchor.y) };
  }

  closeAll(): void {
    this.craftPanel.classList.add('hidden');
    this.bankPanel.classList.add('hidden');
    this.shopPanel.classList.add('hidden');
    this.buildPanel.classList.add('hidden');
    this.anchor = null;
    this.showing = null;
    this.bankSel = null;
  }

  /**
   * Called every frame with the player's position: an anchored panel
   * closes once its station is out of reach (a little past the 2.2
   * interaction radius, so standing at the edge doesn't flicker it).
   */
  enforceAnchor(px: number, py: number): void {
    if (!this.anchor || !this.anyOpen) return;
    const dx = this.anchor.x - px;
    const dy = this.anchor.y - py;
    if (dx * dx + dy * dy > 3 * 3) this.closeAll();
  }

  /** The pack changed — keep the open maker screen's figures honest. */
  refreshOpen(): void {
    if (!this.showing) return;
    if (this.showing.kind === 'craft') this.renderCraft();
    else if (this.showing.kind === 'plant') this.renderPlant();
    else this.renderBuild();
  }

  /** Total of an item across the pack — the "have" in have/need. */
  private countOf(item: string): number {
    let n = 0;
    for (const slot of this.getInventory()) {
      if (slot && slot.item === item) n += slot.qty;
    }
    return n;
  }

  // ------------------------------------------------------------ build

  openBuild(skills: SkillXp): void {
    this.closeAll();
    this.showing = { kind: 'build', skills };
    this.renderBuild();
    this.buildPanel.classList.remove('hidden');
  }

  /**
   * The Builder's Table: every blueprint is a CARD laid on the table —
   * portrait, name, the level it asks, the material story, and one
   * Place button. Locked plans stay visible; ambition needs a map.
   */
  private renderBuild(): void {
    if (this.showing?.kind !== 'build') return;
    const { skills } = this.showing;
    this.buildList.innerHTML = '';
    for (const def of BUILDABLES.values()) {
      const skill = def.skill ?? 'construction';
      const level = levelForXp(skills[skill] ?? 0);
      const locked = level < def.levelReq;

      const card = document.createElement('div');
      card.className = 'blueprint-card' + (locked ? ' disabled' : '');
      const top = document.createElement('div');
      top.className = 'blueprint-top';
      const iconUrl = buildableIconUrl(def.id, 44);
      let tile: HTMLElement;
      if (iconUrl) {
        tile = iconTile(iconUrl, 'sm');
      } else {
        tile = document.createElement('div');
        tile.className = 'icon-tile sm';
        const sw = document.createElement('div');
        sw.className = 'tile-swatch';
        sw.style.cssText = `width:70%;height:70%;background:${
          tileDef(def.tile).topColor ?? tileDef(def.tile).color
        }`;
        tile.appendChild(sw);
      }
      const names = document.createElement('div');
      names.className = 'blueprint-names';
      const name = document.createElement('div');
      name.className = 'blueprint-name';
      name.textContent = def.name;
      names.appendChild(name);
      names.appendChild(levelBadge(def.levelReq, skill, !locked));
      top.append(tile, names);
      card.appendChild(top);

      const chips = document.createElement('div');
      chips.className = 'make-chips';
      for (const m of def.materials) {
        const mDef = itemDef(m.item);
        chips.appendChild(
          needChip(itemIconUrl(m.item, 24), this.countOf(m.item), m.qty, mDef?.name ?? m.item),
        );
      }
      card.appendChild(chips);

      const actions = document.createElement('div');
      actions.className = 'blueprint-actions';
      if (!locked) {
        actions.appendChild(
          bigButton('Place', `build:${def.id}`, () => this.onPickBuildable(def.id)),
        );
      } else {
        const lockNote = document.createElement('span');
        lockNote.className = 'lock-note';
        lockNote.textContent = `Reach ${skill} ${def.levelReq}`;
        actions.appendChild(lockNote);
      }
      card.appendChild(actions);
      this.buildList.appendChild(card);
    }
  }

  // ------------------------------------------------------------ plant

  /** Set by main: sends the plant intent for a chosen seed. */
  onPlant: ((tx: number, ty: number, seed: string) => void) | null = null;

  /** Seed picker for a tilled plot: lists the seeds you carry. */
  openPlant(
    tx: number,
    ty: number,
    inventory: InvSlot[],
    skills: SkillXp,
    at?: { tx: number; ty: number },
  ): void {
    void inventory; // counts come live from getInventory now
    this.closeAll();
    this.anchor = at ? { x: at.tx + 0.5, y: at.ty + 0.5 } : { x: tx + 0.5, y: ty + 0.5 };
    this.showing = { kind: 'plant', tx, ty, skills, sel: null };
    this.dressCraft('Planting', itemIconUrl('carrot', 34), '#7ac46a',
      'The furrow is cut — choose what grows in it.');
    this.renderPlant();
    this.craftPanel.classList.remove('hidden');
  }

  /** Dress the Workshop head for whoever owns it right now. */
  private dressCraft(title: string, iconUrl: string, accent: string, hint: string): void {
    this.craftTitle.textContent = title;
    this.craftPanel.style.setProperty('--screen-accent', accent);
    this.craftDressHandles?.setIcon(iconUrl);
    this.craftDressHandles?.setHint(hint);
  }

  /** One ledger row (Workshop master list). */
  private ledgerRow(opts: {
    key: string;
    iconUrl: string;
    name: string;
    note: string;
    noteTone?: 'ok' | 'short' | 'lock';
    selected: boolean;
    onPick: () => void;
  }): HTMLElement {
    const row = document.createElement('div');
    row.className = 'ledger-row' + (opts.selected ? ' selected' : '');
    row.dataset.nav = '';
    row.dataset.navkey = opts.key;
    row.dataset.acta = 'View';
    const img = document.createElement('img');
    img.src = opts.iconUrl;
    img.draggable = false;
    const name = document.createElement('span');
    name.className = 'ledger-name';
    name.textContent = opts.name;
    const note = document.createElement('span');
    note.className = `ledger-note ${opts.noteTone ?? ''}`.trim();
    note.textContent = opts.note;
    row.append(img, name, note);
    row.addEventListener('click', opts.onPick);
    return row;
  }

  /** One material row in the Workshop detail: the full story of a need. */
  private materialRow(item: string, need: number): HTMLElement {
    const have = this.countOf(item);
    const def = itemDef(item);
    const row = document.createElement('div');
    row.className = 'mat-row' + (have >= need ? ' ok' : ' short');
    const img = document.createElement('img');
    img.src = itemIconUrl(item, 36);
    img.draggable = false;
    const name = document.createElement('span');
    name.className = 'mat-name';
    name.textContent = def?.name ?? item;
    const count = document.createElement('span');
    count.className = 'mat-count';
    count.textContent = `${Math.min(have, 9999).toLocaleString()} / ${need}`;
    row.append(img, name, count);
    return row;
  }

  private renderPlant(): void {
    if (this.showing?.kind !== 'plant') return;
    const showing = this.showing;
    const { tx, ty, skills } = showing;
    this.craftList.innerHTML = '';
    this.craftDetail.innerHTML = '';
    const level = levelForXp(skills.farming ?? 0);

    // Tally the seed pouches in the pack.
    const held = new Map<string, number>();
    for (const slot of this.getInventory()) {
      if (slot && CROP_BY_SEED.has(slot.item)) {
        held.set(slot.item, (held.get(slot.item) ?? 0) + slot.qty);
      }
    }
    if (held.size === 0) {
      const empty = document.createElement('div');
      empty.className = 'make-empty';
      empty.textContent = 'No seeds in your pack — buy some at the shop, or forage wild herbs.';
      this.craftList.appendChild(empty);
      return;
    }
    const seeds = [...held.keys()];
    if (!showing.sel || !held.has(showing.sel)) showing.sel = seeds[0]!;

    for (const seed of seeds) {
      const crop = CROP_BY_SEED.get(seed)!;
      const locked = level < crop.levelReq;
      this.craftList.appendChild(
        this.ledgerRow({
          key: `plantrow:${seed}`,
          iconUrl: itemIconUrl(seed, 40),
          name: crop.name,
          note: locked ? `lvl ${crop.levelReq}` : `× ${held.get(seed)!.toLocaleString()}`,
          noteTone: locked ? 'lock' : 'ok',
          selected: showing.sel === seed,
          onPick: () => {
            showing.sel = seed;
            this.renderPlant();
          },
        }),
      );
    }

    // The chosen seed, laid out large.
    const seed = showing.sel;
    const crop = CROP_BY_SEED.get(seed)!;
    const locked = level < crop.levelReq;
    const head = document.createElement('div');
    head.className = 'work-head';
    head.appendChild(iconTile(itemIconUrl(seed, 64)));
    const titles = document.createElement('div');
    const name = document.createElement('div');
    name.className = 'work-name';
    name.textContent = crop.name;
    const sub = document.createElement('div');
    sub.className = 'work-sub';
    sub.textContent = `farming · level ${crop.levelReq}`;
    titles.append(name, sub);
    head.appendChild(titles);
    this.craftDetail.appendChild(head);

    const facts = document.createElement('div');
    facts.className = 'work-facts';
    const fact = (label: string, value: string): void => {
      const f = document.createElement('div');
      f.className = 'work-fact';
      f.innerHTML = '';
      const v = document.createElement('strong');
      v.textContent = value;
      const l = document.createElement('span');
      l.textContent = label;
      f.append(v, l);
      facts.appendChild(f);
    };
    fact('to grow', `~${crop.growMinutes} min`);
    fact('seeds held', held.get(seed)!.toLocaleString());
    this.craftDetail.appendChild(facts);

    this.craftDetail.appendChild(sectionHead('In the furrow'));
    this.craftDetail.appendChild(this.materialRow(seed, 1));

    const actions = document.createElement('div');
    actions.className = 'work-actions';
    if (locked) {
      const lockNote = document.createElement('span');
      lockNote.className = 'lock-note';
      lockNote.textContent = `Reach farming ${crop.levelReq} to plant this`;
      actions.appendChild(lockNote);
    } else {
      actions.appendChild(
        bigButton('Plant', `plant:${seed}`, () => {
          this.onPlant?.(tx, ty, seed);
          this.closeAll();
        }),
      );
    }
    this.craftDetail.appendChild(actions);
  }

  // ------------------------------------------------------------ craft

  openCraft(station: StationType | null, skills: SkillXp, at?: { tx: number; ty: number }): void {
    this.closeAll();
    if (at) this.anchor = { x: at.tx + 0.5, y: at.ty + 0.5 };
    this.showing = { kind: 'craft', station, skills, sel: null };
    const face = (station && STATION_FACE[station]) || HANDIWORK_FACE;
    this.dressCraft(
      face.label,
      face.icon ? itemIconUrl(face.icon, 34) : uiIconUrl('hammer', 34),
      face.accent,
      face.hint,
    );
    this.renderCraft();
    this.craftPanel.classList.remove('hidden');
  }

  /** How many of a recipe the pack can cover right now. */
  private makeable(recipe: RecipeDef): number {
    let n = Infinity;
    for (const input of recipe.inputs) {
      n = Math.min(n, Math.floor(this.countOf(input.item) / input.qty));
    }
    return Number.isFinite(n) ? n : 0;
  }

  /**
   * The Workshop: recipe ledger on the left — each row telling you at
   * a glance whether it's within reach — and the chosen work laid out
   * large on the right with the full material story and make buttons.
   */
  private renderCraft(): void {
    if (this.showing?.kind !== 'craft') return;
    const showing = this.showing;
    const { station, skills } = showing;
    const face = (station && STATION_FACE[station]) || HANDIWORK_FACE;
    this.craftList.innerHTML = '';
    this.craftDetail.innerHTML = '';
    const recipes = recipesForStation(station);
    if (recipes.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'make-empty';
      empty.textContent = 'Nothing can be made here yet.';
      this.craftList.appendChild(empty);
      return;
    }
    if (!showing.sel || !recipes.some((r) => r.id === showing.sel)) {
      // First choice: the first recipe you can actually make right
      // now; failing that, the first you have the level for.
      const canDo = recipes.find(
        (r) => levelForXp(skills[r.skill] ?? 0) >= r.levelReq && this.makeable(r) > 0,
      );
      const unlocked = recipes.find((r) => levelForXp(skills[r.skill] ?? 0) >= r.levelReq);
      showing.sel = (canDo ?? unlocked ?? recipes[0]!).id;
    }

    for (const recipe of recipes) {
      const level = levelForXp(skills[recipe.skill] ?? 0);
      const locked = level < recipe.levelReq;
      const count = this.makeable(recipe);
      this.craftList.appendChild(
        this.ledgerRow({
          key: `recipe:${recipe.id}`,
          iconUrl: itemIconUrl(recipe.output.item, 40),
          name: recipe.name,
          note: locked ? `lvl ${recipe.levelReq}` : count > 0 ? `× ${count}` : 'short',
          noteTone: locked ? 'lock' : count > 0 ? 'ok' : 'short',
          selected: showing.sel === recipe.id,
          onPick: () => {
            showing.sel = recipe.id;
            this.renderCraft();
          },
        }),
      );
    }

    // ---- the chosen work, laid out large
    const recipe = recipes.find((r) => r.id === showing.sel)!;
    const level = levelForXp(skills[recipe.skill] ?? 0);
    const locked = level < recipe.levelReq;
    const count = this.makeable(recipe);

    const head = document.createElement('div');
    head.className = 'work-head';
    const tile = iconTile(itemIconUrl(recipe.output.item, 64));
    if (recipe.output.qty > 1) {
      const q = document.createElement('span');
      q.className = 'out-qty';
      q.textContent = `×${recipe.output.qty}`;
      tile.appendChild(q);
    }
    head.appendChild(tile);
    const titles = document.createElement('div');
    const name = document.createElement('div');
    name.className = 'work-name';
    name.textContent = recipe.name;
    const sub = document.createElement('div');
    sub.className = 'work-sub';
    sub.textContent = `${recipe.skill} · level ${recipe.levelReq} · +${recipe.xp} xp each`;
    titles.append(name, sub);
    head.appendChild(titles);
    this.craftDetail.appendChild(head);

    const facts = document.createElement('div');
    facts.className = 'work-facts';
    const fact = (value: string, label: string, tone?: string): void => {
      const f = document.createElement('div');
      f.className = 'work-fact';
      const v = document.createElement('strong');
      v.textContent = value;
      if (tone) v.style.color = tone;
      const l = document.createElement('span');
      l.textContent = label;
      f.append(v, l);
      facts.appendChild(f);
    };
    fact(locked ? '—' : `× ${count}`, 'you can make', locked ? undefined : count > 0 ? 'var(--green)' : 'var(--red-soft)');
    fact(`${level}`, `your ${recipe.skill}`, locked ? 'var(--red-soft)' : undefined);
    if (recipe.output.qty > 1) fact(`× ${recipe.output.qty}`, 'per make');
    this.craftDetail.appendChild(facts);

    this.craftDetail.appendChild(sectionHead('Materials'));
    for (const input of recipe.inputs) {
      this.craftDetail.appendChild(this.materialRow(input.item, input.qty));
    }

    // The result's own story — what you're actually making and why.
    const outDef = itemDef(recipe.output.item);
    if (outDef) {
      const facts: string[] = [];
      if (outDef.heals) facts.push(`Heals ${outDef.heals} HP`);
      if (outDef.weapon) facts.push(`${outDef.weapon.damage} damage`);
      if (outDef.armor) facts.push(`+${outDef.armor} armor`);
      if (outDef.value) facts.push(`worth ${outDef.value.toLocaleString()}c each`);
      if (facts.length > 0 || outDef.desc) {
        this.craftDetail.appendChild(sectionHead('The result'));
        const result = document.createElement('div');
        result.className = 'work-result';
        if (facts.length > 0) {
          const line = document.createElement('div');
          line.className = 'work-result-facts';
          line.textContent = facts.join(' · ');
          result.appendChild(line);
        }
        if (outDef.desc) {
          const flavor = document.createElement('div');
          flavor.className = 'work-result-flavor';
          flavor.textContent = outDef.desc;
          result.appendChild(flavor);
        }
        this.craftDetail.appendChild(result);
      }
    }

    const actions = document.createElement('div');
    actions.className = 'work-actions';
    if (locked) {
      const lockNote = document.createElement('span');
      lockNote.className = 'lock-note';
      lockNote.textContent = `Reach ${recipe.skill} ${recipe.levelReq} to ${face.verb.toLowerCase()} this`;
      actions.appendChild(lockNote);
    } else {
      for (const qty of [1, 5, 28]) {
        const label = qty === 1 ? `${face.verb} 1` : qty === 28 ? `${face.verb} all` : `× ${qty}`;
        const btn = bigButton(label, `craft:${recipe.id}:${qty}`, () => this.onCraft(recipe.id, qty), {
          acta: face.verb,
          minor: qty !== 1,
        });
        if (count === 0) btn.disabled = true;
        actions.appendChild(btn);
      }
    }
    this.craftDetail.appendChild(actions);
  }

  // ------------------------------------------------------------- bank

  openBank(
    items: Record<string, number>,
    at?: { tx: number; ty: number },
    gear?: Array<{ id: number; item: string; roll: ItemRoll }>,
  ): void {
    this.lastBank = items;
    if (gear) this.lastBankGear = gear;
    this.closeAll();
    if (at) this.anchor = { x: at.tx + 0.5, y: at.ty + 0.5 };
    this.renderBank();
    this.bankPanel.classList.remove('hidden');
  }

  refreshBank(
    items: Record<string, number>,
    gear?: Array<{ id: number; item: string; roll: ItemRoll }>,
  ): void {
    this.lastBank = items;
    if (gear) this.lastBankGear = gear;
    if (this.bankOpen) this.renderBank();
  }

  /**
   * The Vault: stored goods as a WALL OF SOCKETS you read like your
   * own pack — pick a pile and the counter beneath offers Take 1/5/
   * All. Rolled gear hangs apart on the armory rack, tinted by tier,
   * each piece taken back with one press. Hover or focus any socket
   * for the full item card, exactly like the pack.
   */
  private renderBank(): void {
    this.bankList.innerHTML = '';
    this.bankArmory.innerHTML = '';
    this.bankDetail.innerHTML = '';
    const entries = Object.entries(this.lastBank).sort(([a], [b]) => a.localeCompare(b));
    if (this.bankSel && !this.lastBank[this.bankSel]) this.bankSel = null;

    if (entries.length === 0 && this.lastBankGear.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'make-empty';
      empty.textContent = 'Your vault is empty — deposit from the pack beside you.';
      this.bankList.appendChild(empty);
      this.bankArmory.classList.add('hidden');
      this.bankDetail.classList.add('hidden');
      return;
    }

    // ---- armory rack: one socket per rolled instance.
    if (this.lastBankGear.length > 0) {
      this.bankArmory.classList.remove('hidden');
      this.bankArmory.appendChild(sectionHead('Armory — rolled gear'));
      const rack = document.createElement('div');
      rack.className = 'vault-grid';
      for (const g of this.lastBankGear) {
        const cell = document.createElement('div');
        cell.className = `inv-slot vault-slot clickable rarity-${g.roll.rar}`;
        cell.dataset.nav = '';
        cell.dataset.navkey = `bankgear:${g.id}`;
        cell.dataset.acta = 'Take';
        cell.dataset.tipname = instanceName(g.item, g.roll);
        // The full inspect card serves vault gear like pack gear.
        cell.dataset.lootitem = g.item;
        cell.dataset.lootqty = '1';
        cell.dataset.lootroll = JSON.stringify(g.roll);
        const img = document.createElement('img');
        img.className = 'inv-item';
        img.src = itemIconUrl(g.item, 48);
        img.draggable = false;
        cell.appendChild(img);
        cell.addEventListener('click', () => this.onBank('withdraw', g.item, 1, g.id));
        rack.appendChild(cell);
      }
      this.bankArmory.appendChild(rack);
    } else {
      this.bankArmory.classList.add('hidden');
    }

    // ---- the goods wall.
    if (entries.length > 0) {
      const grid = document.createElement('div');
      grid.className = 'vault-grid';
      for (const [item, qty] of entries) {
        const cell = document.createElement('div');
        cell.className = 'inv-slot vault-slot clickable';
        if (this.bankSel === item) cell.classList.add('selected');
        cell.dataset.nav = '';
        cell.dataset.navkey = `bank:${item}`;
        cell.dataset.acta = 'Choose';
        cell.dataset.tipname = itemDef(item)?.name ?? item;
        cell.dataset.lootitem = item;
        cell.dataset.lootqty = String(qty);
        const img = document.createElement('img');
        img.className = 'inv-item';
        img.src = itemIconUrl(item, 48);
        img.draggable = false;
        cell.appendChild(img);
        const q = document.createElement('span');
        q.className = 'inv-qty';
        q.textContent = qty > 9999 ? `${Math.floor(qty / 1000)}k` : qty.toLocaleString();
        cell.appendChild(q);
        cell.addEventListener('click', () => {
          this.bankSel = item;
          this.renderBank();
        });
        grid.appendChild(cell);
      }
      this.bankList.appendChild(grid);
    }

    // ---- the counter: the chosen pile's take actions.
    if (this.bankSel) {
      const item = this.bankSel;
      const qty = this.lastBank[item]!;
      const def = itemDef(item);
      this.bankDetail.classList.remove('hidden');
      const face = document.createElement('div');
      face.className = 'counter-face';
      const img = document.createElement('img');
      img.src = itemIconUrl(item, 44);
      img.draggable = false;
      const names = document.createElement('div');
      const name = document.createElement('div');
      name.className = 'counter-name';
      name.textContent = def?.name ?? item;
      const sub = document.createElement('div');
      sub.className = 'counter-sub';
      sub.textContent = `${qty.toLocaleString()} stored`;
      names.append(name, sub);
      face.append(img, names);
      this.bankDetail.appendChild(face);
      const actions = document.createElement('div');
      actions.className = 'counter-actions';
      for (const [label, n] of [
        ['Take 1', 1],
        ['Take 5', 5],
        ['Take all', qty],
      ] as const) {
        actions.appendChild(
          bigButton(label, `bank:${item}:${label}`, () => this.onBank('withdraw', item, n), {
            acta: 'Withdraw',
            minor: label !== 'Take 1',
          }),
        );
      }
      this.bankDetail.appendChild(actions);
    } else {
      this.bankDetail.classList.add('hidden');
    }
  }

  // ------------------------------------------------------------- shop

  /**
   * The Store: goods SHELVED in a grid — big portrait, name, an honest
   * coin price tag, and the buy buttons right on the shelf. Your pack
   * stands beside the counter; tap items there to sell them.
   */
  openShop(at?: { tx: number; ty: number }): void {
    this.closeAll();
    if (at) this.anchor = { x: at.tx + 0.5, y: at.ty + 0.5 };
    this.shopList.innerHTML = '';
    for (const entry of GENERAL_STORE) {
      const def = itemDef(entry.item);
      const card = document.createElement('div');
      card.className = 'shelf-card';
      // Hover / pad focus raises the full item card for shop goods.
      card.dataset.lootitem = entry.item;
      card.dataset.lootqty = '1';
      card.appendChild(iconTile(itemIconUrl(entry.item, 48), 'sm'));
      const mid = document.createElement('div');
      mid.className = 'shelf-mid';
      const name = document.createElement('div');
      name.className = 'shelf-name';
      name.textContent = def?.name ?? entry.item;
      const tag = document.createElement('span');
      tag.className = 'price-tag';
      const coin = document.createElement('img');
      coin.src = itemIconUrl('coins', 18);
      coin.draggable = false;
      const amount = document.createElement('span');
      amount.textContent = entry.price.toLocaleString();
      tag.append(coin, amount);
      mid.append(name, tag);
      card.appendChild(mid);
      const actions = document.createElement('div');
      actions.className = 'shelf-actions';
      for (const [label, n] of [
        ['Buy 1', 1],
        ['Buy 5', 5],
      ] as const) {
        actions.appendChild(
          bigButton(label, `shop:${entry.item}:${n}`, () => this.onShop('buy', entry.item, n), {
            acta: 'Buy',
            minor: n !== 1,
          }),
        );
      }
      card.appendChild(actions);
      this.shopList.appendChild(card);
    }
    this.shopPanel.classList.remove('hidden');
  }
}
