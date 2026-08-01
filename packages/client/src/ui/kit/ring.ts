/**
 * THE RING GAUGE — radial progress for emblems and crests
 * (The Grand Refit, Phase 2). The "show, don't spell" workhorse:
 * a skill's climb, a school's level, a bond's warmth read as a filled
 * ring around the thing itself, not as a sentence beside it.
 *
 * Flat-facet law: the ring is a hard-edged arc (butt caps, no glow),
 * an SVG stroke over a recessed channel — the gauge vocabulary bent
 * into a circle. Size rides `--ring-size` (rem) so it obeys the one
 * ruler; the center is a slot the caller fills (a numeral, a crest).
 */

const R = 15.5; /* viewBox radius; stroke rides this circle */
const C = 2 * Math.PI * R;

export interface RingGauge {
  root: HTMLElement;
  /** The center slot — put a numeral or an emblem in it. */
  center: HTMLElement;
  /** Set the fill fraction [0,1]; snaps into the flat-facet world. */
  set(frac: number): void;
}

export function ringGauge(
  frac: number,
  opts: { size?: string; tone?: string; track?: boolean } = {},
): RingGauge {
  const root = document.createElement('span');
  root.className = 'ring-gauge';
  if (opts.size) root.style.setProperty('--ring-size', opts.size);
  if (opts.tone) root.style.setProperty('--ring-tone', opts.tone);

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 36 36');
  svg.classList.add('ring-gauge-svg');

  const circle = (cls: string): SVGCircleElement => {
    const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c.setAttribute('cx', '18');
    c.setAttribute('cy', '18');
    c.setAttribute('r', String(R));
    c.classList.add(cls);
    svg.appendChild(c);
    return c;
  };

  if (opts.track !== false) circle('ring-track');
  const fill = circle('ring-fill');
  fill.setAttribute('stroke-dasharray', `0 ${C}`);
  /* Start at 12 o'clock, run clockwise. */
  fill.setAttribute('transform', 'rotate(-90 18 18)');

  const center = document.createElement('span');
  center.className = 'ring-center';

  root.append(svg, center);

  const set = (f: number): void => {
    const clamped = Math.max(0, Math.min(1, f));
    fill.setAttribute('stroke-dasharray', `${clamped * C} ${C}`);
    root.classList.toggle('full', clamped >= 1);
  };
  set(frac);

  return { root, center, set };
}
