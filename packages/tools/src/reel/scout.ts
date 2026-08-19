#!/usr/bin/env tsx
/**
 * LOCATION SCOUTING.
 *
 * Before a shot is written, somebody has to stand in the place and
 * look at it. This walks a body to a list of world points at a given
 * hour and brings back a plate of each — the same lane, the same
 * dress, the same camera the reel will use, so what you judge is what
 * you will get.
 *
 *   npx tsx src/reel/scout.ts --tour "-64,20; -40,-10" --hour 18.6 --zoom 1.1
 *   npx tsx src/reel/scout.ts --at -64,20 --cmd "/spawnmob hobgoblin 3" --hud drama
 */
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { Lane } from './lane.js';

const argv = process.argv.slice(2);
const arg = (name: string, fallback = '') => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? (argv[i + 1] ?? fallback) : fallback;
};
const all = (name: string) =>
  argv.flatMap((a, i) => (a === `--${name}` ? [argv[i + 1] ?? ''] : []));

const OUT = arg('out', '/tmp/arx-scout');
const hour = arg('hour', '');
const zoom = Number.parseFloat(arg('zoom', '1.1'));
const hud = arg('hud', 'clean');
const cast = arg('cast', 'blade');
const settle = Number.parseInt(arg('settle', '2200'), 10);
const points = (arg('tour') || arg('at'))
  .split(';')
  .map((p) => p.trim())
  .filter(Boolean)
  .map((p) => {
    const [x, y] = p.split(',').map((n) => Number.parseFloat(n.trim()));
    return { x: x ?? 0, y: y ?? 0 };
  });

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true });
  const lane = new Lane({
    account: { user: `reel_${cast}`, pass: 'reel-room-1', name: 'Ash' },
  });
  await lane.open();
  try {
    await lane.enter();
    if (hour) await lane.cmd(`/time ${hour}`);
    for (const c of all('cmd')) await lane.cmd(c);
    await lane.page.evaluate(
      ([h, z]) => {
        const w = globalThis as any;
        w.__arx.renderer.chrome = h === 'play' ? 'all' : h === 'drama' ? 'drama' : 'none';
        w.__arx.renderer.camera.setZoom(z as number);
        const style = w.document.createElement('style');
        style.textContent = '#hud, #speech-layer, #ui-interact-prompt { display: none !important }';
        if (h !== 'play') w.document.head.appendChild(style);
      },
      [hud, zoom] as [string, number],
    );
    for (const [i, p] of points.entries()) {
      await lane.cmd(`/tp ${Math.round(p.x)} ${Math.round(p.y)}`, 400);
      await lane.page.waitForTimeout(settle);
      const name = `scout-${String(i).padStart(2, '0')}-${Math.round(p.x)}_${Math.round(p.y)}.png`;
      await lane.page.screenshot({ path: join(OUT, name) });
      console.log(`  ${name}`);
    }
  } finally {
    await lane.close();
  }
}

await main();
