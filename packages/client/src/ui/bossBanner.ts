import type { ClientGame } from '../game/clientGame.js';

/**
 * THE DREAD BANNER (docs/boss-system-plan.md LAW 7) — the crowned
 * fight, worn at the top of the screen where a duel's stakes belong.
 * One banner, one boss: the nearest crowned foe whose fight holds
 * you. The name and its epithet over a long ember gauge, the phase
 * ladder as rune pips (passed rungs gutter, the standing rung burns),
 * and the phase reveal line rising for a breath when the fight turns.
 *
 * The banner reads only what the wire already speaks: EntityMeta.boss
 * (re-broadcast through the one meta door on every turn) and the
 * snapshot hpPct riding the interp buffer. DOM writes land only on
 * change — the perf law of the HUD. A fresh, unbloodied crown takes
 * the screen only when you truly close; the felled banner holds a
 * beat so the kill reads, then lowers.
 */

/** How far a bloodied crown's fight reads on the banner (tiles). */
const SHOW_RANGE = 14;
/** A fresh crown only takes the screen when you walk into its court. */
const FRESH_RANGE = 9;
/** The felled banner holds this long before it lowers. */
const FELLED_HOLD_MS = 2200;
/** hp <= this fraction of 255 when a body vanishes = read it as slain. */
const VANISH_FELLED_HP = 64;

interface ShownCrown {
  eid: number;
  name: string;
  title: string;
  phases: number;
  phase: number;
  hp: number;
}

export class BossBanner {
  private readonly root = document.createElement('div');
  private readonly nameEl = document.createElement('div');
  private readonly titleEl = document.createElement('div');
  private readonly fill = document.createElement('div');
  private readonly ghost = document.createElement('div');
  private readonly pipsEl = document.createElement('div');
  private readonly revealEl = document.createElement('div');
  private key = '';
  private shown: ShownCrown | null = null;
  private felledAt = 0;

  constructor() {
    this.root.id = 'boss-banner';
    this.root.style.display = 'none';

    const head = document.createElement('div');
    head.className = 'boss-head';
    this.nameEl.className = 'boss-name';
    this.titleEl.className = 'boss-title';
    head.append(this.nameEl, this.titleEl);

    const gauge = document.createElement('div');
    gauge.className = 'boss-hp';
    this.ghost.className = 'boss-hp-ghost';
    this.fill.className = 'boss-hp-fill';
    gauge.append(this.ghost, this.fill);

    this.pipsEl.className = 'boss-pips';
    this.revealEl.className = 'boss-reveal';

    this.root.append(head, gauge, this.pipsEl, this.revealEl);
    document.getElementById('hud')!.appendChild(this.root);
  }

  /** Called once per frame — cheap, writes only on change. */
  update(game: ClientGame): void {
    const now = performance.now();
    const own = game.predictor.pos;

    // The one crown that holds you: nearest qualifying crowned foe.
    let best: ShownCrown | null = null;
    let bestDist = Infinity;
    let sawShownAlive = false;
    for (const [eid, remote] of game.entities) {
      const b = remote.meta.boss;
      if (!b) continue;
      const s = remote.buffer.latest();
      const hp = s ? s.hpPct : 255;
      const x = s ? s.x : remote.meta.x;
      const y = s ? s.y : remote.meta.y;
      const dist = Math.hypot(x - own.x, y - own.y);
      if (this.shown && eid === this.shown.eid && hp > 0) sawShownAlive = true;
      if (hp <= 0) continue;
      if (dist > SHOW_RANGE) continue;
      if (hp >= 255 && dist > FRESH_RANGE) continue;
      if (dist < bestDist) {
        bestDist = dist;
        best = {
          eid,
          name: remote.meta.name ?? 'The Crowned',
          title: b.title ?? '',
          phases: b.phases,
          phase: b.phase,
          hp,
        };
      }
    }

    // THE FELLED BEAT: the shown crown died (hp 0 seen, or its body
    // vanished bloodied) — hold the emptied banner so the kill reads.
    if (!best && this.shown && this.felledAt === 0) {
      const remote = game.entities.get(this.shown.eid);
      const hp = remote?.buffer.latest()?.hpPct;
      const felled = hp === 0 || (!sawShownAlive && !remote && this.shown.hp <= VANISH_FELLED_HP);
      if (felled) {
        this.felledAt = now;
        this.shown = { ...this.shown, hp: 0 };
        this.root.classList.add('felled');
        this.root.style.setProperty('--boss-vigor', '0');
        this.key = '';
        return;
      }
    }
    if (this.felledAt !== 0) {
      if (best) {
        // A new crown takes the stage before the old one lowers.
        this.root.classList.remove('felled');
        this.felledAt = 0;
      } else if (now - this.felledAt >= FELLED_HOLD_MS) {
        this.root.classList.remove('felled');
        this.root.style.display = 'none';
        this.felledAt = 0;
        this.shown = null;
        this.key = '';
        return;
      } else {
        return; // the beat holds
      }
    }

    const key = best
      ? `${best.eid}:${best.hp}:${best.phase}:${best.phases}:${best.name}`
      : '';
    if (key === this.key) return;
    this.key = key;

    if (!best) {
      // Walked away, or never engaged: the banner simply lowers.
      this.root.style.display = 'none';
      this.shown = null;
      return;
    }

    const fresh = !this.shown || this.shown.eid !== best.eid;
    const turned = !fresh && this.shown !== null && best.phase > this.shown.phase;

    this.root.style.display = '';
    this.nameEl.textContent = best.name;
    this.titleEl.textContent = best.title;
    this.titleEl.style.display = best.title ? '' : 'none';

    // The gauge: fill snaps to the truth, the pale ghost eases after
    // it in CSS — every bite leaves a mark before it fades.
    const frac = Math.max(0, Math.min(1, best.hp / 255));
    this.root.style.setProperty('--boss-vigor', String(Math.round(frac * 1000) / 1000));
    this.root.dataset['vigor'] = frac <= 0.25 ? 'dire' : frac <= 0.5 ? 'worn' : 'hale';

    // The ladder: one rune pip per rung; passed rungs gutter, the
    // standing rung burns. Rebuilt only when the crown or count turns.
    if (fresh || turned || this.pipsEl.childElementCount !== best.phases) {
      this.pipsEl.replaceChildren();
      for (let i = 0; i < best.phases; i++) {
        const pip = document.createElement('span');
        pip.className = i < best.phase ? 'boss-pip past' : i === best.phase ? 'boss-pip now' : 'boss-pip';
        this.pipsEl.appendChild(pip);
      }
    }

    // THE REVEAL: the turn's name rises for a breath. Only a true
    // turn speaks — approach and retreat re-raise nothing.
    if (turned) {
      const meta = game.entities.get(best.eid)?.meta;
      const line = meta?.boss?.phaseName ?? '';
      this.revealEl.textContent = line;
      if (line) {
        this.revealEl.classList.remove('speaking');
        // Reflow so back-to-back turns each restart the rise.
        void this.revealEl.offsetWidth;
        this.revealEl.classList.add('speaking');
      }
    } else if (fresh) {
      this.revealEl.textContent = '';
      this.revealEl.classList.remove('speaking');
    }

    this.shown = best;
  }
}
