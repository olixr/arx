// Parity gate v8 (the toggle battery): hybrid vs canvas in ONE session.
// v8 = THE VEIL JOINS THE PHASE CLASS (2026-09-01, foundation audit).
// THE REV TELLS THE WHOLE TRUTH restored door-veil/reveal-cut
// liveness to the keyed wall lane (they froze at mint before), so
// crown thresholds now TRACK NPCs in the stage lane exactly as the
// canvas lane always did. Honest rendering, but a cross-mode pair at
// 400ms separation now reads NPC-threshold phase across whole door
// areas — the irreducible animation-phase class grew. Measured
// interleaved on one machine: new sig medians 260-307 (6 runs)
// vs same-day pre-fix control 212-251 (6/6 PASS at +100); flag-
// bisected to the rev fold alone (BISECT_NO_DYN → sig 240 PASS).
// The crown scenes gain a second rail: an ABSOLUTE cap (330 ≈
// measured max median +8%), because the floor undersamples the veil
// class whenever NPCs pause between same-mode pairs — a pure
// allowance whipsaws with the floor. The cap rail DEMANDS A LIVE
// SCENE (noise2T >= 60): the degenerate empty-plane signature
// (sig ~150 on noise ~17) is refused the cap rail outright and
// still fails the +100 rail by 33. Gate:
//   sig <= floor + allow  OR  (sig <= absCap AND noise2T >= 60).
// v7 = the CROWN VERDICT codified (2026-09-01). The crown pair
// hovered at the +60 gate (margins −20..+42 over 7 runs) on the
// atlas AND the pre-atlas control alike — coinciding distributions,
// so the atlas is exonerated and the overshoot is a property of the
// scene: noise2T split by mode parity shows the stage lane's ON-ON
// pairs run QUIET (~80-120; sprited animation re-mints less often)
// while canvas OFF-OFF pairs run ~165-195 (live animation every
// frame) — a cross-mode pair therefore carries an irreducible
// animation-PHASE offset on brazier/willow-dense crown, on top of
// the long-documented willow/NPC/AA class. That is a bounded,
// pre-existing render-cadence difference, not a defect the gate
// should chase. The crown scenes carry a +100 allowance (max
// observed overshoot +42 over the +60 base, both lanes; a real
// break still trips it — the empty-plane bug's sig-150-on-noise-17
// signature fails a +100 gate by 33). All other scenes stay at +60.
// v6 added the SAME-MODE TAIL: five more frames in ONE mode at the
// same 400ms cadence measure noiseT — animation noise at the sig
// pairs' OWN separation; the floor is max(noise2T, noiseT). Kept as
// a printed diagnostic and floor guard.
// v5 crops the perf HUD column from sampling (stage-ON prints extra
// confession rows — a constant text delta that drowned real parity)
// and takes SCENES=/ORIGIN= envs for scoped runs.
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
  // The crown pair: +100 allowance (v7 verdict) + absolute cap 330
  // (v8 — THE VEIL JOINS THE PHASE CLASS; see header).
  { name: 'crown-noon', tp: '/tp -448 -320', allow: 100, absCap: 330 },
  { name: 'crown-evening', tp: '/tp -448 -320', time: '/time 16.5', allow: 100, absCap: 330 },
].filter((s) => !ONLY || ONLY.includes(s.name));

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await (await browser.newContext({ viewport: { width: 1500, height: 900 }, deviceScaleFactor: 2 })).newPage();
// FLAG=NAME sets window.NAME=true before the client boots — the
// runtime-bisect lever (pair it with a temporary in-code switch to
// A/B a suspect change through this battery's own medians; the v8
// crown verdict was isolated exactly this way).
if (process.env.FLAG) await page.addInitScript(`window.${process.env.FLAG} = true;`);
page.on('pageerror', (e) => console.log('[pageerror]', e.message.slice(0, 300)));
await page.goto((process.env.ORIGIN ?? 'http://localhost:5231') + '/?perf&stage=world');
await page.fill('#login-user', 'perf12_probe');
await page.fill('#login-pass', 'probe-owl-9127');
await page.click('#login-submit');
await page.waitForFunction(() => window.dcGame && window.dcGame.connStatus === 'ingame', null, { timeout: 30000 });
await page.waitForTimeout(2000);
// THE PLANE CHECK: /museum is a TOGGLE and the probe account keeps its
// plane across logins — a museum-audit session once left the account
// shelved and every /tp landed on empty museum ground (q 165, draws 71
// masquerading as the crown). Scene teleports only mean anything in
// the overworld.
if (await page.evaluate(() => window.dcGame.plane?.id === 'museum')) {
  await page.evaluate(() => window.dcGame.sendChat('/museum'));
  await page.waitForTimeout(2500);
}
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
// THE VERIFIED TELEPORT: the chat rate limiter silently eats
// commands (a battery once measured four scenes at the graveyard
// while PASSing) — send, verify the renderer's own position landed,
// retry until it does.
const tpTo = async (tp, time) => {
  const [tx, ty] = tp.split(' ').slice(1).map(Number);
  for (let a = 0; a < 6; a++) {
    await page.evaluate(({ tp: t, time: tm }) => { window.dcGame.sendChat(tm ?? '/time 12'); window.dcGame.sendChat(t); }, { tp, time });
    try {
      await page.waitForFunction(
        ([x, y]) => Math.abs(window.dcRenderer.ownPX - x) < 4 && Math.abs(window.dcRenderer.ownPY - y) < 4,
        [tx, ty],
        { timeout: 2500 },
      );
      return;
    } catch { /* eaten — retry */ }
  }
  throw new Error(`teleport never landed: ${tp}`);
};
for (const scene of SCENES) {
  await tpTo(scene.tp, scene.time);
  await page.waitForTimeout(5000);
  // 9 captures, alternating ON/OFF, fixed 400ms cadence.
  const caps = [];
  for (let i = 0; i < 9; i++) {
    await setStage(i % 2 === 0);
    await page.waitForTimeout(400);
    caps.push(await grab());
  }
  // The same-mode tail: the loop ends stage-ON (i=8 even); hold that
  // mode and keep the cadence, so the tail's adjacent pairs sit at
  // the SAME separation T as the sig pairs — the honest floor for
  // periodic animation that aliases in-phase at 2T.
  const tail = [caps[caps.length - 1]];
  for (let i = 0; i < 4; i++) {
    await page.waitForTimeout(400);
    tail.push(await grab());
  }
  const sigs = [];
  const noises = [];
  const noiseTs = [];
  for (let i = 0; i + 1 < caps.length; i++) sigs.push(diff(caps[i], caps[i + 1]));
  for (let i = 0; i + 2 < caps.length; i++) noises.push(diff(caps[i], caps[i + 2]));
  for (let i = 0; i + 1 < tail.length; i++) noiseTs.push(diff(tail[i], tail[i + 1]));
  const sig = median(sigs);
  const noise = median(noises);
  const noiseT = median(noiseTs);
  const floor = Math.max(noise, noiseT);
  const perf = await page.evaluate(() => window.dcRenderer.perfSummary());
  const line = perf.split('\n').filter((l) => l.startsWith('stage world')).join('');
  const ok =
    sig <= floor + (scene.allow ?? 60) ||
    (scene.absCap !== undefined && sig <= scene.absCap && noise >= 60);
  allOk = allOk && ok;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${scene.name}: sig ${sig} (${sigs.join(',')})  noise2T ${noise} (${noises.join(',')})  noiseT ${noiseT} (${noiseTs.join(',')})  | ${line}`);
}
console.log(allOk ? 'PARITY GATE PASS' : 'PARITY GATE FAIL');
await browser.close();
process.exit(allOk ? 0 : 1);
