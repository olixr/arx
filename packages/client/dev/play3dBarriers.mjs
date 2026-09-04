/**
 * PLAY3D W2 BARRIERS — the lane's screenshot proof driver.
 *
 * A copy of play3dW2.mjs's login + PLANE CHECK + THE VERIFIED TELEPORT +
 * settle law, with the barrier scenes: the garrison curtain beside the
 * wood fence pen, the graveyard's iron rest, Dawnmead's hedged orchard
 * and Amberford's palisade ring. Scenes with `find` teleport NEAR a
 * spot, scan the streamed chunks for the tile id, and re-teleport to
 * the nearest cluster of it (the live world's own coordinates, never a
 * map-file guess).
 *
 *   cd packages/client && ../../node_modules/.bin/vite --config vite.config.play3d.ts --port 5246 --force
 *   ORIGIN=http://localhost:5246 TAG=w2-barriers node dev/play3dBarriers.mjs
 *
 * ENV: ORIGIN (default http://localhost:5246), TAG (default w2-barriers),
 * SCENES (comma list). Writes dev/play3d-shots/<TAG>-<scene>-{low,high}.png.
 * Frame-ms numbers are headless INDICATIONS ONLY, never an fps claim.
 */
import { chromium } from '/Users/aeriek/.npm/_npx/705bc6b22212b352/node_modules/playwright/index.mjs';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, 'play3d-shots');
const ORIGIN = process.env.ORIGIN ?? 'http://localhost:5246';
const TAG = process.env.TAG ?? 'w2-barriers';
const ONLY = process.env.SCENES ? new Set(process.env.SCENES.split(',').map((s) => s.trim()).filter(Boolean)) : null;
const VIEW = { width: 1440, height: 900, dpr: 1 };

// Tile ids (tilesEnum.ts): Fence 15, WallGarrison 139, Palisade 292, Hedge 342, IronFence 496.
const SCENES = [
  { name: 'curtain-fence', tp: [-460, -240], yaw: -0.4, dist: 20, low: 0.36, high: 0.85 },
  { name: 'curtain-close', tp: [-460, -240], find: 139, yaw: 0.35, dist: 11, low: 0.3, high: 0.8 },
  { name: 'graveyard', tp: [-512, -212], yaw: 0.6, dist: 16, low: 0.36, high: 0.85 },
  { name: 'graveyard-close', tp: [-512, -212], find: 496, yaw: 0.6, dist: 10, low: 0.3, high: 0.8 },
  { name: 'hedge', tp: [-430, -290], find: 342, yaw: 0.5, dist: 14, low: 0.36, high: 0.85 },
  { name: 'fence-close', tp: [-460, -240], find: 15, yaw: -0.4, dist: 9, low: 0.3, high: 0.8 },
  { name: 'palisade', tp: [582, 45], find: 292, yaw: 0.4, dist: 16, low: 0.36, high: 0.85 },
  // Gates by either posture (open / shut): PalisadeGate 295/296, FenceGate 134/135, HedgeGate 345/346, IronGate 499/500.
  { name: 'palisade-gate', tp: [582, 45], find: [295, 296], yaw: 0.2, dist: 8, low: 0.3, high: 0.8 },
  { name: 'fence-gate', tp: [-460, -240], find: [134, 135], yaw: -0.3, dist: 7, low: 0.3, high: 0.8 },
  { name: 'hedge-gate', tp: [-430, -290], find: [345, 346], yaw: 0.5, dist: 8, low: 0.3, high: 0.8 },
];

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: VIEW.width, height: VIEW.height }, deviceScaleFactor: VIEW.dpr });
const errors = [];
page.on('console', (m) => {
  if (m.type() === 'error' && m.location()?.url?.endsWith('/favicon.ico')) return;
  if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text().slice(0, 300)}`);
});
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message.slice(0, 300)}`));
page.on('response', (r) => {
  if (r.status() >= 400 && !r.url().endsWith('/favicon.ico')) errors.push(`http ${r.status()}: ${r.url()}`);
});

await page.goto(`${ORIGIN}/play3d.html`, { waitUntil: 'load' });
await page.waitForFunction(() => Boolean(window.__play3d) && Boolean(window.dcGame), null, { timeout: 30000 });
await page.waitForSelector('#login-user', { state: 'visible', timeout: 30000 });
await page.fill('#login-user', 'perf12_probe');
await page.fill('#login-pass', 'probe-owl-9127');
await page.click('#login-submit');
await page.waitForFunction(() => window.dcGame.connStatus === 'ingame' && window.dcGame.ownEid !== null, null, { timeout: 30000 });
await page.waitForTimeout(1500);
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

/** THE VERIFIED TELEPORT: re-send until the predictor lands (the rate limiter eats /tp). */
const tpTo = async ([tx, ty]) => {
  const before = await page.evaluate(() => ({ ...window.dcGame.predictor.pos }));
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
      const after = await page.evaluate(() => ({ ...window.dcGame.predictor.pos }));
      if (Math.hypot(after.x - before.x, after.y - before.y) < 1 && Math.hypot(before.x - tx, before.y - ty) > 4) continue;
      return a;
    } catch {
      /* eaten — retry */
    }
  }
  throw new Error(`teleport never landed: ${tx} ${ty}`);
};

