/**
 * PLAY3D — THE LIVING WORLD's screenshot proof (S2).
 *
 * Loads /play3d.html on the :5243 rig headless, signs in as the probe
 * account against the shared rig-36 backend (:8814 through the vite
 * proxy), teleports through chat (THE VERIFIED TELEPORT: the rate
 * limiter eats commands, so every /tp is re-sent until the predictor
 * lands), settles the ground ring, walks a few tiles by CLICK through
 * the page's own click law, and captures the live world + HUD. Every
 * shot is the LOOK gate for a commit; frame-ms numbers printed here
 * are headless INDICATIONS ONLY, never an fps claim.
 *
 *   cd packages/client && ../../node_modules/.bin/vite --config vite.config.play3d.ts
 *   node dev/play3dLive.mjs          # writes dev/play3d-shots/s2-*.png
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
const TAG = process.env.TAG ?? 's2';
const VIEW = { width: 1440, height: 900, dpr: 1 };

const SCENES = [
  // Dawnmead's interiors scene: walls, doors, the townsfolk on their rounds.
  { name: 'interiors', tp: [-430, -290], yaw: 0.45, pitch: 0.55, dist: 18, walk: [0.42, 0.7] },
  { name: 'interiors-low', tp: null, yaw: -0.9, pitch: 0.36, dist: 12, walk: null },
  // The meadow east of the village: the open ground, beasts and grass.
  { name: 'meadow', tp: [42, 20], yaw: 0.3, pitch: 0.5, dist: 20, walk: [0.4, 0.55] },
  { name: 'meadow-close', tp: null, yaw: 0.9, pitch: 0.62, dist: 7, walk: null },
  { name: 'meadow-night', tp: null, yaw: -0.6, pitch: 0.5, dist: 18, walk: null, day: 0.08 },
  // THE CROSSING: /museum is a plane toggle — the world source rebuilds
  // under the body (ground ring dropped + refilled from the new store).
  { name: 'museum-plane', tp: null, plane: '/museum', yaw: 0.35, pitch: 0.5, dist: 20, walk: null },
];

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: VIEW.width, height: VIEW.height }, deviceScaleFactor: VIEW.dpr });
const errors = [];
page.on('console', (m) => {
  // The favicon 404 is index.html's too (no icon is shipped) — not a finding.
  if (m.type() === 'error' && m.location()?.url?.endsWith('/favicon.ico')) return;
  if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text().slice(0, 300)}`);
});
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message.slice(0, 300)}`));
page.on('response', (r) => {
  if (r.status() >= 400 && !r.url().endsWith('/favicon.ico')) errors.push(`http ${r.status()}: ${r.url()}`);
});

await page.goto(`${ORIGIN}/play3d.html`, { waitUntil: 'load' });
await page.waitForFunction(() => Boolean(window.__play3d) && Boolean(window.dcGame), null, { timeout: 30000 });
// Sign in (the stored token is never trusted in a fresh headless profile).
await page.waitForSelector('#login-user', { state: 'visible', timeout: 30000 });
await page.fill('#login-user', 'perf12_probe');
await page.fill('#login-pass', 'probe-owl-9127');
await page.click('#login-submit');
await page.waitForFunction(() => window.dcGame.connStatus === 'ingame' && window.dcGame.ownEid !== null, null, { timeout: 30000 });
await page.waitForTimeout(1500);
// THE PLANE CHECK: /museum is a toggle and the probe keeps its plane.
if (await page.evaluate(() => window.dcGame.plane?.id === 'museum')) {
  await page.evaluate(() => window.dcGame.sendChat('/museum'));
  await page.waitForTimeout(2500);
}
await page.evaluate(() => window.dcGame.sendChat('/time 12'));

const settle = async () =>
  page.evaluate(async () => {
    const p = window.__play3d;
    for (let i = 0; i < 600; i++) {
      if (p.settle()) return i;
      await new Promise((r) => requestAnimationFrame(r));
    }
    return -1;
  });

const tpTo = async ([tx, ty]) => {
  for (let a = 0; a < 6; a++) {
    await page.evaluate((t) => window.dcGame.sendChat(`/tp ${t[0]} ${t[1]}`), [tx, ty]);
    try {
      await page.waitForFunction(
        ([x, y]) => {
          const p = window.dcGame.predictor.pos;
          return Math.abs(p.x - x) < 4 && Math.abs(p.y - y) < 4;
        },
        [tx, ty],
        { timeout: 2500 },
      );
      return a;
    } catch {
      /* eaten — retry */
    }
  }
  throw new Error(`teleport never landed: ${tx} ${ty}`);
};

