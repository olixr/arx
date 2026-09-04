/**
 * THE SCARRED LAND — EmberBed (510): a dead fire that still glows,
 * the night tell of a fresh burning. THE LIGHT IS CONTENT: its warmth
 * is a lights.ts row (COALS-class, flame-gated) collected in the
 * collectStaticLights scan — this painter never queueGlows and never
 * paints smoke (K1's smoke grain is a dt-gated emitter in that same
 * scan). K0 stub: a low char pan with an ember-lit top.
 */
import { Tile } from '@arx/shared';
import { SCAR_CHAR, SCAR_EMBER } from '../palette.js';
import { stubBlock } from './stub.js';
import type { PropEntries } from '../types.js';

export const EMBER_BED_PROPS: PropEntries = [
  [[Tile.EmberBed], stubBlock({ hw: 0.4, up: 0.12, ink: SCAR_CHAR, lit: SCAR_EMBER, depth: 0.42, sortOff: 0.55 })],
];
