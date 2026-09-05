/**
 * PLAY3D W2 — STRUCTURES AS GEOMETRY: the screenshot proof harness
 * (INTEGRATE lane's driver, superseding the scaffold's six scenes).
 *
 * The harness law, verbatim from play3dLive.mjs: login as the probe,
 * THE PLANE CHECK (/museum is a toggle — leave it if we are on it),
 * THE VERIFIED TELEPORT (the rate limiter eats /tp; re-send until the
 * predictor moved), settle (every ring chunk painted, no dirty
 * structure chunk). Scenes may `find` a tile id in the streamed
 * chunks and re-teleport to the nearest big cluster (the live world's
 * own coordinates, never a map-file guess — the BARRIERS driver's
 * law).
 *
 * Every scene shoots a LOW and a HIGH pitch (seams, z-fighting and
 * floating read differently from each); `night` scenes force the sky
 * to 0.08 and shoot one pitch; `occlusion` sits the camera at eye
 * height behind a wall so the depth buffer, not a sort, hides the
 * body. After the roster THE LEDGER WALK: teleport ≥ 60 tiles from
 * the last scene, settle, and print the structures ledger against
 * its own audit (bytes/draws/tris recomputed from the records; every
 * chunk the walk evicted must have paid back).
 *
 *   cd packages/client && ../../node_modules/.bin/vite --config vite.config.play3d.ts --port 5248 --force
 *   ORIGIN=http://localhost:5248 TAG=w2 node dev/play3dW2.mjs
 *
 * ENV: ORIGIN (default http://localhost:5243), TAG (filename prefix,
 * default w2), SCENES (comma list; default all), NOLEDGER=1 skips the
 * walk. Writes dev/play3d-shots/<TAG>-<scene>-{low,high|night}.png.
 * Scenes with `tone` run THE TONE PROBE after their low shot.
 * Frame-ms numbers are headless INDICATIONS ONLY, never an fps claim.
 */
import { chromium } from '/Users/aeriek/.npm/_npx/705bc6b22212b352/node_modules/playwright/index.mjs';
import { mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, 'play3d-shots');
const ORIGIN = process.env.ORIGIN ?? 'http://localhost:5243';
const TAG = process.env.TAG ?? 'w2';
const ONLY = process.env.SCENES ? new Set(process.env.SCENES.split(',').map((s) => s.trim()).filter(Boolean)) : null;
const VIEW = { width: 1440, height: 900, dpr: 1 };
const LOW = 0.36;
const HIGH = 0.85;

/**
 * Each scene: teleport (then optionally `find` a tile id and re-teleport
 * to its nearest cluster), then the listed shots (name → pitch).
 * `day` forces the sky (null = the server clock, set to noon).
 */
