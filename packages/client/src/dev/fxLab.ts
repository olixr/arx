/**
 * THE MATTER LAB — the `?fx` audit lever (the `?icons` contract:
 * the game boots untouched, the lever rides on top).
 *
 * Stand anywhere in the live world and cycle material × deployment:
 *   [ / ]   previous / next material
 *   , / .   previous / next deployment
 *   Enter   cast at a fixed offset south-east of the hero
 *   \       toggle repeat (re-casts as each run ends — for tuning)
 *
 * Every cast goes through the SAME registry the signatures will use;
 * what the lab shows is exactly what abilities inherit. The registry
 * also lands on window.dcMatter for the Playwright audit harness.
 */

import type { Renderer } from '../render/renderer.js';
import type { ClientGame } from '../game/clientGame.js';
import { MATTER } from '../render/matter/index.js';
import type { MatterCtx } from '../render/matter/index.js';

export function startFxLab(game: ClientGame, renderer: Renderer): void {
  (window as unknown as { dcMatter: typeof MATTER }).dcMatter = MATTER;

  const ids = Object.keys(MATTER);
  let mi = 0;
  let di = 0;
  let repeat = false;
  let repeatTimer: ReturnType<typeof setTimeout> | null = null;

  const label = document.createElement('div');
  label.id = 'fx-lab';
  label.style.cssText =
    'position:fixed;left:50%;bottom:4.5rem;transform:translateX(-50%);' +
    'padding:0.4rem 0.9rem;background:rgba(24,17,31,0.88);color:#e8dfc8;' +
    'font:600 0.85rem monospace;border:2px solid #241a2e;z-index:99;' +
    'pointer-events:none;white-space:pre;';
  document.body.appendChild(label);

  const ctx: MatterCtx = {
    particles: renderer.particles,
    glow: (x, y, r, rgb, a) => renderer.queueGlow(x, y, r, rgb, a),
  };

  const depsOf = (i: number) => Object.keys(MATTER[ids[i]!]!.deployments);

  const show = () => {
    const mat = MATTER[ids[mi]!]!;
    const deps = depsOf(mi);
    const dep = deps[di]!;
    label.textContent =
      `MATTER LAB  ${mat.name} . ${dep}` +
      `  (${mi + 1}/${ids.length} · ${di + 1}/${deps.length})` +
      `${repeat ? '  [repeat]' : ''}\n[ ] material   , . deployment   Enter cast   \\ repeat`;
  };

  const cast = () => {
    const own = game.predictor.renderPos();
    const mat = MATTER[ids[mi]!]!;
    const dep = mat.deployments[depsOf(mi)[di]!]!;
    // A fixed stage SE of the hero: clear of the body, close enough
    // to audit occlusion when the deployment reaches back over it.
    const x = own.x + 0.9;
    const y = own.y + 0.4;
    dep(ctx, x, y, { x2: x + 1.8, y2: y - 0.6, dir: 0 });
    if (repeat) repeatTimer = setTimeout(cast, 2400);
  };

  window.addEventListener('keydown', (e) => {
    if (e.key === '[') mi = (mi + ids.length - 1) % ids.length;
    else if (e.key === ']') mi = (mi + 1) % ids.length;
    else if (e.key === ',') di = (di + depsOf(mi).length - 1) % depsOf(mi).length;
    else if (e.key === '.') di = (di + 1) % depsOf(mi).length;
    else if (e.key === 'Enter') cast();
    else if (e.key === '\\') {
      repeat = !repeat;
      if (!repeat && repeatTimer) clearTimeout(repeatTimer);
      if (repeat) cast();
    } else return;
    di = Math.min(di, depsOf(mi).length - 1);
    show();
    e.stopPropagation();
  }, { capture: true });

  show();
}
