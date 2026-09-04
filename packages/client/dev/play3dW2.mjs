/**
 * PLAY3D W2 — STRUCTURES AS GEOMETRY: the screenshot proof harness.
 *
 * A copy of play3dLive.mjs's login + THE VERIFIED TELEPORT + settle
 * law, with the W2 scene roster (one LOW and one HIGH pitch per scene —
 * seams, z-fighting and floating read differently from each) and the
 * structures ledger in the log. Owned by the INTEGRATE lane; other
 * lanes add scenes here or pick a subset with SCENES.
 *
 *   cd packages/client && ../../node_modules/.bin/vite --config vite.config.play3d.ts --port 5244 --force
 *   ORIGIN=http://localhost:5244 TAG=walls SCENES=interiors,wall-market node dev/play3dW2.mjs
 *
 * ENV: ORIGIN (default http://localhost:5243), TAG (filename prefix,
 * default w2), SCENES (comma list of scene names; default all).
 * Writes dev/play3d-shots/<TAG>-<scene>-{low,high}.png. Frame-ms
 * numbers are headless INDICATIONS ONLY, never an fps claim.
 */
import { chromium } from '/Users/aeriek/.npm/_npx/705bc6b22212b352/node_modules/playwright/index.mjs';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, 'play3d-shots');
const ORIGIN = process.env.ORIGIN ?? 'http://localhost:5243';
const TAG = process.env.TAG ?? 'w2';
const ONLY = process.env.SCENES ? new Set(process.env.SCENES.split(',').map((s) => s.trim()).filter(Boolean)) : null;
const VIEW = { width: 1440, height: 900, dpr: 1 };

/** Each scene: teleport, then a low and a high pitch at the given yaw/dist. */
const SCENES = [
  // Dawnmead's interiors: house walls, doors, windows, wall-hung art.
  { name: 'interiors', tp: [-430, -290], yaw: 0.45, dist: 16, low: 0.36, high: 0.85 },
  // The market walls: awnings, signs, banners on the south faces.
  { name: 'wall-market', tp: [-420, -240], yaw: 0.2, dist: 16, low: 0.36, high: 0.85 },
  // The garrison curtain beside a wood fence pen.
  { name: 'curtain-fence', tp: [-460, -240], yaw: -0.4, dist: 20, low: 0.36, high: 0.85 },
  // The graveyard: iron fence + stone wall.
  { name: 'graveyard', tp: [-512, -212], yaw: 0.6, dist: 16, low: 0.36, high: 0.85 },
  // The worldgen terraces NE of Dawnmead: cliff faces and ramps.
  { name: 'terraces', tp: [48, -78], yaw: 0.5, dist: 24, low: 0.36, high: 0.85 },
  // Amberford's bridge over the river (maps/amberford.ts:1138, zone origin 448,-56).
  { name: 'amberford-bridge', tp: [534, 62], yaw: 0.35, dist: 18, low: 0.36, high: 0.85 },
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
