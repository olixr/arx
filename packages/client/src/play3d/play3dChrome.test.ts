import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const CLIENT = resolve(HERE, '..', '..');

/**
 * THE COPIED CHROME STAYS A COPY. play3d.html carries index.html's
 * #login + #hud markup verbatim (the ui modules find their elements
 * by id at runtime, with no compile signal when an id moves). Until
 * the two pages render one shared source (W5 — an index.html /
 * main.ts change this program does not make), this test is the
 * signal: it fails the moment index.html's chrome drifts from the
 * copy, and the moment shell.ts asks for an id the copy lacks.
 */
function chromeRegion(html: string): string {
  const start = html.indexOf('<div id="login"');
  const end = html.indexOf('<script type="module"');
  assert.ok(start > 0 && end > start, 'the chrome region is bounded by #login and the module script');
  return html.slice(start, end).replace(/\s+/g, ' ').trim();
}

test('play3d.html carries index.html chrome verbatim (plus its own #hud3d block)', () => {
  const index = readFileSync(resolve(CLIENT, 'index.html'), 'utf8');
  const play3d = readFileSync(resolve(CLIENT, 'play3d.html'), 'utf8');
  const own = chromeRegion(play3d).replace(/<div id="hud3d">.*?<\/div>/, '').trim();
  assert.equal(own, chromeRegion(index));
});

test('every id the 3D shell reads exists in play3d.html', () => {
  const play3d = readFileSync(resolve(CLIENT, 'play3d.html'), 'utf8');
  const shell = readFileSync(resolve(HERE, 'shell.ts'), 'utf8');
  const main = readFileSync(resolve(HERE, 'main3d.ts'), 'utf8');
  const wanted = new Set<string>();
  for (const m of (shell + main).matchAll(/(?:el(?:<[^>]+>)?|getElementById)\('([^']+)'\)/g)) wanted.add(m[1]!);
  assert.ok(wanted.size >= 15, `found ${wanted.size} id lookups`);
  const present = new Set([...play3d.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]!));
  const missing = [...wanted].filter((id) => !present.has(id));
  assert.deepEqual(missing, []);
});
