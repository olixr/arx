import { itemDef, parseDialogueMarkup } from '@arx/content';
import type { QuestObjectiveWire, QuestWire } from '@arx/shared';
import type { ClientGame } from '../game/clientGame.js';
import { dockGlyphUrl, itemIconUrl, uiIconUrl } from '../render/icons.js';
import { bigButton, dressPanel, needChip, sectionHead } from './panel.js';
import { createLedger } from './kit/ledger.js';

/**
 * THE JOURNAL — the quest log (J). List left, the open page right.
 *
 * Groups by pull: Ready to turn in (the strongest) > Underway >
 * Resting (repeatables on cooldown) > Finished. THE GUIDANCE LAW
 * rules the page: the journal entry is written directions in the
 * world's voice — read it, know the land, go. No markers.
 *
 * Offerable-but-untaken quests are DELIBERATELY absent: you find work
 * by talking to the folk who wear the mark, not by reading a menu.
 *
 * Tracking is client-local (localStorage per character) — pure
 * presentation; the server never hears which page is dog-eared.
 */
export class QuestLog {
  private readonly panel = document.getElementById('quest-panel')!;
  private readonly list: HTMLElement;
  private readonly bench: HTMLElement;
  private selected: string | null = null;
  private confirmAbandon: string | null = null;
  private renderedVersion = -1;
  /** When the list last painted — the resting shelf's clocks read
   *  Date.now() at render time, so a reopen must know if they moved. */
  private renderedAt = 0;
  /** The reader's leaf in the errand ledger, kept across repaints. */
  private leaf = 0;

  constructor(private readonly game: ClientGame) {
    dressPanel(this.panel, {
      icon: dockGlyphUrl('quest', 44),
      hint: 'Your sworn errands — the entry tells you where; the land tells you the rest.',
      onClose: () => this.close(),
    });
    const main = document.createElement('div');
    main.className = 'quest-main';
    this.list = document.createElement('div');
    this.list.className = 'quest-list';
    // THE ROOM IS MADE OF ROOMS: the ledger and the open page each hold
    // the pad's ring, so walking the errands never steps onto the page.
    this.list.dataset.region = '';
    this.bench = document.createElement('div');
    this.bench.className = 'quest-bench';
    this.bench.dataset.region = '';
    main.append(this.list, this.bench);
    this.panel.appendChild(main);
  }

  get isOpen(): boolean {
    return !this.panel.classList.contains('hidden');
  }

  open(): void {
    this.panel.classList.remove('hidden');
    // Rebuild only when the data moved (or a resting errand's clock
    // could have) — the version check replaces the old forced full
    // rebuild on every open.
    if (this.renderedVersion !== this.game.questVersion || this.restingMoved()) {
      this.render();
    } else {
      // The bench alone repaints cheap: close() clears a pending
      // abandon-confirm without a render, and the done-shelf cooldown
      // line reads the clock — neither stale word may survive reopen.
      this.renderBench();
    }
  }

  close(): void {
    this.panel.classList.add('hidden');
    this.confirmAbandon = null;
  }

  /** Quiet-wire hook: repaint only when open and only on change. */
  refresh(): void {
    if (!this.isOpen || this.renderedVersion === this.game.questVersion) return;
    this.render();
  }

  /**
   * True when any repeatable's cooldown was still running at the last
   * paint — its shelf or countdown word may have changed since, even
   * with the data version unmoved.
   */
  private restingMoved(): boolean {
    for (const d of this.game.questsDone.values()) {
      if (d.repeatable && (d.cooldownUntil ?? 0) > this.renderedAt) return true;
    }
    return false;
  }

  private get trackKey(): string {
    return `arx.questTracked.${this.game.ownName}`;
  }

  /** The dog-eared page: a valid active quest id, or a sensible default. */
  trackedId(): string | null {
    const stored = localStorage.getItem(this.trackKey);
    if (stored && this.game.quests.has(stored)) return stored;
    let fallback: string | null = null;
    for (const q of this.game.quests.values()) {
      if (q.status === 'ready') return q.id;
      fallback ??= q.id;
    }
    return fallback;
  }

  private setTracked(id: string | null): void {
    if (id) localStorage.setItem(this.trackKey, id);
    else localStorage.removeItem(this.trackKey);
    this.game.questVersion++; // the tracker pill re-reads on it
    this.render();
  }

