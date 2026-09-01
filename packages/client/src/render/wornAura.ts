/**
 * THE WORN LIGHT'S KEEPING — the carried glow: motion tracking, cape
 * wake, and the corona a lit body wears.
 * Moved verbatim off the Renderer class (foundations F2 wave B); the
 * painters reach the engine through the shared PaintHost slice.
 */
import { ElementTint, WORN_LIGHT_BODY_BUDGET, WORN_LIGHT_FAR, WornLight, resolveWornLight, tierGlowAlpha, tierGlowRadius, tierMoteRate, wornLightFalloff } from './wornLight.js';
import { hashString } from '@arx/shared';
import type { PaintHost } from './paintHost.js';

/**
 * The world-space half of the worn-light grammar (wornLight.ts holds
 * the law): the trail under the boots, the wake off the cape, and the
 * body-wide corona. The body-space half — brow, weave, knuckles,
 * greaves, rune face — rides the rig, where the joints are known.
 *
 * Called once per lit body per frame from collectEntities. Rate-gated
 * on frameDt exactly like statusAmbience, so the effect costs the
 * same at 30fps and 144fps.
 */
export function wornLight(rend: PaintHost, 
  key: string | number,
  x: number,
  y: number,
  dir: number,
  ench: Partial<Record<string, string>> | undefined,
  isOwn: boolean,
  /**
   * True while this body is riding a netcode correction glide
   * (InterpBuffer.gliding): the motion on screen is presentation,
   * not travel, so the trail and wake must not read it as a sprint.
   */
  gliding = false,
): void {
  if (!ench) {
    rend.wornMotion.delete(key);
    return;
  }
  const light = resolveWornLight(ench);
  if (!light.any) {
    rend.wornMotion.delete(key);
    return;
  }
  // THE READABILITY CAP: your own light is always full; other people's
  // fades with range and falls silent past the far mark.
  const dist = isOwn ? 0 : Math.hypot(x - rend.wornOrigin.x, y - rend.wornOrigin.y);
  if (dist >= WORN_LIGHT_FAR) {
    rend.wornMotion.delete(key);
    return;
  }
  // Full voice inside the near ring, easing to silence at the far
  // mark — a party member two tiles away speaks as loudly as you do.
  const voice = wornLightFalloff(dist, isOwn);
  // The crowd backstop: past the budget, remote bodies keep their glow
  // (which is cheap and reads at a glance) and stop shedding matter.
  rend.wornLitBodies++;
  const mayShed = isOwn || rend.wornLitBodies <= WORN_LIGHT_BODY_BUDGET;

  const now = performance.now();
  let speed = trackWornMotion(rend, key, x, y, now);
  if (gliding) {
    // A correction glide is not travel: bank no stride, report no
    // speed, and let the corona (which only needs a position) keep
    // the body lit while it slides onto the truth.
    const m = rend.wornMotion.get(key);
    if (m) {
      m.stride = 0;
      m.speed = 0;
    }
    speed = 0;
  }

  if (light.slots.boots) rend.trail(key, x, y, dir, speed, light.slots.boots, voice, mayShed);
  if (light.slots.cape) capeWake(rend, x, y, dir, speed, light.slots.cape, voice, mayShed);
  wornCorona(rend, key, x, y, light, voice, mayShed);
}

/**
 * Ground speed, in tiles per second, for a body we only ever see
 * positions of. Remote bodies arrive interpolated and own arrives
 * predicted, so measuring the delta is both the simplest and the most
 * honest source: whatever the body VISIBLY did is what the trail
 * answers to.
 */
export function trackWornMotion(rend: PaintHost, key: string | number, x: number, y: number, now: number): number {
  const m = rend.wornMotion.get(key);
  if (!m) {
    rend.wornMotion.set(key, { x, y, t: now, speed: 0, stride: 0, foot: 0, seen: rend.frameNo, heading: NaN });
    return 0;
  }
  const dt = (now - m.t) / 1000;
  m.seen = rend.frameNo;
  // A long gap means the body left interest and came back somewhere
  // else; teleports and respawns land here too. Re-seed rather than
  // reporting a thousand tiles per second and painting a stripe
  // across the map. (Sub-3-tile correction GLIDES pass this guard on
  // purpose — wornLight gates them with InterpBuffer.gliding, so a
  // standing body sliding onto its corrected path sheds nothing.)
  const step = Math.hypot(x - m.x, y - m.y);
  if (dt <= 0) return m.speed;
  if (dt > 0.5 || step > 3) {
    m.x = x;
    m.y = y;
    m.t = now;
    m.speed = 0;
    m.stride = 0;
    m.heading = NaN;
    return 0;
  }
  // The travel heading is measured HERE, from the delta, before the
  // sync erases it — trail() consumes it so prints point the way the
  // body ran, never the way it aimed. Kept through pauses (a runner
  // who stops mid-stride still knows which way they were going).
  if (step > 1e-4) m.heading = Math.atan2(y - m.y, x - m.x);
  // Low-passed: raw frame deltas jitter badly against interpolation,
  // and a trail that flickers on and off at the speed gate would be
  // worse than no trail at all.
  const raw = step / dt;
  m.speed += (raw - m.speed) * Math.min(1, dt * 9);
  m.stride += step;
  m.x = x;
  m.y = y;
  m.t = now;
  return m.speed;
}

