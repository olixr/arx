/**
 * THE ENCODE LADDER — one mezzanine in, a delivery set out.
 *
 * The tape off the canvas is variable-rate and enormous on purpose.
 * Everything a browser actually plays is made here, and made twice:
 * VP9 in WebM for the browsers that have it (nearly all of them, and
 * it is the better codec at these bitrates), H.264 in MP4 for the ones
 * that do not. A 720 line pair rides along for phones, because sending
 * a 1080p60 background video down a cellular link is a choice, not an
 * accident.
 *
 * Two ffmpeg laws are load-bearing here:
 *   `-vsync cfr -r N` — the mezzanine is variable-rate; every delivery
 *      file must be constant-rate or seeking and looping stutter.
 *   `-pix_fmt yuv420p` — anything else and Safari plays a black rect.
 */
import { execFile } from 'node:child_process';
import { statSync } from 'node:fs';
import { promisify } from 'node:util';

const run = promisify(execFile);

export interface EncodeResult {
  webm: string;
  webm720: string;
  mp4: string;
  poster: string;
  seconds: number;
  bytes: { webm: number; webm720: number; mp4: number; poster: number };
}

/**
 * THE HEAD TRIM. MediaRecorder's first frame is whatever the canvas
 * held when the tap opened — reliably a black plate, occasionally two.
 * A quarter second off the front costs nothing (every shot is written
 * with slack at both ends) and guarantees frame one of the delivery
 * file is a real frame of the game.
 */
const HEAD_TRIM = 0.25;

export interface EncodeOptions {
  fps: number;
  /**
   * Full-bleed surface. Only the hero plates and the bands ever paint
   * at viewport width; a feature well is 700 CSS px at its largest, so
   * shipping it a 1080 ladder is several megabytes nobody will ever
   * see. When false the 720 file IS the delivery file.
   */
  full?: boolean;
  /** Higher = smaller. 30 is rich, 34 is a background plate. */
  crf?: number;
  /** Seconds into the piece for the poster frame. */
  posterAt?: number;
}

async function ff(args: string[]): Promise<void> {
  await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], {
    maxBuffer: 1 << 26,
  });
}

export async function probeSeconds(file: string): Promise<number> {
  const { stdout } = await run('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    file,
  ]);
  return Number.parseFloat(stdout.trim()) || 0;
}

/**
 * THE CONTACT SHEET — every take's frames on one plate.
 *
 * A reel is judged by looking at it, and looking at a video costs a
 * minute a take. One grid of stills answers most of the questions a
 * take raises — is the body in frame, does the Art actually fire, is
 * the hour right — in a glance, which is how any cutting room has ever
 * worked.
 */
export async function contactSheet(
  raw: string,
  out: string,
  seconds: number,
  columns = 4,
): Promise<string> {
  const shots = Math.min(16, Math.max(4, Math.round(seconds)));
  const rows = Math.ceil(shots / columns);
  await ff([
    '-i', raw,
    '-vf', `fps=1,scale=480:-2,tile=${columns}x${rows}`,
    '-frames:v', '1',
    out,
  ]);
  return out;
}

/**
 * THE REMUX. A MediaRecorder blob is a LIVE container: no duration, no
 * frame count, no cue index — it was written for a stream that might
 * never end. Every encoder pass that reads it therefore works blind,
 * and the constant-rate conversion in particular crawls. One copy-mode
 * remux stamps the timestamps and the index in a second or two, and
 * every pass after it runs at a sane speed off a seekable file.
 */
async function remux(raw: string): Promise<string> {
  const fixed = raw.replace(/\.webm$/, '.fixed.webm');
  await ff(['-fflags', '+genpts', '-i', raw, '-c', 'copy', fixed]);
  return fixed;
}

export async function encode(
  rawIn: string,
  outBase: string,
  opts: EncodeOptions,
): Promise<EncodeResult> {
  const raw = await remux(rawIn);
  const fps = opts.fps;
  const crf = opts.crf ?? 32;
  const full = opts.full ?? true;
  // A well-sized reel has ONE delivery file: the 720. Pointing both
  // manifest entries at it beats writing the same bytes twice.
  const webm = full ? `${outBase}.webm` : `${outBase}-720.webm`;
  const webm720 = `${outBase}-720.webm`;
  const mp4 = `${outBase}.mp4`;
  const poster = `${outBase}.jpg`;

  const common = ['-vsync', 'cfr', '-r', String(fps), '-an', '-pix_fmt', 'yuv420p'];

  // VP9, row-threaded, quality-targeted — the 1080 delivery file.
  // Skipped entirely for a well-sized reel, whose 720 file below then
  // becomes the delivery file.
  if (full) {
    await ff([
      '-ss', String(HEAD_TRIM), '-i', raw,
      ...common,
      '-c:v', 'libvpx-vp9',
      '-b:v', '0', '-crf', String(crf),
      '-row-mt', '1', '-tile-columns', '2', '-threads', '0',
      // cpu-used 4 is the knee of libvpx's curve: a whole batch encodes
      // in the time cpu-used 2 spends on two clips, and on flat-colour
      // pixel art the difference does not survive a screenshot
      // comparison. `realtime` does — it smears the particle work these
      // reels exist to show — so the floor stays here.
      '-deadline', 'good', '-cpu-used', '4',
      // A keyframe every second keeps scrubbing and loop-restarts snappy.
      '-g', String(fps),
      webm,
    ]);
  }

  await ff([
    '-ss', String(HEAD_TRIM), '-i', raw,
    '-vf', 'scale=1280:-2:flags=lanczos',
    ...common,
    '-c:v', 'libvpx-vp9',
    '-b:v', '0', '-crf', String(crf + 4),
    '-row-mt', '1', '-tile-columns', '2', '-threads', '0',
    // cpu-used 4 is the knee of libvpx's curve: a whole batch encodes
    // in the time cpu-used 2 spends on two clips, and on flat-colour
    // pixel art the difference does not survive a screenshot
    // comparison. `realtime` does — it smears the particle work these
    // reels exist to show — so the floor stays here.
    '-deadline', 'good', '-cpu-used', '4',
    '-g', String(fps),
    webm720,
  ]);

  // The MP4 lane is a FALLBACK, not a delivery target: everything that
  // can play VP9 (every browser since 2022) takes the WebM above. It
  // rides at 720 so a codec-poor browser gets a working page instead of
  // a second full-weight ladder nobody downloads.
  await ff([
    '-ss', String(HEAD_TRIM), '-i', raw,
    '-vf', 'scale=1280:-2:flags=lanczos',
    ...common,
    '-c:v', 'libx264',
    '-profile:v', 'high', '-preset', 'medium', '-crf', String(crf - 8),
    '-g', String(fps),
    '-movflags', '+faststart',
    mp4,
  ]);

  const seconds = await probeSeconds(webm);
  const at = Math.min(Math.max(0, opts.posterAt ?? seconds * 0.4), Math.max(0, seconds - 0.1));
  await ff([
    '-ss', (at + HEAD_TRIM).toFixed(2), '-i', raw,
    '-frames:v', '1', '-q:v', '3', poster,
  ]);

  const size = (f: string) => statSync(f).size;
  return {
    webm, webm720, mp4, poster,
    seconds,
    bytes: { webm: size(webm), webm720: size(webm720), mp4: size(mp4), poster: size(poster) },
  };
}
