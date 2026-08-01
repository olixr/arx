/**
 * THE TAB RAIL — one look for wings and sections everywhere
 * (The Grand Refit, Phase 2; trigger paging arrives with Phase 3).
 *
 * Iron keys in a row; the standing tab is pressed brass with the
 * screen's accent under it. A tab may wear a pip when something
 * unseen waits behind it. `data-pager` marks the rail as the room's
 * primary pager so LT/RT can step it.
 */

export interface TabDef {
  id: string;
  label: string;
}

export interface TabRail {
  root: HTMLElement;
  setActive(id: string): void;
  setPip(id: string, on: boolean): void;
  /** Step to the neighbor tab — the trigger verbs. */
  step(dir: -1 | 1): void;
}

export function tabRail(tabs: TabDef[], onPick: (id: string) => void, navPrefix = 'tab'): TabRail {
  const root = document.createElement('div');
  root.className = 'tab-rail';
  root.dataset.pager = '';

  let active = tabs[0]?.id ?? '';
  const chips = new Map<string, HTMLButtonElement>();

  const paint = (): void => {
    for (const [id, chip] of chips) chip.classList.toggle('active', id === active);
  };

  for (const tab of tabs) {
    const chip = document.createElement('button');
    chip.className = 'tab-chip';
    chip.textContent = tab.label;
    chip.dataset.nav = '';
    chip.dataset.navkey = `${navPrefix}:${tab.id}`;
    chip.dataset.acta = 'Open';
    chip.addEventListener('click', () => {
      active = tab.id;
      paint();
      onPick(tab.id);
    });
    chips.set(tab.id, chip);
    root.appendChild(chip);
  }
  paint();

  return {
    root,
    setActive(id): void {
      active = id;
      paint();
    },
    setPip(id, on): void {
      chips.get(id)?.classList.toggle('has-pip', on);
    },
    step(dir): void {
      const ids = tabs.map((t) => t.id);
      const i = ids.indexOf(active);
      const next = ids[Math.max(0, Math.min(ids.length - 1, i + dir))];
      if (next && next !== active) chips.get(next)?.click();
    },
  };
}
