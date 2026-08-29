// THE ICON SHEET (checked-in tooling): the pack-icon audit surface.
// Every item icon rendered at the three judging sizes — 96 (the hero
// read), 48 (the pack slot), 26 (the belt/ledger small) — because a
// painter is only done when the SMALL reads. The 26px swatch repeats
// on a light ground: an icon that only reads on the dark slot is
// leaning on the slot.
// Levers:
//   ?ids=a,b,c   audit exactly these ids
//   ?match=pelt  audit ids containing a substring
//   (no lever)   the whole ITEM_ICON roster, grouped by painter glyph
import { itemDef } from '@arx/content';
import { allIconItemIds, itemIconUrl } from '../render/icons.js';

const root = document.getElementById('lab')!;
const q = new URLSearchParams(location.search);

let ids: string[];
const only = q.get('ids');
const match = q.get('match');
if (only) ids = only.split(',').map((s) => s.trim()).filter(Boolean);
else if (match) ids = allIconItemIds().filter((id) => id.includes(match));
else ids = allIconItemIds();

const section = (title: string): HTMLElement => {
  const h = document.createElement('h2');
  h.textContent = title;
  root.appendChild(h);
  const g = document.createElement('div');
  g.className = 'grid';
  root.appendChild(g);
  return g;
};

const cell = (grid: HTMLElement, id: string): void => {
  const div = document.createElement('div');
  div.className = 'cell';
  const name = itemDef(id)?.name ?? '';
  div.innerHTML = `<div class="name" title="${id}">${id}${name ? ` — ${name}` : ''}</div>`;
  const sizes = document.createElement('div');
  sizes.className = 'sizes';
  for (const s of q.get('big') ? [192, 96, 48, 26] : [96, 48, 26]) {
    const sw = document.createElement('div');
    sw.className = 'sw';
    const img = document.createElement('img');
    img.width = s;
    img.height = s;
    img.src = itemIconUrl(id, s);
    sw.appendChild(img);
    sizes.appendChild(sw);
  }
  // The light-ground small: the honesty check.
  const sw = document.createElement('div');
  sw.className = 'sw lite';
  const img = document.createElement('img');
  img.width = 26;
  img.height = 26;
  img.src = itemIconUrl(id, 26);
  sw.appendChild(img);
  sizes.appendChild(sw);
  div.appendChild(sizes);
  grid.appendChild(div);
};

const grid = section(`${ids.length} icons — 96 / 48 / 26 / 26-light`);
for (const id of ids) cell(grid, id);
