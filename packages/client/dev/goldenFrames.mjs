/**
 * THE ONE RENDER — F0 foundation gate: the q=0 GOLDEN-FRAME harness.
 *
 * The epic collapses the renderer's `q === 0 ? ortho : perspective` forks
 * into ONE q-parameterized pipeline. q=0 (the flat game live players use)
 * need NOT stay byte-identical, but the FLAT LOOK MUST HOLD. This harness
 * is the automated gate for that: it captures a fixed set of canonical
 * q=0 scenes as PNG goldens (the committed baseline), then re-captures a
 * candidate build and reports per-scene pixel-diff stats. Every later
 * phase runs `compare` after its changes; the flat look holding within
 * tolerance is the go/no-go.
 *
 * USAGE (rig on :5241 — see vite.config.f0.ts; backend :8814):
 *   # 1. start the rig (from packages/client):
 *   #    node_modules/.bin/vite --config vite.config.f0.ts
 *   # 2. capture / re-capture the baseline goldens (commit the PNGs):
 *   node dev/goldenFrames.mjs capture
 *   # 3. after a phase's changes, prove the flat look still holds:
 *   node dev/goldenFrames.mjs compare
 *   # 4. A/B against a live BASELINE rig (THE LEAN COMES OUT): per scene,
 *   #    shoot the baseline rig, then the candidate seconds later, and diff
 *   #    the two — immune to the shared world drifting between a committed
 *   #    golden and a later compare (NPC routines, work cycles, restocks):
 *   BASE_ORIGIN=http://localhost:5241 ORIGIN=http://localhost:5242 node dev/goldenFrames.mjs ab
 *
 * ENV:
 *   ORIGIN  rig origin (default http://localhost:5241)
 *   BASE_ORIGIN  ab only: the baseline rig's origin (the untouched code)
 *   SCENES  comma-separated scene names to limit the run
 *   TOL     max differing-pixel fraction to PASS (default 0.02 = 2%)
 *   THRESH  per-pixel max-channel delta that counts as "differs" (default 24)
 *   FRAMES  candidate frames sampled per scene in compare (default 5; the
 *           MIN diff wins so transient animation phase can't fail the gate)
 *   BACKEND stage (default) = the WebGL accelerated display (?stage=world);
 *           canvas = the standard canvas2d display (plain '/', arx.stage
 *           cleared). THE LEAN COMES OUT: the flat game must hold on BOTH.
 *   DIFF_OUT  compare only: a directory (relative to packages/client) to
 *           write <scene>.diff.png into — the crop with every differing
 *           pixel painted red over the dimmed golden, so a FAIL can be
 *           read by eye (a wandering NPC vs a structural drift).
 *   GOLDEN_DIR  golden directory, relative to packages/client (default
 *           dev/golden = the stage baseline; dev/golden-canvas = the
 *           canvas2d baseline captured from the untouched b4c00f2e code)
 *
 * The scenes, coords, crop and tolerance are documented in
 * docs/the-one-render-verify.md and echoed in golden/manifest.json so
 * later phases reuse the EXACT framings.
 */
import { chromium } from '/Users/aeriek/.npm/_npx/705bc6b22212b352/node_modules/playwright/index.mjs';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, relative, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const BACKEND = process.env.BACKEND === 'canvas' ? 'canvas' : 'stage';
const GOLDEN_DIR = process.env.GOLDEN_DIR ? resolve(HERE, '..', process.env.GOLDEN_DIR) : resolve(HERE, 'golden');
const GOLDEN_REL = relative(HERE, GOLDEN_DIR); // 'golden' | 'golden-canvas', as the manifest names it
const DIFF_OUT = process.env.DIFF_OUT ? resolve(HERE, '..', process.env.DIFF_OUT) : null;
const ORIGIN = process.env.ORIGIN ?? 'http://localhost:5241';
const TOL = Number(process.env.TOL ?? 0.02);
const THRESH = Number(process.env.THRESH ?? 24);
const FRAMES = Number(process.env.FRAMES ?? 5);
const MODE = process.argv[2] === 'compare' ? 'compare' : process.argv[2] === 'ab' ? 'ab' : 'capture';
const BASE_ORIGIN = process.env.BASE_ORIGIN ?? null;
if (MODE === 'ab' && !BASE_ORIGIN) {
  console.error('ab mode needs BASE_ORIGIN (the baseline rig)');
  process.exit(2);
}

