import { DUNGEON_MIN_Y } from '@arx/shared';
import type { ClientGame } from '../game/clientGame.js';
import type { Renderer } from '../render/renderer.js';

/**
 * THE WAYFINDER — the one waypoint's live compass on the HUD.
 *
 * Smoked-glass tier (v4.3: the live HUD only whispers): a small pill
 * with a rotating arrow and the distance in tiles. When the flag's
 * spot is on screen the pill floats OVER it (arrow tucked away); when
 * it's off screen the pill rides the screen edge, arrow aimed along
 * the bearing. Within a few tiles it dims — you have arrived, the
 * chart can rest.
 */
export class WaypointHud {
  private readonly el: HTMLElement;
  private readonly arrowWrap: HTMLElement;
  private readonly dist: HTMLElement;

  constructor() {
    this.el = document.createElement('div');
    this.el.id = 'waypoint-hud';
    this.el.classList.add('hidden');

    this.arrowWrap = document.createElement('div');
    this.arrowWrap.className = 'wp-arrow';
    const cnv = document.createElement('canvas');
    cnv.width = 28;
    cnv.height = 28;
    const ctx = cnv.getContext('2d')!;
    // A monoline chevron arrow pointing RIGHT (rotation 0), sky ink —
    // the waypoint's color everywhere on the chart.
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(12, 9, 5, 0.6)';
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.moveTo(8, 7.5);
    ctx.lineTo(21, 14);
    ctx.lineTo(8, 20.5);
    ctx.stroke();
    ctx.strokeStyle = '#7ec8e3';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(7, 7);
    ctx.lineTo(20, 13.5);
    ctx.lineTo(7, 20);
    ctx.stroke();
    this.arrowWrap.appendChild(cnv);

    this.dist = document.createElement('span');
    this.dist.className = 'wp-dist';

    this.el.append(this.arrowWrap, this.dist);
    document.getElementById('hud')!.appendChild(this.el);
  }

  /** Per-frame from the main loop. Pass hidden=true to suppress (screens, cinema, build). */
  update(game: ClientGame, renderer: Renderer, hidden: boolean): void {
    const wp = game.waypoint;
    const pos = game.predictor.pos;
    if (!wp || hidden || game.ownEid === null || pos.y >= DUNGEON_MIN_Y) {
      this.el.classList.add('hidden');
      return;
    }
    this.el.classList.remove('hidden');

    const w = window.innerWidth;
    const h = window.innerHeight;
    const p = renderer.camera.worldToScreen(wp.x + 0.5, wp.y + 0.5, w, h);
    p.y -= renderer.renderLift(wp.x + 0.5, wp.y + 0.5) * renderer.camera.scale;

    const distTiles = Math.hypot(wp.x + 0.5 - pos.x, wp.y + 0.5 - pos.y);
    this.dist.textContent = `${Math.max(0, Math.round(distTiles))}`;
    this.el.classList.toggle('wp-near', distTiles < 6);

    // Edge margins keep the pill clear of the chrome: chat left, dock
    // right, hotbar bottom.
    const mx = 74;
    const myTop = 64;
    const myBot = 140;
    const onScreen = p.x >= mx && p.x <= w - mx && p.y >= myTop && p.y <= h - myBot;
    if (onScreen) {
      this.el.style.transform = `translate(${Math.round(p.x)}px, ${Math.round(p.y - 34)}px) translate(-50%, -50%)`;
      this.el.classList.add('wp-onspot');
    } else {
      const cx = w / 2;
      const cy = h / 2;
      const ang = Math.atan2(p.y - cy, p.x - cx);
      // Walk the bearing ray out to the padded screen rectangle.
      const dx = Math.cos(ang);
      const dy = Math.sin(ang);
      const tx = dx > 0 ? (w - mx - cx) / dx : dx < 0 ? (mx - cx) / dx : Infinity;
      const ty = dy > 0 ? (h - myBot - cy) / dy : dy < 0 ? (myTop - cy) / dy : Infinity;
      const t = Math.min(tx, ty);
      const ex = cx + dx * t;
      const ey = cy + dy * t;
      this.el.style.transform = `translate(${Math.round(ex)}px, ${Math.round(ey)}px) translate(-50%, -50%)`;
      this.el.classList.remove('wp-onspot');
      this.arrowWrap.style.transform = `rotate(${ang}rad)`;
    }
  }
}
