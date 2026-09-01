// Parity gate v5 (the toggle battery): hybrid vs canvas in ONE session.
// v5 crops the perf HUD column from sampling (stage-ON prints extra
// confession rows — a constant text delta that drowned real parity)
// and takes SCENES=/ORIGIN= envs for scoped runs. KNOWN MARGINAL: the
// crown pair fails the +60 gate by ~10-15 on BOTH the atlas and
// pre-atlas builds (willow-sway/NPC-motion/AA class, documented since
// the epic) — judge crown against its control, not the bare gate.
// Parity gate v4: alternate ON/OFF captures at ONE fixed cadence.
// sig = adjacent cross-mode pairs (T apart); noise = same-mode pairs
// (2T apart — animation noise GROWS with separation, so this upper-
// bounds the animation share of every sig pair). Medians of several
// pairs, so one flame-flicker beat can't decide the verdict. v3's
// flaw: its null control sat 350ms apart while its toggle pairs sat
// ~800ms apart — the crown's slow brazier flicker made honest frames
// fail. The gate must measure its control at (at least) the
// separation of its measurement.
import { chromium } from '/Users/aeriek/.npm/_npx/705bc6b22212b352/node_modules/playwright/index.mjs';

const ONLY = process.env.SCENES?.split(',');
const SCENES = [
  { name: 'dawnmead', tp: '/tp 30 18' },
  { name: 'avenue', tp: '/tp -448 -264' },
  { name: 'graveyard', tp: '/tp -512 -212' },
  { name: 'hoargate', tp: '/tp -333 -261' },
  { name: 'forest', tp: '/tp 34 110' },
  { name: 'crown-noon', tp: '/tp -448 -320' },
  { name: 'crown-evening', tp: '/tp -448 -320', time: '/time 16.5' },
].filter((s) => !ONLY || ONLY.includes(s.name));

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await (await browser.newContext({ viewport: { width: 1500, height: 900 }, deviceScaleFactor: 2 })).newPage();
page.on('pageerror', (e) => console.log('[pageerror]', e.message.slice(0, 300)));
await page.goto((process.env.ORIGIN ?? 'http://localhost:5231') + '/?perf&stage=world');
await page.fill('#login-user', 'perf12_probe');
await page.fill('#login-pass', 'probe-owl-9127');
await page.click('#login-submit');
await page.waitForFunction(() => window.dcGame && window.dcGame.connStatus === 'ingame', null, { timeout: 30000 });
await page.waitForTimeout(2000);
await page.evaluate(() => { window.dcRenderer.camera.setZoom(1); });

const grab = () => page.evaluate(() => {
  const cv = document.getElementById('game');
  // Crop the perf HUD's column: stage-ON prints extra confession rows
  // there, a constant text delta that would drown real pixel parity.
  const im = cv.getContext('2d').getImageData(0, 0, Math.floor(cv.width * 0.66), cv.height).data;
  const out = [];
  for (let i = 0; i < im.length; i += 997) out.push(im[i]);
  return out;
});
const diff = (a, b) => { let d = 0; for (let i = 0; i < a.length; i++) if (Math.abs(a[i] - b[i]) > 6) d++; return d; };
const median = (xs) => [...xs].sort((a, b) => a - b)[xs.length >> 1];
const setStage = (on) => page.evaluate((v) => { window.dcRenderer.stageGround = v; window.dcRenderer.stageWorld = v; }, on);

let allOk = true;
for (const scene of SCENES) {
  await page.evaluate(({ tp, time }) => { window.dcGame.sendChat(time ?? '/time 12'); window.dcGame.sendChat(tp); }, scene);
  await page.waitForTimeout(5000);
  // 9 captures, alternating ON/OFF, fixed 400ms cadence.
  const caps = [];
  for (let i = 0; i < 9; i++) {
    await setStage(i % 2 === 0);
    await page.waitForTimeout(400);
    caps.push(await grab());
  }
  const sigs = [];
  const noises = [];
  for (let i = 0; i + 1 < caps.length; i++) sigs.push(diff(caps[i], caps[i + 1]));
  for (let i = 0; i + 2 < caps.length; i++) noises.push(diff(caps[i], caps[i + 2]));
  const sig = median(sigs);
  const noise = median(noises);
  const perf = await page.evaluate(() => window.dcRenderer.perfSummary());
  const line = perf.split('\n').filter((l) => l.startsWith('stage world')).join('');
  const ok = sig <= noise + 60;
  allOk = allOk && ok;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${scene.name}: sig ${sig} (${sigs.join(',')})  noise2T ${noise} (${noises.join(',')})  | ${line}`);
}
console.log(allOk ? 'PARITY GATE PASS' : 'PARITY GATE FAIL');
await browser.close();
process.exit(allOk ? 0 : 1);
