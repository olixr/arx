import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, stat, unlink, writeFile } from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { join } from 'node:path';
import { VOICE_MIME, type VoiceExt } from '@arx/content';
import { config } from '../config.js';

/**
 * THE HASH IS THE FILE — the voice binary store (voiceover-plan
 * Phase 2). Clips live at data/voice/<sha1>.<ext>: content-addressed,
 * write-once, deduped by construction. data/ is the one directory
 * that survives a deploy (the web root is rebuilt per release), which
 * is exactly why uploads land here and are served by the game server
 * itself instead of riding the Vite artifact.
 *
 * Serving is prod-safe and read-only: the URL grammar admits nothing
 * but 40 hex chars and a known extension, so no path from the wire
 * ever reaches the filesystem un-laundered. Hash-named files never
 * change, so the cache header is a hard immutable year — replacing a
 * recording mints a new hash and a new URL by construction.
 */

const FILE_RE = /^\/voice\/([a-f0-9]{40})\.(ogg|opus|webm|mp3|m4a|wav)$/;

export function voiceDir(): string {
  return join(config.dataDir, 'voice');
}

export function voiceFilePath(fileHash: string, ext: string): string {
  return join(voiceDir(), `${fileHash}.${ext}`);
}

/**
 * Land one clip's bytes: hash names the file; an existing file is the
 * dedupe hit and is left untouched (write-once).
 */
export async function saveVoiceFile(
  bytes: Buffer,
  ext: VoiceExt,
): Promise<{ fileHash: string; existed: boolean }> {
  const fileHash = createHash('sha1').update(bytes).digest('hex');
  await mkdir(voiceDir(), { recursive: true });
  const path = voiceFilePath(fileHash, ext);
  try {
    await stat(path);
    return { fileHash, existed: true };
  } catch {
    await writeFile(path, bytes);
    return { fileHash, existed: false };
  }
}

/** Best-effort orphan cleanup — a missing file is already the goal. */
export async function unlinkVoiceFile(fileHash: string, ext: string): Promise<void> {
  try {
    await unlink(voiceFilePath(fileHash, ext));
  } catch {
    /* already gone */
  }
}

export async function voiceFileExists(fileHash: string, ext: string): Promise<boolean> {
  try {
    await stat(voiceFilePath(fileHash, ext));
    return true;
  } catch {
    return false;
  }
}

/**
 * The read-only public door: GET /voice/<hash>.<ext>. Returns true
 * when the URL was voice-shaped (whether or not the file existed);
 * false hands the request onward. NOT gated on devCommands — the live
 * game fetches clips through here in production.
 */
export function serveVoiceFile(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
): boolean {
  const m = FILE_RE.exec(pathname);
  if (!m) return false;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { allow: 'GET, HEAD' });
    res.end();
    return true;
  }
  const hash = m[1]!;
  const ext = m[2]!;
  const path = voiceFilePath(hash, ext);
  void stat(path)
    .then((s) => {
      res.writeHead(200, {
        'content-type': VOICE_MIME[ext as VoiceExt],
        'content-length': s.size,
        // Hash-named ⇒ the content at this URL can never change.
        'cache-control': 'public, max-age=31536000, immutable',
        'access-control-allow-origin': '*',
      });
      if (req.method === 'HEAD') {
        res.end();
        return;
      }
      const stream = createReadStream(path);
      stream.on('error', () => res.destroy());
      stream.pipe(res);
    })
    .catch(() => {
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('no such clip');
    });
  return true;
}
