import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { GameServer } from './gameServer.js';
import * as arenaSys from './arena.js';
import * as dlgSys from './dialogue.js';
import * as runSys from './dungeonRuns.js';
import * as farmSys from './farming.js';
import * as interestSys from './interest.js';
import * as keySys from './keyring.js';
import * as meleeSys from './melee.js';
import * as procSys from './procs.js';
import * as standingSys from './standing.js';
import * as statusSys from './statuses.js';

/**
 * THE DELEGATOR PARITY WALK (core audit 2026-09, Band A). The
 * foundations split (F4) left one-line delegators on GameServer:
 * `return <mod>Sys.<fn>(this, ...args)`. This suite reads
 * gameServer.ts at test time, finds every such line, and pins for
 * each: the module export exists, is a function, carries the SAME
 * NAME, and takes the delegator's arity plus `srv` — so a renamed,
 * deleted or re-signatured door on either side fails here before it
 * fails in a player's hands. The reverse walk pins that every
 * `export function x(srv: GameServer` in a split module still has
 * its delegator (THE STUB WINS THE DOOR needs the class seam).
 */

type Fn = (...a: never[]) => unknown;
const proto = GameServer.prototype as unknown as Record<string, Fn>;
const here = dirname(fileURLToPath(import.meta.url));
const modules: Record<string, { file: string; mod: Record<string, unknown> }> = {
  arenaSys: { file: 'arena.ts', mod: arenaSys },
  dlgSys: { file: 'dialogue.ts', mod: dlgSys },
  runSys: { file: 'dungeonRuns.ts', mod: runSys },
  farmSys: { file: 'farming.ts', mod: farmSys },
  interestSys: { file: 'interest.ts', mod: interestSys },
  keySys: { file: 'keyring.ts', mod: keySys },
  meleeSys: { file: 'melee.ts', mod: meleeSys },
  procSys: { file: 'procs.ts', mod: procSys },
  standingSys: { file: 'standing.ts', mod: standingSys },
  statusSys: { file: 'statuses.ts', mod: statusSys },
};

interface Delegator {
  alias: string;
  fn: string;
  argc: number;
  line: number;
}

/**
 * Top-level commas only: a nested call (`foo(this, bar(x, y))`) or an
 * object literal in the arg list counts as one argument, as it is.
 */
function countArgs(args: string): number {
  if (args.trim() === '') return 0;
  let depth = 0;
  let n = 1;
  for (const ch of args) {
    if (ch === '(' || ch === '[' || ch === '{') depth++;
    else if (ch === ')' || ch === ']' || ch === '}') depth--;
    else if (ch === ',' && depth === 0) n++;
  }
  return n;
}

/** The text after `this` with the joining comma and any trailing (wrapped) comma dropped. */
function argList(afterThis: string): string {
  return afterThis.trim().replace(/^,/, '').replace(/,\s*$/, '').trim();
}

function readDelegators(): Delegator[] {
  // Matched over the whole file, not line by line: a delegator the
  // formatter wrapped across lines is still a delegator.
  const src = readFileSync(join(here, 'gameServer.ts'), 'utf8');
  const out: Delegator[] = [];
  const re = /\breturn (\w+Sys)\.(\w+)\(\s*this\b([^;]*)\)\s*;/gs;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    const rest = argList(m[3]!);
    const line = src.slice(0, m.index).split('\n').length;
    out.push({ alias: m[1]!, fn: m[2]!, argc: countArgs(rest), line });
  }
  return out;
}

const delegators = readDelegators();

test('the walk finds the split\'s delegators (the F4 count was 111)', () => {
  assert.ok(delegators.length >= 100, `found ${delegators.length}`);
  const perModule = new Map<string, number>();
  for (const d of delegators) perModule.set(d.alias, (perModule.get(d.alias) ?? 0) + 1);
  for (const alias of Object.keys(modules)) assert.ok((perModule.get(alias) ?? 0) > 0, `${alias} has delegators`);
});

test('every delegator names a live module export of the same name and arity (minus srv)', () => {
  const problems: string[] = [];
  for (const d of delegators) {
    const m = modules[d.alias];
    if (!m) {
      problems.push(`gameServer.ts:${d.line} unknown module alias ${d.alias}`);
      continue;
    }
    const fn = m.mod[d.fn];
    if (typeof fn !== 'function') {
      problems.push(`gameServer.ts:${d.line} ${d.alias}.${d.fn} is not an exported function of ${m.file}`);
      continue;
    }
    const del = proto[d.fn];
    if (typeof del !== 'function') {
      problems.push(`gameServer.ts:${d.line} delegator method GameServer.${d.fn} missing (name drift)`);
      continue;
    }
    // .length counts params before the first default on both sides;
    // the delegator copied the signature verbatim, so they must agree
    // once `srv` is dropped, and the call must pass every non-default.
    if (del.length !== fn.length - 1) {
      problems.push(`gameServer.ts:${d.line} GameServer.${d.fn} arity ${del.length} vs ${m.file} ${d.fn} arity ${fn.length - 1}`);
    }
    if (d.argc < fn.length - 1) {
      problems.push(`gameServer.ts:${d.line} passes ${d.argc} args but ${d.fn} needs ${fn.length - 1}`);
    }
  }
  assert.deepEqual(problems, []);
});

test('every srv-taking export of a split module has its delegator on the class (THE STUB WINS THE DOOR)', () => {
  const missing: string[] = [];
  for (const [alias, { file }] of Object.entries(modules)) {
    const src = readFileSync(join(here, file), 'utf8');
    const re = /^export function (\w+)\(srv: GameServer/gm;
    let m: RegExpExecArray | null;
    while ((m = re.exec(src)) !== null) {
      const name = m[1]!;
      const has = delegators.some((d) => d.alias === alias && d.fn === name);
      if (!has) missing.push(`${file}: ${name}`);
    }
  }
  assert.deepEqual(missing, []);
});

test('the walk reads a wrapped delegator and counts nested commas as one argument', () => {
  const wrapped = [
    '    return farmSys.plantSeed(',
    '      this,',
    '      eid,',
    '      { x: tx, y: ty },',
    '      pick(a, b),',
    '    );',
  ].join('\n');
  const re = /\breturn (\w+Sys)\.(\w+)\(\s*this\b([^;]*)\)\s*;/gs;
  const m = re.exec(wrapped);
  assert.ok(m, 'the wrapped form matches');
  assert.equal(countArgs(argList(m![3]!)), 3);
  assert.equal(countArgs(''), 0);
  assert.equal(countArgs('a'), 1);
});