/** Scan the streamed chunks for `tile`; return the nearest cluster centroid to (nx, ny) or null. */
const findTile = async (tile, [nx, ny]) =>
  page.evaluate(
    ({ tile, nx, ny }) => {
      const ids = Array.isArray(tile) ? tile : [tile];
      const w = window.dcGame.world;
      const pts = [];
      for (const ch of w.chunks.values()) {
        const g = ch.ground;
        const size = Math.round(Math.sqrt(g.length));
        for (let i = 0; i < g.length; i++) {
          if (!ids.includes(g[i])) continue;
          pts.push([ch.cx * size + (i % size), ch.cy * size + Math.floor(i / size)]);
        }
      }
      if (pts.length === 0) return null;
      // Greedy clusters within 12 tiles of a seed; pick the biggest nearest.
      const used = new Array(pts.length).fill(false);
      const clusters = [];
      for (let i = 0; i < pts.length; i++) {
        if (used[i]) continue;
        const c = [pts[i]];
        used[i] = true;
        for (let j = i + 1; j < pts.length; j++) {
          if (used[j]) continue;
          if (Math.abs(pts[j][0] - pts[i][0]) <= 12 && Math.abs(pts[j][1] - pts[i][1]) <= 12) {
            c.push(pts[j]);
            used[j] = true;
          }
        }
        const cx = c.reduce((a, p) => a + p[0], 0) / c.length;
        const cy = c.reduce((a, p) => a + p[1], 0) / c.length;
        clusters.push({ n: c.length, x: cx, y: cy, d: Math.hypot(cx - nx, cy - ny) });
      }
      clusters.sort((a, b) => b.n - a.n || a.d - b.d);
      const big = clusters[0].n;
      const near = clusters.filter((c) => c.n >= big * 0.6).sort((a, b) => a.d - b.d);
      return { total: pts.length, best: near[0], clusters: clusters.slice(0, 5) };
    },
    { tile, nx, ny },
  );

const fmtStats = (st) => {
  const s = st.structures ?? {};
  const lanes = s.lanes ?? {};
  return (
    `draws ${st.info.calls} tris ${st.info.triangles} chunks ${st.ground.painted}/${st.ground.chunks} · STRUCTURES ${s.draws ?? '-'} draws ${s.tris ?? '-'} tris ${s.quads ?? '-'} quads ` +
    `(walls ${lanes.walls ?? '-'} / barriers ${lanes.barriers ?? '-'} / terrain ${lanes.terrainForms ?? '-'}) atlas ${s.atlasTiles ?? '-'} tiles/${s.atlasPages ?? '-'} pages ` +
    `geom ${((s.geometryBytes ?? 0) / 1048576).toFixed(1)}MB build ${(s.buildMsLast ?? 0).toFixed(1)}ms rebuilds ${s.rebuilds ?? '-'} · ` +
    `frameMs(headless) ${st.frameMs.toFixed(1)} at ${st.player.x.toFixed(1)},${st.player.y.toFixed(1)}`
  );
};

for (const s of SCENES) {
  if (ONLY && !ONLY.has(s.name)) continue;
  let tp = s.tp;
  const tries = await tpTo(tp);
  console.log(`${s.name}: teleported (${tries + 1} sends), waiting for chunks`);
  await page.waitForTimeout(2500);
  if (s.find !== undefined) {
    const found = await findTile(s.find, tp);
    if (!found) {
      console.log(`  tile ${s.find} not found near ${tp} — shooting the near spot`);
    } else {
      console.log(`  tile ${s.find}: ${found.total} tiles; clusters ${found.clusters.map((c) => `${c.n}@${c.x.toFixed(0)},${c.y.toFixed(0)}`).join(' ')}`);
      tp = [Math.round(found.best.x), Math.round(found.best.y)];
      await tpTo(tp);
      console.log(`  re-teleported to ${tp}`);
      await page.waitForTimeout(2500);
    }
  }
  for (const [pitchName, pitch] of [
    ['low', s.low],
    ['high', s.high],
  ]) {
    await page.evaluate(
      ({ yaw, pitch, dist }) => {
        const p = window.__play3d;
        p.day(null);
        p.setCamera(yaw, pitch, dist);
      },
      { yaw: s.yaw, pitch, dist: s.dist },
    );
    const n = await settle();
    await page.waitForTimeout(700);
    const stats = await page.evaluate(() => window.__play3d.stats());
    const file = resolve(OUT, `${TAG}-${s.name}-${pitchName}.png`);
    await page.screenshot({ path: file });
    console.log(`  ${pitchName} (settled ${n}): ${file}`);
    console.log(`    ${fmtStats(stats)}`);
  }
}
if (errors.length) {
  console.log('CONSOLE:');
  for (const e of errors) console.log(`  ${e}`);
} else {
  console.log('console clean');
}
await browser.close();