const SCENES = [
  // Dawnmead's interiors: timber house walls, doorways with leaves, windows, wall-hung art, awnings.
  { name: 'interiors', tp: [-430, -290], yaw: 0.45, dist: 16 },
  // The market walls: awnings, signs, banners on the south faces; stone + timber side by side.
  { name: 'wall-market', tp: [-420, -240], yaw: 0.2, dist: 16 },
  // The garrison curtain beside a wood fence pen (the brief's scene).
  { name: 'curtain-fence', tp: [-460, -240], yaw: -0.4, dist: 20, tone: { tiles: [139], hex: '#544e61', mid: 1.7, label: 'rampart ashlar (garrisonArt)' } },
  // The gatehouse close: piers, lintel, portcullis, leaves, merlons at the 2D phase.
  { name: 'curtain-gate', tp: [-460, -240], find: 139, yaw: -0.3, dist: 12 },
  // The iron rest: iron fence + stone wall + gate (the barriers driver's graveyard-close).
  { name: 'graveyard', tp: [-512, -198], yaw: 0.6, dist: 12, tone: { tiles: [10], hex: '#5b5566', mid: 1.0, label: 'house stone (STONE_FACE)' } },
  // The worldgen terraces NE of Dawnmead: cliff strips over the heightfield, ramps.
  { name: 'terraces', tp: [48, -78], yaw: 0.5, dist: 24 },
  // Amberford's bridge + dock junction (terrain lane's framing).
  { name: 'amberford-bridge', tp: [534, 80], yaw: 0.35, dist: 18 },
  // The weir dock west of Dawnmead (map 154..159×45..47 + origin −160,−64): a hollow jetty on piles.
  { name: 'weir-dock', tp: [-3, -15], yaw: 0.3, dist: 14 },
  // Dawnmead's hedges (the barriers driver found 342 at −460,−167).
  { name: 'hedge', tp: [-460, -167], find: 342, yaw: 0.3, dist: 14 },
  // A hedge gate (either posture) in Amberford (the barriers driver found 345/346 at 519,18): THE HEDGE THICKENED AT
  // THE GAP — posts at the run's height, finials, the wicket.
  { name: 'hedge-gate', tp: [519, 18], find: [345, 346], yaw: 0.5, dist: 8, shots: [['low', 0.3], ['high', 0.8]] },
  // The same gate with the body OFF the gate tile (two tiles south-west), so the wicket shows in the gap.
  { name: 'hedge-wicket', tp: [517, 20], yaw: 0.9, dist: 7, shots: [['low', 0.45]] },
  // Amberford's palisade + its great gate.
  { name: 'palisade', tp: [579, 45], find: 292, yaw: 0.3, dist: 16 },
  { name: 'palisade-gate', tp: [582, 38], find: [295, 296], yaw: 0.3, dist: 12 },
  // A fence gate with its open five-bar leaf.
  { name: 'fence-gate', tp: [582, 2], find: [134, 135], yaw: 0.3, dist: 12 },
  // THE DEPTH BUFFER, NOT A SORT: the body stands SOUTH of the 3.4-tall curtain on a plain run (west of the
  // gate), the camera NORTH of it at the orbit's lowest pitch (0.3) — the wall must cut the body (a 2.05 house
  // wall cannot hide one from that pitch), and the sun (from the south-west) lays the curtain's shadow on the
  // ground in front of the camera.
  { name: 'occlusion', tp: [-440, -229], yaw: Math.PI - 0.3, dist: 13, shots: [['low', 0.3]] },
  // Night: lamps on the faces, the sun gone — the same house.
  { name: 'interiors-night', tp: [-430, -290], yaw: 0.45, dist: 16, day: 0.08, shots: [['night', LOW]] },
];
/**
 * THE TONE PROBE (W2 fixes): a scene may name a wall tile family and
 * the 2D tone its lit face wears; after the LOW shot the probe finds a
 * tile of that family with an open south side in front of the camera,
 * projects the face's midpoint to the screen, samples the shot there
 * and reads the median against the 2D tone in STOPS (linear luminance).
 * The lit face must stay within ONE stop of the 2D (recognisable, never
 * washed out) — a photograph, not a guess. Occluded candidates (a
 * saturated or sky-bright sample) are skipped; up to six are tried.
 */
/** THE LEDGER WALK: ≥ 60 tiles from the last scene (open Dawnmead meadow NW of the graveyard). */
const LEDGER_TP = [-560, -260];

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

/** Scan the streamed chunks for `tile`; the nearest big cluster's centroid to (nx, ny), or null. */
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
      // THE STORE REMEMBERS: chunks from earlier scenes are still in
      // the store, so only clusters within reach of this teleport count.
      const local = clusters.filter((c) => c.d <= 40);
      if (local.length === 0) return null;
      local.sort((a, b) => b.n - a.n || a.d - b.d);
      const big = local[0].n;
      const near = local.filter((c) => c.n >= big * 0.6).sort((a, b) => a.d - b.d);
      return { total: pts.length, best: near[0] };
    },
    { tile, nx, ny },
  );

const mb = (b) => `${((b ?? 0) / 1048576).toFixed(1)}MB`;
const fmtStats = (st) => {
  const s = st.structures ?? {};
  const lanes = s.lanes ?? {};
  const a = s.audit ?? {};
  return (
    `renderer draws ${st.info.calls} tris ${st.info.triangles} geoms ${st.info.geometries} tex ${st.info.textures} · chunks ${st.ground.painted}/${st.ground.chunks} · ` +
    `STRUCTURES ${s.draws} draws (max ${s.drawsMax}/chunk over ${s.chunks} chunks) ${s.tris} tris ${s.quads} quads ` +
    `(walls ${lanes.walls} / barriers ${lanes.barriers} / terrain ${lanes.terrainForms}) geom ${mb(s.geometryBytes)} · ` +
    `faces ${s.atlasTiles} tiles / ${s.atlasPages} pages ${mb(s.atlasBytes)} (${s.faceUploads} uploads ${s.faceBlits} blits) · leaves ${s.doorLeaves} · ` +
    `build ${(s.buildMsLast ?? 0).toFixed(1)}ms rebuilds ${s.rebuilds} (wakes skipped ${s.wakesSkipped}) · audit ${a.ok ? 'OK' : 'MISMATCH ' + JSON.stringify(a)} · ` +
    `frameMs(headless) ${st.frameMs.toFixed(1)} at ${st.player.x.toFixed(1)},${st.player.y.toFixed(1)}`
  );
};

