/**
 * THE KIT GALLERY — `?kit` (dev-only, The Grand Refit, Phase 2).
 *
 * One room showing every piece of the kit in both glyph languages:
 * the palette and ladders, the painted vocabulary, the new Phase 2
 * components, and the ambient layer — the receipt that the kit is
 * whole before the rooms are rebuilt from it in Phases 4–6.
 */

import { dressPanel, bigButton, sectionHead, meter, needChip, levelBadge } from '../ui/panel.js';
import { PALETTE, TYPE, SPACE, RADIUS } from '../ui/kit/tokens.js';
import { ringGauge } from '../ui/kit/ring.js';
import { seatChip, glyphChip, glyphLine } from '../ui/kit/glyphs.js';
import { plate, socket, emptyState, inspector } from '../ui/kit/plates.js';
import { createLedger } from '../ui/kit/ledger.js';
import { tabRail } from '../ui/kit/tabs.js';
import { openSheet } from '../ui/kit/contextSheet.js';
import { attachAmbient } from '../ui/kit/ambient.js';
import { itemIconUrl, uiIconUrl } from '../render/icons.js';

function row(label: string, ...nodes: (HTMLElement | string)[]): HTMLElement {
  const r = document.createElement('div');
  r.className = 'kg-row';
  const lab = document.createElement('span');
  lab.className = 'kg-label';
  lab.textContent = label;
  r.appendChild(lab);
  const well = document.createElement('span');
  well.className = 'kg-well';
  for (const n of nodes) {
    if (typeof n === 'string') {
      const s = document.createElement('span');
      s.textContent = n;
      well.appendChild(s);
    } else well.appendChild(n);
  }
  r.appendChild(well);
  return r;
}