  private render(): void {
    this.renderedVersion = this.game.questVersion;
    this.renderedAt = Date.now();
    const game = this.game;
    const active = [...game.quests.values()];
    const ready = active.filter((q) => q.status === 'ready');
    const underway = active.filter((q) => q.status !== 'ready');
    const done = [...game.questsDone.values()];
    const now = Date.now();
    const resting = done.filter((d) => d.repeatable && (d.cooldownUntil ?? 0) > now);
    const finished = done.filter((d) => !resting.includes(d));

    if (this.selected === null || (!game.quests.has(this.selected) && !game.questsDone.has(this.selected))) {
      this.selected = ready[0]?.id ?? underway[0]?.id ?? resting[0]?.id ?? finished[0]?.id ?? null;
    }

    this.list.innerHTML = '';
    const rows: HTMLElement[] = [];
    // THE DOG-EAR RIDES FIRST: the followed errand pins to the top of
    // the ledger, whatever shelf it belongs to.
    const followedId =
      localStorage.getItem(this.trackKey) && this.game.quests.has(localStorage.getItem(this.trackKey)!)
        ? localStorage.getItem(this.trackKey)
        : null;
    const makeRow = (id: string, name: string, chip: string, tone: string): HTMLElement => {
      const row = document.createElement('button');
      row.className = `quest-row${this.selected === id ? ' sel' : ''}${followedId === id ? ' followed' : ''}`;
      row.dataset.nav = '';
      row.dataset.navkey = `quest:${id}`;
      row.dataset.acta = 'Read';
      const label = document.createElement('span');
      label.className = 'quest-row-name';
      label.textContent = name;
      const state = document.createElement('span');
      state.className = `quest-row-state ${tone}`;
      state.textContent = chip;
      row.append(label, state);
      row.addEventListener('click', () => this.inspectQuest(id));
      return row;
    };
    const followed = followedId ? active.find((q) => q.id === followedId) : undefined;
    if (followed) {
      rows.push(sectionHead('Followed'));
      rows.push(
        makeRow(
          followed.id,
          followed.name,
          followed.status === 'ready'
            ? followed.turnInName
            : followed.stages > 1
              ? `part ${followed.stage + 1} of ${followed.stages}`
              : '',
          followed.status === 'ready' ? 'ready' : 'active',
        ),
      );
    }
    const rest = (list: QuestWire[]): QuestWire[] => list.filter((q) => q.id !== followedId);
    if (rest(ready).length > 0) {
      rows.push(sectionHead('Ready to turn in'));
      for (const q of rest(ready)) rows.push(makeRow(q.id, q.name, `${q.turnInName}`, 'ready'));
    }
    if (rest(underway).length > 0) {
      rows.push(sectionHead('Underway'));
      for (const q of rest(underway))
        rows.push(makeRow(q.id, q.name, q.stages > 1 ? `part ${q.stage + 1} of ${q.stages}` : '', 'active'));
    }
    if (resting.length > 0) {
      rows.push(sectionHead('Resting'));
      for (const d of resting) rows.push(makeRow(d.id, d.name, cooldownWord((d.cooldownUntil ?? now) - now), 'resting'));
    }
    if (finished.length > 0) {
      rows.push(sectionHead('Finished'));
      for (const d of finished) rows.push(makeRow(d.id, d.name, d.completions > 1 ? `×${d.completions}` : '', 'done'));
    }
    if (rows.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'quest-empty';
      empty.textContent = 'No errands sworn yet. Folk with work to give wear a mark over their heads — go and talk.';
      this.list.appendChild(empty);
    } else {
      // The errands deal onto leaves — nothing lives below the fold.
      const ledger = createLedger<HTMLElement>({
        renderRow: (el) => el,
        seedRows: 9,
        initialLeaf: this.leaf,
        onLeaf: (leaf) => {
          this.leaf = leaf;
        },
      });
      this.list.appendChild(ledger.root);
      ledger.setItems(rows);
    }

    this.renderBench();
  }

  /**
   * Light the page for one errand without redealing the ledger —
   * focus and hover ride this, so reading costs nothing.
   */
  inspectQuest(id: string): void {
    if (!this.game.quests.has(id) && !this.game.questsDone.has(id)) return;
    if (this.selected === id) return;
    this.selected = id;
    this.confirmAbandon = null;
    this.list.querySelectorAll('.quest-row.sel').forEach((r) => r.classList.remove('sel'));
    this.list
      .querySelector(`[data-navkey="${CSS.escape(`quest:${id}`)}"]`)
      ?.classList.add('sel');
    this.renderBench();
  }

  private renderBench(): void {
    this.bench.innerHTML = '';
    const id = this.selected;
    if (!id) return;
    const q = this.game.quests.get(id);
    if (q) this.renderActiveBench(q);
    else {
      const d = this.game.questsDone.get(id);
      if (d) this.renderDoneBench(d);
    }
  }

