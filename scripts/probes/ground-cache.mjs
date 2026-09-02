// THE GROUND CACHE (foundation B2) — the baseline: at the terraced
// capital, how many bytes the 2D ground cache holds, how much of it is
// LIFTED layers, and how much of each lifted canvas is actually
// occupied by its bands (the row-range the B2 tightening would keep).
import { chromium } from '/Users/aeriek/.npm/_npx/705bc6b22212b352/node_modules/playwright/index.mjs';

const ORIGIN = process.env.ORIGIN ?? 'http://localhost:5231';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
await page.goto(ORIGIN + '/?perf&stage=world');
try {
  await page.waitForFunction(() => window.dcGame && window.dcGame.connStatus === 'ingame', null, { timeout: 6000 });
} catch {
  await page.fill('#login-user', 'perf12_probe', { timeout: 5000 });
  await page.fill('#login-pass', 'probe-owl-9127');
  await page.click('#login-submit');
  await page.waitForFunction(() => window.dcGame && window.dcGame.connStatus === 'ingame', null, { timeout: 30000 });
}
if (await page.evaluate(() => window.dcGame.plane?.id === 'museum')) {
  await page.evaluate(() => window.dcGame.sendChat('/museum'));
  await page.waitForTimeout(2500);
}
await page.evaluate(() => window.dcRenderer.camera.setZoom(1));
// Roam the terraced capital so its lifted chunks all bake in.
const CIRCUIT = ['/tp -448 -320', '/tp -420 -300', '/tp -470 -340', '/tp -430 -350', '/tp -460 -300', '/tp -448 -320'];
for (const tp of CIRCUIT) {
  const [tx, ty] = tp.split(' ').slice(1).map(Number);
  for (let a = 0; a < 5; a++) {
    await page.evaluate((t) => window.dcGame.sendChat(t), tp);
    try {
      await page.waitForFunction(([x, y]) => Math.abs(window.dcRenderer.ownPX - x) < 4 && Math.abs(window.dcRenderer.ownPY - y) < 4, [tx, ty], { timeout: 2500 });
      break;
    } catch {}
  }
  await page.waitForTimeout(1500);
}
await page.waitForTimeout(2000);

const stats = await page.evaluate(() => {
  const r = window.dcRenderer;
  const CHUNK = 32; // CHUNK_SIZE
  const bytes = (c) => (c ? c.width * c.height * 4 : 0);
  let baseBytes = 0, liftedBytes = 0, liftedLayers = 0, chunks = 0;
  let occupiedRows = 0, fullRows = 0;
  for (const entry of r.baked.values()) {
    chunks++;
    baseBytes += bytes(entry.canvas);
    for (const l of entry.lifted ?? []) {
      liftedLayers++;
      liftedBytes += bytes(l.canvas);
      // Occupied rows = union of bands; full = CHUNK rows.
      let lo = 1e9, hi = -1;
      for (const [a, b] of l.bands) { lo = Math.min(lo, a); hi = Math.max(hi, b); }
      const occ = hi >= lo ? hi - lo + 1 : 0;
      occupiedRows += occ;
      fullRows += CHUNK;
    }
  }
  const MB = 1048576;
  return {
    chunks, liftedLayers,
    baseMB: baseBytes / MB, liftedMB: liftedBytes / MB,
    bakedBytesMB: r.bakedBytes / MB,
    occupancyPct: fullRows ? (occupiedRows / fullRows) * 100 : 0,
    // If lifted canvases shrank to their occupied rows (bucketed to
    // multiples of 8), the projected lifted bytes:
    projectedLiftedMB: (() => {
      let proj = 0;
      for (const entry of r.baked.values()) for (const l of entry.lifted ?? []) {
        let lo = 1e9, hi = -1; for (const [a, b] of l.bands) { lo = Math.min(lo, a); hi = Math.max(hi, b); }
        const occ = hi >= lo ? hi - lo + 3 : 0; // +2 band pad, +1 safety
        const bucket = Math.min(CHUNK, Math.ceil(occ / 8) * 8);
        const c = l.canvas; const gut = c.height - CHUNK * (c.height > CHUNK ? (c.width - (c.width % CHUNK)) / CHUNK : 1); // approx
        // simpler: px from width: width = CHUNK*px + 2*gut; assume gut≈px
        const px = Math.round(c.width / (CHUNK + 2)); // rough
        proj += (c.width) * (bucket * px + 2 * px) * 4;
      }
      return proj / MB;
    })(),
  };
});
console.log('THE GROUND CACHE — terraced capital baseline (1600×1000 dpr2)\n');
console.log(`chunks resident:   ${stats.chunks}`);
console.log(`lifted layers:     ${stats.liftedLayers}`);
console.log(`base canvases:     ${stats.baseMB.toFixed(0)} MB`);
console.log(`lifted canvases:   ${stats.liftedMB.toFixed(0)} MB   (${stats.occupancyPct.toFixed(0)}% of lifted rows actually occupied)`);
console.log(`bakedBytes total:  ${stats.bakedBytesMB.toFixed(0)} MB`);
console.log(`\nprojected lifted after row-range tighten (~8-row buckets): ${stats.projectedLiftedMB.toFixed(0)} MB`);
console.log(`→ lifted saving ≈ ${(stats.liftedMB - stats.projectedLiftedMB).toFixed(0)} MB`);
await browser.close();
