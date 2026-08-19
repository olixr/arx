/**
 * THE RECORDER — the canvas, taped.
 *
 * `captureStream` on the game's own canvas is the only honest tap: it
 * takes the composited frames the renderer actually presented, at the
 * moment it presents them, with no second render path to drift. What
 * lands here is a VFR mezzanine at a deliberately absurd bitrate; the
 * lane re-encodes it to a constant-rate delivery ladder afterwards.
 * Quality is spent here and saved later, never the other way round.
 *
 * The bytes come out through `read()` in slices because a five-second
 * 1080p60 mezzanine is tens of megabytes and no driver should try to
 * lift that across the bridge in one string.
 */

export interface TakeStats {
  /** Frames the director stepped while the tape rolled. */
  frames: number;
  /** Wall time the tape rolled, ms. */
  ms: number;
  /** Median frame interval, ms — 16.7 is a clean 60. */
  medianDt: number;
  /** Frames that took longer than 1.8 intervals: visible hitches. */
  hitches: number;
  /** The worst single frame, ms. */
  worstDt: number;
  /** Commands a shot asked for faster than the server's bucket allows. */
  overspend: string[];
  /** Marks the shot planted, seconds from the first recorded frame. */
  marks: Record<string, number>;
  /** The performer went down mid-take. Whatever the tape shows, the
   *  shot did not happen the way it was written. */
  died: boolean;
}

export class Recorder {
  private rec: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private chunks: Blob[] = [];
  private joined: Uint8Array | null = null;
  private startedAt = 0;
  private dts: number[] = [];

  /** 'idle' | 'rolling' | 'sealing' | 'done' | 'error' */
  state: 'idle' | 'rolling' | 'sealing' | 'done' | 'error' = 'idle';
  error = '';

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly fps: number,
  ) {}

  start(): void {
    const stream = this.canvas.captureStream(this.fps);
    this.stream = stream;
    // VP9 first: it is what the page will ship, and taping in the same
    // family keeps the mezzanine honest about what survives the codec.
    const types = [
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
    ];
    const mimeType = types.find((t) => MediaRecorder.isTypeSupported(t)) ?? '';
    this.rec = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 60_000_000,
    });
    this.rec.ondataavailable = (e) => {
      if (e.data && e.data.size) this.chunks.push(e.data);
    };
    this.rec.onerror = (e) => {
      this.state = 'error';
      this.error = String((e as unknown as { error?: unknown }).error ?? 'recorder error');
    };
    this.chunks = [];
    this.joined = null;
    this.dts = [];
    this.startedAt = performance.now();
    this.state = 'rolling';
    this.rec.start(500);
  }

  /** Called once per director frame while rolling. */
  note(dt: number): void {
    if (this.state === 'rolling') this.dts.push(dt * 1000);
  }

  async stop(): Promise<void> {
    if (!this.rec) return;
    this.state = 'sealing';
    await new Promise<void>((res) => {
      this.rec!.onstop = () => res();
      this.rec!.stop();
    });
    // LET GO OF THE CANVAS. A capture stream keeps pulling frames off
    // the canvas for as long as its tracks live, whatever the recorder
    // is doing — so a session that shoots nine reels through one page
    // ends up with nine taps on the same canvas and a frame rate that
    // halves with every take. (It did: shot one 8.6 ms, shot three
    // 41 ms, on identical scenes.) One line, and the lane is flat
    // across a whole batch again.
    for (const track of this.stream?.getTracks() ?? []) track.stop();
    this.stream = null;
    const blob = new Blob(this.chunks, { type: 'video/webm' });
    this.joined = new Uint8Array(await blob.arrayBuffer());
    this.state = 'done';
  }

  stats(overspend: string[], marks: Record<string, number>, died: boolean): TakeStats {
    const sorted = [...this.dts].sort((a, b) => a - b);
    const median = sorted.length ? sorted[Math.floor(sorted.length / 2)]! : 0;
    const budget = (1000 / this.fps) * 1.8;
    return {
      frames: this.dts.length,
      ms: performance.now() - this.startedAt,
      medianDt: Math.round(median * 100) / 100,
      hitches: this.dts.filter((d) => d > budget).length,
      worstDt: Math.round(Math.max(0, ...this.dts) * 100) / 100,
      overspend,
      marks,
      died,
    };
  }

  get bytes(): number {
    return this.joined?.byteLength ?? 0;
  }

  /** A base64 slice of the sealed tape — the bridge across to node. */
  read(offset: number, length: number): string {
    if (!this.joined) return '';
    const view = this.joined.subarray(offset, offset + length);
    let s = '';
    const STEP = 0x8000;
    for (let i = 0; i < view.length; i += STEP) {
      s += String.fromCharCode(...view.subarray(i, i + STEP));
    }
    return btoa(s);
  }
}
