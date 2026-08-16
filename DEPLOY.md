# Deploying Arx to production (Laravel Forge)

Arx is two pieces on one domain:

1. **Static client** — `npm run build` writes the game bundle to
   `<repo>/public/`. Nginx serves it directly; that directory is the
   site's web root.
2. **Game server** — a Node WebSocket process on loopback
   (`127.0.0.1:8790`), kept alive by supervisor. Nginx proxies
   `wss://arx.gg/ws` to it. All client URLs are origin-relative
   (`wss://<host>/ws`), so nothing is domain-specific in the bundle.

## Requirements

- **Node.js ≥ 22.13** on the server. Pick Node 22 LTS when
  provisioning in Forge, or install via nvm for the forge user.
- **PostgreSQL** (any supported version; 15+ recommended) — select it
  when provisioning the Forge server, or install it later from the
  server's Database panel.
- No PHP, no MySQL/Redis needed.

## 1. Forge site

- Create the site for **arx.gg** with type **Static HTML** (or General
  PHP — the type only shapes the nginx template; we override the root).
- **Web directory: `/public`.** With Forge's release-based deployments
  the repo lives at `/home/forge/arx.gg/current` (a symlink swung on
  each activation), so the effective document root is
  `/home/forge/arx.gg/current/public` — the build step creates it
  inside each release before activation.
- Install the repository `olixr/arx` on the site (Forge → site → Git
  Repository), branch `main`.
- Enable SSL (LetsEncrypt) — the client automatically uses `wss://`
  on https pages.

## 2. Nginx

Edit the site's nginx config (Forge → site → Edit Nginx Configuration)
and paste the following into the `server { }` block Forge generated,
**above** the default `location /` block (same content ships as
[`deploy/nginx-arx.conf`](deploy/nginx-arx.conf)):

```nginx
# The game WebSocket — wss://arx.gg/ws → the Node game server on
# loopback. The Upgrade/Connection pair is what makes the WebSocket
# handshake survive the proxy; without it clients get a 400 and the
# game never connects.
location /ws {
    proxy_pass http://127.0.0.1:8790;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    # A quiet-but-connected client should not be reaped mid-session.
    proxy_read_timeout 1h;
    proxy_send_timeout 1h;
}

# Liveness probe (safe to expose: static JSON, no state).
location = /healthz {
    proxy_pass http://127.0.0.1:8790;
}

# The dev studio API must never be reachable from the internet. The
# server also refuses it when NODE_ENV=production, but belt + braces.
location /dev {
    return 404;
}

# Vite emits content-hashed filenames under /assets — cache hard.
location /assets/ {
    expires 30d;
    add_header Cache-Control "public, immutable";
}

# Voice clips — served by the game server out of its data/voice store
# (hash-named; the node response already carries the immutable cache
# header, nginx just relays). WITHOUT this block every clip 404s from
# the internet and voiced NPCs stay silent.
location /voice/ {
    proxy_pass http://127.0.0.1:8790;
    proxy_set_header Host $host;
}

# THE FRONT DOOR — `/` serves the landing page, `/play` the game shell.
# Both entry documents revalidate on every load (no-cache + etag) so a
# heuristic cache never pins a player to yesterday's build; /index.html
# still reaches the game directly for old bookmarks.
location = / {
    add_header Cache-Control "no-cache";
    try_files /landing.html =404;
}
location = /landing.html {
    add_header Cache-Control "no-cache";
}
location = /play {
    add_header Cache-Control "no-cache";
    try_files /index.html =404;
}
location = /index.html {
    add_header Cache-Control "no-cache";
}
```

What each piece does:

- **`/ws`** proxies the WebSocket with upgrade headers and a 1-hour
  read timeout so idle-but-connected players aren't dropped,
- **`/healthz`** proxies the liveness JSON,
- **`/dev`** hard-404s the studio API (defense in depth; the server
  also refuses it in production),
- **`/assets/`** long-caches the content-hashed bundle files,
- **`/` and `/play`** split the front door from the game: the landing
  page (built from `packages/client/landing.html`) greets the world at
  the root, the game shell answers at `/play`. The Vite dev server
  mirrors the `/play` spelling (`vite.config.ts`, arx-entry-routes),
  so the landing page's Play buttons work identically in dev and prod.

## 3. Database

