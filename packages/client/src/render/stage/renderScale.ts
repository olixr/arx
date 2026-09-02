/**
 * THE RENDER SCALE (foundation phase A2) — how much the WebGL stage
 * downsamples its backbuffer relative to the device's native dpr.
 *
 * The stage rasterizes into a backbuffer sized cssPx × dpr × dpr. On a
 * maximized Retina window (2560×1440 at dpr 2 → a 5120×2880 backbuffer)
 * that is the dpr² blowup: the presented drawing buffer and the alpha
 * layer FBO each cost tens of MB, and every one of those pixels is
 * shaded every frame — the fill-rate cost the accelerated display exists
 * to relieve on weak GPUs, exactly where a big window hurts most.
 *
 * Capping the render scale rasterizes the SAME geometry (positions stay
 * in full-dpr space, uRes unchanged) into a smaller viewport, then the
 * composite upsamples it. It trades a touch of world sharpness for
 * backbuffer/layer memory and fill rate; the UI, the 2D bake resolution,
 * and the content textures are all untouched. It is a QUALITY TIER, not
 * a fixed policy — the player owns the trade.
 *
 * Tiers:
 *  - full     — always native dpr. No cap, ever. Byte-identical to
 *               pre-A2 (render scale 1).
 *  - auto     — native dpr on small and medium windows; caps the
 *               EFFECTIVE dpr to 1.5 only past ~3.5 Mpx of CSS area (a
 *               maximized 27" Retina trips it; a 1080p window does not).
 *  - balanced — caps the effective dpr to 1.25 on ANY window past 1×,
 *               for machines that want the fill-rate everywhere.
 */
export type StageResTier = 'auto' | 'full' | 'balanced';

/** CSS-pixel area past which `auto` engages. 2560×1368 ≈ 3.5M — a
 *  maximized 27" Retina (2560×1440 = 3.69M) trips it; 1920×1080 (2.07M)
 *  and 1440×900 do not. */
export const STAGE_CAP_CSS_PX = 3_500_000;

/** Effective-dpr ceilings per capping tier. */
const CAP_AUTO = 1.5;
const CAP_BALANCED = 1.25;

export function isStageResTier(v: unknown): v is StageResTier {
  return v === 'auto' || v === 'full' || v === 'balanced';
}

/**
 * The render scale (0 < s ≤ 1) the stage backbuffer should use.
 * `s === 1` means native dpr (no change from pre-A2). The effective dpr
 * the stage rasterizes at is `dpr * s`.
 */
export function stageRenderScale(cssW: number, cssH: number, dpr: number, tier: StageResTier): number {
  // Nothing to cap on a non-HiDPI display, and `full` never caps.
  if (tier === 'full' || !(dpr > 1)) return 1;
  const cap = tier === 'balanced' ? CAP_BALANCED : CAP_AUTO;
  // `auto` leaves small/medium windows at native dpr — the blowup is a
  // big-window problem, and a capped small window is just soft for no
  // memory reason worth the sharpness.
  if (tier === 'auto' && cssW * cssH < STAGE_CAP_CSS_PX) return 1;
  if (cap >= dpr) return 1;
  return cap / dpr;
}
