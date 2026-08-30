/**
 * THE FRONT DOOR — boot for arx.gg's landing page.
 *
 * Order of operations is the whole performance story: styles and the
 * light systems (meadow, fire, sky) come up on first paint; the heavy
 * painters (rig, trees) arrive through scene.ts's dynamic import; the
 * small stages only tick while on screen. Scroll work is transform-only
 * and runs through one rAF gate. prefers-reduced-motion stands
 * everything down to authored stills.
 */
import './landing.css';
//# sourceMappingURL=landing.d.ts.map