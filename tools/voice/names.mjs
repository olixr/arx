/**
 * THE NAME IS A RESOURCE — cross-cluster personal-name audit.
 *
 * A world written by many hands at once will invent the same name twice.
 * That is cheap to prevent and expensive to find later: a name carved on
 * one town's memorial and given to another town's dead reads to a player
 * as a connection they have failed to understand.
 *
 * This walks every dialogue tree, every actor def, the character bible
 * (docs/dialogue-bible/**​/*.md) and every VOICE card (docs/VOICE*.md),
 * pulls the proper nouns out of the spoken text, drops the ones that are
 * real actors or known places, and reports every remaining invented name
 * together with the towns that use it. A name appearing in two unrelated
 * towns is the finding; a name appearing many times in one town is just
 * a character.
 *
 * THE ONE-LETTER LAW (the contested-lands names gate): every PERSON
 * name — the display names of actor defs plus every `### Name —` head
 * and every `**Name**` bold in the bible — is also checked against every
 * other for a one-edit distance (Levenshtein 1: Kesk/Hesk) and for the
 * simple homophone (doubled letters collapsed and a trailing e dropped:
 * Tholl/toll, Whin/Wyn-style). Two names one slip apart are a reader's
 * bug even when neither is a typo.
 *
 *   node tools/voice/names.mjs                    full table
 *   node tools/voice/names.mjs --collide          only the hits; exits 1 on any
 *   node tools/voice/names.mjs --bible <dir> ...  extra bible dirs to scan
 *                                                 (another branch's live bible)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DLG = path.join(ROOT, 'packages/content/src/dialogues/defs');
const ACT = path.join(ROOT, 'packages/content/src/actors/defs');
const MAPS = path.join(ROOT, 'packages/content/src/maps');
const DOCS = path.join(ROOT, 'docs');
const argv = process.argv.slice(2);
const ONLY_COLLIDE = argv.includes('--collide');
const EXTRA_BIBLES = [];
for (let i = 0; i < argv.length; i++) if (argv[i] === '--bible' && argv[i + 1]) EXTRA_BIBLES.push(path.resolve(argv[++i]));

// ---- actor -> town, from the map placements (the same source of truth
// the assignment used), so a name can be attributed to where it is said.
const actorTown = new Map();
for (const f of fs.readdirSync(MAPS)) {
  if (!f.endsWith('.ts') || f.includes('.test.')) continue;
  const town = f.replace('.ts', '');
  const src = fs.readFileSync(path.join(MAPS, f), 'utf8');
  for (const m of src.matchAll(/b\.actor\(\s*'([a-z0-9_]+)'/g)) {
    if (!actorTown.has(m[1])) actorTown.set(m[1], town);
  }
}

// ---- the allowlist: every real actor's own name, plus place names.
const known = new Set();
/** person name -> Set(where) for the one-letter law. */
const persons = new Map();
/** [firstName, where] per actor def — resolved after the lowercase corpus is complete. */
const personCandidates = [];
function person(name, where) {
  const w = name.replace(/[^\w']/g, '');
  if (!/^[A-Z][a-z]{2,}$/.test(w)) return;
  if (!persons.has(w)) persons.set(w, new Set());
  persons.get(w).add(where);
}
/** Titles that lead a display name ("Sergeant Hale", "Captain Aldis"). */
const HONORIFICS = new Set(['Sergeant', 'Serjeant', 'Captain', 'Marshal', 'Warden', 'Keeper', 'Elder', 'Master', 'Mistress',
  'Reeve', 'King', 'Queen', 'Old', 'Lady', 'Lord', 'Mother', 'Father', 'Brother', 'Sister', 'Sir', 'Dame']);
for (const f of fs.readdirSync(ACT)) {
  if (!f.endsWith('.json')) continue;
  const a = JSON.parse(fs.readFileSync(path.join(ACT, f), 'utf8'));
  const words = String(a.name || '').split(/\s+/).map((w) => w.replace(/[^\w']/g, ''));
  for (const w of words) known.add(w);
  // The slug's own parts are the person too (magpie_mab is "The Magpie"
  // on the plate and Mab in every mouth).
  for (const part of f.replace('.json', '').split('_')) known.add(part.charAt(0).toUpperCase() + part.slice(1));
  // A pooled, title-shaped name ("Wayward Watch", "Company Blade") is
  // a job, not a person: only names whose first non-honorific word is
  // NOT itself a lowercase vocabulary word later count as persons.
  const first = words.find((w) => !HONORIFICS.has(w));
  if (first) personCandidates.push([first, `actor:${f.replace('.json', '')}`]);
}
const PLACES = `Dawnmead Amberford Silverfall Pinewatch Kingsdelf Hartfell Saltmere Evenfall
  Undercroft Rookery Everwood Heartwood Dawnlands Waykeepers Waykeeper Redmask Redmasks
  Crown Company Charter Arcanum Guild Songhouse Stillroom Everflame Kettle Wolfwinter
  Deep Market Silver Line Ring Waking Vale Falls Northguard Southreach Fairstead Delf
  Low Hall Tollhouse Brand Oldcrown Ashmarch Gullmoor Darkwater Frostfall Evengate
  Moonglass Mithril Toll War Last Lamp Silver Shrine Flagon Gull Rest Horn Hearth
  Pine Bell Climb Delvers Grand Round Ford Wanderer Painted Outward Keeping Third Table
  Amberfen Thornveil Gloamwood Spinewall Sett Course Marl Sinter Culm Gossan Gabbro
  Ashlamp Felling Husk Fenside Returners Returner Doorless Legion Drum Copse Scrap Crag
  Old Road First Road Hunters Trail Waist Standing Bone Meadow Ashen Hem Spoil Wold Reach
  Plug Weight Stone Green Row Common Five Stones Timber Timberway Hoargate Wardline Hartway
  Cottage Free Furrows Amber Returning Pale Reeve Struck Sergeant Waking Ring
  Castellan Glasshouse Glasswater Greenstair Lantern Riftgate Overband Processional Inks Arx Evenking`
  .split(/\s+/).filter(Boolean);
for (const p of PLACES) known.add(p);
// sentence-openers and ordinary capitalised words that are not names
const STOP = new Set(`A An The I You He She It We They This That These Those There Here My Your His Her Its Our Their
  No Yes Aye Not And But So If When What Who Why How Where Which Let Come Go Take Mind Stay Keep Wait Look Listen Ask
  Tell Sit Stand Watch Hold Do Does Did Can Will Would Should Could May Might Must Have Has Had Is Are Was Were Am Be
  Once Twice Then Now Never Always Every Some Any Most Half Both Three Two One Four Five Six Seven Eight Nine Ten
  Aid North South East West Winter Summer Spring Autumn Frost Ice Old Young Good Bad Better Best Right Left Well
  Mister Missus Sir Madam Captain Sergeant Serjeant Marshal Warden Keeper Elder Master Mistress Reeve Speaker Steward
  Herald Bursar Factor Foreman Mason Smith Miller Baker Cook Fisher Hunter Drover Potter Cobbler Chandler Tanner
  Grocer Innkeep Taverner Courier Lookout Fence Broker Assayer Scrivener Weaver Gardener Hostler Porter Salter
  Boatwright Wainwright Roper Lightkeeper Pilot Ringmaster Drillmaster Houndmistress Quartermaster Sawmistress
  Sparmaster Boomsman Tallyman Nurseryman Pitchmaster Storekeep Provisioner Outfitter Salvewright Keywright
  Lampwright Glasswright Sealkeeper Delfmaster Stablemaster Enchanter Enchantress Sage Herbalist Physic Loresinger
  Inscriber Bowyer Smokemistress Smokemaster Bathkeeper Gravekeeper Hostelkeeper Springkeeper Netkeeper Tithekeeper
  Huntmaster Herdmaster Furrier Tallywife Pedlar Peddler Wayfarer Outrider Guildmaster Portreeve Ironmaster
  Silversmith Forgemistress Smeltmaster Carpenter Cooper Fletcher Angler Forester Fellwatch Delfwatch Evenguard
  Sentinel Crofter Chainman Surveyor Feller Carter Escort Headman Widow Clerk Dike Toll Actor Trees Life Wants
  Carries Knows Room Threads Remembered Speaks Wit Barks Register Cadence Fault Virtue Quirk Wound Mouth Scar Flag
  Set Read Notes Naming Author Author-facing Route Party Mark Kind Sub Yes Wants`
  .split(/\s+/).filter(Boolean));

const hits = new Map(); // name -> Map(town -> Set(file))
function note(name, town, file) {
  if (!hits.has(name)) hits.set(name, new Map());
  const t = hits.get(name);
  if (!t.has(town)) t.set(town, new Set());
  t.get(town).add(file);
}

/**
 * THE LOWERCASE TEST. A common noun that happens to be capitalised
 * ("the Road", "the Forge", "the Bank") appears in lowercase somewhere
 * in a corpus this size. An invented personal name never does. Collect
 * every lowercase word first, then treat any capitalised word with a
 * lowercase twin as vocabulary rather than as a person.
 */
const lower = new Set();
function harvest(text) {
  // words ALREADY lowercase in the source. Lowercasing the whole string
  // would let every name register its own twin and match itself.
  // Slugs (`fenside_halvor`, charter_margit) and code spans are NOT prose:
  // a person's own slug must never register as their lowercase twin.
  const prose = text.replace(/`[^`]*`/g, ' ').replace(/[A-Za-z0-9]+_[A-Za-z0-9_]+/g, ' ');
  for (const w of prose.match(/(?<![A-Za-z'_])[a-z][a-z']{2,}(?![A-Za-z'_])/g) || []) {
    lower.add(w.replace(/'s$/, ''));
  }
}

const pending = [];
function scanText(text, town, file) {
  harvest(text);
  pending.push({ text, town, file });
}

function resolveNames() {
  for (const { text, town, file } of pending) {
    const clean = text.replace(/\{item:[a-z0-9_]+\}/g, ' ').replace(/`[^`]*`/g, ' ').replace(/[*_]/g, '');
    for (const sentence of clean.split(/(?<=[.!?])\s+|\n/)) {
      const words = sentence.trim().split(/\s+/);
      for (let i = 0; i < words.length; i++) {
        let raw = words[i].replace(/^[^\w']+|[^\w']+$/g, '');
        raw = raw.replace(/'s$/, ''); // possessive is the same person
        if (i === 0) continue;                       // sentence opener
        if (!/^[A-Z][a-z]{2,}$/.test(raw)) continue; // drops contractions too
        if (known.has(raw) || STOP.has(raw)) continue;
        if (lower.has(raw.toLowerCase())) continue;  // it is vocabulary
        note(raw, town, file);
      }
    }
  }
}

for (const f of fs.readdirSync(DLG)) {
  if (!f.endsWith('.json')) continue;
  const d = JSON.parse(fs.readFileSync(path.join(DLG, f), 'utf8'));
  const town = [...new Set((d.bindings || []).map((b) => actorTown.get(b.target) || 'roads'))][0] || 'unbound';
  for (const n of d.nodes) {
    scanText(n.text, town, f);
    for (const c of n.choices || []) scanText(c.text, town, f);
  }
}
for (const f of fs.readdirSync(ACT)) {
  if (!f.endsWith('.json')) continue;
  const a = JSON.parse(fs.readFileSync(path.join(ACT, f), 'utf8'));
  const town = actorTown.get(f.replace('.json', '')) || 'roads';
  if (a.examine) scanText(a.examine, town, f);
  for (const l of a.lines || []) scanText(l, town, f);
}

// ---- the bible and the voice cards: prose, attributed to the file's
// town (its basename), with every `### Name —` head and `**Name**` bold
// entered as a PERSON for the one-letter law.
function walkMd(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkMd(p, out);
    else if (e.name.endsWith('.md')) out.push(p);
  }
  return out;
}
const bibleFiles = [
  ...walkMd(path.join(DOCS, 'dialogue-bible')),
  ...fs.readdirSync(DOCS).filter((f) => /^VOICE.*\.md$/.test(f)).map((f) => path.join(DOCS, f)),
  ...EXTRA_BIBLES.flatMap((d) => walkMd(d)),
];
for (const p of bibleFiles) {
  const town = path.basename(p, '.md').replace(/^_/, '');
  const text = fs.readFileSync(p, 'utf8');
  for (const m of text.matchAll(/^#{2,4}\s+([A-Z][a-z]+)(?:\s+[A-Z][a-z]+)?\s+—/gm)) personCandidates.push([m[1], `bible:${town}`]);
  for (const m of text.matchAll(/\*\*([A-Z][a-z]{2,})\*\*/g)) personCandidates.push([m[1], `bible:${town}`]);
  scanText(text, 'bible', path.basename(p));
}

resolveNames(); // the lowercase corpus is complete only now

// Actor display names and bible heads count as persons only when they
// are not plain vocabulary ("Watch", "Blade", "Sentinel", "Returner"
// are jobs; a bold "Signs" is a heading).
for (const [first, where] of personCandidates) {
  if (STOP.has(first) || lower.has(first.toLowerCase())) continue;
  person(first, where);
}

/**
 * THE BASELINE: one-edit pairs the shipped roster already carried the
 * day this law was written (2026-09-04). They are reported, never
 * fatal — renaming a shipped actor is the lead's call, not a gate's.
 * A NEW pair is fatal under --collide. Add to this list only with a
 * dated note and the lead's sign-off.
 */
const KNOWN_PAIRS = new Set([
  'Bram|Bray', 'Bray|Dray', 'Denna|Dunna', 'Denna|Senna', 'Nib|Nix', 'Petra|Petya', 'Ranka|Ranna', 'Ranna|Ravna', 'Signe|Signy',
]);

// ---- THE ONE-LETTER LAW
function lev1(a, b) {
  if (a === b) return false;
  const la = a.length, lb = b.length;
  if (Math.abs(la - lb) > 1) return false;
  if (la === lb) {
    let diff = 0;
    for (let i = 0; i < la; i++) if (a[i] !== b[i] && ++diff > 1) return false;
    return diff === 1;
  }
  const [s, l] = la < lb ? [a, b] : [b, a];
  let i = 0, j = 0, skipped = false;
  while (i < s.length && j < l.length) {
    if (s[i] === l[j]) { i++; j++; continue; }
    if (skipped) return false;
    skipped = true; j++;
  }
  return true;
}
/** Tholl/toll, Whin/Wyn-style: doubled letters collapsed, trailing e dropped, case folded. */
function homophone(n) {
  return n.toLowerCase().replace(/(.)\1+/g, '$1').replace(/e$/, '').replace(/ph/g, 'f').replace(/wh/g, 'w').replace(/y/g, 'i').replace(/ck/g, 'k');
}
const names = [...persons.keys()].sort();
const near = [];
for (let i = 0; i < names.length; i++) {
  for (let j = i + 1; j < names.length; j++) {
    const a = names[i], b = names[j];
    const sameWhere = [...persons.get(a)].some((w) => persons.get(b).has(w));
    // Two heads for the same person in one file (Vorl / Vorl Fullweight) are one person.
    if (a.toLowerCase() === b.toLowerCase()) continue;
    const l1 = lev1(a, b);
    const hp = homophone(a) === homophone(b);
    if (l1 || hp) near.push({ a, b, law: l1 ? 'one-edit' : 'homophone', sameWhere, known: KNOWN_PAIRS.has(`${a}|${b}`), wa: [...persons.get(a)], wb: [...persons.get(b)] });
  }
}

const rows = [...hits].map(([name, towns]) => ({ name, towns })).sort((a, b) => b.towns.size - a.towns.size || a.name.localeCompare(b.name));
const collisions = rows.filter((r) => r.towns.size > 1);

console.log(`\n=== CROSS-TOWN NAME COLLISIONS: ${collisions.length} ===`);
console.log('(a name spoken in two unrelated towns: verify it is the SAME person)\n');
for (const r of collisions) {
  console.log(`  ${r.name}`);
  for (const [t, files] of r.towns) console.log(`      ${t.padEnd(24)} ${[...files].slice(0, 4).join(' ')}`);
}
console.log(`\n=== ONE-LETTER / HOMOPHONE PAIRS: ${near.length} (over ${names.length} person names) ===`);
for (const n of near) {
  console.log(`  ${n.known ? '(baseline) ' : 'NEW        '}${n.a} ~ ${n.b}  [${n.law}]  ${n.wa.slice(0, 3).join(',')}  |  ${n.wb.slice(0, 3).join(',')}`);
}
const fatalNear = near.filter((n) => !n.known);
if (!ONLY_COLLIDE) {
  console.log(`\n=== all invented names: ${rows.length} ===`);
  for (const r of rows) console.log(`  ${r.name.padEnd(16)} ${[...r.towns.keys()].join(', ')}`);
}
if (ONLY_COLLIDE && (collisions.length > 0 || fatalNear.length > 0)) {
  console.log(`\nNAMES GATE: FAIL (${collisions.length} cross-town, ${fatalNear.length} new one-edit/homophone)`);
  process.exitCode = 1;
} else if (ONLY_COLLIDE) {
  console.log('\nNAMES GATE: PASS');
}
