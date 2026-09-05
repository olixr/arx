// PARTICLES v6 lab probe (docs/particles-v6-plan.md). LAB=<vite origin serving fxlab.html>, OUT=<dir>.
// Perf receipt: N simultaneous casts of an effect, stepped 90 frames, update/draw ms sampled per frame.
import { chromium } from '/Users/aeriek/.npm/_npx/705bc6b22212b352/node_modules/playwright/index.mjs';
const fx = process.argv[2] ?? 'fire.burst';
const n = Number(process.argv[3] ?? 24);
const LAB = process.env.LAB ?? 'http://localhost:5299';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 900 } })).newPage();
await page.goto(`${LAB}/fxlab.html?auto=0&fx=${fx}&k=64&seed=3`);
await page.waitForFunction(() => window.fxlab, null, { timeout: 15000 });
const r = await page.evaluate(({ n }) => {
  const lab = window.fxlab;
  lab.stress(n);
  const up = [], dr = [], grains = [];
  for (let f = 0; f < 120; f++) {
    const t0 = performance.now();
    lab.step(1, 1 / 60); // step + render
    const s = lab.stats();
    grains.push(s.grains);
    up.push(s.update); dr.push(s.draw);
    if (f === 30) lab.stress(n); // a second wave mid-life
  }
  const q = (a, p) => { const b = [...a].sort((x, y) => x - y); return b[Math.floor(p * (b.length - 1))]; };
  return { peak: Math.max(...grains), quality: lab.stats().quality,
    update: { p50: q(up, 0.5), p90: q(up, 0.9), max: Math.max(...up) },
    draw: { p50: q(dr, 0.5), p90: q(dr, 0.9), max: Math.max(...dr) } };
}, { n });
console.log(fx, `${n}+${n} casts`, JSON.stringify(r));
await browser.close();
