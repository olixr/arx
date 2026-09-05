// PARTICLES v6 lab probe (docs/particles-v6-plan.md). LAB=<vite origin serving fxlab.html>, OUT=<dir>.
// Contact sheet: node sheet.mjs <effect> <moments csv> <k> [outname]
import { chromium } from '/Users/aeriek/.npm/_npx/705bc6b22212b352/node_modules/playwright/index.mjs';
const OUT = process.env.OUT ?? process.cwd();
const LAB = process.env.LAB ?? 'http://localhost:5299';
const fx = process.argv[2] ?? 'fire.burst';
const moments = (process.argv[3] ?? '0.05,0.2,0.45,0.9,1.6,2.6,4,6').split(',').map(Number);
const k = process.argv[4] ?? '64';
const name = process.argv[5] ?? fx.replace('.', '_');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(`${LAB}/fxlab.html?auto=0&fx=${fx}&k=${k}&seed=7`);
await page.waitForFunction(() => window.fxlab, null, { timeout: 15000 });
await page.evaluate((m) => window.fxlab.contact(m, 340, 300), moments);
const file = `${OUT}/${name}.png`;
await page.locator('#contact').screenshot({ path: file });
const st = await page.evaluate(() => window.fxlab.stats());
console.log(`${fx} k=${k} → ${file}  update ${st.update.toFixed(2)}ms draw ${st.draw.toFixed(2)}ms`);
if (errors.length) console.log('ERRORS', errors);
await browser.close();
