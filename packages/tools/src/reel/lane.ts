/**
 * THE CAPTURE LANE — a browser, a body, and a socket.
 *
 * The lane's whole job is to put a real, logged-in game client on a
 * real screen and then get out of the way. It knows nothing about
 * shots: it opens the door, walks the account through it, and hands
 * control to the director inside the page (`window.__reel`).
 *
 * Two things here are load-bearing and easy to get wrong:
 *
 *  1. THE WINDOW MUST BE AWAKE. Chromium throttles rAF in backgrounded
 *     and occluded windows, and a throttled frame loop tapes a
 *     stuttering reel that no amount of re-encoding can fix. The three
 *     `--disable-*backgrounding` flags are not optional.
 *  2. THE BACKING STORE IS THE FRAME. deviceScaleFactor 1 with a
 *     1920×1080 viewport gives a 1920×1080 canvas backing store, which
 *     is exactly what `captureStream` hands the recorder. Any other
 *     ratio and the tape is a resample of a resample.
 */
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, type Browser, type Page } from 'playwright-core';

export interface LaneOptions {
  /** Vite origin serving the game shell. */
  url?: string;
  width?: number;
  height?: number;
  /** Show the window (default) — a hidden window is a throttled window. */
  headless?: boolean;
  account?: { user: string; pass: string; name: string };
}

const DEFAULTS = {
  url: process.env.ARX_REEL_URL ?? 'http://localhost:5230',
  width: 1920,
  height: 1080,
  headless: false,
};

/** Playwright's own chromium, wherever this machine parked it. */
export function findChrome(): string {
  if (process.env.ARX_CHROME) return process.env.ARX_CHROME;
  const root = join(process.env.HOME ?? '', 'Library/Caches/ms-playwright');
  if (existsSync(root)) {
    const dirs = readdirSync(root)
      .filter((d) => d.startsWith('chromium-'))
      .sort()
      .reverse();
    for (const d of dirs) {
      for (const app of ['Google Chrome for Testing.app', 'Chromium.app']) {
        const exe = join(root, d, 'chrome-mac-arm64', app, 'Contents/MacOS', app.replace('.app', ''));
        if (existsSync(exe)) return exe;
      }
    }
  }
  for (const p of [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ]) {
    if (existsSync(p)) return p;
  }
  throw new Error('No Chromium found — set ARX_CHROME to a browser binary.');
}

export class Lane {
  browser!: Browser;
  page!: Page;
  readonly opts: Required<Omit<LaneOptions, 'account'>> & { account: NonNullable<LaneOptions['account']> };

  constructor(o: LaneOptions = {}) {
    this.opts = {
      ...DEFAULTS,
      ...o,
      account: o.account ?? { user: 'reel', pass: 'reel-room-1', name: 'Ash' },
    } as Lane['opts'];
  }

  async open(): Promise<void> {
    this.browser = await chromium.launch({
      executablePath: findChrome(),
      headless: this.opts.headless,
      args: [
        '--autoplay-policy=no-user-gesture-required',
        // The window must never be told to go to sleep.
        '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding',
        '--disable-backgrounding-occluded-windows',
        '--disable-features=CalculateNativeWinOcclusion',
        '--hide-scrollbars',
        '--mute-audio',
        '--window-position=0,0',
      ],
    });
    this.page = await this.browser.newPage({
      viewport: { width: this.opts.width, height: this.opts.height },
      deviceScaleFactor: 1,
    });
    this.page.on('pageerror', (e) =>
      console.error('  [page] ' + String((e as Error).stack ?? e).slice(0, 700)),
    );
    this.page.on('console', (m) => {
      if (m.type() === 'error') console.error('  [console] ' + m.text().slice(0, 300));
    });
  }