/**
 * THE WAKE. The cape's channel: matter shedding off the trailing hem,
 * behind the body and low, so it reads as the garment leaving light
 * behind rather than the body being on fire. Motion-scaled, because a
 * standing cape has no wake.
 */
export function capeWake(rend: PaintHost, 
  x: number,
  y: number,
  dir: number,
  speed: number,
  slot: { element: string; tier: number; tint: ElementTint },
  voice: number,
  mayShed: boolean,
): void {
  if (!mayShed) return;
  const drive = Math.min(1, speed / 4.2) * voice;
  // A tier-3 mantle keeps a slow wake even at rest: the cloth is
  // charged, not merely moving. A tier-5 mantle keeps a REAL one —
  // the comet wake standing off a still body is the fifth band's
  // silhouette-touching read on this channel.
  const rest = slot.tier >= 5 ? 0.4 : 0.15;
  const rate = tierMoteRate(slot.tier) * (rest + drive * (1 - rest));
  if (rate <= 0 || Math.random() >= rend.frameDt * rate) return;
  const back = dir + Math.PI;
  rend.particles.burst(
    x + Math.cos(back) * 0.26 + (Math.random() - 0.5) * 0.16,
    y + Math.sin(back) * 0.12 - 0.5 - Math.random() * 0.25,
    1,
    [slot.tint.core, slot.tint.fleck],
    {
      speed: 0.3 + drive * 0.9,
      dir: back,
      spread: 0.55,
      life: 0.5 + Math.random() * 0.35,
      size: 0.06,
      gravity: -0.5,
      drag: 1.7,
      shape: 'glint',
    },
  );
}

/**
 * The body-wide corona. Tier is loudness: a tier-1 kit gets nothing
 * here (its whole voice is the per-slot glint on the rig), tier 2
 * gets a quiet lamp that becomes real scene light after dark, and
 * tier 3 gets the living charge that marks a walking masterwork.
 *
 * The corona answers the STRONGEST worn working only. Summing eight
 * of them would put a bonfire on anyone with a full kit and undo the
 * per-slot reading the whole grammar is built on.
 */
export function wornCorona(rend: PaintHost, key: string | number, x: number, y: number, light: WornLight, voice: number, mayShed: boolean): void {
  const best = light.best;
  if (!best) return;
  const alpha = tierGlowAlpha(best.tier);
  if (alpha <= 0) return;
  const t = performance.now() / 1000;
  const dt = rend.frameDt;
  // The corona breathes — never a steady lamp, always a living charge.
  // Phased by a stable per-body seed, never by position: a phase that
  // rode world-x would flutter at ~2.7 Hz on a running body, turning
  // the slow breath into a strobe.
  const phase = (typeof key === 'number' ? key : hashString(key)) % 61;
  const breath = 0.5 + 0.5 * Math.sin(t * 2.1 + phase);
  const r = tierGlowRadius(best.tier);
  rend.queueGlow(x, y - 0.45, r + breath * 0.25, best.tint.glow, (alpha + breath * 0.1) * voice);
  if (!mayShed || best.tier < 3) return;
  // Rising motes on a loose ring around the body — the supercharged read.
  if (Math.random() < dt * 7 * voice) {
    const a = Math.random() * Math.PI * 2;
    const rr = 0.32 + Math.random() * 0.2;
    rend.particles.burst(x + Math.cos(a) * rr, y - 0.15 + Math.sin(a) * rr * 0.5, 1, [best.tint.core, best.tint.fleck], {
      speed: 0.12,
      life: 0.9,
      size: 0.06,
      gravity: -1.6,
      drag: 1.2,
    });
  }
  // The occasional tangential spark whipping around the corona.
  if (Math.random() < dt * 2.5 * voice) {
    const a = Math.random() * Math.PI * 2;
    rend.particles.burst(x + Math.cos(a) * 0.42, y - 0.3 + Math.sin(a) * 0.2, 1, [best.tint.fleck], {
      speed: 1.6,
      dir: a + Math.PI / 2,
      spread: 0.3,
      life: 0.25,
      size: 0.05,
      gravity: 0,
    });
  }
}
