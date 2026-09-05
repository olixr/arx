// PARTICLES v6 in-world probe: speaks an ABILITY's plan through renderer.castPlan(id, kind, …) on a rig lane
// (ORIGIN=, USER_=, PASS_=): node fx-plan.mjs <abilityId> <kind> <delays csv>.
// In-world proof: the ?fx lever's effect roster in the live game.
import { chromium } from '/Users/aeriek/.npm/_npx/705bc6b22212b352/node_modules/playwright/index.mjs';
const OUT = process.env.OUT ?? process.cwd();
const ORIGIN = process.env.ORIGIN ?? 'http://localhost:5300';
const ability = process.argv[2] ?? "fireburst";
const kind = process.argv[3] ?? "blast";
const fx = `${ability}_${kind}`;
const delays = (process.argv[4] ?? '250,900,2200').split(',').map(Number);
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(ORIGIN + '/?fx');
try {
  await page.waitForFunction(() => window.dcGame && window.dcGame.connStatus === 'ingame', null, { timeout: 8000 });
} catch {
  console.log('login needed; status:', await page.evaluate(() => window.dcGame?.connStatus));
  await page.fill('#login-user', process.env.USER_ ?? 'perf12_probe', { timeout: 5000 });
  await page.fill('#login-pass', process.env.PASS_ ?? 'probe-owl-9127');
  await page.click('#login-submit');
  await page.waitForFunction(() => window.dcGame && window.dcGame.connStatus === 'ingame', null, { timeout: 30000 });
}
await page.waitForTimeout(2500);
await page.evaluate(() => { window.dcGame.sendChat('/time 13'); });
await page.waitForTimeout(800);
const pos = await page.evaluate(() => ({ x: window.dcRenderer.ownPX, y: window.dcRenderer.ownPY, plane: window.dcGame.plane?.id }));
console.log('in game at', JSON.stringify(pos));
// Cast through the renderer's own door — exactly what a signature would call.
const t0 = Date.now();
const spoke = await page.evaluate(({ ability, kind }) => {
  const r = window.dcRenderer;
  const own = window.dcGame.predictor.renderPos();
  const plan = r.castPlan(ability, kind, own.x + 0.9, own.y + 0.35, { radius: 1.2, dir: 0, x2: own.x + 2.9, y2: own.y - 0.3 });
  return plan ? plan.cues.map((c) => c.id).join('+') : 'NO PLAN';
}, { ability, kind });
console.log('plan:', spoke);
for (const d of delays) {
  const wait = d - (Date.now() - t0);
  if (wait > 0) await page.waitForTimeout(wait);
  const file = `${OUT}/ingame_${fx.replace('.', '_')}_${d}.png`;
  await page.screenshot({ path: file, clip: { x: 340, y: 160, width: 600, height: 460 } });
  const st = await page.evaluate(() => ({ grains: window.dcRenderer.particles.count(), marks: window.dcRenderer.groundMarks.count(), q: window.dcRenderer.particles.quality }));
  console.log(`${fx} +${d}ms`, JSON.stringify(st), file);
}
if (errors.length) console.log('ERRORS', errors.slice(0, 5));
await browser.close();