const toneFailures = [];
const toneProbe = async (tone, file) =>
  page.evaluate(
    async ({ tiles, hex, mid, b64 }) => {
      const p = window.__play3d;
      const g = window.dcGame;
      const pose = p.stats().camera;
      const own = g.predictor.pos;
      const camX = own.x + Math.sin(pose.yaw) * Math.cos(pose.pitch) * pose.dist;
      const camZ = own.y + Math.cos(pose.yaw) * Math.cos(pose.pitch) * pose.dist;
      const camY = p.heightAt(own.x, own.y) + 0.9 + Math.sin(pose.pitch) * pose.dist;
      const W = window.innerWidth;
      const H = window.innerHeight;
      const tileAt = (tx, ty) => {
        const size = 32;
        const ch = g.world.chunks.get?.(`${Math.floor(tx / size)},${Math.floor(ty / size)}`) ?? null;
        if (ch) return ch.ground[(ty - ch.cy * size) * size + (tx - ch.cx * size)];
        for (const c of g.world.chunks.values()) {
          const sz = Math.round(Math.sqrt(c.ground.length));
          if (Math.floor(tx / sz) === c.cx && Math.floor(ty / sz) === c.cy) return c.ground[(ty - c.cy * sz) * sz + (tx - c.cx * sz)];
        }
        return undefined;
      };
      // LINE OF SIGHT: walk the camera→face segment; a family tile whose crown stands above the ray hides the face.
      const clear = (fx, fy, fz) => {
        const n = 40;
        for (let k = 1; k < n; k++) {
          const t = k / n;
          const x = camX + (fx - camX) * t;
          const z = camZ + (fz - camZ) * t;
          const y = camY + (fy - camY) * t;
          const tx = Math.floor(x);
          const ty = Math.floor(z);
          if (tx === Math.floor(fx) && ty === Math.floor(fz) - 1) continue; // the face's own tile
          if (tiles.includes(tileAt(tx, ty)) && y < p.heightAt(x, z) + 2.05) return false;
        }
        return true;
      };
      // Candidates: family tiles with an open south side, their south face midpoint on screen, facing the camera, in clear sight.
      const cands = [];
      for (const ch of g.world.chunks.values()) {
        const gr = ch.ground;
        const size = Math.round(Math.sqrt(gr.length));
        for (let i = 0; i < gr.length; i++) {
          if (!tiles.includes(gr[i])) continue;
          const ly = Math.floor(i / size);
          if (ly === size - 1) continue;
          if (tiles.includes(gr[i + size])) continue;
          const tx = ch.cx * size + (i % size);
          const ty = ch.cy * size + ly;
          if (camZ <= ty + 1) continue;
          const d = Math.hypot(camX - tx - 0.5, camZ - ty - 1);
          if (d > 22) continue;
          const y = p.heightAt(tx + 0.5, ty + 1) + mid;
          const s = p.project(tx + 0.5, y, ty + 1);
          if (!(s.z > 0 && s.z < 1) || s.sx < 40 || s.sx > W - 40 || s.sy < 120 || s.sy > H - 120) continue;
          if (!clear(tx + 0.5, y, ty + 1)) continue;
          // An outdoor face (grass to the south) before an inner one.
          cands.push({ tx, ty, sx: s.sx, sy: s.sy, d, outdoor: gr[i + size] === 1 ? 0 : 1 });
        }
      }
      // OUTDOOR FIRST, THEN NEAREST THE CAMERA (a farther face can hide behind a nearer crown plate — grey too).
      cands.sort((a, b) => a.outdoor - b.outdoor || a.d - b.d);
      const img = new Image();
      img.src = 'data:image/png;base64,' + b64;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const lin = (v) => Math.pow(v / 255, 2.2);
      const lum = (r, g2, b) => 0.2126 * lin(r) + 0.7152 * lin(g2) + 0.0722 * lin(b);
      const exp = [1, 3, 5].map((k) => parseInt(hex.slice(k, k + 2), 16));
      const Ye = lum(...exp);
      const tried = [];
      for (const cand of cands.slice(0, 6)) {
        const d = ctx.getImageData(Math.round(cand.sx) - 5, Math.round(cand.sy) - 5, 10, 10).data;
        const R = [];
        const G = [];
        const B = [];
        for (let i = 0; i < d.length; i += 4) {
          R.push(d[i]);
          G.push(d[i + 1]);
          B.push(d[i + 2]);
        }
        const med = (a) => a.sort((x, y) => x - y)[a.length >> 1];
        const m = [med(R), med(G), med(B)];
        const sat = Math.max(...m) - Math.min(...m);
        const got = '#' + m.map((v) => v.toString(16).padStart(2, '0')).join('');
        tried.push(`${cand.tx},${cand.ty}@${cand.sx.toFixed(0)},${cand.sy.toFixed(0)}=${got}`);
        // Occluded by grass/a tree (saturated) or the sky (bright): not the face.
        if (sat > 40 || Math.max(...m) > 200) continue;
        const stops = Math.log2(lum(...m) / Ye);
        return { ok: Math.abs(stops) <= 1, got, stops, at: [cand.tx, cand.ty], screen: [Math.round(cand.sx), Math.round(cand.sy)], tried, candidates: cands.length };
      }
      return { ok: null, tried, candidates: cands.length };
    },
    { tiles: tone.tiles, hex: tone.hex, mid: tone.mid, b64: readFileSync(file).toString('base64') },
  );

