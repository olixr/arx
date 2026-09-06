// THE HAND SEES proof (THE MASTERED HAND Ph6): drives the codex and the hotbar on a rig lane (ORIGIN=, USER_=, PASS_=, OUT=)
// and screenshots the bench seals + combo plates, the role runes, the open-word ribbon and the landed flash.
// THE HAND SEES proof: codex bench + hotbar ribbon/flash on the rig lane.
import { chromium } from '/Users/aeriek/.npm/_npx/705bc6b22212b352/node_modules/playwright/index.mjs';
const OUT = process.env.OUT ?? process.cwd();
const ORIGIN = process.env.ORIGIN ?? 'http://localhost:5300';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(ORIGIN + '/');
try {
  await page.waitForFunction(() => window.dcGame && window.dcGame.connStatus === 'ingame', null, { timeout: 8000 });
} catch {
  await page.fill('#login-user', process.env.USER_ ?? 'perf12_probe', { timeout: 5000 });
  await page.fill('#login-pass', process.env.PASS_ ?? 'probe-owl-9127');
  await page.click('#login-submit');
  await page.waitForFunction(() => window.dcGame && window.dcGame.connStatus === 'ingame', null, { timeout: 30000 });
}
await page.waitForTimeout(2500);
const begin = await page.$('#look-panel button');
if (begin) { await begin.click().catch(() => {}); await page.waitForTimeout(500); }
await page.evaluate(() => { window.dcGame.sendChat('/time 13'); });
await page.evaluate(() => { window.dcGame.sendChat('/xp arx 10000000'); });
await page.waitForTimeout(1200);
await page.evaluate(() => { window.dcGame.sendChat('/xp archery 10000000'); });
await page.waitForTimeout(1200);
// 1. The codex bench on Twin Strike.
await page.evaluate(() => { const p = window.dcPanels; p.artsWing = 'arts'; p.artsSchoolSel = 'archery'; p.artsSel = 'twin_strike'; p.showArts(); });
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/codex_twin_strike.png` });
await page.evaluate(() => { const p = window.dcPanels; p.artsSchoolSel = 'arx'; p.artsSel = 'wickfire'; p.showArts(); });
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/codex_wickfire.png` });
await page.evaluate(() => window.dcPanels.closeAll());
// 2. Seat the arx signature and cast the opener: ribbon + runes.
await page.evaluate(() => { window.dcGame.sendTechnique('wickfire', 0); });
await page.waitForTimeout(400);
await page.evaluate(() => { window.dcGame.sendTechnique('frost_lance', 2); });
await page.waitForTimeout(800);
const bar = await page.$('#hotbar');
await bar.screenshot({ path: `${OUT}/hotbar_seated.png` });
await page.keyboard.down('q'); await page.waitForTimeout(80); await page.keyboard.up('q');
await page.waitForTimeout(1700);
await page.screenshot({ path: `${OUT}/hud_word_stands.png`, clip: { x: 340, y: 520, width: 600, height: 280 } });
await page.keyboard.down('e'); await page.waitForTimeout(80); await page.keyboard.up('e');
await page.waitForTimeout(1250);
await page.screenshot({ path: `${OUT}/hud_landed.png`, clip: { x: 340, y: 520, width: 600, height: 280 } });
const state = await page.evaluate(() => ({ open: window.dcGame.artOpen, landed: window.dcGame.followLanded, ribbon: document.querySelector('.hotbar-window')?.className, text: document.querySelector('.hotbar-window')?.textContent }));
console.log('state', JSON.stringify(state));
console.log('errors', errors.length, errors.slice(0, 3));
await browser.close();
