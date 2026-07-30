import {
  VOICE_SLOTS,
  voiceClipUrl,
  type VoiceBankDef,
  type VoiceBankEntry,
  type VoiceClipDef,
  type VoiceDoc,
  type VoiceSlot,
} from '@arx/content';
import { iconImg } from '../editor/editorIcons.js';
import {
  deleteVoiceBank,
  deleteVoiceClip,
  saveVoiceBank,
  saveVoiceClip,
} from './api.js';
import { markDirty, persistence, reloadSection, setSection, state, toast } from './cms.js';
import { actorBust } from './portraits.js';
import { combobox, el, pill, type ComboOption } from './widgets.js';

/**
 * The Voice bench — THE STUDIO SPEAKS (voiceover-plan Phase 5). Three
 * panes over the one clip ledger:
 *
 *   THE LIBRARY  every recorded clip: upload straight from disk (the
 *                browser's own decoder probes the true duration),
 *                audition, describe (transcript/actor/tags), replace,
 *                delete (the server refuses while anything speaks it);
 *   THE BANKS    each throat's fallback quips — slot rows with
 *                weighted shuffles, auditioned exactly as the live
 *                resolver would draw them;
 *   THE DIALS    the 'voice' singleton on the weather-bench skeleton.
 *
 * Every save lands in the DB and re-registers the live ledger — an
 * upload speaks on the very next line in the running world.
 */

const SLUG_RE = /^[a-z][a-z0-9_]*$/;

/** What each slot means in the live flow — shown beside its row. */
const SLOT_HINTS: Record<VoiceSlot, string> = {
  greet: 'fires at the door — the first beat of every conversation',
  ack: 'between beats without a full line, rationed by the dials',
  yes: 'no firing moment yet — arrives with node marking',
  no: 'no firing moment yet — arrives with node marking',
  farewell: 'fires on the terminal beat — the goodbye',
  hm: 'no firing moment yet — the thinking filler',
  bark: 'rides the overworld one-liners, spatial at the speaker',
};

// ------------------------------------------------------ small helpers

