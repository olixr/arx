/**
 * THE LEDGER — the paged collection (The Grand Refit, Phase 2).
 *
 * NOTHING LIVES BELOW THE FOLD: a ledger never hides rows behind a
 * scrollbar. It measures how many rows fit the space it was given,
 * deals the collection into LEAVES of that many, and turns leaves
 * whole — page dots underneath, prev/next keys beside them, triggers
 * stepping them on the pad (wired in Phase 3 via `data-pager`).
 *
 * The rows themselves are the caller's to render (bespoke rooms);
 * the leaf-turn, the dots, and the "everything visible" guarantee
 * are the kit's.
 */

export interface Ledger<T> {
  root: HTMLElement;
  /** Replace the collection; keeps the current leaf when possible. */
  setItems(items: T[]): void;
  /** Turn a leaf: -1 back, +1 forward. Wraps nothing — edges hold. */
  page(dir: -1 | 1): void;
  /** Re-measure and re-deal (call after a resize or reflow). */
  refit(): void;
}

export function createLedger<T>(opts: {
  renderRow: (item: T, index: number) => HTMLElement;
  /** Fallback rows per leaf before the first honest measure. */
  seedRows?: number;
  /** One quiet line for the empty case (quartermaster voice). */
  emptyLine?: string;
}): Ledger<T> {
  const root = document.createElement('div');
  root.className = 'kit-ledger';
  root.dataset.pager = '';

  const leaf = document.createElement('div');
  leaf.className = 'ledger-leaf';
  const foot = document.createElement('div');
  foot.className = 'ledger-foot';
  const prev = document.createElement('button');
  prev.className = 'ledger-turn';
  prev.textContent = '‹';
  prev.dataset.nav = '';
  prev.dataset.navkey = 'ledger:prev';
  prev.dataset.acta = 'Back a leaf';
  const dots = document.createElement('div');
  dots.className = 'ledger-dots';
  const next = document.createElement('button');
  next.className = 'ledger-turn';
  next.textContent = '›';
  next.dataset.nav = '';
  next.dataset.navkey = 'ledger:next';
  next.dataset.acta = 'On a leaf';
  foot.append(prev, dots, next);
  root.append(leaf, foot);

  let items: T[] = [];
  let at = 0;
  let per = Math.max(1, opts.seedRows ?? 8);

  const leaves = (): number => Math.max(1, Math.ceil(items.length / per));

  const renderDots = (): void => {
    dots.innerHTML = '';
    const n = leaves();
    foot.classList.toggle('hidden', n <= 1);
    for (let i = 0; i < n; i++) {
      const dot = document.createElement('span');
      dot.className = i === at ? 'ledger-dot on' : 'ledger-dot';
      dots.appendChild(dot);
    }
  };

  const deal = (): void => {
    leaf.innerHTML = '';
    if (items.length === 0) {
      if (opts.emptyLine) {
        const empty = document.createElement('div');
        empty.className = 'kit-empty';
        empty.textContent = opts.emptyLine;
        leaf.appendChild(empty);
      }
      renderDots();
      return;
    }
    at = Math.min(at, leaves() - 1);
    const start = at * per;
    items.slice(start, start + per).forEach((item, i) => {
      leaf.appendChild(opts.renderRow(item, start + i));
    });
    renderDots();
  };

  const refit = (): void => {
    /* Measure one dealt row against the leaf's height. */
    const row = leaf.firstElementChild as HTMLElement | null;
    if (!row || leaf.clientHeight === 0) return;
    const rowH = row.getBoundingClientRect().height;
    if (rowH <= 0) return;
    const gap = parseFloat(getComputedStyle(leaf).rowGap) || 0;
    const fit = Math.max(1, Math.floor((leaf.clientHeight + gap) / (rowH + gap)));
    if (fit !== per) {
      per = fit;
      deal();
    }
  };

  prev.addEventListener('click', () => {
    if (at > 0) {
      at--;
      deal();
    }
  });
  next.addEventListener('click', () => {
    if (at < leaves() - 1) {
      at++;
      deal();
    }
  });

  /* The leaf re-measures itself whenever its box changes — including
     the first honest layout after mounting, so a ledger dealt while
     detached still lands on the true row count. */
  new ResizeObserver(() => refit()).observe(leaf);

  return {
    root,
    setItems(next_: T[]): void {
      items = next_;
      deal();
      refit();
    },
    page(dir): void {
      (dir === -1 ? prev : next).click();
    },
    refit,
  };
}