// Fixed viewport + dpr so goldens and recaptures share pixel dimensions.
const VIEW = { width: 1500, height: 900, dpr: 2 };

// The diff CROP (in backing-store device px): excludes the animated HUD
// regions so the gate measures the WORLD, not the fps/tick counter, the
// chat log, the toolbar or the hotbar. Backing store = VIEW × dpr.
//   top    — skip the level badge / top HUD
//   right  — skip the top-right fps/tick/entities confession + toolbar
//   bottom — skip the chat log, tips, hotbar and xp/health bar
const CROP = {
  x0: 0,
  y0: 44 * VIEW.dpr,
  x1: Math.floor(VIEW.width * 0.66) * VIEW.dpr,
  y1: (VIEW.height - 210) * VIEW.dpr,
};

// THE CANONICAL q=0 SCENES. Coords are exact /tp targets, reused verbatim
// by every later phase. Chosen to cover the epic's surface classes:
// world-geometry volumes (wall runs, curtain walls, fences, building
// exteriors + interiors), ground, billboards (trees), and props.
//
// `tol` is the per-scene differing-pixel budget (fraction), CALIBRATED to
// the scene's inherent animation floor so a clean q=0 recapture always
// passes (no false alarms for the gate later phases depend on). The floor
// is grass wind, ambient pollen particles, patrolling NPCs, flames and
// water — measured with `FRAMES=10 compare` against fresh goldens, then
// given headroom above the observed per-frame max. A STRUCTURAL flat-look
// regression (segmented walls, a busted outline, squished-under hedges, a
// mis-occluded sprite) is a CONCENTRATED diff far above these floors.
// interiors is the tightest, most trustworthy gate (near-static geometry);
// meadow is the coarsest (grass wind dominates — grass fidelity is pinned
// precisely by the grassProjectParity node test, not this scene). See
// docs/the-one-render-verify.md.
const ALL_SCENES = [
  // E-W crenellated stone wall run + market stalls/benches/barrels (props)
  // + willow (billboard) + open grass. Walls + props. Floor ~5.7%.
  { name: 'wall-market', tp: '/tp -420 -240', tol: 0.09 },
  // Building EXTERIORS + two building INTERIORS (tables, chairs, rugs,
  // shelves) + market stalls + benches. Exterior + interior + props.
  // Near-static — the tightest gate. Floor ~0.6%.
  { name: 'interiors', tp: '/tp -430 -290', tol: 0.02 },
  // Long clean E-W castle curtain wall + a wooden FENCE-run pen (the same
  // run-continuous barrier volume hedges use) + crates + grass. Floor ~2.3%.
  { name: 'curtain-fence', tp: '/tp -460 -240', tol: 0.04 },
  // Graveyard: E-W stone perimeter wall + iron fence + gravestone props +
  // open grass meadow. Wall + fence + props + ground. Floor ~6.5%.
  { name: 'graveyard', tp: '/tp -512 -212', tol: 0.10 },
  // Open grass MEADOW with scattered trees (billboards). Ground + grass +
  // billboards — the noisiest scene (grass wind swings 5-17%). Coarse gate
  // for ground/tree gross regressions; grass parallax is pinned by the
  // grassProjectParity node test. Floor ~17%.
  { name: 'meadow', tp: '/tp 42 20', tol: 0.22 },
];
const only = process.env.SCENES?.split(',');
const SCENES = ALL_SCENES.filter((s) => !only || only.includes(s.name));

const browser = await chromium.launch({ channel: 'chrome', headless: true });

