// THE COMPOSED FRAME'S TABLE (painted-stage §A5) — the before/after
// bench: stage OFF (the initial Canvas2D system) vs ON (the WebGL
// hybrid), unthrottled and at the 20x CPU throttle that reproduces the
// weak field machine, steady and moving-through-fresh-map. A FRESH page
// per configuration, stage chosen at login by URL — toggling mid-run
// measures arrival churn, not the product (learned the hard way).
import { chromium } from '/Users/aeriek/.npm/_npx/705bc6b22212b352/node_modules/playwright/index.mjs';

const SCENES = [
  { name: 'dawnmead', tp: '/tp 30 18' },
  { name: 'crown', tp: '/tp -448 -320' },
  { name: 'forest', tp: '/tp 34 110' },
];
const CIRCUIT = ['/tp 70 140', '/tp 110 120', '/tp 150 150', '/tp 110 180', '/tp 60 200', '/tp 20 170', '/tp -20 140', '/tp 30 110'];

const browser = await chromium.launch({ channel: 'chrome', headless: true });

async function run(rate, stage) {
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 900 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto('http://localhost:5231/?perf' + (stage ? '&stage=world' : ''));
  try {
    await page.waitForFunction(() => window.dcGame && window.dcGame.connStatus === 'ingame', null, { timeout: 6000 });
  } catch {
    await page.fill('#login-user', 'perf12_probe', { timeout: 5000 });
    await page.fill('#login-pass', 'probe-owl-9127');
    await page.click('#login-submit');
    await page.waitForFunction(() => window.dcGame && window.dcGame.connStatus === 'ingame', null, { timeout: 30000 });
  }
  // THE PLANE CHECK (see stage-parity.mjs): the probe account keeps
  // its plane across logins — leave the museum before any scene /tp.
  if (await page.evaluate(() => window.dcGame.plane?.id === 'museum')) {
    await page.evaluate(() => window.dcGame.sendChat('/museum'));
    await page.waitForTimeout(2500);
  }
  await page.evaluate(() => { window.dcRenderer.camera.setZoom(1); });
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate });
  const label = (stage ? 'STAGE ON ' : 'STAGE OFF') + ` x${rate}`;
  const sample = (ms) => page.evaluate(async (dur) => {
    const deltas = [];
    let last = performance.now();
    const start = performance.now();
    await new Promise((done) => {
      const tick = (now) => {
        deltas.push(now - last); last = now;
        if (now - start >= dur) return done();
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    deltas.shift();
    deltas.sort((a, b) => a - b);
    const q = (p) => deltas[Math.min(deltas.length - 1, Math.floor(deltas.length * p))];
    return { med: q(0.5), p90: q(0.9), worst: deltas[deltas.length - 1], fps: 1000 / q(0.5) };
  }, ms);
  const fmt = (r) => `med ${r.med.toFixed(1)}ms p90 ${r.p90.toFixed(1)} worst ${r.worst.toFixed(0)} (~${r.fps.toFixed(0)}fps)`;
  for (const sc of SCENES) {
    await page.evaluate((t) => { window.dcGame.sendChat('/time 12'); window.dcGame.sendChat(t); }, sc.tp);
    await page.waitForTimeout(rate === 1 ? 4000 : 10000);
    console.log(`${label} steady ${sc.name.padEnd(9)} ${fmt(await sample(rate === 1 ? 3000 : 5000))}`);
  }
  const rm = await page.evaluate(async (args) => {
    const deltas = [];
    let last = performance.now();
    let stop = false;
    const tick = (now) => { deltas.push(now - last); last = now; if (!stop) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    for (const t of args.hops) {
      window.dcGame.sendChat(t);
      await new Promise((r2) => setTimeout(r2, args.dwell));
    }
    stop = true;
    deltas.shift();
    deltas.sort((a, b) => a - b);
    const q = (p) => deltas[Math.min(deltas.length - 1, Math.floor(deltas.length * p))];
    return { med: q(0.5), p90: q(0.9), worst: deltas[deltas.length - 1], fps: 1000 / q(0.5) };
  }, { hops: CIRCUIT, dwell: rate === 1 ? 1100 : 2500 });
  console.log(`${label} MOVING circuit    ${fmt(rm)}`);
  const conf = await page.evaluate(() => window.dcRenderer.perfSummary());
  console.log(String(conf).split('\n').filter((l) => /^(ground|collect|world|chunks|stage world|bands)/.test(l)).map((l) => '   ' + l).join('\n'));
  await ctx.close();
}

for (const rate of [1, 20]) {
  console.log(`\n===== CPU throttle x${rate} =====`);
  for (const stage of [false, true]) await run(rate, stage);
}
await browser.close();