let lastTp = null;
for (const s of SCENES) {
  if (ONLY && !ONLY.has(s.name)) continue;
  let tp = s.tp;
  const tries = await tpTo(tp);
  console.log(`${s.name}: teleported (${tries + 1} sends), waiting for chunks`);
  await page.waitForTimeout(2500);
  if (s.find !== undefined) {
    const found = await findTile(s.find, tp);
    if (!found) console.log(`  tile ${s.find} not found near ${tp} — shooting the near spot`);
    else {
      tp = [Math.round(found.best.x), Math.round(found.best.y)];
      await tpTo(tp);
      console.log(`  tile ${s.find}: ${found.total} tiles; re-teleported to ${tp}`);
      await page.waitForTimeout(2500);
    }
  }
  lastTp = tp;
  const shots = s.shots ?? [
    ['low', LOW],
    ['high', HIGH],
  ];
  for (const [shotName, pitch] of shots) {
    await page.evaluate(
      ({ yaw, pitch, dist, day }) => {
        const p = window.__play3d;
        p.day(day);
        p.setCamera(yaw, pitch, dist);
      },
      { yaw: s.yaw, pitch, dist: s.dist, day: s.day ?? null },
    );
    const n = await settle();
    await page.waitForTimeout(700);
    const stats = await page.evaluate(() => window.__play3d.stats());
    const file = resolve(OUT, `${TAG}-${s.name}-${shotName}.png`);
    await page.screenshot({ path: file });
    console.log(`  ${shotName} (settled ${n}): ${file}`);
    console.log(`    ${fmtStats(stats)}`);
    if (s.tone && shotName === 'low') {
      const t = await toneProbe(s.tone, file);
      if (t.ok === null) console.log(`    TONE ${s.tone.label}: no unoccluded candidate (${t.candidates} candidates; tried ${t.tried.join(' ')})`);
      else {
        console.log(`    TONE ${s.tone.label}: lit south face of ${t.at} at px ${t.screen} = ${t.got} vs 2D ${s.tone.hex} → ${t.stops >= 0 ? '+' : ''}${t.stops.toFixed(2)} stop → ${t.ok ? 'PASS (within a stop)' : 'FAIL (more than a stop off)'}`);
        if (!t.ok) toneFailures.push(`${s.name}: ${t.got} vs ${s.tone.hex} (${t.stops.toFixed(2)} stop)`);
      }
    }
  }
  await page.evaluate(() => window.__play3d.day(null));
}

if (!process.env.NOLEDGER && lastTp) {
  const before = await page.evaluate(() => window.__play3d.stats());
  const far = Math.hypot(LEDGER_TP[0] - lastTp[0], LEDGER_TP[1] - lastTp[1]) >= 60 ? LEDGER_TP : [lastTp[0] + 70, lastTp[1]];
  await tpTo(far);
  await page.waitForTimeout(2500);
  const n = await settle();
  const after = await page.evaluate(() => window.__play3d.stats());
  const sb = before.structures;
  const sa = after.structures;
  console.log(`LEDGER WALK (${Math.hypot(far[0] - lastTp[0], far[1] - lastTp[1]).toFixed(0)} tiles, settled ${n}):`);
  console.log(`  before: chunks ${sb.chunks} draws ${sb.draws} quads ${sb.quads} geom ${mb(sb.geometryBytes)} · renderer geoms ${before.info.geometries} · audit ${sb.audit.ok ? 'OK' : 'MISMATCH'}`);
  console.log(`  after:  chunks ${sa.chunks} draws ${sa.draws} quads ${sa.quads} geom ${mb(sa.geometryBytes)} · renderer geoms ${after.info.geometries} · audit ${sa.audit.ok ? 'OK' : 'MISMATCH ' + JSON.stringify(sa.audit)}`);
  console.log(`  ${sa.audit.ok && sb.audit.ok ? 'LEDGER BALANCES' : 'LEDGER BROKEN'} · atlas pages ${sa.atlasPages} (${sa.atlasTiles} tiles, shared, never evicted)`);
  const file = resolve(OUT, `${TAG}-ledger-walk.png`);
  await page.screenshot({ path: file });
  console.log(`  ${file}`);
}

if (toneFailures.length) console.log(`TONE FAILURES: ${toneFailures.join('; ')}`);
if (errors.length) {
  console.log('CONSOLE:');
  for (const e of errors) console.log(`  ${e}`);
} else {
  console.log('console clean');
}
await browser.close();
