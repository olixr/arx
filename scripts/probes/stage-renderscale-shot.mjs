// THE RENDER SCALE (A2) — the sharpness A/B: the same crown scene at a
// big Retina window, captured at Full (native dpr 2) vs Balanced (eff
// dpr 1.25), for the craft sign-off. A fresh page per tier.
import { chromium } from '/Users/aeriek/.npm/_npx/705bc6b22212b352/node_modules/playwright/index.mjs';

const ORIGIN = process.env.ORIGIN ?? 'http://localhost:5231';
const OUT = process.env.OUT ?? '/private/tmp/claude-501/-Users-aeriek-code-devcraft/d38d8413-f6b4-40dc-8ebb-9ebf2d3d041f/scratchpad';
const browser = await chromium.launch({ channel: 'chrome', headless: true });

async function shoot(tier, file) {
  const ctx = await browser.newContext({ viewport: { width: 2560, height: 1440 }, deviceScaleFactor: 2 });
  await ctx.addInitScript((t) => { try { localStorage.setItem('arx.stageres', t); } catch {} }, tier);
  const page = await ctx.newPage();
  await page.goto(ORIGIN + '/?stage=world');
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
  await page.waitForTimeout(4500);
  const eff = await page.evaluate(() => (window.dcRenderer.dpr() * window.dcRenderer.stageScale()).toFixed(2));
  // Crop a detailed 900×560 slab around the crown's chrome for a fair
  // side-by-side of edges and text, not the whole 2560 field.
  await page.screenshot({ path: `${file}`, clip: { x: 830, y: 440, width: 900, height: 560 } });
  console.log(`${tier} (eff ${eff}x) → ${file}`);
  await ctx.close();
}

await shoot('full', `${OUT}/a2-full.png`);
await shoot('balanced', `${OUT}/a2-balanced.png`);
await browser.close();