const fmtMs = (ms: number): string => (ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`);
const fmtBytes = (b: number): string =>
  b < 1024 ? `${b}b` : b < 1024 * 1024 ? `${Math.round(b / 1024)}kb` : `${(b / (1024 * 1024)).toFixed(1)}mb`;

/**
 * One audition throat for the whole Studio — a new play stops the
 * old. The Dialogue Studio's beat rows and rehearsal borrow it too.
 */
let auditionEl: HTMLAudioElement | null = null;
export function audition(url: string): void {
  auditionEl?.pause();
  auditionEl = new Audio(url);
  auditionEl.play().catch(() => toast('could not play the clip', 3000, 'error'));
}

/** Decode the true duration with the browser's own decoder. */
async function probeDurMs(bytes: ArrayBuffer): Promise<number> {
  const ctx = new AudioContext();
  try {
    const buf = await ctx.decodeAudioData(bytes.slice(0));
    return Math.max(1, Math.round(buf.duration * 1000));
  } finally {
    void ctx.close();
  }
}

function extOf(name: string): string {
  return (name.split('.').pop() ?? '').toLowerCase();
}

function b64(bytes: ArrayBuffer): string {
  const arr = new Uint8Array(bytes);
  let out = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < arr.length; i += CHUNK) {
    out += String.fromCharCode(...arr.subarray(i, i + CHUNK));
  }
  return btoa(out);
}

function clipOptions(): ComboOption[] {
  return (state.voice?.clips ?? []).map((c) => ({
    id: c.def.id,
    label: c.def.id,
    sub: `${fmtMs(c.def.durMs)}${c.def.actor ? ` · ${c.def.actor}` : ' · shared'}${c.def.transcript ? ` · “${c.def.transcript.slice(0, 40)}”` : ''}`,
  }));
}

function actorOptions(): ComboOption[] {
  return [
    { id: '', label: 'shared (no owner)', sub: 'a generic clip any bank may borrow' },
    ...state.actors.map((a) => ({ id: a.def.id, label: a.def.name, sub: a.def.id })),
  ];
}

function paneHead(icon: string, title: string, sub: string, pills: HTMLElement[]): HTMLElement {
  const head = el('div', 'hero');
  const frame = el('div', 'hero-portrait');
  frame.appendChild(iconImg(icon, 34));
  head.appendChild(frame);
  const mid = el('div', 'hero-mid');
  const nameRow = el('div', 'hero-name');
  nameRow.appendChild(el('h1', '', title));
  nameRow.appendChild(el('span', 'sub', sub));
  mid.appendChild(nameRow);
  const pillRow = el('div', 'hero-pills');
  for (const p of pills) pillRow.appendChild(p);
  mid.appendChild(pillRow);
  head.appendChild(mid);
  return head;
}

function vsect(title: string, subtitle: string, ...children: HTMLElement[]): HTMLElement {
  const box = el('div', 'fsect');
  box.appendChild(el('h3', '', title));
  if (subtitle) box.appendChild(el('p', 'sect-sub', subtitle));
  for (const c of children) box.appendChild(c);
  return box;
}

/** Every place a clip is spoken — nodes and bank slots, for guards + linkage. */
function clipUses(clipId: string): { nodes: string[]; slots: string[] } {
  const nodes: string[] = [];
  for (const d of state.dialogues) {
    for (const n of d.def.nodes) if (n.voice === clipId) nodes.push(`${d.def.id} · ${n.id}`);
  }
  const slots: string[] = [];
  for (const b of state.voice?.banks ?? []) {
    for (const [slot, entries] of Object.entries(b.slots)) {
      if ((entries ?? []).some((e) => e.clip === clipId)) slots.push(`${b.owner.id} · ${slot}`);
    }
  }
  return { nodes, slots };
}

// --------------------------------------------------------- the library

function libraryPane(body: HTMLElement, linkage: HTMLElement): void {
  const v = state.voice;
  if (!v) {
    body.appendChild(el('p', 'muted', 'The ledger has not loaded — is the server running?'));
    return;
  }
  const total = v.clips.reduce((n, c) => n + c.def.bytes, 0);
  body.appendChild(
    paneHead('speech', 'The Library', `voice · ${v.clips.length} clips`, [
      pill(`${fmtBytes(total)} on the shelf`, 'total stored audio', 'ink'),
      pill(
        `cap ${fmtBytes(v.dials.def.maxClipBytes)}/clip`,
        'the maxClipBytes dial — raise it on the Dials pane',
        'brass',
      ),
    ]),
  );

  // ---- the upload card
  const up = el('div', 'voice-upload');
  const drop = el('div', 'voice-drop');
  drop.appendChild(el('b', '', 'Add a recording'));
  drop.appendChild(
    el('p', 'muted', 'Pick an audio file (ogg/opus/webm/mp3/m4a/wav). The duration is probed right here; the binary lands content-addressed and immutable.'),
  );
  const file = document.createElement('input');
  file.type = 'file';
  file.accept = '.ogg,.opus,.webm,.mp3,.m4a,.wav,audio/*';
  drop.appendChild(file);
  up.appendChild(drop);

  const form = el('div', 'voice-upload-form');
  const idIn = document.createElement('input');
  idIn.placeholder = 'clip id, e.g. dunna_greet_1';
  const transcriptIn = document.createElement('textarea');
  transcriptIn.placeholder = 'transcript — what is spoken (docs/VOICE.md governs it)';
  transcriptIn.rows = 2;
  const tagsIn = document.createElement('input');
  tagsIn.placeholder = 'tags, comma-separated: greet, grunt, gruff';
  let actorPick = '';
  const actorCombo = combobox(actorOptions, '', (id) => (actorPick = id), 'owning actor…');
  const probe = el('span', 'muted', 'no file chosen');
  const send = el('button', 'primary', 'Upload ▸ Live') as HTMLButtonElement;
  send.disabled = true;

  let pending: { bytes: ArrayBuffer; ext: string; durMs: number } | null = null;
  file.onchange = async () => {
    const f = file.files?.[0];
    if (!f) return;
    const ext = extOf(f.name);
    try {
      const bytes = await f.arrayBuffer();
      const durMs = await probeDurMs(bytes);
      pending = { bytes, ext, durMs };
      probe.textContent = `${f.name} — ${fmtMs(durMs)}, ${fmtBytes(bytes.byteLength)}`;
      if (!idIn.value) {
        idIn.value = f.name
          .replace(/\.[^.]*$/, '')
          .toLowerCase()
          .replace(/[^a-z0-9_]+/g, '_')
          .replace(/^_+|_+$/g, '')
          .replace(/^(?=[0-9])/, 'clip_');
      }
      send.disabled = false;
    } catch {
      pending = null;
      send.disabled = true;
      probe.textContent = 'could not decode that file — is it audio?';
    }
  };
  send.onclick = () => {
    if (!pending) return;
    const id = idIn.value.trim();
    if (!SLUG_RE.test(id)) {
      toast('clip ids are lowercase [a-z0-9_]', 3200, 'error');
      return;
    }
    const tags = tagsIn.value.split(',').map((t) => t.trim()).filter(Boolean);
    send.disabled = true;
    void saveVoiceClip({
      id,
      ext: pending.ext,
      durMs: pending.durMs,
      transcript: transcriptIn.value.trim() || undefined,
      actor: actorPick || undefined,
      tags: tags.length > 0 ? tags : undefined,
      dataB64: b64(pending.bytes),
    })
      .then(async () => {
        toast(`'${id}' uploaded — it speaks on the next line`, 3000, 'success');
        await reloadSection('voice');
      })
      .catch((err) => {
        send.disabled = false;
        toast((err as Error).message, 5000, 'error');
      });
  };
  form.append(idIn, actorCombo, transcriptIn, tagsIn, probe, send);
  up.appendChild(form);
  body.appendChild(vsect('New clip', '', up));

  // ---- the shelf
  const shelf = el('div', 'voice-shelf');
  const filter = document.createElement('input');
  filter.placeholder = 'filter clips…';
  filter.className = 'voice-filter';
  const cards = el('div', 'voice-cards');
  const renderCards = (): void => {
    cards.innerHTML = '';
    const q = filter.value.trim().toLowerCase();
    const rows = v.clips.filter(
      (c) =>
        !q ||
        c.def.id.includes(q) ||
        (c.def.actor ?? '').includes(q) ||
        (c.def.transcript ?? '').toLowerCase().includes(q) ||
        (c.def.tags ?? []).some((t) => t.includes(q)),
    );
    if (rows.length === 0) {
      cards.appendChild(el('p', 'muted', v.clips.length === 0 ? 'The shelf is bare — upload the first recording above.' : 'Nothing matches.'));
    }
    for (const c of rows) cards.appendChild(clipCard(c));
  };
  filter.oninput = renderCards;
  shelf.append(filter, cards);
  renderCards();
  body.appendChild(vsect('The shelf', 'audition, describe, replace, retire', shelf));

  // ---- linkage: who speaks what
  const spoken = el('div', 'panel');
  spoken.appendChild(el('div', 'panel-head', 'Spoken in the trees'));
  const lines: HTMLElement[] = [];
  for (const d of state.dialogues) {
    for (const n of d.def.nodes) {
      if (n.voice !== undefined) {
        const row = el('button', 'link-row', `${d.def.id} · ${n.id} → ${n.voice}`) as HTMLButtonElement;
        row.onclick = () => setSection('dialogues', d.def.id);
        lines.push(row);
      }
    }
  }
  if (lines.length === 0) {
    spoken.appendChild(el('p', 'muted', 'No tree names a clip yet — attach one on a beat in the Dialogue Studio.'));
  }
  for (const row of lines.slice(0, 40)) spoken.appendChild(row);
  linkage.appendChild(spoken);
}

function clipCard(c: { def: VoiceClipDef; edited: boolean; url: string }): HTMLElement {
  const card = el('div', 'voice-card');
  const head = el('div', 'voice-card-head');
  const play = el('button', 'voice-play', '▶') as HTMLButtonElement;
  play.title = 'audition';
  play.onclick = () => audition(c.url);
  head.appendChild(play);
  const title = el('div', 'voice-card-title');
  title.appendChild(el('b', '', c.def.id));
  title.appendChild(
    el('span', 'muted', ` ${fmtMs(c.def.durMs)} · ${fmtBytes(c.def.bytes)} · ${c.def.ext}${c.def.actor ? ` · ${c.def.actor}` : ' · shared'}`),
  );
  head.appendChild(title);
  const uses = clipUses(c.def.id);
  const useCount = uses.nodes.length + uses.slots.length;
  head.appendChild(
    pill(
      useCount === 0 ? 'unused' : `${useCount} use${useCount === 1 ? '' : 's'}`,
      [...uses.nodes, ...uses.slots].join('\n') || 'nothing speaks this clip yet',
      useCount === 0 ? 'ink' : 'brass',
    ),
  );
  const del = el('button', 'danger voice-del', '✕') as HTMLButtonElement;
  del.title = 'retire the clip (refused while anything speaks it)';
  del.onclick = () => {
    if (!window.confirm(`Retire '${c.def.id}'?`)) return;
    void deleteVoiceClip(c.def.id)
      .then(async () => {
        toast(`'${c.def.id}' retired`, 2600, 'success');
        await reloadSection('voice');
      })
      .catch((err) => toast((err as Error).message, 5000, 'error'));
  };
  head.appendChild(del);
  card.appendChild(head);

  // Details: transcript + actor + tags, saved as a metadata-only PUT.
  const meta = el('div', 'voice-card-meta');
  const transcript = document.createElement('textarea');
  transcript.rows = 2;
  transcript.placeholder = 'transcript…';
  transcript.value = c.def.transcript ?? '';
  let actorPick = c.def.actor ?? '';
  const actorCombo = combobox(actorOptions, actorPick, (id) => {
    actorPick = id;
    saveBtn.disabled = false;
  });
  const tags = document.createElement('input');
  tags.placeholder = 'tags…';
  tags.value = (c.def.tags ?? []).join(', ');
  const saveBtn = el('button', '', 'Save details') as HTMLButtonElement;
  saveBtn.disabled = true;
  transcript.oninput = () => (saveBtn.disabled = false);
  tags.oninput = () => (saveBtn.disabled = false);
  saveBtn.onclick = () => {
    const tagList = tags.value.split(',').map((t) => t.trim()).filter(Boolean);
    void saveVoiceClip({
      id: c.def.id,
      durMs: c.def.durMs,
      transcript: transcript.value.trim() || undefined,
      actor: actorPick || undefined,
      tags: tagList.length > 0 ? tagList : undefined,
    })
      .then(async () => {
        toast(`'${c.def.id}' details saved`, 2600, 'success');
        await reloadSection('voice');
      })
      .catch((err) => toast((err as Error).message, 5000, 'error'));
  };
  // Replace the recording in place — new hash, new URL, same id.
  const replace = document.createElement('input');
  replace.type = 'file';
  replace.accept = '.ogg,.opus,.webm,.mp3,.m4a,.wav,audio/*';
  replace.className = 'voice-replace';
  replace.title = 'replace the recording (same id, new immutable URL)';
  replace.onchange = async () => {
    const f = replace.files?.[0];
    if (!f) return;
    try {
      const bytes = await f.arrayBuffer();
      const durMs = await probeDurMs(bytes);
      await saveVoiceClip({
        id: c.def.id,
        ext: extOf(f.name),
        durMs,
        transcript: transcript.value.trim() || undefined,
        actor: actorPick || undefined,
        tags: tags.value.split(',').map((t) => t.trim()).filter(Boolean),
        dataB64: b64(bytes),
      });
      toast(`'${c.def.id}' re-recorded (${fmtMs(durMs)})`, 3000, 'success');
      await reloadSection('voice');
    } catch (err) {
      toast((err as Error).message, 5000, 'error');
    }
  };
  meta.append(transcript, actorCombo, tags, replace, saveBtn);
  card.appendChild(meta);
  return card;
}

// ----------------------------------------------------------- the banks

function bankCard(bank: VoiceBankDef, isDraft: boolean): HTMLElement {
  // The card edits a local draft; Save replaces the owner's whole bank.
  const draft: VoiceBankDef = JSON.parse(JSON.stringify(bank)) as VoiceBankDef;
  const card = el('div', 'voice-bank-card');
  const head = el('div', 'voice-card-head');
  const actorDef = state.actors.find((a) => a.def.id === draft.owner.id)?.def;
  const bust = actorDef ? actorBust(actorDef, 34) : null;
  if (bust) {
    bust.className = 'voice-bank-bust';
    head.appendChild(bust);
  }
  const title = el('div', 'voice-card-title');
  title.appendChild(el('b', '', actorDef?.name ?? draft.owner.id));
  title.appendChild(el('span', 'muted', ` ${draft.owner.kind}:${draft.owner.id}`));
  head.appendChild(title);
  const save = el('button', 'primary', isDraft ? 'Create ▸ Live' : 'Save ▸ Live') as HTMLButtonElement;
  save.onclick = () => {
    // Empty slots are dropped; a wholly empty bank is a delete.
    const slots: VoiceBankDef['slots'] = {};
    for (const s of VOICE_SLOTS) {
      const entries = (draft.slots[s] ?? []).filter((e) => e.clip);
      if (entries.length > 0) slots[s] = entries;
    }
    const def: VoiceBankDef = { owner: draft.owner, slots };
    const empty = Object.keys(slots).length === 0;
    void (empty ? deleteVoiceBank(draft.owner.kind, draft.owner.id) : saveVoiceBank(def))
      .then(async () => {
        toast(
          empty
            ? `${draft.owner.id}'s bank cleared`
            : `${draft.owner.id}'s throat is set — the next talk draws it`,
          3000,
          'success',
        );
        await reloadSection('voice');
      })
      .catch((err) => toast((err as Error).message, 5000, 'error'));
  };
  head.appendChild(save);
  if (!isDraft) {
    const del = el('button', 'danger voice-del', '✕') as HTMLButtonElement;
    del.title = 'clear this whole bank';
    del.onclick = () => {
      if (!window.confirm(`Clear ${draft.owner.id}'s bank?`)) return;
      void deleteVoiceBank(draft.owner.kind, draft.owner.id)
        .then(async () => {
          toast('bank cleared', 2600, 'success');
          await reloadSection('voice');
        })
        .catch((err) => toast((err as Error).message, 5000, 'error'));
    };
    head.appendChild(del);
  }
  card.appendChild(head);

  for (const slot of VOICE_SLOTS) {
    const row = el('div', 'voice-slot');
    const label = el('div', 'voice-slot-label');
    label.appendChild(el('b', '', slot));
    label.appendChild(el('span', 'muted', SLOT_HINTS[slot]));
    row.appendChild(label);
    const entriesBox = el('div', 'voice-slot-entries');
    const renderEntries = (): void => {
      entriesBox.innerHTML = '';
      const entries = draft.slots[slot] ?? [];
      for (const [i, e] of entries.entries()) {
        const entry = el('div', 'voice-entry');
        entry.appendChild(
          combobox(clipOptions, e.clip, (id) => {
            e.clip = id;
            renderEntries();
          }),
        );
        const w = document.createElement('input');
        w.type = 'number';
        w.min = '1';
        w.max = '100';
        w.value = String(e.weight ?? 1);
        w.title = 'shuffle weight';
        w.className = 'voice-weight';
        w.oninput = () => {
          const val = Number(w.value);
          if (Number.isInteger(val) && val >= 1 && val <= 100) {
            if (val === 1) delete e.weight;
            else e.weight = val;
          }
        };
        entry.appendChild(w);
        const rm = el('button', 'voice-del', '✕') as HTMLButtonElement;
        rm.onclick = () => {
          entries.splice(i, 1);
          renderEntries();
        };
        entry.appendChild(rm);
        entriesBox.appendChild(entry);
      }
      const add = el('button', 'voice-add', '+ clip') as HTMLButtonElement;
      add.onclick = () => {
        (draft.slots[slot] ??= []).push({ clip: '' } as VoiceBankEntry);
        renderEntries();
      };
      entriesBox.appendChild(add);
      if (entries.length > 0) {
        const play = el('button', 'voice-play', '▶') as HTMLButtonElement;
        play.title = 'audition — one weighted draw, exactly as the resolver rolls';
        play.onclick = () => {
          const pool = entries.filter((e) => e.clip);
          if (pool.length === 0) return;
          const total = pool.reduce((a, e) => a + (e.weight ?? 1), 0);
          let mark = Math.random() * total;
          let picked = pool[pool.length - 1]!;
          for (const e of pool) {
            mark -= e.weight ?? 1;
            if (mark < 0) {
              picked = e;
              break;
            }
          }
          const clip = state.voice?.clips.find((c) => c.def.id === picked.clip);
          if (clip) audition(voiceClipUrl(clip.def));
        };
        entriesBox.appendChild(play);
      }
    };
    renderEntries();
    row.appendChild(entriesBox);
    card.appendChild(row);
  }
  return card;
}

