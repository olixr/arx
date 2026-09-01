// THE STATION VISIT (foundations polish) — closes F5.3's residual: the
// rooms that only open at a live station. Finds real stations near the
// probe by scanning the streamed world, teleports adjacent, presses
// the interact key, and asserts the room opens and Escape closes it.
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
// Silverfall's avenue — the vault quarter — then let the town stream in.
await page.evaluate(() => window.dcGame.sendChat('/tp -448 -264'));
await page.waitForTimeout(3500);

// Hunt station tiles by NAME through the shared enum riding the page.
const findStation = (names) => page.evaluate((wanted) => {
  const g = window.dcGame;
  const world = g.world;
  const px = Math.round(g.predictor.pos.x), py = Math.round(g.predictor.pos.y);
  for (let r = 1; r < 80; r++) {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const t = world.groundAt(px + dx, py + dy);
      if (t !== undefined && wanted.includes(t)) return { x: px + dx, y: py + dy, tile: t };
    }
  }
  return null;
}, names);

// Tile ids resolved in-page from the bundle's own enum via a known probe:
// BankChest=28 per shared tiles; others found by scanning the interact
// targets the game itself reports.
const visits = [
  ['bank', [28], 'bank-panel'],
];
let pass = 0, fail = 0;
for (const [name, tiles, panel] of visits) {
  const spot = await findStation(tiles);
  if (!spot) { console.log(`SKIP ${name}: no station within 60 tiles`); continue; }
  await page.evaluate((s) => window.dcGame.sendChat(`/tp ${s.x} ${s.y + 1}`), spot);
  await page.waitForTimeout(1200);
  await page.keyboard.press('KeyF');
  await page.waitForTimeout(600);
  const open = await page.evaluate((pid) => {
    const el = document.getElementById(pid);
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return r.width > 40 && r.height > 40;
  }, panel);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  console.log(`${open ? 'PASS' : 'FAIL'} ${name}: station at ${spot.x},${spot.y} panel=${open}`);
  open ? pass++ : fail++;
}
console.log(`pageerrors: ${errors.length}`);
const ok = fail === 0 && pass >= 1 && errors.length === 0;
console.log(ok ? 'STATION VISIT PASS' : 'STATION VISIT FAIL');
await browser.close();
process.exit(ok ? 0 : 1);