for (const s of SCENES) {
  if (s.plane) {
    const before = await page.evaluate(() => ({ plane: window.dcGame.plane.id, chunks: window.__play3d.stats().ground.chunks }));
    await page.evaluate((c) => window.dcGame.sendChat(c), s.plane);
    await page.waitForFunction((p) => window.dcGame.plane.id !== p, before.plane, { timeout: 8000 });
    const dropped = await page.evaluate(() => window.__play3d.stats().ground.chunks);
    await page.waitForTimeout(3000);
    console.log(`${s.name}: plane ${before.plane} → ${await page.evaluate(() => window.dcGame.plane.id)} (ground ring ${before.chunks} → ${dropped} at the crossing)`);
  }
  if (s.tp) {
    const tries = await tpTo(s.tp);
    console.log(`${s.name}: teleported (${tries + 1} sends), waiting for chunks`);
    await page.waitForTimeout(2500);
  }
  await page.evaluate((s) => {
    const p = window.__play3d;
    p.day(s.day ?? null);
    p.setCamera(s.yaw, s.pitch, s.dist);
  }, s);
  const n = await settle();
  console.log(`  settled after ${n} steps`);
  if (s.walk) {
    // THE CLICK: a point on the screen, through the page's own click law.
    const before = await page.evaluate(() => ({ ...window.dcGame.predictor.pos }));
    await page.evaluate(([fx, fy]) => window.__play3d.click(innerWidth * fx, innerHeight * fy), s.walk);
    await page.waitForTimeout(1600);
    const after = await page.evaluate(() => ({ ...window.dcGame.predictor.pos }));
    console.log(`  click-walk: ${before.x.toFixed(1)},${before.y.toFixed(1)} → ${after.x.toFixed(1)},${after.y.toFixed(1)} (moved ${Math.hypot(after.x - before.x, after.y - before.y).toFixed(2)} tiles)`);
    await settle();
  }
  await page.waitForTimeout(500);
  const stats = await page.evaluate(() => window.__play3d.stats());
  const file = resolve(OUT, `${TAG}-${s.name}.png`);
  await page.screenshot({ path: file });
  console.log(`${s.name}: ${file}`);
  console.log(
    `  draws ${stats.info.calls} tris ${stats.info.triangles} tex ${stats.info.textures} geo ${stats.info.geometries} programs ${stats.info.programs} ` +
      `chunks ${stats.ground.painted}/${stats.ground.chunks} (store ${stats.world.store}) faces ${stats.ground.faces} statics ${stats.ground.statics}/${stats.ground.staticDraws}draws ` +
      `atlas ${stats.atlas.sprites}sprites/${stats.atlas.pages}pages bodies ${stats.bodies.count}/${stats.bodies.entities}ent repaints ${stats.bodies.paints} ` +
      `ground ${(stats.ground.textureBytes / 1048576).toFixed(0)}MB frameMs(headless) ${stats.frameMs.toFixed(1)} at ${stats.player.x.toFixed(1)},${stats.player.y.toFixed(1)} plane ${stats.world.plane}`,
  );
}
// Leave the probe on the surface for the next run.
if (await page.evaluate(() => window.dcGame.plane?.id === 'museum')) {
  await page.evaluate(() => window.dcGame.sendChat('/museum'));
  await page.waitForTimeout(2500);
}
if (errors.length) {
  console.log('CONSOLE:');
  for (const e of errors.slice(0, 25)) console.log('  ' + e);
} else console.log('console clean');
await browser.close();
