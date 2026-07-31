/**
 * THE HERALD'S PLAQUE — the screen-space half of the level-up show
 * (the renderer stages the world half: honor seal, pillar, orbit).
 *
 * Choreography: an accent light seam strikes down first, the chrome
 * plaque unfurls out of it like a banner unrolling, and the contents
 * arrive in reading order — plaque icon, kicker, skill name, the
 * skill's story line, the accent inlay drawing itself — while the new
 * level rolls onto the brass crest and six motes drift off the frame.
 * Two counter-rotating ray fans breathe behind it all, sized to stay
 * out of the game's way (the card sits high and small; the world
 * ceremony is the spectacle, this is the citation).
 *
 * Everything animates in CSS on transform and opacity only —
 * compositor work, zero per-frame JS.
 *
 * Level-ups QUEUE: one kill can raise several skills at once, and
 * each deserves its moment. A waiting queue shortens the current
 * card's hold so no announcement ever goes stale; reaching level 99
 * swaps the kicker for the mastery face.
 */
import { MAX_LEVEL } from '@arx/shared';
import { itemIconUrl } from '../render/icons.js';

interface LevelShow {
  name: string;
  level: number;
  icon: string;
  color: string;
  /** One quiet line under the name — what the craft IS. */
  story?: string;
}

let stage: HTMLElement | null = null;
let exitTimer = 0;
let killTimer = 0;
let shownAt = 0;
let showing = false;
const queue: LevelShow[] = [];

/** Enter + hold before the bow-out begins. */
const HOLD_MS = 4400;
/** The shortened hold while more level-ups wait their turn. */
const HOLD_QUEUED_MS = 2400;
/** The least time a card may hold when a newcomer hurries it. */
const MIN_SHOW_MS = 1700;
/** The bow-out itself (matches the lvl-exit keyframes). */
const EXIT_MS = 620;

export function showLevelUp(o: LevelShow): void {
  queue.push(o);
  if (!showing) {
    pump();
  } else if (stage && !stage.classList.contains('leaving')) {
    // A newcomer waits — the current card yields early, but never so
    // fast the player can't read it.
    const remain = Math.max(0, MIN_SHOW_MS - (performance.now() - shownAt));
    clearTimeout(exitTimer);
    exitTimer = window.setTimeout(beginExit, remain);
  }
}

/** Clear the current card AND the waiting line (scene changes). */
export function dismissLevelUp(): void {
  queue.length = 0;
  if (exitTimer) clearTimeout(exitTimer);
  if (killTimer) clearTimeout(killTimer);
  exitTimer = 0;
  killTimer = 0;
  stage?.remove();
  stage = null;
  showing = false;
}

function pump(): void {
  const o = queue.shift();
  if (!o) {
    showing = false;
    return;
  }
  showing = true;
  build(o);
  shownAt = performance.now();
  exitTimer = window.setTimeout(beginExit, queue.length > 0 ? HOLD_QUEUED_MS : HOLD_MS);
}

function beginExit(): void {
  const el = stage;
  if (!el) {
    pump();
    return;
  }
  el.classList.add('leaving');
  killTimer = window.setTimeout(() => {
    if (stage === el) {
      el.remove();
      stage = null;
    }
    pump();
  }, EXIT_MS + 60);
}

function build(o: LevelShow): void {
  stage?.remove();

  const el = document.createElement('div');
  el.id = 'levelup-stage';
  el.style.setProperty('--lvl-accent', o.color);
  const mastered = o.level >= MAX_LEVEL;
  if (mastered) el.classList.add('lvl-mastery');

  // Two ray fans, counter-rotating at different weights — the light
  // has depth instead of being one spinning sticker.
  const rays = document.createElement('div');
  rays.className = 'lvl-rays';
  const raysB = document.createElement('div');
  raysB.className = 'lvl-rays lvl-rays-b';
  el.append(rays, raysB);

  // The strike: a vertical accent seam the card unfurls out of.
  const beam = document.createElement('div');
  beam.className = 'lvl-beam';
  el.appendChild(beam);

  // Bespoke class only — .ui-tray is the loot dock's chrome AND the
  // "a panel is open" input-gate selector; a ceremony card must be
  // neither (it stacked into the misaligned column, and it silently
  // gated input for the 5s hold).
  const card = document.createElement('div');
  card.className = 'lvl-card';

  const plaque = document.createElement('div');
  plaque.className = 'lvl-plaque';
  const img = document.createElement('img');
  img.src = itemIconUrl(o.icon, 64);
  img.draggable = false;
  plaque.appendChild(img);
  card.appendChild(plaque);

  const text = document.createElement('div');
  text.className = 'lvl-text';
  const kicker = document.createElement('div');
  kicker.className = 'lvl-kicker';
  kicker.textContent = mastered ? 'Mastered!' : 'Level up!';
  const name = document.createElement('div');
  name.className = 'lvl-skill';
  name.textContent = o.name;
  text.append(kicker, name);
  if (o.story) {
    const story = document.createElement('div');
    story.className = 'lvl-story';
    story.textContent = o.story;
    text.appendChild(story);
  }
  card.appendChild(text);

  // The new level rides a brass crest that breaks the tray's
  // silhouette — and ROLLS in over the level it replaces, so the
  // number visibly becomes more.
  const medal = document.createElement('div');
  medal.className = 'lvl-medal';
  const roll = document.createElement('div');
  roll.className = 'lvl-roll';
  const oldNum = document.createElement('span');
  oldNum.className = 'lvl-num-old';
  oldNum.textContent = String(o.level - 1);
  const newNum = document.createElement('span');
  newNum.className = 'lvl-num';
  newNum.textContent = String(o.level);
  roll.append(oldNum, newNum);
  medal.appendChild(roll);
  card.appendChild(medal);

  const shine = document.createElement('div');
  shine.className = 'lvl-shine';
  card.appendChild(shine);

  // Six motes drift up off the card as it settles — the little
  // secondary life that says the thing is lit, not printed.
  const motes = document.createElement('div');
  motes.className = 'lvl-motes';
  for (let i = 0; i < 6; i++) {
    const m = document.createElement('span');
    m.style.setProperty('--mi', String(i));
    motes.appendChild(m);
  }
  card.appendChild(motes);

  el.appendChild(card);
  document.body.appendChild(el);
  stage = el;
}
