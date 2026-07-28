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
```

What each piece does:

- **`/ws`** proxies the WebSocket with upgrade headers and a 1-hour
  read timeout so idle-but-connected players aren't dropped,
- **`/healthz`** proxies the liveness JSON,
- **`/dev`** hard-404s the studio API (defense in depth; the server
  also refuses it in production),
- **`/assets/`** long-caches the content-hashed bundle files.

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

Production safety defaults: with `NODE_ENV=production`, dev chat
commands, the `/dev` studio API, and guest (accountless) joins are all
**off** unless explicitly enabled.

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

Then add the daemon's id to the site **Environment** so the control
script can address it:

```
ARX_PROGRAM=daemon-<id>:*
```

Logs: Forge's daemon panel, or `/home/forge/.forge/daemon-<id>.log`.

(Alternative: `deploy/arx-supervisor.conf` is a hand-installed
supervisor program with the stable name `arx` — only if you prefer
managing supervisor yourself; then leave `ARX_PROGRAM` unset.)

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

$ACTIVATE_RELEASE()

# Swing the game server onto the new release and confirm it's alive.
# ($FORGE_RELEASE_DIRECTORY is the release `current` now points at —
# no site path is hardcoded anywhere in this script.)
bash "$FORGE_RELEASE_DIRECTORY/scripts/arxctl.sh" restart
sleep 2
bash "$FORGE_RELEASE_DIRECTORY/scripts/arxctl.sh" ping || echo "WARNING: game server not answering /healthz"
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

Note the restart drops connected players for a couple of seconds — a
single authoritative world process can't hand off live sessions, so
deploy at quiet hours once there's a population.

## 7. Verify

- `https://arx.gg` loads the game and the login panel.
- `https://arx.gg/healthz` returns `{"ok":true,…}`.
- `https://arx.gg/dev/maps` returns 404.
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
