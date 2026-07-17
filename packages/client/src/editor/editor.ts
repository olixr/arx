import {
  CHUNK_SIZE,
  Detail,
  TILE_DEFS,
  Tile,
  tileDef,
} from '@devcraft/shared';
import {
  buildBramblewick,
  zoneFromJson,
  zoneToJson,
  type ZoneDef,
  type ZoneJson,
} from '@devcraft/content';

/**
 * In-browser zone editor. Paints ground/detail tiles onto a ZoneDef and
 * exports the JSON the server loads from data/maps/*.json.
 */

const canvas = document.getElementById('editor-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const status = document.getElementById('status')!;

const DETAIL_LABELS: Record<Detail, string> = {
  [Detail.None]: 'none',
  [Detail.Flowers]: 'flowers',
  [Detail.Tuft]: 'tuft',
  [Detail.Pebbles]: 'pebbles',
  [Detail.Mushroom]: 'shroom',
};

let zone: ZoneDef = newZone();
let brushTile: Tile = Tile.Grass;
let brushDetail: Detail | null = null;
let scale = 8;
let panX = 0;
let panY = 0;

function newZone(): ZoneDef {
  return {
    id: 'myzone',
    name: 'My Zone',
    origin: { x: 0, y: 0 },
    width: 96,
    height: 96,
    ground: new Uint16Array(96 * 96).fill(Tile.Grass),
    detail: new Uint16Array(96 * 96),
    spawn: undefined,
  };
}

// ------------------------------------------------------------- palettes

function buildPalettes(): void {
  const tilePal = document.getElementById('tile-palette')!;
  tilePal.innerHTML = '';
  for (const [idStr, def] of Object.entries(TILE_DEFS)) {
    const id = Number(idStr) as Tile;
    const el = document.createElement('div');
    el.className = 'swatch' + (id === brushTile && brushDetail === null ? ' selected' : '');
    el.style.background = def.color;
    el.title = def.name;
    const label = document.createElement('span');
    label.className = 'label';
    label.textContent = def.name.slice(0, 6);
    el.appendChild(label);
    el.onclick = () => {
      brushTile = id;
      brushDetail = null;
      buildPalettes();
    };
    tilePal.appendChild(el);
  }

  const detailPal = document.getElementById('detail-palette')!;
  detailPal.innerHTML = '';
  for (const d of [Detail.None, Detail.Flowers, Detail.Tuft, Detail.Pebbles, Detail.Mushroom]) {
    const el = document.createElement('div');
    el.className = 'swatch' + (brushDetail === d ? ' selected' : '');
    el.style.background = d === Detail.None ? '#1a1626' : '#3f7d3a';
    el.title = DETAIL_LABELS[d];
    const label = document.createElement('span');
    label.className = 'label';
    label.textContent = DETAIL_LABELS[d];
    el.appendChild(label);
    el.onclick = () => {
      brushDetail = d;
      buildPalettes();
    };
    detailPal.appendChild(el);
  }
}

// ------------------------------------------------------------- render

function render(): void {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  const dpr = window.devicePixelRatio || 1;
  if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
    canvas.width = w * dpr;
    canvas.height = h * dpr;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#14101f';
  ctx.fillRect(0, 0, w, h);

  for (let y = 0; y < zone.height; y++) {
    for (let x = 0; x < zone.width; x++) {
      const g = zone.ground[y * zone.width + x]!;
      const def = tileDef(g);
      ctx.fillStyle = def.color;
      ctx.fillRect(panX + x * scale, panY + y * scale, scale, scale);
      if (def.raised && def.topColor) {
        ctx.fillStyle = def.topColor;
        ctx.fillRect(panX + x * scale, panY + y * scale, scale, scale * 0.35);
      }
      const d = zone.detail[y * zone.width + x]!;
      if (d !== Detail.None && scale >= 4) {
        ctx.fillStyle = d === Detail.Flowers ? '#e86a8a' : d === Detail.Mushroom ? '#d95763' : '#ddd';
        ctx.fillRect(panX + x * scale + scale * 0.35, panY + y * scale + scale * 0.35, scale * 0.3, scale * 0.3);
      }
    }
  }

  // Chunk grid.
  ctx.strokeStyle = 'rgba(232, 163, 61, 0.35)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= zone.width; x += CHUNK_SIZE) {
    ctx.beginPath();
    ctx.moveTo(panX + x * scale, panY);
    ctx.lineTo(panX + x * scale, panY + zone.height * scale);
    ctx.stroke();
  }
  for (let y = 0; y <= zone.height; y += CHUNK_SIZE) {
    ctx.beginPath();
    ctx.moveTo(panX, panY + y * scale);
    ctx.lineTo(panX + zone.width * scale, panY + y * scale);
    ctx.stroke();
  }

  // Spawn marker.
  if (zone.spawn) {
    const sx = panX + (zone.spawn.x - zone.origin.x) * scale;
    const sy = panY + (zone.spawn.y - zone.origin.y) * scale;
    ctx.fillStyle = '#f2c94c';
    ctx.beginPath();
    ctx.arc(sx, sy, Math.max(4, scale * 0.6), 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1a1626';
    ctx.stroke();
  }

  requestAnimationFrame(render);
}

// ------------------------------------------------------------- painting

function tileAt(clientX: number, clientY: number): { x: number; y: number } | null {
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((clientX - rect.left - panX) / scale);
  const y = Math.floor((clientY - rect.top - panY) / scale);
  if (x < 0 || y < 0 || x >= zone.width || y >= zone.height) return null;
  return { x, y };
}

function paint(clientX: number, clientY: number, erase: boolean): void {
  const t = tileAt(clientX, clientY);
  if (!t) return;
  const i = t.y * zone.width + t.x;
  if (brushDetail !== null) {
    zone.detail[i] = erase ? Detail.None : brushDetail;
  } else {
    zone.ground[i] = erase ? Tile.Grass : brushTile;
  }
}

let painting = false;
let erasing = false;
let panning = false;
let lastPan = { x: 0, y: 0 };

canvas.addEventListener('contextmenu', (e) => e.preventDefault());
canvas.addEventListener('mousedown', (e) => {
  if (e.button === 1) {
    panning = true;
    lastPan = { x: e.clientX, y: e.clientY };
    return;
  }
  if (e.shiftKey && e.button === 0) {
    const t = tileAt(e.clientX, e.clientY);
    if (t) zone.spawn = { x: zone.origin.x + t.x + 0.5, y: zone.origin.y + t.y + 0.5 };
    return;
  }
  painting = true;
  erasing = e.button === 2;
  paint(e.clientX, e.clientY, erasing);
});
window.addEventListener('mousemove', (e) => {
  if (panning) {
    panX += e.clientX - lastPan.x;
    panY += e.clientY - lastPan.y;
    lastPan = { x: e.clientX, y: e.clientY };
  } else if (painting) {
    paint(e.clientX, e.clientY, erasing);
  }
});
window.addEventListener('mouseup', () => {
  painting = false;
  panning = false;
});
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const next = Math.min(24, Math.max(2, scale * (e.deltaY < 0 ? 1.2 : 1 / 1.2)));
  // Zoom around the cursor.
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  panX = mx - ((mx - panX) / scale) * next;
  panY = my - ((my - panY) / scale) * next;
  scale = next;
});
window.addEventListener('keydown', (e) => {
  const step = 64;
  if (e.code === 'ArrowLeft') panX += step;
  if (e.code === 'ArrowRight') panX -= step;
  if (e.code === 'ArrowUp') panY += step;
  if (e.code === 'ArrowDown') panY -= step;
});

