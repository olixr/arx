/**
 * THE CLIP LEDGER — content's half of the voiceover epic
 * (docs/voiceover-plan.md). Three shapes live here:
 *
 *   VoiceClipDef  one recorded utterance: a slug, a content-addressed
 *                 binary (sha1 names the file, THE HASH IS THE FILE),
 *                 a duration, and a transcript the VOICE.md law reads.
 *   VoiceBankDef  an owner's fallback throat: named slots (greet, ack,
 *                 yes, no, farewell, hm, bark) each holding a weighted
 *                 shuffle of clips. The owner axis is open — 'actor'
 *                 today; 'poi', 'zone', 'cutscene' join as new kinds
 *                 without touching the shape.
 *   VoiceDoc      the dials — quip cadence, duck depths, prefetch and
 *                 upload caps. A live content doc (kind 'voice', the
 *                 two-hash law): the DB is the truth, this object is
 *                 the shipped seed AND the live registry. Every
 *                 consumer reads VOICE.x at call time; never
 *                 destructure a dial into long-lived state.
 *
 * THE ONE RESOLVER (server-side, Phase 3+) picks node line → bank
 * slot → silence; nothing here plays sound. The client only ever sees
 * URLs built by voiceClipUrl.
 */

// ------------------------------------------------------- the grammar

/** Same id grammar as dialogue/node ids — one naming law everywhere. */
const SLUG_RE = /^[a-z][a-z0-9_]*$/;
const SLUG_MAX = 48;
const HASH_RE = /^[a-f0-9]{40}$/;

/**
 * The bank slots — each is a MOMENT the conversation flow fires, so
 * the roster is code, not a dial: a Studio-invented slot would sit
 * silent forever. New slots arrive with the code that fires them.
 */
export const VOICE_SLOTS = ['greet', 'ack', 'yes', 'no', 'farewell', 'hm', 'bark'] as const;
export type VoiceSlot = (typeof VOICE_SLOTS)[number];

/**
 * Owner kinds a bank may hang from (THE WORLD SPEAKS, Phase 6):
 * 'actor' throats speak in conversation and barks; 'poi' banks are
 * the spirit at a shrine — their greet fires the moment a site is
 * first discovered; 'zone' banks are the voice on the wind — greet
 * fires at a place's first footfall. Future kinds join here with the
 * moment that fires them.
 */
export const VOICE_OWNER_KINDS = ['actor', 'poi', 'zone'] as const;
export type VoiceOwnerKind = (typeof VOICE_OWNER_KINDS)[number];

/**
 * Node moods — the designer's mark that a beat is an affirmation, a
 * refusal, or a hesitation. An unvoiced marked beat draws its mood's
 * bank slot unconditionally (a mark is authored intent, never diced).
 */
export const VOICE_MOODS = ['yes', 'no', 'hm'] as const;
export type VoiceMood = (typeof VOICE_MOODS)[number];

/**
 * THE REEL THRESHOLD: a line at or past this length streams through a
 * media element instead of decoding into a buffer (the cutscene/boss
 * reel path) — and the prefetch walk leaves it to stream on demand.
 */
export const VOICE_STREAM_MS = 45_000;

/** Accepted upload containers and what they serve as. */
export const VOICE_EXTS = ['ogg', 'opus', 'webm', 'mp3', 'm4a', 'wav'] as const;
export type VoiceExt = (typeof VOICE_EXTS)[number];
export const VOICE_MIME: Record<VoiceExt, string> = {
  ogg: 'audio/ogg',
  opus: 'audio/ogg',
  webm: 'audio/webm',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  wav: 'audio/wav',
};

// ---------------------------------------------------------- the clip

export interface VoiceClipDef {
  /** Designer-facing slug, e.g. dunna_greet_2, grunt_low_1. */
  id: string;
  /** sha1 (hex) of the binary — names the file on disk and the URL. */
  fileHash: string;
  ext: VoiceExt;
  /** Play length, probed by the Studio's decoder at upload. */
  durMs: number;
  /** Binary size as stored. */
  bytes: number;
  /** What is spoken — player-facing text, docs/VOICE.md governs it. */
  transcript?: string;
  /** Owning actor slug; undefined = a shared/generic clip. */
  actor?: string;
  /** Free labels for the Studio's shelves: grunt, female, gruff… */
  tags?: string[];
}

/** The immutable URL a clip serves at — the client's only address. */
export function voiceClipUrl(clip: Pick<VoiceClipDef, 'fileHash' | 'ext'>): string {
  return `/voice/${clip.fileHash}.${clip.ext}`;
}

export type ValidateClipResult = { ok: true; def: VoiceClipDef } | { ok: false; errors: string[] };

/** Ten minutes — far past any spoken line, still refusing a podcast. */
const DUR_MAX_MS = 10 * 60_000;
const TRANSCRIPT_MAX = 600;
const TAG_MAX = 24;
const TAGS_MAX = 16;

