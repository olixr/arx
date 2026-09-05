/**
 * THE MATTER LAB — the `?fx` audit lever (the `?icons` contract:
 * the game boots untouched, the lever rides on top).
 *
 * Stand anywhere in the live world and cycle material × deployment:
 *   [ / ]   previous / next material
 *   , / .   previous / next deployment
 *   Enter   cast at a fixed offset south-east of the hero
 *   \       toggle repeat (re-casts as each run ends — for tuning)
 *   e / E   previous / next COMPOSED EFFECT (particles v6 library) —
 *           selecting one puts the lab in effect mode; Enter casts it
 *   m       back to matter mode
 *
 * Every cast goes through the SAME registry the signatures will use;
 * what the lab shows is exactly what abilities inherit. The registry
 * also lands on window.dcMatter for the Playwright audit harness.
 *
 * THE STATUS WING (statusBook Phase 4):
 *   s       cycle the forced status on the OWN body (off → each page)
 *   S       cycle the forced stack tier (1..5) for the nibble reads
 * The wing writes renderer.statusAuditBits — the ambience, tier
 * escalation, and glyph row can be photographed without a live
 * applier; 'off' returns the body to the wire's truth.
 */

import type { Renderer } from '../render/renderer.js';
import type { ClientGame } from '../game/clientGame.js';
import { MATTER } from '../render/matter/index.js';
import type { MatterCtx } from '../render/matter/index.js';
import { EFFECT_LIST } from '../render/fx/library/index.js';
import {
  AFFLICTION_STACKS_SHIFT,
  COUNT_STACKS_SHIFT,
  STATUS_BIT,
  STATUS_IDS,
  STATUS_BOOK,
} from '@arx/shared';

export function startFxLab(game: ClientGame, renderer: Renderer): void {
  (window as unknown as { dcMatter: typeof MATTER }).dcMatter = MATTER;

  const ids = Object.keys(MATTER);
  let mi = 0;
  let di = 0;
  // THE COMPOSER's roster rides beside the matter roster: ei ≥ 0 means
  // Enter casts EFFECT_LIST[ei] instead of a material deployment.
  let ei = -1;
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

  let si = -1; // -1 = the wing is off; else an index into STATUS_IDS
  let tier = 1;

  const auditBits = (): number => {
    if (si < 0) return 0;
    const id = STATUS_IDS[si]!;
    const model = STATUS_BOOK[id].stacking.model;
    let bits = STATUS_BIT[id];
    if (model === 'perSource') bits |= Math.min(15, tier) << AFFLICTION_STACKS_SHIFT;
    else if (model === 'count') bits |= Math.min(15, tier) << COUNT_STACKS_SHIFT;
    return bits;
  };

  const show = () => {
    const mat = MATTER[ids[mi]!]!;
    const deps = depsOf(mi);
    const dep = deps[di]!;
    const wing = si < 0 ? 'off' : `${STATUS_IDS[si]} x${tier}`;
    const head = ei >= 0
      ? `EFFECT LAB  ${EFFECT_LIST[ei]!.id}  (${ei + 1}/${EFFECT_LIST.length})`
      : `MATTER LAB  ${mat.name} . ${dep}  (${mi + 1}/${ids.length} · ${di + 1}/${deps.length})`;
    label.textContent =
      head +
      `${repeat ? '  [repeat]' : ''}  status:${wing}` +
      `\n[ ] material   , . deployment   e E effect   m matter   Enter cast   \\ repeat   s status   S tier`;
  };

  const cast = () => {
    const own = game.predictor.renderPos();
    const mat = MATTER[ids[mi]!]!;
    const dep = mat.deployments[depsOf(mi)[di]!]!;
    // A fixed stage SE of the hero: clear of the body, close enough
    // to audit occlusion when the deployment reaches back over it.
    const x = own.x + 0.9;
    const y = own.y + 0.4;
    if (ei >= 0) {
      renderer.castEffect(EFFECT_LIST[ei]!.id, x, y, { x2: x + 1.8, y2: y - 0.6, dir: 0, radius: 1 });
    } else {
      dep(ctx, x, y, { x2: x + 1.8, y2: y - 0.6, dir: 0 });
    }
    if (repeat) repeatTimer = setTimeout(cast, 2400);
  };

  window.addEventListener('keydown', (e) => {
    if (e.key === '[') mi = (mi + ids.length - 1) % ids.length;
    else if (e.key === ']') mi = (mi + 1) % ids.length;
    else if (e.key === ',') di = (di + depsOf(mi).length - 1) % depsOf(mi).length;
    else if (e.key === '.') di = (di + 1) % depsOf(mi).length;
    else if (e.key === 'e') ei = ei < 0 ? EFFECT_LIST.length - 1 : (ei + EFFECT_LIST.length - 1) % EFFECT_LIST.length;
    else if (e.key === 'E') ei = (ei + 1) % EFFECT_LIST.length;
    else if (e.key === 'm') ei = -1;
    else if (e.key === 'Enter') cast();
    else if (e.key === '\\') {
      repeat = !repeat;
      if (!repeat && repeatTimer) clearTimeout(repeatTimer);
      if (repeat) cast();
    } else if (e.key === 's') {
      si = si + 1 >= STATUS_IDS.length ? -1 : si + 1;
      renderer.statusAuditBits = auditBits();
    } else if (e.key === 'S') {
      tier = (tier % 5) + 1;
      renderer.statusAuditBits = auditBits();
    } else return;
    di = Math.min(di, depsOf(mi).length - 1);
    show();
    e.stopPropagation();
  }, { capture: true });

  show();
}