// Open a fresh context on a rig, log the probe in, land it in the
// overworld at zoom 1 on the requested backend, and assert q=0. One
// account = one live session, so rigs are visited one at a time.
const openRig = async (origin) => {
  const context = await browser.newContext({ viewport: { width: VIEW.width, height: VIEW.height }, deviceScaleFactor: VIEW.dpr });
  const page = await context.newPage();
  page.on('pageerror', (e) => console.log('[pageerror]', e.message.slice(0, 200)));

  // q=0 is the shipped default. BACKEND=stage: ?stage=world runs the WebGL
  // backend; BACKEND=canvas: the plain URL with the stored stage pref cleared
  // runs the standard canvas2d display (a fresh context has no localStorage,
  // the clear is belt-and-braces). We deliberately never turn the lean on.
  if (BACKEND === 'canvas') {
    await page.goto(`${origin}/`);
    await page.evaluate(() => {
      localStorage.removeItem('arx.stage');
      localStorage.removeItem('arx.lean');
    });
    await page.reload();
  } else {
    await page.goto(`${origin}/?stage=world`);
  }
  await page.fill('#login-user', 'perf12_probe');
  await page.fill('#login-pass', 'probe-owl-9127');
  await page.click('#login-submit');
  await page.waitForFunction(() => window.dcGame && window.dcGame.connStatus === 'ingame', null, { timeout: 30000 });
  await page.waitForTimeout(2000);
  // THE PLANE CHECK: /museum is a toggle and the probe account keeps its
  // plane across logins — teleports only mean anything in the overworld.
  if (await page.evaluate(() => window.dcGame.plane?.id === 'museum')) {
    await page.evaluate(() => window.dcGame.sendChat('/museum'));
    await page.waitForTimeout(2500);
  }
  await page.evaluate(() => window.dcRenderer.camera.setZoom(1));
  // The lean is on its way OUT (epic/lean-out): a missing camera.q is the
  // flat game too, so undefined counts as 0 here.
  const q = await page.evaluate(() => window.dcRenderer.camera.q ?? 0);
  if (q !== 0) {
    console.error(`ABORT: camera.q is ${q}, expected 0 (this is the q=0 flat-look gate)`);
    await browser.close();
    process.exit(2);
  }
  // THE BACKEND CHECK: the gate must run on the backend it claims to.
  const stageLive = await page.evaluate(() => !!window.dcRenderer.stageWorld);
  if (stageLive !== (BACKEND === 'stage')) {
    console.error(`ABORT: BACKEND=${BACKEND} but renderer.stageWorld is ${stageLive}`);
    await browser.close();
    process.exit(2);
  }
  return page;
};
// A session ends by closing its context (the socket drops → the server
// frees the one probe seat for the next rig).
const closeRig = async (page) => page.context().close();

let page = MODE === 'ab' ? null : await openRig(ORIGIN);
console.log(`mode ${MODE}, backend ${BACKEND}, goldens ${GOLDEN_REL}, origin ${ORIGIN}${BASE_ORIGIN ? `, base ${BASE_ORIGIN}` : ''}`);

// THE VERIFIED TELEPORT: the chat rate limiter silently eats commands —
// send, verify the renderer's own position landed, retry until it does.
const tpTo = async (tp) => {
  const [tx, ty] = tp.split(' ').slice(1).map(Number);
  for (let a = 0; a < 6; a++) {
    await page.evaluate((t) => {
      window.dcGame.sendChat('/time 12');
      window.dcGame.sendChat(t);
    }, tp);
    try {
      await page.waitForFunction(
        ([x, y]) => Math.abs(window.dcRenderer.ownPX - x) < 4 && Math.abs(window.dcRenderer.ownPY - y) < 4,
        [tx, ty],
        { timeout: 2500 },
      );
      return;
    } catch {
      /* eaten — retry */
    }
  }
  throw new Error(`teleport never landed: ${tp}`);
};

// Grab the current canvas as a PNG data URL (the whole frame — the golden
// is human-viewable; the diff crops later).
const grabPng = () =>
  page.evaluate(() => document.getElementById('game').toDataURL('image/png'));