export function showKitGallery(): void {
  const panel = document.createElement('div');
  panel.className = 'ui-screen screen-kit';
  panel.id = 'kit-gallery';
  const h3 = document.createElement('h3');
  h3.textContent = 'The Kit';
  panel.appendChild(h3);
  document.body.appendChild(panel);
  dressPanel(panel, {
    icon: uiIconUrl('hammer', 40),
    hint: 'Every piece of the refit, on one bench.',
    onClose: () => panel.remove(),
  });

  const body = document.createElement('div');
  body.className = 'kg-body';
  panel.appendChild(body);

  /* ---- the palette ---- */
  body.appendChild(sectionHead('The palette'));
  const swatches = document.createElement('div');
  swatches.className = 'kg-swatches';
  for (const [name, value] of Object.entries(PALETTE)) {
    const chip = document.createElement('div');
    chip.className = 'kg-swatch';
    const well = document.createElement('span');
    well.style.background = value;
    const lab = document.createElement('span');
    lab.textContent = name;
    chip.append(well, lab);
    swatches.appendChild(chip);
  }
  body.appendChild(swatches);

  /* ---- the ladders ---- */
  body.appendChild(sectionHead('The ladders'));
  for (const [name, size] of Object.entries(TYPE)) {
    const sample = document.createElement('span');
    sample.style.fontSize = `var(--${name})`;
    sample.textContent = 'The lamp stays lit';
    body.appendChild(row(`${name} (${size})`, sample));
  }
  const spaceRow = document.createElement('span');
  spaceRow.className = 'kg-space';
  for (const name of Object.keys(SPACE)) {
    const bar = document.createElement('span');
    bar.style.width = `var(--${name})`;
    spaceRow.appendChild(bar);
  }
  body.appendChild(row(`space (${Object.keys(SPACE).length} steps)`, spaceRow));
  const radiusRow = document.createElement('span');
  radiusRow.className = 'kg-space';
  for (const name of Object.keys(RADIUS)) {
    const box = document.createElement('span');
    box.className = 'kg-radius';
    box.style.borderRadius = `var(--${name})`;
    radiusRow.appendChild(box);
  }
  body.appendChild(row('radius ladder', radiusRow));

  /* ---- glyphs, both languages side by side ---- */
  body.appendChild(sectionHead('The glyph language'));
  body.appendChild(
    row(
      'faces',
      glyphChip('pad', 'a', 'A'),
      glyphChip('pad', 'b', 'B'),
      glyphChip('pad', 'x', 'X'),
      glyphChip('pad', 'y', 'Y'),
    ),
  );
  body.appendChild(
    row(
      'shoulders',
      glyphChip('pad', 'lb', 'LB'),
      glyphChip('pad', 'rb', 'RB'),
      glyphChip('pad', 'lt', 'LT'),
      glyphChip('pad', 'rt', 'RT'),
    ),
  );
  body.appendChild(
    row(
      'keys + dual chips',
      glyphChip('kb', '', 'Q'),
      glyphChip('kb', '', 'E', true),
      seatChip('ability1'),
      seatChip('ability3'),
    ),
  );
  body.appendChild(
    row('a sentence with chips', glyphLine('Seat on • or •', seatChip('ability1'), seatChip('ability3'))),
  );

  /* ---- gauges ---- */
  body.appendChild(sectionHead('Gauges'));
  const m = meter(0.65);
  m.root.style.width = '16rem';
  const rings = document.createElement('span');
  rings.className = 'kg-well';
  for (const [frac, tone, label] of [
    [0.25, undefined, '12'],
    [0.62, PALETTE['arcane'], '38'],
    [1, undefined, '99'],
  ] as const) {
    const rg = ringGauge(frac, { tone, size: '3.5rem' });
    rg.center.textContent = label;
    rings.appendChild(rg.root);
  }
  body.appendChild(row('meter + rings', m.root, rings));

  /* ---- chips and seals ---- */
  body.appendChild(sectionHead('Chips and seals'));
  body.appendChild(
    row(
      'requirement + level',
      needChip(itemIconUrl('coins', 20), 12, 8, 'coins'),
      needChip(itemIconUrl('coins', 20), 3, 8, 'coins'),
      levelBadge(30, 'smithing', true),
      levelBadge(52, 'enchanting', false),
    ),
  );

  /* ---- sockets ---- */
  body.appendChild(sectionHead('Sockets'));
  const empty = socket({ action: 'ability1', label: 'First art' });
  const filled = socket({ action: 'ability3', label: 'Second art' });
  filled.fill(itemIconUrl('coins', 48), 'coins');
  const flashBtn = bigButton('Land it', 'kg:flash', () => filled.flash(), { minor: true });
  body.appendChild(row('empty / seated / landing', empty.root, filled.root, flashBtn));

  /* ---- tabs ---- */
  body.appendChild(sectionHead('The tab rail'));
  const rail = tabRail(
    [
      { id: 'arts', label: 'Arts' },
      { id: 'callings', label: 'Callings' },
      { id: 'secrets', label: 'Secrets' },
    ],
    () => {},
    'kgtab',
  );
  rail.setPip('secrets', true);
  body.appendChild(row('wings', rail.root));

  /* ---- plates + ledger ---- */
  body.appendChild(sectionHead('Plates and the ledger'));
  const ledgerWrap = document.createElement('div');
  ledgerWrap.className = 'kg-ledger';
  const ledger = createLedger<number>({
    seedRows: 3,
    emptyLine: 'Nothing here yet.',
    renderRow: (n) =>
      plate({
        icon: itemIconUrl('coins', 40),
        name: `Ledger entry ${n}`,
        sub: 'A cut plate, dealt onto a leaf',
        navkey: `kg:plate:${n}`,
      }),
  });
  ledger.setItems([1, 2, 3, 4, 5, 6, 7]);
  ledgerWrap.appendChild(ledger.root);
  body.appendChild(ledgerWrap);

  /* ---- the inspector ---- */
  body.appendChild(sectionHead('The inspector'));
  const insp = inspector();
  insp.set({
    icon: itemIconUrl('coins', 48),
    kicker: 'Kit piece',
    name: 'The Inspector',
    stats: [
      { label: 'anatomy', value: 'fixed' },
      { label: 'travel', value: 'none' },
      { label: 'renders', value: 'on focus' },
    ],
    story: 'The detail card with a fixed anatomy. It renders where it stands, so reading never costs the hand a journey.',
    actions: [bigButton('A verb lives here', 'kg:verb', () => {})],
  });
  body.appendChild(insp.root);

  /* ---- the context sheet ---- */
  body.appendChild(sectionHead('The context sheet'));
  const sheetBtn = bigButton('Open the sheet', 'kg:sheet', () => {
    openSheet(sheetBtn, [
      { label: 'Inspect', act: () => {} },
      { label: 'Seat on the first art', act: () => {} },
      { label: 'Seat on the second art', act: () => {} },
      { label: 'Drop', act: () => {}, danger: true },
    ]);
  });
  body.appendChild(row('any focusable can offer verbs', sheetBtn));

  /* ---- empty state ---- */
  body.appendChild(sectionHead('The empty state'));
  body.appendChild(emptyState('Your pack is light. The road will fill it.', itemIconUrl('coins', 48)));

  attachAmbient(panel);
}
