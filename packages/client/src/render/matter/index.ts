/**
 * THE MATTER LIBRARY — the registry.
 *
 * Ten mastered materials, one voice each. Signatures compose these
 * deployments; THE ONE-VOICE LAW forbids hand-mixing a material the
 * library owns. The `?fx` lab and the contract tests both read this
 * registry — a material that isn't here doesn't exist.
 */

import type { Material } from './types.js';
import { fire } from './fire.js';
import { smoke } from './smoke.js';
import { dust } from './dust.js';
import { frost } from './frost.js';
import { venom } from './venom.js';
import { storm } from './storm.js';
import { blood } from './blood.js';
import { radiance } from './radiance.js';
import { shadow } from './shadow.js';
import { water } from './water.js';

export const MATTER: Record<string, Material> = {
  fire, smoke, dust, frost, venom, storm, blood, radiance, shadow, water,
};

export type { Material, MatterCtx, MatterOpts, Deployment } from './types.js';
export { asMatter } from './types.js';
export { fire, smoke, dust, frost, venom, storm, blood, radiance, shadow, water };
