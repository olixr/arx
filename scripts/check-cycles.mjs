#!/usr/bin/env node
/**
 * THE CYCLE GATE (foundations F7) — counts file-level import cycles per
 * package and fails if any package EXCEEDS its recorded baseline, so the
 * count can only ever go down. Update a baseline only when a cycle is
 * genuinely retired (never to admit a new one).
 *
 * Usage: node scripts/check-cycles.mjs [--print]
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';

// Baselines as of foundations band eight (2026-09-01). The audit
// counted 46 runtime cycles; the epic's tint cut and type-only host
// slices retired most — these 20 that remain are each known (deferred
// value back-imports and the cms trio) and charted for F7's endgame in
// docs/foundations-plan.md.
const BASELINES = {
  'packages/client/src': 14,
  'packages/server/src': 3,
  'packages/shared/src': 0,
  'packages/content/src': 2,
};

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (e === 'node_modules' || e === 'dist' || e === 'dist-types') continue;
      walk(p, out);
    } else if (e.endsWith('.ts') && !e.endsWith('.test.ts') && !e.endsWith('.d.ts')) {
      out.push(p);
    }
  }
  return out;
}

function importsOf(file) {
  const src = readFileSync(file, 'utf8');
  const out = [];
  // Type-only imports are erased at runtime — they are the SANCTIONED
  // cycle mechanism (Pick<Host> slices) and never count as an edge.
  for (const m of src.matchAll(/^(?:import|export)\s(?!type\s)[^;]*?from\s+'(\.[^']+)'/gms) ?? []) {
    let spec = m[1].replace(/\.js$/, '.ts');
    if (!spec.endsWith('.ts')) spec += '.ts';
    out.push(resolve(dirname(file), spec));
  }
  return out;
}

const root = resolve(dirname(new URL(import.meta.url).pathname), '..');
let failed = false;
const print = process.argv.includes('--print');
for (const pkg of Object.keys(BASELINES)) {
  const files = walk(join(root, pkg));
  const set = new Set(files);
  const edges = new Map();
  for (const f of files) edges.set(f, importsOf(f).filter((t) => set.has(t)));
  // mutual 2-node cycles
  let pairs = 0;
  const pairList = [];
  for (const [f, outs] of edges) {
    for (const t of outs) {
      if (t > f) continue; // count each unordered pair once
      if ((edges.get(t) ?? []).includes(f)) {
        pairs++;
        pairList.push([f, t]);
      }
    }
  }
  const short = (p) => p.slice(root.length + 1 + pkg.length + 1);
  const base = BASELINES[pkg];
  const verdict = base === null ? 'RECORD' : pairs <= base ? 'OK' : 'FAIL';
  if (verdict === 'FAIL') failed = true;
  console.log(`${verdict.padEnd(6)} ${pkg}: ${pairs} mutual-import pairs${base !== null ? ` (baseline ${base})` : ''}`);
  if (print || verdict === 'FAIL') {
    for (const [a, b] of pairList) console.log(`   ${short(a)} <-> ${short(b)}`);
  }
}
process.exit(failed ? 1 : 0);