In Forge (server → **Database**) create a database named `arx` and a
user (Forge's default `forge` user is fine) with a strong password.
That's all — the server runs its own schema migrations at boot, and
the `citext` extension it needs is trusted (no superuser required).

## 4. Environment

Paste the contents of `.env.production.example` into Forge's
**Environment** tab for the site (it lands at `/home/forge/arx.gg/.env`
and Forge links it into each release). Review it — set the real
credentials in `DB_USERNAME` / `DB_PASSWORD`
(`DB_HOST`/`DB_PORT`/`DB_DATABASE` default sensibly).

Everything stays inside the one site directory Forge manages:

- **Live world state** (accounts, characters, inventories, the POI
  ledger, studio-edited content) lives in **Postgres** — releases
  never touch it.
- **Authored disk content** (`data/maps` zone overrides, `data/prefabs`
  POI library) ships inside each release via git; the server reads the
  release's own `data/` directory by default. No `DATA_DIR`, nothing
  outside the repo.
- **Uploaded voice clips** (`data/voice`) are the one runtime-written
  disk store: the deploy script symlinks it to the site's
  `shared/voice` directory so recordings persist across releases.

Production safety defaults: with `NODE_ENV=production`, dev chat
commands, the `/dev` studio API, and guest (accountless) joins are all
**off** unless explicitly enabled — and **account creation requires an
invite code** unless explicitly disabled (`REQUIRE_INVITE=0`).

### The invite gate

Set `INVITE_CODE` in the environment to a long random string (e.g.
`openssl rand -hex 12`) — boot seeds it into the `invite_codes` table
with unlimited uses, and only people who type it can create an
account. Existing accounts sign in as always; guests are turned away.

- **Rotate the code:** change `INVITE_CODE`, `arxctl restart`, then
  disable the old one:
  `UPDATE invite_codes SET disabled = 1 WHERE code = 'OLD-CODE';`
- **Extra codes** (e.g. a 5-use code for a friend group) go straight
  into the table:
  `INSERT INTO invite_codes (code, max_uses, note, created_at) VALUES ('FRIENDS-XYZ', 5, 'for the crew', (extract(epoch from now())*1000)::bigint);`
- **Audit:** `SELECT username, invite_code FROM accounts;` shows which
  code opened each account; `invite_codes.uses` counts spends.

Codes are case-insensitive (CITEXT). If the gate is on and no open
codes exist, boot logs a loud warning — nobody can register.

### Throttles

Every auth attempt (session resume, sign-in, account creation) rides
two token buckets — per-connection and per-IP (the per-IP one survives
reconnects) — and each IP gets a bounded number of sockets and
handshakes per second, with `MAX_CONNECTIONS` as the whole-box fuse.
The nginx template adds matching `limit_conn`/`limit_req` rules in
front (see `deploy/nginx-arx.conf` — the two zone directives go above
the `server { }` block).

## 5. The game-server process (Forge Daemon)

Create a **Forge Daemon** (server → Daemons → New Daemon):

| Field | Value |
|---|---|
| Command | `bash /home/forge/arx.gg/current/scripts/arx-run.sh` |
| User | `forge` |
| Directory | `/home/forge/arx.gg/current` |
| Processes | `1` — one authoritative world, never more |
| Start Seconds | `5` — boot runs DB migrations + content seeding |
| Stop Seconds | `15` — SIGTERM saves players and drains the DB queue |
| Stop Signal | `SIGTERM` |

No env wiring needed: `scripts/arxctl.sh` **discovers** the daemon by
scanning `/etc/supervisor/conf.d/` for the config whose command runs
`arx-run.sh` — recreate the daemon as often as you like, the new id is
found automatically. (`ARX_PROGRAM` still overrides discovery if you
ever need to pin it.) If supervisor can't be addressed at all, the
script falls back to a graceful SIGTERM at the game port's listener
and lets the daemon's autorestart revive it on the current release.

Logs: Forge's daemon panel, or `/home/forge/.forge/daemon-<id>.log`.

(Alternative: `deploy/arx-supervisor.conf` is a hand-installed
supervisor program — discovery finds it the same way.)

Operate it with the control script:

```bash
scripts/arxctl.sh status    # supervisor state + live /healthz probe
scripts/arxctl.sh ping      # {"ok":true,"uptimeSec":…,"players":…}
scripts/arxctl.sh start
scripts/arxctl.sh restart   # after every deploy
scripts/arxctl.sh stop
```

## 6. Forge deploy script

Release-based (Forge's default `$CREATE_RELEASE` scaffold, extended).
Every step stays inside the site directory:

```bash
$CREATE_RELEASE()

cd $FORGE_RELEASE_DIRECTORY

# --include=dev is load-bearing: vite + tsx are devDependencies, and if
# NODE_ENV=production leaks into this shell npm would otherwise skip them
npm ci --include=dev
npm run build                      # client bundle → <release>/public/

# Voice clips (THE CLIP LEDGER) are runtime-uploaded binaries — the one
# piece of disk content releases do NOT ship. They live in one shared
# store that every release links in, so a deploy never silences a throat.
mkdir -p "$FORGE_SITE_DIRECTORY/shared/voice"
ln -sfn "$FORGE_SITE_DIRECTORY/shared/voice" "$FORGE_RELEASE_DIRECTORY/data/voice"

$ACTIVATE_RELEASE()

# Swing the game server onto the new release. restart discovers the
# daemon (no ids configured anywhere), stops it gracefully, and polls
# /healthz until the new release answers — a dead server fails the
# deploy right here. ($FORGE_RELEASE_DIRECTORY is the release
# `current` now points at; no site path is hardcoded.)
bash "$FORGE_RELEASE_DIRECTORY/scripts/arxctl.sh" restart
```

There is no data-shipping step because the restart does it all:

- **Schema migrations** run at boot against Postgres.
- **Authored content seeding** runs at boot under the two-hash truth
  law — new or changed bestiary defs, loot tables, dialogues, routines,
  actors, POIs, and geography flow from the release's shipped code and
  `data/` into the database, while any studio-edited rows are left
  untouched.
- **Zone overrides and prefabs** are simply read from the new
  release's own `data/` directory.
- **Voice clip binaries** are the exception to "no data-shipping":
  clip *metadata* lives in Postgres like all studio content, but the
  audio files themselves sit in `data/voice` — which the deploy script
  above symlinks to the site's `shared/voice` so uploads survive every
  release. The server serves them read-only at `/voice/<hash>.<ext>`
  (nginx proxies that path — see deploy/nginx-arx.conf).

### Pushing voice clips to production

A local `tools/voice/import.mts` run fills only the **local** ledger —
deploys never carry clips or banks, so production stays silent until
they are pushed through its own `/dev` door. The dialogue `voice` refs
ship via git as usual (and are ghost-safe: an unmatched ref resolves to
silence, never an error). To push the clips and banks themselves:

Two prerequisites, both one-time:

- the live nginx config needs the `location /voice/` block above (Forge
  → site → Edit Nginx Configuration) — without it clips upload fine but
  404 from the internet, and voiced NPCs stay silent;
- `scripts/arx-run.sh` self-heals the `data/voice → shared/voice`
  symlink on every daemon start (and rescues clips a symlink-less boot
  wrote into a release), so clips survive releases even if the Forge
  deploy script lacks the mkdir/ln step. Keep the step anyway — belt
  and braces.

Beware: if Forge quick-deploy is on, every `git push` builds and
activates a release and restarts the game server. Push (or pause
quick-deploy) before starting a long import so a mid-import restart
doesn't cut the door out from under it.

1. On the server, set `DEV_COMMANDS=1` in the site environment (Forge →
   Environment) and `scripts/arxctl.sh restart` — this opens the `/dev`
   API on loopback only; nginx still 404s it from the internet.
2. Tunnel from your machine: `ssh -L 8791:127.0.0.1:8790 forge@arx.gg`.
3. Run the same importer against the tunnel:
   `npx tsx tools/voice/import.mts --api http://localhost:8791`
   Uploads are content-addressed and deduped, so re-pushing the whole
   voicework/ tree is cheap and idempotent; clips and banks re-register
   live with no restart. (It also re-lays the local JSON refs — a
   no-op if they are already committed.)
4. Remove `DEV_COMMANDS=1` and `scripts/arxctl.sh restart` again.
5. Spot-check: `https://arx.gg/voice/<hash>.<ext>` for a hash from
   local `data/voice/` returns 200, and a voiced NPC speaks in-world.

Note the restart drops connected players for a couple of seconds — a
single authoritative world process can't hand off live sessions, so
deploy at quiet hours once there's a population.

## 7. Verify

- `https://arx.gg` loads the landing page — the live meadow hero draws
  and the day cycle turns (the clock chip bottom-right changes). On a
  browser that has signed in before (an `arx.token` or `arx.roster` in
  localStorage), `/` bounces straight to `/play` once per tab session;
  `https://arx.gg/?stay` always shows the landing page regardless.
- `https://arx.gg/play` loads the game and the login panel, which
  carries a "What is Arx? — the front page" link back to `/?stay`.
- `https://arx.gg/healthz` returns `{"ok":true,…}`.
- `https://arx.gg/dev/maps` returns 404.
- Creating an account WITHOUT the invite code is refused; with it,
  registration works.
- Create an account, walk around, `scripts/arxctl.sh restart`, log
  back in — position and inventory persist.

## Notes

- **Studios in production:** the map editor / Content Studio are not
  in the production bundle (`STUDIO=1 npm run build` includes them) and
  the `/dev` API is disabled and nginx-blocked. To edit the live world,
  SSH-tunnel instead: `ssh -L 8790:127.0.0.1:8790 forge@arx.gg`, run
  the studio locally against the tunnel with `DEV_COMMANDS=1` set on
  the server only for the session — or better, edit locally and deploy.
- **Backups:** the whole world is the `arx` Postgres database. Forge
  scheduled job (daily):
  `mkdir -p /home/forge/arx.gg/backups && pg_dump -Fc arx > /home/forge/arx.gg/backups/arx-$(date +\%F).dump`
  (the site-level `backups/` dir sits beside `releases/` and `current`,
  untouched by deploys)
  — restore with `pg_restore -d arx --clean`. Forge's own database
  backup feature works too.
- **Migrating an old SQLite world:** if you have a pre-Postgres
  `arx.db`, copy it anywhere on the server (e.g. the site directory)
  and run `npm run migrate:sqlite -w @arx/server -- /path/to/arx.db`
  from `current/` once, before opening the doors.
- **Scaling:** one process = one world. Keep it on one box; move the
  client to a CDN later if asset bandwidth ever matters.

## THE GREAT WORLD REGEN (2026-08-14): rolling the new seed to prod

The shipped seed moved from 1337 to **24601** — it now lives as
`WORLD_SEED` in `packages/content/src/worldgen.ts` (server config
defaults to it; the `WORLD_SEED` env knob remains a rig/lab override
only). The authored geography — every town rect, landform heart, road
polyline, and wild site — is composed against seed 24601's rivers and
provinces, so **the seed and the geography deploy as one unit**: never
override the seed on prod again, and never change it without
re-threading the whole plan (that is a project, not an env edit).

Rollout procedure (the seed change soft-corrupts a live DB — POI
ledger anchors, player positions, and built-tile overlays were all
chosen against old-seed terrain):

1. Deploy the release carrying the new `WORLD_SEED` + geography.
2. STOP the server.
3. Remove any stale `WORLD_SEED` line from the site `.env` (the
   content constant must win).
4. `npm run db:refresh -w @arx/server -- --all --yes` — the full
   reset: content docs (including the stored geography doc, which
   would otherwise outvote the new plan forever under the two-hash
   law), world ledgers, and player rows. Voice tables and
   `invite_codes` survive, as ever.
5. Start the server — the next boot re-seeds content, re-surveys the
   POI ledger against the new terrain, and the world is the new world.

## Refreshing the world before launch

`npm run db:refresh -w @arx/server` is the pre-launch reset lane. It
loads the same `.env` the daemon's `arx-run.sh` sources (found by
walking up from the working directory — release root, `releases/`,
then the site dir, so running it from `current/` just works; explicit
environment variables always win), and with no flags it only
REPORTS — row counts per group, plus any TOOL-EDITED content rows
(the two-hash law: an edited row outvotes the shipped code forever,
which is exactly how a stale geography or NPC def survives a deploy;
the report names them per kind).

To actually refresh, stop the game server first, choose groups, and
pass `--yes`:

```bash
scripts/arxctl.sh stop            # or supervisor: stop the arx worker
npm run db:refresh -w @arx/server -- --all --yes
scripts/arxctl.sh start
```

- `--content` — content_docs + npc_actors + dialogues + routines +
  quests. All re-seed at boot from the shipped code, so this
  guarantees the DB matches the repo (voice clips/banks are imported
  recordings and are NEVER touched).
- `--world` — the frontier's ledgers (world_pois, world_minors,
  world_growth, frontier_state, frontier_calm). Boot re-rolls a fresh
  frontier against the current geography.
- `--players` — accounts and everything cascading off them, plus the
  player-made world (built tiles/details, crops, signs, farm bins,
  troughs). invite_codes are kept.
- `--all` — all three: the full "fresh world, doors not yet open"
  reset.

The next boot IS the refresh — it re-seeds every content table,
re-surveys the POI ledger, and regenerates terrain from `WORLD_SEED`.
Take a `pg_dump` first if there is anything on the box you are not
ready to lose.
