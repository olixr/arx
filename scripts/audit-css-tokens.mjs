/*
 * THE GHOST TOKEN AUDIT.
 *
 * An undefined `var(--x)` does not warn. It is invalid at
 * computed-value time, which discards the WHOLE declaration — so a
 * `border: var(--hairline) solid var(--typo)` leaves border-style:none
 * and the element ships frameless, looking like a design choice. This
 * catches those. (2026-08-18: it found 16 such sites across three
 * screens, after two hand-rolled greps got it wrong in three different
 * ways.)
 *
 *   node scripts/audit-css-tokens.mjs
 *
 * Exits 1 if any true ghost is found. No browser, no network.
 *
 * A name is a ghost only when it is in NEITHER roster:
 *
 *   A. the token sheets installTokens() publishes at :root. These live
 *      as OBJECT KEYS in ui/kit/tokens.ts ('r-chip': '0.25rem') and the
 *      `--` is prepended at runtime, so the literal string "--r-chip"
 *      appears nowhere in the source — grepping for it flags every real
 *      token as missing.
 *   B. every other `--name` the code actually WRITES: the bare name in
 *      any non-CSS source (which covers the properties JS sets
 *      per-element — --cut, --skill-accent, --ring-angle — and
 *      chrome.ts's runtime :root writes; grep the BARE name, never
 *      `setProperty('--x'`, because some of those calls wrap across a
 *      line break and a line-based grep misses them), plus any real
 *      `--name:` declaration in a stylesheet.
 *
 * CSS comments are stripped before anything is read. Prose naming a
 * token — including the comments explaining a fix like this one — must
 * never make a ghost look defined. (It did, on the first cut: a comment
 * reading "`--iron-edge` was never a token" made --iron-edge pass.)
 *
 * Uses that carry a fallback — var(--x, #4a453c) — are skipped: they
 * degrade by design.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = resolve(import.meta.dirname, '..', 'packages', 'client');
const DIR = resolve(ROOT, 'src', 'styles');

// ---- roster A: the published token sheets, read from the source of truth.
const tokensSrc = readFileSync(resolve(ROOT, 'src/ui/kit/tokens.ts'), 'utf8');
// Read the sheet list out of installTokens itself, so adding a sheet
// there can never leave this audit quietly reading a stale roster.
const install = tokensSrc.match(/for \(const sheet of \[([^\]]+)\]/);
if (!install) {
  console.error("Could not find installTokens' sheet list in tokens.ts — fix this script.");
  process.exit(2);
}
const SHEETS = install[1].split(',').map((n) => n.trim()).filter(Boolean);
const published = new Set();
for (const sheet of SHEETS) {
  // The sheets are a mix of exported and module-private consts.
  const at = tokensSrc.search(new RegExp(`^(export )?const ${sheet}\\b`, 'm'));
  if (at < 0) {
    console.error(`tokens.ts declares no const ${sheet} — fix this script.`);
    process.exit(2);
  }
  const body = tokensSrc.slice(tokensSrc.indexOf('{', at), tokensSrc.indexOf('\n};', at));
  for (const m of body.matchAll(/^\s*'?([a-zA-Z][\w-]*)'?\s*:/gm)) published.add(`--${m[1]}`);
}

// Blank out /* */ comments, keeping newlines so line numbers hold.
const decomment = (css) => css.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '));

// ---- every var() use in every stylesheet, minus the ones with
// fallbacks, and every custom property a stylesheet DECLARES.
const uses = new Map();
const declared = new Set();
const sheets = readdirSync(DIR).filter((n) => n.endsWith('.css'));
for (const f of sheets) {
  decomment(readFileSync(resolve(DIR, f), 'utf8')).split('\n').forEach((line, i) => {
    for (const m of line.matchAll(/var\(\s*(--[a-zA-Z0-9-]+)\s*(,?)/g)) {
      if (m[2] === ',') continue;
      if (!uses.has(m[1])) uses.set(m[1], []);
      uses.get(m[1]).push(`${f}:${i + 1}`);
    }
    const d = line.match(/^\s*(--[a-zA-Z0-9-]+)\s*:/);
    if (d) declared.add(d[1]);
  });
}

// ---- roster B: written by the CODE — never merely mentioned in prose.
const written = (name) => {
  if (declared.has(name)) return true;
  try {
    const out = execFileSync(
      'grep',
      ['-rn', '--include=*.ts', '--include=*.html', '--', name, 'src', 'index.html'],
      { cwd: ROOT, encoding: 'utf8' },
    );
    return out.split('\n').some((l) => l.trim() && !l.includes(`var(${name}`));
  } catch {
    return false; // grep exits 1 when nothing matches
  }
};

const ghosts = [...uses.entries()].filter(([n]) => !published.has(n) && !written(n));

console.log(`${uses.size} distinct tokens used across ${sheets.length} stylesheets · ${published.size} published at :root.`);
if (ghosts.length === 0) {
  console.log('No ghosts — every var() without a fallback resolves.');
} else {
  for (const [n, where] of ghosts) {
    console.log(`GHOST ${n}  (${where.length} site${where.length > 1 ? 's' : ''}): ${where.join(', ')}`);
  }
  process.exitCode = 1;
}