  /** Into the world: sign in (registering the first time), dismiss the
   *  mirror, and wait until the body actually exists. */
  async enter(): Promise<void> {
    const { url, account } = this.opts;
    await this.page.goto(`${url}/index.html?reel=1`, { waitUntil: 'domcontentloaded' });
    await this.page.waitForSelector('#login-form', { timeout: 60_000 });

    const signIn = async (register: boolean, name = account.name) => {
      await this.page.evaluate(() => {
        // Always start from the plain sign-in view; a remembered roster
        // card would otherwise hide the username field.
        const doc = (globalThis as any).document;
        const other = doc.getElementById('login-other');
        if (other && !other.classList.contains('hidden')) other.click();
      });
      if (register) {
        const inRegister = await this.page.isVisible('#login-charname');
        if (!inRegister) await this.page.click('#login-toggle');
        await this.page.fill('#login-charname', name);
      }
      await this.page.fill('#login-user', account.user);
      await this.page.fill('#login-pass', account.pass);
      await this.page.click('#login-submit');
    };

    await signIn(false);
    const shout = async (why: string) => {
      // A door that will not open must show its face: the shot of the
      // login panel is the whole diagnosis, every time.
      const shot = `/tmp/arx-reel-door-${account.user}.png`;
      await this.page.screenshot({ path: shot }).catch(() => {});
      const err = await this.page
        .textContent('#login-error')
        .catch(() => '');
      console.error(`  door: ${why} — "${(err ?? '').trim()}" — see ${shot}`);
    };
    // A fresh account answers with an error, not a world — register it.
    const ok = await this.page
      .waitForFunction(() => (globalThis as any).__arx?.game?.ownEid != null, { timeout: 12_000 })
      .then(() => true)
      .catch(() => false);
    if (!ok) {
      // The world already holds a couple of hundred named people, so a
      // good short name is often spoken for. Try the name, then the
      // name with a mark on it, rather than failing a whole capture
      // session on a collision with an NPC.
      let landed = false;
      for (const suffix of ['', 'e', 'a', 'wyn', 'ric']) {
        await signIn(true, account.name + suffix);
        landed = await this.page
          .waitForFunction(() => (globalThis as any).__arx?.game?.ownEid != null, {
            timeout: 12_000,
          })
          .then(() => true)
          .catch(() => false);
        if (landed) break;
        const err = (await this.page.textContent('#login-error').catch(() => '')) ?? '';
        if (!/name is taken/i.test(err)) break;
      }
      if (!landed) {
        await shout('registration did not land');
        throw new Error(`could not enter as ${account.user}`);
      }
    }

    // THE HERO'S MIRROR stands in front of every new character.
    const begin = this.page.locator('#look-confirm');
    if (await begin.isVisible().catch(() => false)) {
      await begin.click();
      await this.page.waitForTimeout(1200);
    }
    await this.page.waitForFunction(() => (globalThis as any).__reel?.ready === true, {
      timeout: 30_000,
    });
    // Let the first chunks bake before anyone asks for a frame.
    await this.page.waitForTimeout(2500);
    await this.surface();
  }

  /**
   * COME UP FOR AIR.
   *
   * A character stands where it last stood, and `/tp` is a SAME-PLANE
   * teleport by design — so a body left in the Undercroft by yesterday's
   * dungeon shot answers today's `/tp -84 54` by walking to (-84, 54)
   * *underground*, and the meadow reel comes back as a cave. (It did.
   * A whole batch of it.) Every session therefore starts by walking
   * home through the nearest way up, before any shot is staged.
   */
  async surface(): Promise<void> {
    const under = await this.page.evaluate(
      () => (globalThis as any).__arx?.game?.plane?.underground === true,
    );
    if (!under) return;
    console.log('  underground — taking the stair home');
    // The Undercroft's way home stands at (-336, 552) and lands in
    // Silverfall; every authored underworld zone keeps one.
    await this.cmd('/tp -336 552', 1600);
    await this.page.evaluate(() => (globalThis as any).__arx.game.interact(-336, 552));
    await this.page.waitForTimeout(3000);
    const still = await this.page.evaluate(
      () => (globalThis as any).__arx?.game?.plane?.underground === true,
    );
    if (still) throw new Error('could not reach the surface — the body is stuck underground');
  }

  /** Dev chat, paced under the server's 1/s bucket. */
  async cmd(text: string, waitMs = 1150): Promise<void> {
    await this.page.evaluate((t) => (globalThis as any).__arx.game.sendChat(t), text);
    await this.page.waitForTimeout(waitMs);
  }

  async close(): Promise<void> {
    await this.browser?.close();
  }
}

/**
 * The slate as the page sees it. The lane never needs a shot's beats —
 * only what it must know to file and encode the result.
 */
export interface SlateShot {
  id: string;
  title: string;
  caption: string;
  pillar: string;
  cast: string;
  seconds: number;
  fps: number;
  hud: string;
  poster: number | null;
  loop: boolean;
  hero: boolean;
}

/**
 * Ask a throwaway page for the roster. The reel bridge installs at load
 * — no login, no world, no socket — so this costs a couple of seconds
 * and keeps the shot list in exactly one file.
 */
export async function readSlate(url = DEFAULTS.url): Promise<SlateShot[]> {
  const browser = await chromium.launch({ executablePath: findChrome(), headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(`${url}/index.html?reel=1`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => (globalThis as any).__reel?.ready === true, {
      timeout: 30_000,
    });
    return (await page.evaluate(() => (globalThis as any).__reel.slate)) as SlateShot[];
  } finally {
    await browser.close();
  }
}
