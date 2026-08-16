import type { ClientGame } from '../game/clientGame.js';
import type { Renderer } from '../render/renderer.js';
import { partyColor } from './map/markers.js';

/**
 * THE PARTY WAYFINDER — edge pills for fellows beyond the screen.
 *
 * Smoked-glass tier, the waypoint pill's pooled sibling: one pill per
 * party member whose ticker position is live, shown ONLY while they are
 * off screen (a fellow you can see needs no pointing at — that is the
 * unobtrusive law). Each pill rides the screen edge along the bearing,
 * chevron inked in the member's identity color, distance in tiles.
 * Fellows across the band veil (surface vs dungeon) are unpointable
 * and get no pill.
 */
export class PartyHud {
  private readonly pills = new Map<
    string,
    { el: HTMLElement; arrowWrap: HTMLElement; name: HTMLElement; dist: HTMLElement }
  >();

  /** Per-frame from the main loop. Pass hidden=true to suppress. */
  update(game: ClientGame, renderer: Renderer, hidden: boolean): void {
    const pos = game.predictor.pos;
    const fellows = hidden || game.ownEid === null ? [] : game.partyFellowsPlaced();
    const seen = new Set<string>();
    const w = window.innerWidth;
    const h = window.innerHeight;
    // Same chrome margins as the waypoint pill, nudged up a step so a
    // fellow and the flag on one bearing stack instead of overlap.
    const mx = 74;
    const myTop = 100;
    const myBot = 176;

    for (const f of fellows) {
      // THE WORLDS APART: fellows across the plane veil are
      // unpointable — coordinates in another world mean nothing here.
      if (f.plane !== game.plane.id) continue;
      const p = renderer.camera.worldToScreen(f.x, f.y, w, h);
      p.y -= renderer.renderLift(f.x, f.y) * renderer.camera.scale;
      const onScreen = p.x >= 0 && p.x <= w && p.y >= 0 && p.y <= h;
      if (onScreen) continue; // visible kin need no pointing at
      seen.add(f.name);
      const pill = this.pill(f.name);
      const distTiles = Math.hypot(f.x - pos.x, f.y - pos.y);
      pill.dist.textContent = `${Math.max(1, Math.round(distTiles))}`;

      const cx = w / 2;
      const cy = h / 2;
      const ang = Math.atan2(p.y - cy, p.x - cx);
      const dx = Math.cos(ang);
      const dy = Math.sin(ang);
      const tx = dx > 0 ? (w - mx - cx) / dx : dx < 0 ? (mx - cx) / dx : Infinity;
      const ty = dy > 0 ? (h - myBot - cy) / dy : dy < 0 ? (myTop - cy) / dy : Infinity;
      const t = Math.min(tx, ty);
      pill.el.style.transform = `translate(${Math.round(cx + dx * t)}px, ${Math.round(cy + dy * t)}px) translate(-50%, -50%)`;
      pill.arrowWrap.style.transform = `rotate(${ang}rad)`;
      pill.el.classList.remove('hidden');
    }

    for (const [name, pill] of this.pills) {
      if (seen.has(name)) continue;
      pill.el.classList.add('hidden');
      // A name gone from the party altogether releases its pill.
      if (!fellows.some((f) => f.name === name)) {
        pill.el.remove();
        this.pills.delete(name);
      }
    }
  }

  /** Get or build the pill for a member — built once, repositioned forever. */
  private pill(name: string) {
    let pill = this.pills.get(name);
    if (pill) return pill;
    const el = document.createElement('div');
    el.className = 'party-pill hidden';

    const arrowWrap = document.createElement('div');
    arrowWrap.className = 'wp-arrow';
    const cnv = document.createElement('canvas');
    cnv.width = 24;
    cnv.height = 24;
    const ctx = cnv.getContext('2d')!;
    // The waypoint's monoline chevron at kin scale, in identity ink.
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(12, 9, 5, 0.6)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(7.5, 6.8);
    ctx.lineTo(18, 12.3);
    ctx.lineTo(7.5, 17.8);
    ctx.stroke();
    ctx.strokeStyle = partyColor(name);
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(7, 6.5);
    ctx.lineTo(17.5, 12);
    ctx.lineTo(7, 17.5);
    ctx.stroke();
    arrowWrap.appendChild(cnv);

    const nameEl = document.createElement('span');
    nameEl.className = 'pp-name';
    nameEl.textContent = name;
    const dist = document.createElement('span');
    dist.className = 'pp-dist';

    el.append(arrowWrap, nameEl, dist);
    document.getElementById('hud')!.appendChild(el);
    pill = { el, arrowWrap, name: nameEl, dist };
    this.pills.set(name, pill);
    return pill;
  }
}