function banksPane(body: HTMLElement, linkage: HTMLElement): void {
  const v = state.voice;
  if (!v) {
    body.appendChild(el('p', 'muted', 'The ledger has not loaded — is the server running?'));
    return;
  }
  const filled = v.banks.reduce((n, b) => n + Object.keys(b.slots).length, 0);
  body.appendChild(
    paneHead('actor', 'The Banks', `voice · ${v.banks.length} throats`, [
      pill(`${filled} filled slot${filled === 1 ? '' : 's'}`, 'slots holding at least one clip', 'brass'),
      pill('line → slot → silence', 'the resolver chain — a bank only speaks when the beat has no full line', 'ink'),
    ]),
  );

  // New bank: pick an actor without one.
  const owned = new Set(v.banks.map((b) => `${b.owner.kind}:${b.owner.id}`));
  const fresh = el('div', 'voice-newbank');
  fresh.appendChild(el('b', '', 'Give a throat its fallbacks'));
  const freshHost = el('div', 'voice-newbank-host');
  fresh.appendChild(freshHost);
  const pickerHolder = el('div');
  pickerHolder.appendChild(
    combobox(
      () =>
        state.actors
          .filter((a) => !owned.has(`actor:${a.def.id}`))
          .map((a) => ({ id: a.def.id, label: a.def.name, sub: a.def.id })),
      '',
      (id) => {
        freshHost.innerHTML = '';
        freshHost.appendChild(bankCard({ owner: { kind: 'actor', id }, slots: {} }, true));
      },
      'pick an actor…',
    ),
  );
  fresh.insertBefore(pickerHolder, freshHost);
  body.appendChild(vsect('New bank', '', fresh));

  const cardsBox = el('div', 'voice-bank-cards');
  for (const bank of v.banks) cardsBox.appendChild(bankCard(bank, false));
  if (v.banks.length === 0) {
    cardsBox.appendChild(el('p', 'muted', 'No throat has fallbacks yet — pick an actor above and fill a greet slot.'));
  }
  body.appendChild(vsect('The throats', 'weighted shuffles per moment', cardsBox));

  // Linkage: actors still silent.
  const silent = el('div', 'panel');
  silent.appendChild(el('div', 'panel-head', 'Still silent'));
  const names = state.actors.filter((a) => !owned.has(`actor:${a.def.id}`)).slice(0, 30);
  for (const a of names) {
    const row = el('button', 'link-row', a.def.name) as HTMLButtonElement;
    row.onclick = () => setSection('actors', a.def.id);
    silent.appendChild(row);
  }
  linkage.appendChild(silent);
}

