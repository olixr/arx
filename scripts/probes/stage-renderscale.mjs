// THE RENDER SCALE (A2) — the big-window proof: at a maximized Retina
// window (2560×1440 dpr2, the dpr² blowup), measure the stage's layer/
// backbuffer memory and frame time at each resolution tier. Auto caps
// this window (3.69M CSS px > 3.5M) exactly as it would on the owner's
// 27" display; full is the native baseline.
import { chromium } from '/Users/aeriek/.npm/_npx/705bc6b22212b352/node_modules/playwright/index.mjs';

const ORIGIN = process.env.ORIGIN ?? 'http://localhost:5231';
const browser = await chromium.launch({ channel: 'chrome', headless: true });

// A FRESH page per tier — toggling mid-run measures arrival churn, not
// the product (the bench's hard-won law). The tier is set in
// localStorage BEFORE load so main.ts picks it up at boot.
async function openAt(tier) {
  const ctx = await browser.newContext({ viewport: { width: 2560, height: 1440 }, deviceScaleFactor: 2 });
  await ctx.addInitScript((t) => { try { localStorage.setItem('arx.stageres', t); } catch {} }, tier);
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
  for (let a = 0; a < 6; a++) {
    await page.evaluate(() => { window.dcGame.sendChat('/time 12'); window.dcGame.sendChat('/tp -448 -320'); });
    try {
      await page.waitForFunction(() => Math.abs(window.dcRenderer.ownPX - -448) < 4 && Math.abs(window.dcRenderer.ownPY - -320) < 4, null, { timeout: 2500 });
      break;
    } catch {}
  }
  // Settle to steady state: let arrival uploads/bakes drain fully before
  // measuring (resTOT climbing = still churning).
  await page.waitForTimeout(4000);
  return { ctx, page };
}

const mkSample = (page) => (ms) => page.evaluate(async (dur) => {
  const d = []; let last = performance.now(); const start = last;
  await new Promise((done) => { const tick = (n) => { d.push(n - last); last = n; if (n - start >= dur) return done(); requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
  d.shift(); d.sort((a, b) => a - b);
  const q = (p) => d[Math.min(d.length - 1, Math.floor(d.length * p))];
  return { med: q(0.5), p90: q(0.9), fps: 1000 / q(0.5) };
}, ms);

const mkRead = (page) => () => page.evaluate(() => {
  const r = window.dcRenderer;
  const w = r.stageWorldGl, g = r.stageGl;
  const wb = w ? w.residentBreakdown() : null;
  const gb = g ? g.residentBreakdown() : null;
  const s = r.stageScale();
  const MB = 1048576;
  return {
    tier: r.stageResTier, scale: s, effDpr: r.dpr() * s,
    worldLayerMB: wb ? wb.layer / MB : 0,
    worldResMB: w ? w.residentBytes / MB : 0,
    groundLayerMB: gb ? gb.layer / MB : 0,
    totalMB: (w ? w.residentBytes : 0) / MB + (g ? g.residentBytes : 0) / MB,
    canvasPx: w ? w.canvas.width * w.canvas.height : 0,
  };
});

console.log('THE RENDER SCALE — big window 2560×1440 dpr2, crown noon (fresh page per tier)\n');
const rows = [];
for (const tier of ['full', 'auto', 'balanced']) {
  const { ctx, page } = await openAt(tier);
  const info = await mkRead(page)();
  const perf = await mkSample(page)(2000);
  rows.push({ ...info, ...perf });
  await ctx.close();
  console.log(
    `${tier.padEnd(9)} scale ${info.scale.toFixed(3)} eff ${info.effDpr.toFixed(2)}x  ` +
    `layer(world) ${info.worldLayerMB.toFixed(1)}MB  resTOT ${info.totalMB.toFixed(0)}MB  ` +
    `backbuf ${(info.canvasPx / 1e6).toFixed(1)}Mpx  |  med ${perf.med.toFixed(1)}ms p90 ${perf.p90.toFixed(1)} (~${perf.fps.toFixed(0)}fps)`,
  );
}
const full = rows[0], bal = rows[2];
console.log(
  `\nDELTA full→balanced: layer ${(full.worldLayerMB - bal.worldLayerMB).toFixed(1)}MB  ` +
  `resTOT ${(full.totalMB - bal.totalMB).toFixed(0)}MB  ` +
  `backbuffer ${((1 - bal.canvasPx / full.canvasPx) * 100).toFixed(0)}% fewer px  ` +
  `frame ${(full.med - bal.med).toFixed(1)}ms faster`,
);
await browser.close();