// In-browser diff of the LIVE canvas crop against a golden PNG (passed as
// a data URL). Uses the browser's own PNG decoder — no node image dep.
// Returns { diffFrac, maxDelta, w, h } over the crop rectangle.
const diffAgainst = (goldenDataUrl, crop) =>
  page.evaluate(
    async ({ url, crop, thresh, wantMask }) => {
      const cv = document.getElementById('game');
      const live = cv.getContext('2d').getImageData(crop.x0, crop.y0, crop.x1 - crop.x0, crop.y1 - crop.y0).data;
      const img = new Image();
      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = rej;
        img.src = url;
      });
      const off = document.createElement('canvas');
      off.width = cv.width;
      off.height = cv.height;
      const octx = off.getContext('2d');
      octx.drawImage(img, 0, 0);
      const gold = octx.getImageData(crop.x0, crop.y0, crop.x1 - crop.x0, crop.y1 - crop.y0).data;
      let differing = 0;
      let maxDelta = 0;
      const n = Math.min(live.length, gold.length);
      let px = 0;
      // The optional diff mask: the golden dimmed, differing pixels red.
      const mask = wantMask ? new Uint8ClampedArray(gold.length) : null;
      for (let i = 0; i < n; i += 4) {
        const dr = Math.abs(live[i] - gold[i]);
        const dg = Math.abs(live[i + 1] - gold[i + 1]);
        const db = Math.abs(live[i + 2] - gold[i + 2]);
        const d = Math.max(dr, dg, db);
        if (d > maxDelta) maxDelta = d;
        const diff = d > thresh;
        if (diff) differing++;
        px++;
        if (mask) {
          mask[i] = diff ? 255 : gold[i] >> 2;
          mask[i + 1] = diff ? 0 : gold[i + 1] >> 2;
          mask[i + 2] = diff ? 0 : gold[i + 2] >> 2;
          mask[i + 3] = 255;
        }
      }
      let maskUrl = null;
      if (mask) {
        const mc = document.createElement('canvas');
        mc.width = crop.x1 - crop.x0;
        mc.height = crop.y1 - crop.y0;
        mc.getContext('2d').putImageData(new ImageData(mask, mc.width, mc.height), 0, 0);
        maskUrl = mc.toDataURL('image/png');
      }
      return { diffFrac: px ? differing / px : 0, maxDelta, w: crop.x1 - crop.x0, h: crop.y1 - crop.y0, maskUrl };
    },
    { url: goldenDataUrl, crop, thresh: THRESH, wantMask: DIFF_OUT !== null },
  );

mkdirSync(GOLDEN_DIR, { recursive: true });
let allOk = true;
const manifest = {
  generated: new Date().toISOString(),
  origin: ORIGIN,
  viewport: VIEW,
  crop: CROP,
  tolerance: { defaultDiffFrac: TOL, pixelThresh: THRESH, framesPerScene: FRAMES, perScene: true },
  login: 'perf12_probe',
  backend: BACKEND,
  note: 'q=0 flat-look baseline for THE ONE RENDER. See docs/the-one-render-verify.md.',
  scenes: [],
};

