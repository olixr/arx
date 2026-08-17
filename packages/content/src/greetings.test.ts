import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  fameSkillOf,
  GREETING_FAME_LEVEL,
  GREETING_LINES,
  pickGreeting,
  renderGreeting,
  type GreetingFacts,
} from './greetings.js';

function allLines(): { text: string; night?: boolean }[] {
  const out: { text: string; night?: boolean }[] = [];
  out.push(...GREETING_LINES.enterFirst);
  out.push(...GREETING_LINES.enterReturn);
  out.push(...GREETING_LINES.enterTrusted);
  out.push(...GREETING_LINES.enterChampion);
  out.push(...GREETING_LINES.exit);
  out.push(...GREETING_LINES.exitTrusted);
  for (const slate of Object.values(GREETING_LINES.fame)) out.push(...(slate ?? []));
  return out;
}

const facts = (patch: Partial<GreetingFacts>): GreetingFacts => ({
  edge: 'enter',
  townName: 'Amberford',
  playerName: 'Renna',
  firstVisit: false,
  band: null,
  fameSkill: null,
  night: false,
  ...patch,
});

test('every line obeys the VOICE laws: dash ban, ASCII, the breath budget', () => {
  for (const l of allLines()) {
    assert.ok(!/[—–]|--|…/.test(l.text), `dash ban: ${l.text}`);
    assert.ok(!l.text.includes('...'), `the watch is not granted the trail-off: ${l.text}`);
    // eslint-disable-next-line no-control-regex
    assert.ok(!/[^\x20-\x7E]/.test(l.text), `ASCII only: ${l.text}`);
    assert.ok(l.text.length <= 90, `breath budget: ${l.text}`);
    assert.ok(l.text.trim() === l.text && l.text.length > 0, `trimmed: '${l.text}'`);
  }
});

test('tokens render whole: no braces survive the picker', () => {
  const f = facts({ firstVisit: true });
  assert.equal(renderGreeting('Welcome to {town}, {name}.', f), 'Welcome to Amberford, Renna.');
  for (let i = 0; i < 40; i++) {
    const line = pickGreeting(f, i / 40);
    assert.ok(line && !line.includes('{'), `rendered: ${line}`);
  }
});

test('the stranger and the returning face draw different slates', () => {
  const first = new Set<string>();
  const back = new Set<string>();
  for (let i = 0; i < 60; i++) {
    first.add(pickGreeting(facts({ firstVisit: true }), i / 60)!);
    back.add(pickGreeting(facts({}), i / 60)!);
  }
  for (const l of first) assert.ok(!back.has(l), `first-visit line never serves a return: ${l}`);
  assert.ok(first.size >= 3 && back.size >= 3, 'variety on both edges');
});

test('the champion is usually called out, sometimes just waved through', () => {
  let champion = 0;
  let plain = 0;
  const championTexts = new Set(
    [...GREETING_LINES.enterChampion, ...GREETING_LINES.enterTrusted].map((l) =>
      renderGreeting(l.text, facts({})),
    ),
  );
  for (let i = 0; i < 200; i++) {
    const line = pickGreeting(facts({ band: 'champion' }), i / 200)!;
    if (championTexts.has(line)) champion++;
    else plain++;
  }
  assert.ok(champion > plain, 'the specific slates outweigh the base');
  assert.ok(plain > 0, 'and the base still serves');
});

test('fame speaks only to a face the gate already knows', () => {
  const famous = facts({ fameSkill: 'archery' });
  const fameTexts = new Set(
    (GREETING_LINES.fame.archery ?? []).map((l) => renderGreeting(l.text, famous)),
  );
  let seen = 0;
  for (let i = 0; i < 100; i++) {
    if (fameTexts.has(pickGreeting(famous, i / 100)!)) seen++;
  }
  assert.ok(seen > 0, 'the famous archer gets named');
  for (let i = 0; i < 100; i++) {
    const line = pickGreeting(facts({ fameSkill: 'archery', firstVisit: true }), i / 100)!;
    assert.ok(!fameTexts.has(line), 'a stranger is a stranger, however famous');
  }
});

test('night lines serve only after dark', () => {
  const nightTexts = new Set(
    GREETING_LINES.exit.filter((l) => l.night).map((l) => renderGreeting(l.text, facts({ edge: 'exit' }))),
  );
  for (let i = 0; i < 100; i++) {
    const day = pickGreeting(facts({ edge: 'exit' }), i / 100)!;
    assert.ok(!nightTexts.has(day), `day sendoff stays sunlit: ${day}`);
  }
  let dark = 0;
  for (let i = 0; i < 100; i++) {
    if (nightTexts.has(pickGreeting(facts({ edge: 'exit', night: true }), i / 100)!)) dark++;
  }
  assert.ok(dark > 0, 'the dark road gets its warning');
});

test('the last line heard steps aside when alternatives exist', () => {
  const f = facts({});
  for (let i = 0; i < 60; i++) {
    const first = pickGreeting(f, i / 60)!;
    const second = pickGreeting(f, i / 60, first)!;
    assert.notEqual(second, first);
  }
});

test('fameSkillOf: the bar, the best, and the roster tiebreak', () => {
  assert.equal(fameSkillOf(() => GREETING_FAME_LEVEL - 1), null, 'nobody under the bar');
  assert.equal(
    fameSkillOf((id) => (id === 'smithing' ? 80 : id === 'archery' ? 78 : 10)),
    'smithing',
    'the highest craft wins',
  );
  assert.equal(
    fameSkillOf((id) => (id === 'archery' || id === 'cooking' ? 80 : 0)),
    'archery',
    'ties break by the roster order',
  );
});
