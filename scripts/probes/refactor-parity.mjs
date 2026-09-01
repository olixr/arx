// Refactor-parity rig (foundations §7): BUILD-vs-BUILD frame compare.
// Two vites serve the same client at different commits (5231 = the
// refactored tree, 5232 = the baseline commit) against ONE rig server,
// so world state is shared. Per scene we visit A,B,A,B; each visit
// captures 3 frames at 400ms. sig = adjacent cross-build visit pairs,
// noise = same-build visit pairs (2x the separation — wander and
// animation noise GROW with separation, so this upper-bounds the
// animation share of every sig pair). A pure code move must sit
// inside the noise band: gate sig <= noise + 60.
import { chromium } from '/Users/aeriek/.npm/_npx/705bc6b22212b352/node_modules/playwright/index.mjs';

const SCENES = [
  { name: 'dawnmead', tp: '/tp 30 18' },
  { name: 'avenue', tp: '/tp -448 -264' },
  { name: 'graveyard', tp: '/tp -512 -212' },
  { name: 'hoargate', tp: '/tp -333 -261' },
  { name: 'forest', tp: '/tp 34 110' },
  { name: 'crown-noon', tp: '/tp -448 -320' },
  { name: 'crown-evening', tp: '/tp -448 -320', time: '/time 16.5' },
];
const ORIGINS = { A: 'http://localhost:5231', B: 'http://localhost:5232' };

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const ctxB = await browser.newContext({ viewport: { width: 1500, height: 900 }, deviceScaleFactor: 2 });
const page = await ctxB.newPage();
page.on('pageerror', (e) => console.log('[pageerror]', e.message.slice(0, 300)));

const grab = () => page.evaluate(() => {
  const cv = document.getElementById('game');
  const im = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
  const out = [];
  for (let i = 0; i < im.length; i += 997) out.push(im[i]);
  return out;
});
const diff = (a, b) => { let d = 0; for (let i = 0; i < a.length; i++) if (Math.abs(a[i] - b[i]) > 6) d++; return d; };
const median = (xs) => [...xs].sort((a, b) => a - b)[xs.length >> 1];

async function visit(build, scene) {
  await page.goto(`${ORIGINS[build]}/?perf`);
  // A stored token auto-logs in; only fill the form when it shows.
  try {
    await page.waitForFunction(() => window.dcGame && window.dcGame.connStatus === 'ingame', null, { timeout: 6000 });
  } catch {
    await page.fill('#login-user', 'perf12_probe', { timeout: 5000 });
    await page.fill('#login-pass', 'probe-owl-9127');
    await page.click('#login-submit');
    await page.waitForFunction(() => window.dcGame && window.dcGame.connStatus === 'ingame', null, { timeout: 30000 });
  }
  await page.evaluate(({ tp, time }) => {
    window.dcGame.sendChat(time ?? '/time 12');
    window.dcGame.sendChat(tp);
  }, scene);
  await page.waitForTimeout(4500);
  await page.evaluate(() => { window.dcRenderer.camera.setZoom(1); });
  await page.waitForTimeout(500);
  const caps = [];
  for (let i = 0; i < 3; i++) {
    caps.push(await grab());
    await page.waitForTimeout(400);
  }
  return caps;
}

const vDiff = (v1, v2) => {
  const ds = [];
  for (const a of v1) for (const b of v2) ds.push(diff(a, b));
  return median(ds);
};

let allOk = true;
for (const scene of SCENES) {
  const order = ['A', 'B', 'A', 'B'];
  const vs = [];
  for (const b of order) vs.push({ build: b, caps: await visit(b, scene) });
  const sigs = [];
  const noises = [];
  for (let i = 0; i + 1 < vs.length; i++) sigs.push(vDiff(vs[i].caps, vs[i + 1].caps));
  for (let i = 0; i + 2 < vs.length; i++) noises.push(vDiff(vs[i].caps, vs[i + 2].caps));
  const sig = median(sigs);
  const noise = median(noises);
  const ok = sig <= noise + 60;
  allOk = allOk && ok;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${scene.name}: sig ${sig} (${sigs.join(',')})  noise2T ${noise} (${noises.join(',')})`);
}
console.log(allOk ? 'REFACTOR PARITY PASS' : 'REFACTOR PARITY FAIL');
await browser.close();
process.exit(allOk ? 0 : 1);