export function validateVoiceClip(
  raw: unknown,
  opts: { actorIds?: ReadonlySet<string> } = {},
): ValidateClipResult {
  const errors: string[] = [];
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ok: false, errors: ['clip must be an object'] };
  }
  const doc = raw as Record<string, unknown>;
  const id = typeof doc.id === 'string' ? doc.id : '';
  if (!SLUG_RE.test(id) || id.length > SLUG_MAX) {
    errors.push(`clip id '${id}' must match ${SLUG_RE} (max ${SLUG_MAX})`);
  }
  const fileHash = typeof doc.fileHash === 'string' ? doc.fileHash : '';
  if (!HASH_RE.test(fileHash)) errors.push('fileHash must be 40 hex chars (sha1)');
  const ext = doc.ext as VoiceExt;
  if (!VOICE_EXTS.includes(ext)) errors.push(`ext must be one of ${VOICE_EXTS.join('/')}`);
  const durMs = doc.durMs;
  if (typeof durMs !== 'number' || !Number.isInteger(durMs) || durMs < 1 || durMs > DUR_MAX_MS) {
    errors.push(`durMs must be an integer in [1, ${DUR_MAX_MS}]`);
  }
  const bytes = doc.bytes;
  if (typeof bytes !== 'number' || !Number.isInteger(bytes) || bytes < 1) {
    errors.push('bytes must be a positive integer');
  } else if (bytes > VOICE.maxClipBytes) {
    errors.push(`bytes exceeds the maxClipBytes dial (${VOICE.maxClipBytes})`);
  }
  if (doc.transcript !== undefined) {
    if (typeof doc.transcript !== 'string' || doc.transcript.length > TRANSCRIPT_MAX) {
      errors.push(`transcript must be a string of at most ${TRANSCRIPT_MAX} chars`);
    }
  }
  if (doc.actor !== undefined) {
    if (typeof doc.actor !== 'string' || !SLUG_RE.test(doc.actor)) {
      errors.push('actor must be an actor slug');
    } else if (opts.actorIds && !opts.actorIds.has(doc.actor)) {
      errors.push(`actor '${doc.actor}' is not a known actor`);
    }
  }
  if (doc.tags !== undefined) {
    if (!Array.isArray(doc.tags) || doc.tags.length > TAGS_MAX) {
      errors.push(`tags must be an array of at most ${TAGS_MAX}`);
    } else {
      for (const t of doc.tags) {
        if (typeof t !== 'string' || !SLUG_RE.test(t) || t.length > TAG_MAX) {
          errors.push(`tag '${String(t)}' must be a short slug`);
        }
      }
    }
  }
  if (errors.length > 0) return { ok: false, errors };
  const def: VoiceClipDef = {
    id,
    fileHash,
    ext,
    durMs: durMs as number,
    bytes: bytes as number,
  };
  if (doc.transcript !== undefined) def.transcript = doc.transcript as string;
  if (doc.actor !== undefined) def.actor = doc.actor as string;
  if (doc.tags !== undefined && (doc.tags as string[]).length > 0) {
    def.tags = [...(doc.tags as string[])];
  }
  return { ok: true, def };
}

// ---------------------------------------------------------- the bank

export interface VoiceBankEntry {
  /** A VoiceClipDef id. */
  clip: string;
  /** Shuffle weight, default 1. */
  weight?: number;
}

export interface VoiceBankDef {
  owner: { kind: VoiceOwnerKind; id: string };
  slots: Partial<Record<VoiceSlot, VoiceBankEntry[]>>;
}

export type ValidateBankResult = { ok: true; def: VoiceBankDef } | { ok: false; errors: string[] };

const SLOT_ENTRIES_MAX = 16;

export function validateVoiceBank(
  raw: unknown,
  opts: { clipIds: ReadonlySet<string>; ownerIds?: ReadonlySet<string> },
): ValidateBankResult {
  const errors: string[] = [];
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ok: false, errors: ['bank must be an object'] };
  }
  const doc = raw as Record<string, unknown>;
  const owner = doc.owner as { kind?: unknown; id?: unknown } | undefined;
  const kind = owner?.kind as VoiceOwnerKind;
  const ownerId = typeof owner?.id === 'string' ? owner.id : '';
  if (!owner || !VOICE_OWNER_KINDS.includes(kind)) {
    errors.push(`owner.kind must be one of ${VOICE_OWNER_KINDS.join('/')}`);
  }
  if (!SLUG_RE.test(ownerId) || ownerId.length > SLUG_MAX) {
    errors.push(`owner.id '${ownerId}' must be a slug`);
  } else if (opts.ownerIds && !opts.ownerIds.has(ownerId)) {
    errors.push(`owner '${ownerId}' is not known`);
  }
  const slots: VoiceBankDef['slots'] = {};
  if (typeof doc.slots !== 'object' || doc.slots === null || Array.isArray(doc.slots)) {
    errors.push('slots must be an object');
  } else {
    for (const [slot, entries] of Object.entries(doc.slots as Record<string, unknown>)) {
      if (!VOICE_SLOTS.includes(slot as VoiceSlot)) {
        errors.push(`unknown slot '${slot}' (moments are code: ${VOICE_SLOTS.join(', ')})`);
        continue;
      }
      if (!Array.isArray(entries) || entries.length === 0 || entries.length > SLOT_ENTRIES_MAX) {
        errors.push(`slot '${slot}' must hold 1..${SLOT_ENTRIES_MAX} entries`);
        continue;
      }
      const out: VoiceBankEntry[] = [];
      for (const e of entries) {
        const entry = e as { clip?: unknown; weight?: unknown };
        const clip = typeof entry.clip === 'string' ? entry.clip : '';
        if (!opts.clipIds.has(clip)) {
          errors.push(`slot '${slot}' names unknown clip '${clip}'`);
          continue;
        }
        const item: VoiceBankEntry = { clip };
        if (entry.weight !== undefined) {
          if (
            typeof entry.weight !== 'number' ||
            !Number.isInteger(entry.weight) ||
            entry.weight < 1 ||
            entry.weight > 100
          ) {
            errors.push(`slot '${slot}' clip '${clip}' weight must be an integer 1..100`);
          } else if (entry.weight !== 1) {
            item.weight = entry.weight;
          }
        }
        out.push(item);
      }
      if (out.length > 0) slots[slot as VoiceSlot] = out;
    }
  }
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, def: { owner: { kind, id: ownerId }, slots } };
}

