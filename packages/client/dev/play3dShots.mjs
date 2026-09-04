/**
 * PLAY3D — THE SECOND DOOR's screenshot proof (S1).
 *
 * Loads /play3d.html on the :5243 rig headless, waits for the ground
 * ring to bake, then captures the standing battery at fixed camera
 * poses through the page's probe (window.__play3d). Every shot is the
 * LOOK gate for a commit; frame-ms numbers printed here are headless
 * INDICATIONS ONLY, never an fps claim.
 *
 *   cd packages/client && node_modules/.bin/vite --config vite.config.play3d.ts
 *   node dev/play3dShots.mjs            # writes dev/play3d-shots/*.png
 *
 * ENV: ORIGIN (default http://localhost:5243), TAG (filename prefix).
 */
import { chromium } from '/Users/aeriek/.npm/_npx/705bc6b22212b352/node_modules/playwright/index.mjs';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, 'play3d-shots');
const ORIGIN = process.env.ORIGIN ?? 'http://localhost:5243';
const TAG = process.env.TAG ?? 's1';
const VIEW = { width: 1440, height: 900, dpr: 1 };

const SHOTS = [
  // yaw, pitch, dist, name — the three required angles + night.
  { name: 'low-across', yaw: 0.35, pitch: 0.42, dist: 22, day: 1 },
  { name: 'top-down', yaw: 0.0, pitch: 1.25, dist: 26, day: 1 },
  { name: 'close-body', yaw: 0.6, pitch: 0.6, dist: 6, day: 1 },
  { name: 'night-across', yaw: -0.8, pitch: 0.5, dist: 18, day: 0.08 },
  // Worldgen plateau country north-east of Dawnmead: real cliff faces.
  { name: 'cliffs', yaw: 0.5, pitch: 0.5, dist: 26, day: 1, tp: [48, -78] },
  { name: 'cliffs-low', yaw: -2.2, pitch: 0.36, dist: 18, day: 1, tp: [48, -78] },
];

mkdirSync(OUT, { recursive: true });
// The installed Google Chrome (channel) — the headless shell is not
// downloaded on this rig; Chrome headless runs WebGL2 on ANGLE Metal.
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: VIEW.width, height: VIEW.height }, deviceScaleFactor: VIEW.dpr });
const errors = [];
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`);
});
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));

await page.goto(`${ORIGIN}/play3d.html`, { waitUntil: 'load' });
await page.waitForFunction(() => Boolean(window.__play3d), null, { timeout: 30000 });

// Settle the streamer: step bakes until every ring chunk is painted.
const settled = await page.evaluate(async () => {
  const p = window.__play3d;
  for (let i = 0; i < 400; i++) {
    if (p.settle()) return i;
    await new Promise((r) => requestAnimationFrame(r));
  }
  return -1;
});
console.log(`settled after ${settled} steps`);
// Let the walkers take a few steps so the rigs are mid-gait.
await page.waitForTimeout(1500);

for (const s of SHOTS) {
  await page.evaluate((s) => {
    const p = window.__play3d;
    if (s.tp) p.tp(s.tp[0], s.tp[1]);
    p.day(s.day);
    p.setCamera(s.yaw, s.pitch, s.dist);
  }, s);
  if (s.tp) {
    const n = await page.evaluate(async () => {
      const p = window.__play3d;
      for (let i = 0; i < 400; i++) {
        if (p.settle()) return i;
        await new Promise((r) => requestAnimationFrame(r));
      }
      return -1;
    });
    console.log(`  re-settled after ${n} steps`);
  }
  await page.waitForTimeout(400);
  const stats = await page.evaluate(() => window.__play3d.stats());
  const file = resolve(OUT, `${TAG}-${s.name}.png`);
  await page.screenshot({ path: file });
  console.log(`${s.name}: ${file}`);
  console.log(
    `  draws ${stats.info.calls} tris ${stats.info.triangles} tex ${stats.info.textures} geo ${stats.info.geometries} programs ${stats.info.programs} ` +
      `chunks ${stats.ground.painted}/${stats.ground.chunks} faces ${stats.ground.faces} statics ${stats.ground.statics}/${stats.ground.staticDraws}draws ` +
      `atlas ${stats.atlas.sprites}sprites/${stats.atlas.pages}pages frameMs(headless) ${stats.frameMs.toFixed(1)}`,
  );
}
const walkers = await page.evaluate(() => window.__play3d.walkers());
console.log('walkers', JSON.stringify(walkers));
if (errors.length) {
  console.log('CONSOLE:');
  for (const e of errors.slice(0, 20)) console.log('  ' + e);
} else console.log('console clean');
await browser.close();
