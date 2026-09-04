/**
 * PLAY3D W2 — TERRAIN-FORMS: the lane's screenshot proof driver.
 *
 * The W2 harness's login + THE VERIFIED TELEPORT + settle law
 * (dev/play3dW2.mjs, owned by INTEGRATE) with THIS lane's scene roster:
 * cliff terraces, the Weir's pier dock, Dawnmead's lane bridge, the
 * porch facing the stones, and Amberford's Salt Road bridge — one LOW
 * and one HIGH pitch each.
 *
 *   cd packages/client && ../../node_modules/.bin/vite --config vite.config.play3d.ts --port 5247 --force
 *   ORIGIN=http://localhost:5247 TAG=w2-terrain node dev/play3dTerrainForms.mjs
 *
 * ENV: ORIGIN (default http://localhost:5247), TAG (default w2-terrain),
 * SCENES (comma list). Writes dev/play3d-shots/<TAG>-<scene>-{low,high}.png.
 * Frame-ms numbers are headless INDICATIONS ONLY, never an fps claim.
 */
import { chromium } from '/Users/aeriek/.npm/_npx/705bc6b22212b352/node_modules/playwright/index.mjs';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, 'play3d-shots');
const ORIGIN = process.env.ORIGIN ?? 'http://localhost:5247';
const TAG = process.env.TAG ?? 'w2-terrain';
const ONLY = process.env.SCENES ? new Set(process.env.SCENES.split(',').map((s) => s.trim()).filter(Boolean)) : null;
const VIEW = { width: 1440, height: 900, dpr: 1 };

/** Dawnmead zone origin (-160,-64): map coords + origin = world. */
const SCENES = [
  // The worldgen terraces NE of Dawnmead: stacked cliff courses, ramps.
  { name: 'terraces', tp: [48, -78], yaw: 0.5, dist: 24, low: 0.36, high: 0.85 },
  // Terraces from the south, faces square to the camera.
  { name: 'terraces-south', tp: [48, -78], yaw: 0.0, dist: 20, low: 0.3, high: 0.8 },
  // The Weir's pier: a dock off the bank over deep water (map 154..159,45..47).
  { name: 'weir-dock', tp: [-3, -15], yaw: 0.3, dist: 14, low: 0.32, high: 0.8 },
  // The lane bridge over the brook (map 157..163 × 110..114).
  { name: 'lane-bridge', tp: [0, 52], yaw: 0.0, dist: 16, low: 0.32, high: 0.8 },
  // The porch facing the stones (map 90..96, 109).
  { name: 'porch', tp: [-67, 48], yaw: 0.0, dist: 12, low: 0.34, high: 0.8 },
  // Amberford's Salt Road bridge (map 85..88 × 122..134, zone origin 448,-56).
  { name: 'amberford-bridge', tp: [534, 80], yaw: 0.35, dist: 18, low: 0.32, high: 0.8 },
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

const fmtStats = (st) => {
  const s = st.structures ?? {};
  const lanes = s.lanes ?? {};
  return (
    `draws ${st.info.calls} tris ${st.info.triangles} programs ${st.info.programs} chunks ${st.ground.painted}/${st.ground.chunks} faces ${st.ground.faces} ` +
    `statics ${st.ground.statics}/${st.ground.staticDraws}draws · STRUCTURES ${s.draws ?? '-'} draws ${s.tris ?? '-'} tris ${s.quads ?? '-'} quads ` +
    `(walls ${lanes.walls ?? '-'} / barriers ${lanes.barriers ?? '-'} / terrain ${lanes.terrainForms ?? '-'}) atlas ${s.atlasTiles ?? '-'} tiles/${s.atlasPages ?? '-'} pages ` +
    `geom ${((s.geometryBytes ?? 0) / 1048576).toFixed(1)}MB build ${(s.buildMsLast ?? 0).toFixed(1)}ms rebuilds ${s.rebuilds ?? '-'} · ` +
    `frameMs(headless) ${st.frameMs.toFixed(1)} at ${st.player.x.toFixed(1)},${st.player.y.toFixed(1)}`
  );
};

for (const s of SCENES) {
  if (ONLY && !ONLY.has(s.name)) continue;
  const tries = await tpTo(s.tp);
  console.log(`${s.name}: teleported (${tries + 1} sends), waiting for chunks`);
  await page.waitForTimeout(2500);
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