for (const scene of SCENES) {
  if (MODE === 'ab') {
    // THE SAME MOMENT, BOTH CODES: shoot the baseline rig, drop its
    // session, bring the candidate up on the same scene seconds later
    // and diff the candidate's frames against that shot. The scene's
    // per-scene tolerance still governs (the animation floor is the
    // same); world drift between the two has seconds, not minutes.
    page = await openRig(BASE_ORIGIN);
    await tpTo(scene.tp);
    await page.waitForTimeout(3500);
    const basePng = await grabPng();
    await closeRig(page);
    page = await openRig(ORIGIN);
    await tpTo(scene.tp);
    await page.waitForTimeout(3500);
    let best = { diffFrac: 1, maxDelta: 255 };
    const fracs = [];
    for (let f = 0; f < FRAMES; f++) {
      await page.waitForTimeout(300);
      const d = await diffAgainst(basePng, CROP);
      fracs.push(d.diffFrac);
      if (d.diffFrac < best.diffFrac) best = d;
    }
    await closeRig(page);
    page = null;
    const tol = process.env.TOL !== undefined ? TOL : scene.tol ?? TOL;
    const ok = best.diffFrac <= tol;
    allOk = allOk && ok;
    if (DIFF_OUT && best.maskUrl) {
      mkdirSync(DIFF_OUT, { recursive: true });
      const f = resolve(DIFF_OUT, `${scene.name}.ab.diff.png`);
      writeFileSync(f, Buffer.from(best.maskUrl.split(',')[1], 'base64'));
      console.log(`  diff mask -> ${f}`);
    }
    console.log(
      `${ok ? 'PASS' : 'FAIL'} ${scene.name} (A/B vs baseline): minDiff ${(best.diffFrac * 100).toFixed(3)}% ` +
        `(maxΔ ${best.maxDelta}) tol ${(tol * 100).toFixed(1)}%  frames [${fracs.map((x) => (x * 100).toFixed(2)).join(', ')}]`,
    );
    continue;
  }
  await tpTo(scene.tp);
  await page.waitForTimeout(3500); // settle: streaming, bakes, LOD

  if (MODE === 'capture') {
    const png = await grabPng();
    const file = resolve(GOLDEN_DIR, `${scene.name}.png`);
    writeFileSync(file, Buffer.from(png.split(',')[1], 'base64'));
    manifest.scenes.push({ name: scene.name, tp: scene.tp, tol: scene.tol ?? TOL, file: `${GOLDEN_REL}/${scene.name}.png` });
    console.log(`captured ${scene.name} (${scene.tp}) -> ${file}`);
  } else {
    const goldenFile = resolve(GOLDEN_DIR, `${scene.name}.png`);
    if (!existsSync(goldenFile)) {
      console.log(`SKIP ${scene.name}: no golden at ${goldenFile} (run capture first)`);
      continue;
    }
    const goldenUrl = 'data:image/png;base64,' + readFileSync(goldenFile).toString('base64');
    // Sample FRAMES candidate frames; the MIN diff wins (a transient
    // animation phase can't fail the gate, but a broken flat look — which
    // differs in EVERY frame — will).
    let best = { diffFrac: 1, maxDelta: 255 };
    const fracs = [];
    for (let f = 0; f < FRAMES; f++) {
      await page.waitForTimeout(300);
      const d = await diffAgainst(goldenUrl, CROP);
      fracs.push(d.diffFrac);
      if (d.diffFrac < best.diffFrac) best = d;
    }
    const tol = process.env.TOL !== undefined ? TOL : scene.tol ?? TOL;
    const ok = best.diffFrac <= tol;
    if (DIFF_OUT && best.maskUrl) {
      mkdirSync(DIFF_OUT, { recursive: true });
      const f = resolve(DIFF_OUT, `${scene.name}.diff.png`);
      writeFileSync(f, Buffer.from(best.maskUrl.split(',')[1], 'base64'));
      console.log(`  diff mask -> ${f}`);
    }
    allOk = allOk && ok;
    console.log(
      `${ok ? 'PASS' : 'FAIL'} ${scene.name}: minDiff ${(best.diffFrac * 100).toFixed(3)}% ` +
        `(maxΔ ${best.maxDelta}) tol ${(tol * 100).toFixed(1)}%  frames [${fracs.map((x) => (x * 100).toFixed(2)).join(', ')}]`,
    );
  }
}

if (MODE === 'capture') {
  // A SUBSET capture (SCENES=...) re-shoots only those goldens: merge them
  // into the standing manifest in canonical order so the untouched scenes
  // keep their entries instead of vanishing from the gate.
  const manifestFile = resolve(GOLDEN_DIR, 'manifest.json');
  if (only && existsSync(manifestFile)) {
    const prev = JSON.parse(readFileSync(manifestFile, 'utf8'));
    const byName = new Map((prev.scenes ?? []).map((sc) => [sc.name, sc]));
    for (const sc of manifest.scenes) byName.set(sc.name, sc);
    manifest.scenes = ALL_SCENES.map((sc) => byName.get(sc.name)).filter(Boolean);
  }
  writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`\nwrote ${manifest.scenes.length} goldens + manifest to ${GOLDEN_DIR}`);
} else {
  console.log(allOk ? '\nGOLDEN GATE PASS — the flat look holds' : '\nGOLDEN GATE FAIL — the flat look drifted');
}
await browser.close();
process.exit(MODE !== 'capture' && !allOk ? 1 : 0);
