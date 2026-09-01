// THE PANEL WALK (foundations F5.3): open every dock screen and click
// every tab and sort chip inside it — the deep smoke for the panel
// splits. A screen must survive its own furniture with zero errors.
import { chromium } from '/Users/aeriek/.npm/_npx/705bc6b22212b352/node_modules/playwright/index.mjs';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await (await browser.newContext({ viewport: { width: 1500, height: 900 } })).newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message.slice(0, 160)));
await page.goto('http://localhost:5231/?perf');
try {
  await page.waitForFunction(() => window.dcGame && window.dcGame.connStatus === 'ingame', null, { timeout: 6000 });
} catch {
  await page.fill('#login-user', 'perf12_probe', { timeout: 5000 });
  await page.fill('#login-pass', 'probe-owl-9127');
  await page.click('#login-submit');
  await page.waitForFunction(() => window.dcGame && window.dcGame.connStatus === 'ingame', null, { timeout: 30000 });
}
await page.waitForTimeout(1500);
const BUTTONS = [['btn-inventory','inventory-panel'],['btn-skills','skills-panel'],['btn-arts','arts-panel'],['btn-beasts','beast-panel'],['btn-companions','companions-panel'],['btn-craft','craft-panel'],['btn-build','build-panel'],['btn-social','social-panel'],['btn-quests','quest-panel'],['btn-rep','rep-panel'],['btn-keys','keyring-panel'],['btn-map','map-panel'],['btn-audio','audio-panel']];
let totalClicks = 0, fails = 0;
for (const [btn, panel] of BUTTONS) {
  await page.click(`#${btn}`, { force: true });
  await page.waitForTimeout(300);
  const chips = await page.evaluate((pid) => {
    const root = document.getElementById(pid);
    if (!root) return 0;
    return root.querySelectorAll('.tab-chip, .sort-chip, #arts-rail > *, #arts-schools > *, .wing-toggle button').length;
  }, panel);
  let clicked = 0;
  for (let i = 0; i < Math.min(chips, 8); i++) {
    const ok = await page.evaluate((args) => {
      const root = document.getElementById(args.pid);
      const chip = root?.querySelectorAll('.tab-chip, .sort-chip, #arts-rail > *, #arts-schools > *, .wing-toggle button')[args.i];
      if (!(chip instanceof HTMLElement)) return false;
      chip.click();
      return true;
    }, { pid: panel, i });
    if (ok) clicked++;
    await page.waitForTimeout(120);
  }
  const stillOpen = await page.evaluate((pid) => {
    const el = document.getElementById(pid);
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return r.width > 40 && r.height > 40;
  }, panel);
  const bad = !stillOpen || errors.length > 0;
  if (bad) fails++;
  console.log(`${bad ? 'FAIL' : 'PASS'} ${panel}: chips=${chips} clicked=${clicked} open=${stillOpen} errs=${errors.length}`);
  totalClicks += clicked;
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
}
console.log(`total chip clicks: ${totalClicks}, pageerrors: ${errors.length}`);
for (const e of errors.slice(0, 4)) console.log('  err:', e);
const allOk = fails === 0 && errors.length === 0;
console.log(allOk ? 'PANEL WALK PASS' : 'PANEL WALK FAIL');
await browser.close();
process.exit(allOk ? 0 : 1);
