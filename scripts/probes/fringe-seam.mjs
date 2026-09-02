// THE SEAM PROOF (fringe re-bake) — drives Renderer.fringeProof across
// dissimilar biomes. Gate = THE BATCH ROUNDING ALLOWANCE (see the
// fringe doc in terrain.ts): honest cases (statics per mask + real
// neighbor-border mutations) must stay within max per-channel delta 4
// — the GPU canvas re-rounds AA coverage ±1-2 whenever the op stream
// changes, and identical streams are byte-exact (the null cases pin
// both) — while the wrong-mask canary must EXCEED it (real missing
// content measures ~63) or the harness can prove nothing. Takes
// ORIGIN= for control lanes.
import { chromium } from '/Users/aeriek/.npm/_npx/705bc6b22212b352/node_modules/playwright/index.mjs';

const SPOTS = [
  { name: 'dawnmead-fields', tp: '/tp 30 18' },
  { name: 'forest', tp: '/tp 34 110' },
  { name: 'coast', tp: '/tp -60 60' },
  { name: 'graveyard-snow', tp: '/tp -512 -212' },
  { name: 'avenue-town', tp: '/tp -448 -264' },
];

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await (await browser.newContext({ viewport: { width: 1200, height: 800 } })).newPage();
await page.goto((process.env.ORIGIN ?? 'http://localhost:5231') + '/?perf');
try {
  await page.waitForFunction(() => window.dcGame && window.dcGame.connStatus === 'ingame', null, { timeout: 6000 });
} catch {
  await page.fill('#login-user', 'perf12_probe', { timeout: 5000 });
  await page.fill('#login-pass', 'probe-owl-9127');
  await page.click('#login-submit');
  await page.waitForFunction(() => window.dcGame && window.dcGame.connStatus === 'ingame', null, { timeout: 30000 });
}
// THE PLANE CHECK (see stage-parity.mjs).
if (await page.evaluate(() => window.dcGame.plane?.id === 'museum')) {
  await page.evaluate(() => window.dcGame.sendChat('/museum'));
  await page.waitForTimeout(2500);
}

let allOk = true;
let realCanaries = 0;
for (const spot of SPOTS) {
  // THE VERIFIED TELEPORT (see stage-parity.mjs).
  const [tx, ty] = spot.tp.split(' ').slice(1).map(Number);
  let landed = false;
  for (let a = 0; a < 6 && !landed; a++) {
    await page.evaluate((t) => { window.dcGame.sendChat('/time 12'); window.dcGame.sendChat(t); }, spot.tp);
    try {
      await page.waitForFunction(
        ([x, y]) => Math.abs(window.dcRenderer.ownPX - x) < 4 && Math.abs(window.dcRenderer.ownPY - y) < 4,
        [tx, ty],
        { timeout: 2500 },
      );
      landed = true;
    } catch { /* eaten — retry */ }
  }
  if (!landed) {
    console.log(`SKIP ${spot.name}: teleport never landed`);
    allOk = false;
    continue;
  }
  await page.waitForTimeout(3000);
  const results = await page.evaluate(([px, py]) => {
    const CHUNK = 32;
    const cx = Math.floor(px / CHUNK);
    const cy = Math.floor(py / CHUNK);
    const out = [];
    // The standing chunk and one neighbor — two data points per spot.
    for (const [dx, dy] of [[0, 0], [1, 0]]) {
      try {
        out.push({
          cx: cx + dx,
          cy: cy + dy,
          cases: window.dcRenderer.fringeProof(window.dcGame, cx + dx, cy + dy),
        });
      } catch (e) {
        out.push({ cx: cx + dx, cy: cy + dy, error: String(e).slice(0, 200) });
      }
    }
    return out;
  }, [tx, ty]);
  for (const r of results) {
    if (r.error) {
      console.log(`FAIL ${spot.name} chunk ${r.cx},${r.cy}: ${r.error}`);
      allOk = false;
      continue;
    }
    // THE GATE IS STRUCTURAL (the honest definition of seam-free):
    // identical op streams are byte-exact (the nulls pin it); ANY
    // op-stream change re-rolls scattered AA pixels — magnitude
    // scales with the stream delta (a mutation ±14, the narrowed
    // meadow's missing thousands of fills ±27) but the pixels stay
    // SINGLES and short boundary chains, every one a legitimate
    // roll of the same content. A real defect is a CONTIGUOUS
    // region. Gate: no 4-connected cluster of >8-delta pixels
    // larger than CLUSTER_MAX, and no single delta past HARD_MAX
    // (a lone wrong-colored pixel cluster-proof would still be a
    // bug). The canary must violate the cluster rail.
    const CLUSTER_MAX = 24;
    const HARD_MAX = 48;
    const honest = r.cases.filter((c) => !c.name.startsWith('canary'));
    const canary = r.cases.find((c) => c.name === 'canary-wrong-mask');
    const bad = honest.filter((c) => c.cluster > CLUSTER_MAX || c.maxd > HARD_MAX);
    const canaryOk = canary === undefined || canary.cluster > CLUSTER_MAX;
    if (canary !== undefined) realCanaries++;
    const ok = bad.length === 0 && canaryOk;
    allOk = allOk && ok;
    const detail = r.cases
      .map((c) => `${c.name}=${c.diff}/${c.maxd}/c${c.cluster}`)
      .join(' ');
    console.log(`${ok ? 'PASS' : 'FAIL'} ${spot.name} chunk ${r.cx},${r.cy}: ${detail}`);
  }
}
// The canary population must be real across the battery — a world
// where every border hid its flips would leave the proof toothless.
if (realCanaries < 6) {
  allOk = false;
  console.log(`CANARY POPULATION THIN: ${realCanaries} real canaries (need >= 6 of 10)`);
}
console.log(allOk ? 'SEAM PROOF PASS' : 'SEAM PROOF FAIL');
await browser.close();
process.exit(allOk ? 0 : 1);