  private renderActiveBench(q: QuestWire): void {
    const head = document.createElement('div');
    head.className = 'quest-bench-head';
    const name = document.createElement('div');
    name.className = 'quest-bench-name';
    name.textContent = q.name;
    const sub = document.createElement('div');
    sub.className = 'quest-bench-sub';
    const part = q.stages > 1 ? `Part ${q.stage + 1} of ${q.stages} · ` : '';
    sub.textContent =
      q.status === 'ready'
        ? `${part}Ready — return to ${q.turnInName}`
        : `${part}Given by ${q.giverName}${q.turnIn !== q.giver ? ` · hand to ${q.turnInName}` : ''}`;
    if (q.status === 'ready') sub.classList.add('ready');
    head.append(name, sub);
    this.bench.appendChild(head);

    // The journal entry — the world's own directions, markup honored.
    const entry = document.createElement('div');
    entry.className = 'quest-entry';
    for (const tok of parseDialogueMarkup(q.journal).tokens) {
      if (tok.kind === 'item') {
        const chip = document.createElement('span');
        chip.className = 'quest-item-chip';
        const img = document.createElement('img');
        img.src = itemIconUrl(tok.item, 24);
        img.draggable = false;
        const label = document.createElement('span');
        label.textContent = itemDef(tok.item)?.name ?? tok.item;
        chip.append(img, label);
        entry.appendChild(chip);
      } else {
        const span = document.createElement('span');
        if (tok.kind === 'em') span.className = 'quest-em';
        if (tok.kind === 'grim') span.className = 'quest-grim';
        span.textContent = tok.text;
        entry.appendChild(span);
      }
    }
    this.bench.appendChild(entry);

    // The asks, each with its have/need chip.
    const objs = document.createElement('div');
    objs.className = 'quest-objectives';
    for (const o of q.objectives) {
      const row = document.createElement('div');
      row.className = 'quest-obj-row';
      row.appendChild(needChip(objectiveIconUrl(o), o.have, o.need, objectiveTitle(o)));
      const label = document.createElement('span');
      label.className = 'quest-obj-label';
      label.textContent = objectiveVerb(o);
      row.appendChild(label);
      objs.appendChild(row);
    }
    this.bench.appendChild(objs);

    const actions = document.createElement('div');
    actions.className = 'quest-actions';
    const tracked = this.trackedId() === q.id && localStorage.getItem(this.trackKey) === q.id;
    actions.appendChild(
      bigButton(tracked ? 'Untrack' : 'Track', `quest:track`, () => this.setTracked(tracked ? null : q.id), {
        acta: 'Track',
      }),
    );
    const abandonLabel = this.confirmAbandon === q.id ? 'Abandon — sure?' : 'Abandon';
    actions.appendChild(
      bigButton(abandonLabel, `quest:abandon`, () => {
        if (this.confirmAbandon === q.id) {
          this.confirmAbandon = null;
          this.game.abandonQuest(q.id);
        } else {
          this.confirmAbandon = q.id;
          this.render();
        }
      }, { acta: 'Abandon', minor: true }),
    );
    this.bench.appendChild(actions);

    if (q.repeatable) {
      const teach = document.createElement('div');
      teach.className = 'quest-teach';
      teach.textContent = 'Standing work — it will be offered again a while after you turn it in.';
      this.bench.appendChild(teach);
    }
  }

  private renderDoneBench(d: { id: string; name: string; completions: number; repeatable?: boolean; cooldownUntil?: number }): void {
    const head = document.createElement('div');
    head.className = 'quest-bench-head';
    const name = document.createElement('div');
    name.className = 'quest-bench-name';
    name.textContent = d.name;
    const sub = document.createElement('div');
    sub.className = 'quest-bench-sub';
    const now = Date.now();
    sub.textContent =
      d.repeatable && (d.cooldownUntil ?? 0) > now
        ? `Seen through ${d.completions > 1 ? `${d.completions} times` : 'once'} · offered again in ${cooldownWord((d.cooldownUntil ?? now) - now)}`
        : `Seen through${d.completions > 1 ? ` ${d.completions} times` : ''}.`;
    head.append(name, sub);
    this.bench.appendChild(head);
  }
}

function objectiveIconUrl(o: QuestObjectiveWire): string {
  switch (o.kind) {
    case 'collect':
      return itemIconUrl(o.item ?? '', 48);
    case 'kill':
      return uiIconUrl('attack', 48);
    case 'discover':
      return uiIconUrl('signpost', 48);
    case 'talk':
      return uiIconUrl('bell', 48);
  }
}

function objectiveVerb(o: QuestObjectiveWire): string {
  switch (o.kind) {
    case 'collect':
      return `Bring ${o.need > 1 ? `${o.need} ` : ''}${o.label}`;
    case 'kill':
      return `Slay ${o.need > 1 ? `${o.need} ` : ''}${o.label}`;
    case 'discover':
      return `Find ${o.label}`;
    case 'talk':
      return `Speak with ${o.label}`;
  }
}

function objectiveTitle(o: QuestObjectiveWire): string {
  return `${objectiveVerb(o)} — ${o.have}/${o.need}`;
}

/** "3h" / "40m" / "under a minute" — the resting shelf's word. */
function cooldownWord(ms: number): string {
  const m = Math.ceil(ms / 60_000);
  if (m >= 90) return `${Math.ceil(m / 60)}h`;
  if (m >= 1) return `${m}m`;
  return 'moments';
}
