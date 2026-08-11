/**
 * THE PLACE HERALD — the one ceremony that names where you stand.
 *
 * A centered typographic announcement over a soft ink veil: the
 * place's chart sigil, a tracked kicker in the kind's accent, the
 * name large in serif, a hairline rule drawing outward from a center
 * gem, then a story line and a facts row (danger pips, level band,
 * threat word). No ray wheels, no slam, no shine sweep — the premium
 * read is restraint, typography, and timing.
 *
 * A toast, not a screen: pointer-events none, own chrome, never
 * .ui-tray (that class doubles as the input gate). One herald stands
 * at a time — a fresh raising dismisses the last. All motion rides
 * transform/opacity only and gates on body.no-ui-motion like every
 * kit animation.
 *
 * The discovery and dungeon-threshold banners are thin adapters over
 * this builder (discoveryBanner.ts / dungeonBanner.ts). Quest, rep,
 * and level ceremonies keep their own chrome — those are event
 * ceremonies, not place ceremonies.
 */

export interface HeraldFacts {
  /** Danger pips: this many lit of five. Absent = no pips. */
  tier?: number;
  /** Plain notes, spoken in a row with quiet separators. */
  notes: string[];
}

export interface HeraldSpec {
  /** Stage flavor: 'town' | 'poi' | 'dungeon' | 'landmark'. */
  kind: string;
  /** The kind's accent — kicker, rule, gem, and lit pips wear it. */
  accent: string;
  /** The small tracked line above the name. */
  kicker: string;
  name: string;
  /** Chart sigil or key icon, seated small above the kicker. */
  iconUrl?: string;
  /** One plain sentence of what this place is. */
  lore?: string;
  facts?: HeraldFacts;
  holdMs: number;
}

let stage: HTMLElement | null = null;
let exitTimer = 0;
let killTimer = 0;

/** The bow-out length — matches the herald-leave keyframes. */
const EXIT_MS = 700;

export function raiseHerald(spec: HeraldSpec): void {
  dismissHerald();

  const el = document.createElement('div');
  el.id = 'herald-stage';
  el.className = `herald-${spec.kind}`;
  el.style.setProperty('--herald-accent', spec.accent);

  // The veil: a wide, soft ink wash the words rest on — legibility
  // over any world, without a card's box.
  const veil = document.createElement('div');
  veil.className = 'herald-veil';
  el.appendChild(veil);

  const body = document.createElement('div');
  body.className = 'herald-body';

  if (spec.iconUrl) {
    const sigil = document.createElement('div');
    sigil.className = 'herald-sigil';
    const img = document.createElement('img');
    img.src = spec.iconUrl;
    img.draggable = false;
    img.alt = '';
    sigil.appendChild(img);
    body.appendChild(sigil);
  }

  const kicker = document.createElement('div');
  kicker.className = 'herald-kicker';
  kicker.textContent = spec.kicker;
  body.appendChild(kicker);

  const name = document.createElement('div');
  name.className = 'herald-name';
  name.textContent = spec.name;
  body.appendChild(name);

  // The rule: two hairlines drawing outward from a center gem.
  const rule = document.createElement('div');
  rule.className = 'herald-rule';
  const left = document.createElement('span');
  left.className = 'herald-rule-line is-left';
  const gem = document.createElement('span');
  gem.className = 'herald-gem';
  const right = document.createElement('span');
  right.className = 'herald-rule-line is-right';
  rule.append(left, gem, right);
  body.appendChild(rule);

  if (spec.lore) {
    const lore = document.createElement('div');
    lore.className = 'herald-lore';
    lore.textContent = spec.lore;
    body.appendChild(lore);
  }

  if (spec.facts && (spec.facts.tier !== undefined || spec.facts.notes.length > 0)) {
    const facts = document.createElement('div');
    facts.className = 'herald-facts';
    if (spec.facts.tier !== undefined) {
      const pips = document.createElement('span');
      pips.className = 'herald-pips';
      for (let i = 0; i < 5; i++) {
        const pip = document.createElement('span');
        pip.className = 'herald-pip';
        pip.style.setProperty('--pi', String(i));
        if (i < spec.facts.tier) pip.dataset.lit = '1';
        pips.appendChild(pip);
      }
      facts.appendChild(pips);
    }
    spec.facts.notes.forEach((note, i) => {
      if (i > 0 || spec.facts!.tier !== undefined) {
        const sep = document.createElement('span');
        sep.className = 'herald-sep';
        sep.textContent = '·';
        facts.appendChild(sep);
      }
      const span = document.createElement('span');
      span.className = 'herald-note';
      span.textContent = note;
      facts.appendChild(span);
    });
    body.appendChild(facts);
  }

  el.appendChild(body);
  document.body.appendChild(el);
  stage = el;

  exitTimer = window.setTimeout(() => {
    el.classList.add('leaving');
    killTimer = window.setTimeout(() => {
      if (stage === el) {
        el.remove();
        stage = null;
      }
    }, EXIT_MS + 80);
  }, spec.holdMs);
}

/**
 * Dev-only (the `?herald` bench): pin the standing show mid-flight —
 * every herald animation pauses at `atMs` and the bow-out timers are
 * lifted, so a choreography frame can be photographed at leisure.
 * Never called by shipped logic.
 */
export function freezeHerald(atMs: number): void {
  if (!stage) return;
  if (exitTimer) {
    clearTimeout(exitTimer);
    exitTimer = 0;
  }
  if (killTimer) {
    clearTimeout(killTimer);
    killTimer = 0;
  }
  for (const a of document.getAnimations()) {
    const t = a.effect && 'target' in a.effect ? (a.effect as KeyframeEffect).target : null;
    if (t instanceof Element && t.closest('#herald-stage')) {
      a.pause();
      a.currentTime = atMs;
    }
  }
}

/** Clear any standing herald (a fresh ceremony restarts the show). */
export function dismissHerald(): void {
  if (exitTimer) {
    clearTimeout(exitTimer);
    exitTimer = 0;
  }
  if (killTimer) {
    clearTimeout(killTimer);
    killTimer = 0;
  }
  stage?.remove();
  stage = null;
}
