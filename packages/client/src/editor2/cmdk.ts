/**
 * ⌘K — THE COMMAND LENS. One field over every verb the studio knows:
 * tools, layers, file ops, view toggles, lenses, and dynamic entries
 * (zones by name) from providers. Recents float; every row teaches its
 * shortcut. The registry is the only source — a command reachable
 * anywhere in the chrome is reachable here by construction.
 */

import { iconImg } from '../editor/editorIcons.js';
import { el, kbd } from '../studio2/kit.js';
import type { Command, StudioMode } from './commands.js';

const RECENT_KEY = 'dc2-cmdk-recent';
const RECENT_MAX = 6;

interface Scored {
  cmd: Command;
  score: number;
}

/** Prefix > word-start > substring > subsequence. 0 = no match. */
function matchScore(hay: string, q: string): number {
  const h = hay.toLowerCase();
  if (q === '') return 1;
  if (h.startsWith(q)) return 100 - h.length * 0.1;
  const wordStart = h.split(/[\s:·—-]+/).some((w) => w.startsWith(q));
  if (wordStart) return 80 - h.length * 0.1;
  const sub = h.indexOf(q);
  if (sub >= 0) return 60 - sub * 0.5;
  // Subsequence.
  let qi = 0;
  for (let i = 0; i < h.length && qi < q.length; i++) {
    if (h[i] === q[qi]) qi++;
  }
  return qi === q.length ? 30 - h.length * 0.1 : 0;
}

export class CommandPalette {
  private readonly host: HTMLElement;
  private readonly input: HTMLInputElement;
  private readonly list: HTMLElement;
  private rows: Array<{ el: HTMLElement; cmd: Command }> = [];
  private sel = 0;

  constructor(
    private readonly getCommands: () => Command[],
    private readonly getMode: () => StudioMode,
    private readonly providers: Array<() => Command[]> = [],
  ) {
    this.host = el('div');
    this.host.id = 'cmdk';
    const panel = el('div', 'cmdk-panel');
    const inputRow = el('div', 'cmdk-input');
    inputRow.appendChild(iconImg('lens', 18));
    this.input = el('input');
    this.input.type = 'text';
    this.input.placeholder = 'Search commands, tools, zones…';
    this.input.setAttribute('aria-label', 'Command search');
    inputRow.appendChild(this.input);
    inputRow.appendChild(kbd('esc'));
    panel.appendChild(inputRow);
    this.list = el('div', 'cmdk-list');
    this.list.setAttribute('role', 'listbox');
    panel.appendChild(this.list);
    const foot = el('div', 'cmdk-foot');
    const hint = (keys: string, label: string): HTMLElement => {
      const s = el('span');
      s.appendChild(kbd(keys));
      s.append(` ${label}`);
      return s;
    };
    foot.append(hint('↑↓', 'choose'), hint('↵', 'run'), hint('esc', 'close'));
    panel.appendChild(foot);
    this.host.appendChild(panel);
    document.body.appendChild(this.host);

    this.host.addEventListener('mousedown', (e) => {
      if (e.target === this.host) this.close();
    });
    this.input.addEventListener('input', () => this.rebuild());
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.move(1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.move(-1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        this.runSelected();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this.close();
      }
      e.stopPropagation();
    });
  }

  get isOpen(): boolean {
    return this.host.classList.contains('open');
  }

  open(): void {
    this.host.classList.add('open');
    this.input.value = '';
    this.rebuild();
    this.input.focus();
  }

  close(): void {
    this.host.classList.remove('open');
    this.input.blur();
  }

  toggle(): void {
    if (this.isOpen) this.close();
    else this.open();
  }

  private recents(): string[] {
    try {
      return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') as string[];
    } catch {
      return [];
    }
  }

  private noteRecent(id: string): void {
    const list = [id, ...this.recents().filter((x) => x !== id)].slice(0, RECENT_MAX);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  }

  private allCommands(): Command[] {
    const mode = this.getMode();
    const base = this.getCommands().filter((c) => !c.mode || c.mode === mode);
    const dyn = this.providers.flatMap((p) => {
      try {
        return p();
      } catch {
        return [];
      }
    });
    return [...base, ...dyn.filter((c) => !c.mode || c.mode === mode)];
  }

  private rebuild(): void {
    const q = this.input.value.trim().toLowerCase();
    const all = this.allCommands();
    this.list.innerHTML = '';
    this.rows = [];
    this.sel = 0;

    let shown: Array<{ group: string; items: Command[] }>;
    if (q === '') {
      // Empty query: recents first, then the registry in group order.
      const byId = new Map(all.map((c) => [c.id, c]));
      const recent = this.recents()
        .map((id) => byId.get(id))
        .filter((c): c is Command => c !== undefined);
      const groups = new Map<string, Command[]>();
      for (const c of all) {
        if (!groups.has(c.group)) groups.set(c.group, []);
        groups.get(c.group)!.push(c);
      }
      shown = [
        ...(recent.length > 0 ? [{ group: 'Recent', items: recent }] : []),
        ...[...groups.entries()].map(([group, items]) => ({ group, items })),
      ];
    } else {
      const scored: Scored[] = [];
      for (const cmd of all) {
        const score = Math.max(matchScore(cmd.title, q), matchScore(cmd.group, q) * 0.5);
        if (score > 0) scored.push({ cmd, score });
      }
      scored.sort((a, b) => b.score - a.score);
      shown = scored.length > 0 ? [{ group: 'Results', items: scored.map((s) => s.cmd).slice(0, 24) }] : [];
    }

    if (shown.length === 0) {
      this.list.appendChild(el('div', 'cmdk-empty', 'Nothing matches — try a tool, a verb, or a zone name.'));
      return;
    }

    for (const { group, items } of shown) {
      this.list.appendChild(el('div', 'cmdk-group', group));
      for (const cmd of items) {
        const row = el('button', 'cmdk-row');
        row.setAttribute('role', 'option');
        if (cmd.icon) row.appendChild(iconImg(cmd.icon, 17));
        row.appendChild(el('span', 't', cmd.title));
        row.appendChild(el('span', 'g', cmd.group));
        if (cmd.keyLabel) row.appendChild(kbd(cmd.keyLabel));
        row.onclick = () => this.run(cmd);
        row.onmousemove = () => {
          const i = this.rows.findIndex((r) => r.el === row);
          if (i >= 0 && i !== this.sel) {
            this.sel = i;
            this.paintSel();
          }
        };
        this.list.appendChild(row);
        this.rows.push({ el: row, cmd });
      }
    }
    this.paintSel();
  }

  private paintSel(): void {
    this.rows.forEach((r, i) => r.el.classList.toggle('sel', i === this.sel));
    this.rows[this.sel]?.el.scrollIntoView({ block: 'nearest' });
  }

  private move(dir: number): void {
    if (this.rows.length === 0) return;
    this.sel = (this.sel + dir + this.rows.length) % this.rows.length;
    this.paintSel();
  }

  private runSelected(): void {
    const row = this.rows[this.sel];
    if (row) this.run(row.cmd);
  }

  private run(cmd: Command): void {
    this.noteRecent(cmd.id);
    this.close();
    cmd.run();
  }
}