// --------------------------------------------------------- the dials

export interface VoiceDoc {
  /** Chance an unvoiced beat draws an 'ack' quip from the speaker. */
  quipChance: number;
  /** Per-speaker quiet time between quips — punctuation, not chatter. */
  quipCooldownMs: number;
  /** Music/tracks duck under a spoken line (fraction of normal). */
  duckLine: number;
  /** Ambience duck under a spoken line — the world keeps breathing. */
  duckAmbience: number;
  /** How long the ducks take to release after the line ends. */
  duckReleaseMs: number;
  /** Most clip URLs a dialogue-open prefetch list may carry. */
  prefetchCap: number;
  /** Upload ceiling for one clip's binary. */
  maxClipBytes: number;
}

/**
 * THE VOICE DIALS — the shipped seed and the live registry in one
 * object (the FRONTIER idiom). replaceVoice swaps fields in place so
 * every call-time read sees a Studio save on the next beat.
 */
export const VOICE: VoiceDoc = {
  quipChance: 0.45,
  quipCooldownMs: 6_000,
  duckLine: 0.45,
  duckAmbience: 0.75,
  duckReleaseMs: 600,
  prefetchCap: 12,
  maxClipBytes: 8 * 1024 * 1024,
};

/** The authored dials exactly as shipped — the CMS revert target. */
export const AUTHORED_VOICE: Readonly<VoiceDoc> = Object.freeze({ ...VOICE });

export type ValidateVoiceResult = { ok: true; def: VoiceDoc } | { ok: false; errors: string[] };

export function validateVoice(raw: unknown): ValidateVoiceResult {
  const errors: string[] = [];
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ok: false, errors: ['voice doc must be an object'] };
  }
  const doc = raw as Record<string, unknown>;
  const num = (key: keyof VoiceDoc, lo: number, hi: number, int = false): number => {
    const v = doc[key];
    if (typeof v !== 'number' || !Number.isFinite(v)) {
      errors.push(`${key} must be a number`);
      return lo;
    }
    if (int && !Number.isInteger(v)) errors.push(`${key} must be an integer`);
    if (v < lo || v > hi) errors.push(`${key} must be in [${lo}, ${hi}]`);
    return v;
  };
  const def: VoiceDoc = {
    quipChance: num('quipChance', 0, 1),
    quipCooldownMs: num('quipCooldownMs', 0, 120_000, true),
    duckLine: num('duckLine', 0.05, 1),
    duckAmbience: num('duckAmbience', 0.05, 1),
    duckReleaseMs: num('duckReleaseMs', 0, 5_000, true),
    prefetchCap: num('prefetchCap', 0, 32, true),
    maxClipBytes: num('maxClipBytes', 64 * 1024, 20 * 1024 * 1024, true),
  };
  // Unknown keys are refused loudly — a typoed dial must never sit in
  // the doc pretending to steer anything.
  const known = new Set(Object.keys(def));
  for (const key of Object.keys(doc)) {
    if (!known.has(key)) errors.push(`unknown dial '${key}'`);
  }
  // The cross-law: a line duck deeper than the ambience duck keeps
  // speech the subject — the reverse buries the voice under birdsong.
  if (def.duckAmbience < def.duckLine) {
    errors.push('duckAmbience must not sit below duckLine (the world steps back less than music)');
  }
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, def };
}

/** THE CMS HOOK — swap the live dials in place, identity stable. */
export function replaceVoice(next: VoiceDoc): void {
  Object.assign(VOICE, next);
}

// The shipped seed must satisfy its own law — loudly, at build time.
{
  const res = validateVoice(AUTHORED_VOICE);
  if (!res.ok) throw new Error(`shipped VOICE dials invalid:\n  ${res.errors.join('\n  ')}`);
}