// ------------------------------------------------------------- io

function syncMetaInputs(): void {
  (document.getElementById('zone-id') as HTMLInputElement).value = zone.id;
  (document.getElementById('zone-name') as HTMLInputElement).value = zone.name;
  (document.getElementById('zone-ox') as HTMLInputElement).value = String(zone.origin.x);
  (document.getElementById('zone-oy') as HTMLInputElement).value = String(zone.origin.y);
}

function readMetaInputs(): void {
  zone.id = (document.getElementById('zone-id') as HTMLInputElement).value.trim() || 'myzone';
  zone.name = (document.getElementById('zone-name') as HTMLInputElement).value.trim() || zone.id;
  zone.origin.x = Number((document.getElementById('zone-ox') as HTMLInputElement).value) || 0;
  zone.origin.y = Number((document.getElementById('zone-oy') as HTMLInputElement).value) || 0;
}

document.getElementById('btn-new')!.addEventListener('click', () => {
  zone = newZone();
  syncMetaInputs();
  status.textContent = 'new 96x96 zone';
});

document.getElementById('btn-load-town')!.addEventListener('click', () => {
  zone = buildBramblewick();
  syncMetaInputs();
  status.textContent = 'loaded Bramblewick from content';
});

document.getElementById('btn-save')!.addEventListener('click', () => {
  readMetaInputs();
  const json = JSON.stringify(zoneToJson(zone), null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${zone.id}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  status.textContent = `saved ${zone.id}.json — drop it in data/maps/ on the server`;
});

const fileInput = document.getElementById('file-load') as HTMLInputElement;
document.getElementById('btn-load')!.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', async () => {
  const file = fileInput.files?.[0];
  if (!file) return;
  try {
    zone = zoneFromJson(JSON.parse(await file.text()) as ZoneJson);
    syncMetaInputs();
    status.textContent = `loaded ${zone.id} (${zone.width}x${zone.height})`;
  } catch (err) {
    status.textContent = `load failed: ${(err as Error).message}`;
  }
});

buildPalettes();
syncMetaInputs();
requestAnimationFrame(render);