// ----------------------------------------------------------- the dials

function dialsPane(body: HTMLElement): void {
  const v = state.voice;
  if (!v) {
    body.appendChild(el('p', 'muted', 'The ledger has not loaded — is the server running?'));
    return;
  }
  const draft: VoiceDoc = { ...v.dials.def };
  const pills = (): HTMLElement[] => [
    pill(
      `ack ~${Math.round(draft.quipChance * 100)}% · ${(draft.quipCooldownMs / 1000).toFixed(1)}s apart`,
      'chance an unvoiced beat draws an acknowledgement, and the per-throat quiet time',
      'brass',
    ),
    pill(
      `music to ${Math.round(draft.duckLine * 100)}% · world to ${Math.round(draft.duckAmbience * 100)}%`,
      'what a spoken line seats under itself',
      'ink',
    ),
    pill(
      `release ${draft.duckReleaseMs}ms`,
      'how long the ducks take to stand back up after the line',
      'ink',
    ),
    pill(
      `warm ${draft.prefetchCap} · cap ${fmtBytes(draft.maxClipBytes)}`,
      'prefetch list ceiling and the upload size wall',
      'ok',
    ),
  ];
  const head = paneHead('stamp', 'The Dials', 'voice · world', pills());
  const actions = el('div', 'hero-actions');
  const revert = el('button', 'danger', 'Revert to shipped') as HTMLButtonElement;
  revert.disabled = !v.dials.edited;
  revert.onclick = () => {
    if (window.confirm('Revert the voice dials to shipped?')) {
      void persistence.revertVoiceDialsDef().catch((err) => toast((err as Error).message, 5000, 'error'));
    }
  };
  const save = el('button', 'primary', 'Save ▸ Live') as HTMLButtonElement;
  save.onclick = () =>
    void persistence.saveVoiceDialsDef(draft).catch((err) => toast((err as Error).message, 5000, 'error'));
  actions.append(revert, save);
  head.appendChild(actions);
  body.appendChild(head);
  const refreshPills = (): void => {
    const holder = head.querySelector('.hero-pills');
    if (holder) {
      holder.innerHTML = '';
      for (const p of pills()) holder.appendChild(p);
    }
  };

  const dial = (
    label: string,
    hint: string,
    get: () => number,
    set: (v: number) => void,
    min: number,
    max: number,
    step: number,
  ): HTMLElement => {
    const wrap = el('div', 'frontier-dial');
    const h = el('div', 'frontier-dial-head');
    h.appendChild(el('b', '', label));
    h.appendChild(el('span', 'muted', hint));
    wrap.appendChild(h);
    const input = document.createElement('input');
    input.type = 'number';
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(get());
    input.className = 'frontier-num';
    input.oninput = () => {
      const val = Number(input.value);
      if (Number.isFinite(val)) {
        set(val);
        markDirty();
        refreshPills();
      }
    };
    wrap.appendChild(input);
    return wrap;
  };

  body.appendChild(
    vsect(
      'The quips',
      'how often an unvoiced beat clears its throat',
      dial('quipChance', 'chance 0..1 an unvoiced beat draws an ack', () => draft.quipChance, (x) => (draft.quipChance = x), 0, 1, 0.05),
      dial('quipCooldownMs', 'per-throat quiet time between rationed quips', () => draft.quipCooldownMs, (x) => (draft.quipCooldownMs = x), 0, 120000, 500),
    ),
  );
  body.appendChild(
    vsect(
      'The duck',
      'what a spoken line seats under itself (never below the line)',
      dial('duckLine', 'music/tracks fraction under a line', () => draft.duckLine, (x) => (draft.duckLine = x), 0.05, 1, 0.05),
      dial('duckAmbience', 'ambience fraction under a line — the world keeps breathing', () => draft.duckAmbience, (x) => (draft.duckAmbience = x), 0.05, 1, 0.05),
      dial('duckReleaseMs', 'release time after the line ends', () => draft.duckReleaseMs, (x) => (draft.duckReleaseMs = x), 0, 5000, 100),
    ),
  );
  body.appendChild(
    vsect(
      'The plumbing',
      'warm lists and the upload wall',
      dial('prefetchCap', 'most clip URLs a dialogue-open warm list may carry', () => draft.prefetchCap, (x) => (draft.prefetchCap = x), 0, 32, 1),
      dial('maxClipBytes', 'upload ceiling for one clip binary (bytes)', () => draft.maxClipBytes, (x) => (draft.maxClipBytes = x), 64 * 1024, 20 * 1024 * 1024, 64 * 1024),
    ),
  );
}

// ------------------------------------------------------------- the door

export function voiceDetail(body: HTMLElement, linkage: HTMLElement, id: string): void {
  if (id === 'banks') banksPane(body, linkage);
  else if (id === 'dials') dialsPane(body);
  else libraryPane(body, linkage);
}
