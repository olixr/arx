// THE SHELL SMOKE (foundations F5): login on :5231, click every dock
// button, assert a panel actually opens and Escape closes it, count
// page errors. The client shell's live characterization — run before
// AND after every F5 cut.
import { chromium } from '/Users/aeriek/.npm/_npx/705bc6b22212b352/node_modules/playwright/index.mjs';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await (await browser.newContext({ viewport: { width: 1500, height: 900 } })).newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message.slice(0, 200)));
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

const visiblePanels = () => page.evaluate(() =>
  [...document.querySelectorAll('[id$="-panel"], [id$="-screen"]')]
    .filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 40 && r.height > 40 && getComputedStyle(el).visibility !== 'hidden';
    })
    .map((el) => el.id));

const BUTTONS = ['btn-inventory','btn-skills','btn-arts','btn-beasts','btn-companions','btn-craft','btn-build','btn-social','btn-quests','btn-rep','btn-keys','btn-map','btn-audio'];
let pass = 0, fail = 0;
const before = await visiblePanels();
for (const id of BUTTONS) {
  await page.click(`#${id}`, { force: true });
  await page.waitForTimeout(350);
  const open = (await visiblePanels()).filter((p) => !before.includes(p));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);
  const after = (await visiblePanels()).filter((p) => !before.includes(p));
  const ok = open.length >= 1 && after.length === 0;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${id}: opened=[${open}] afterEsc=[${after}]`);
  ok ? pass++ : fail++;
}
// The game still runs and speaks.
await page.evaluate(() => window.dcGame.sendChat('shell smoke says hello'));
await page.waitForTimeout(400);
const fps = await page.evaluate(() => window.dcRenderer !== undefined && window.dcGame.connStatus === 'ingame');
console.log(`world alive: ${fps}, pageerrors: ${errors.length}`);
for (const e of errors.slice(0, 5)) console.log('  err:', e);
const allOk = fail === 0 && errors.length === 0 && fps;
console.log(allOk ? `UI SMOKE PASS (${pass}/${BUTTONS.length})` : 'UI SMOKE FAIL');
await browser.close();
process.exit(allOk ? 0 : 1);
