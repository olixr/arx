# Deploying Arx to production (Laravel Forge)

Arx is two pieces on one domain:

1. **Static client** — `npm run build` writes the game bundle to
   `<repo>/public/`. Nginx serves it directly; that directory is the
   site's web root.
2. **Game server** — a Node WebSocket process on loopback
   (`127.0.0.1:8787`), kept alive by supervisor. Nginx proxies
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
and paste the location blocks from [`deploy/nginx-arx.conf`](deploy/nginx-arx.conf)
into the `server { }` block, above the default `location /`. They:

- proxy `/ws` (WebSocket upgrade headers, long read timeout),
- proxy `/healthz` (liveness JSON),
- hard-404 `/dev` (studio API — defense in depth; the server also
  refuses it in production),
- long-cache `/assets/` (content-hashed filenames).

## 3. Database

In Forge (server → **Database**) create a database named `arx` and a
user (Forge's default `forge` user is fine) with a strong password.
That's all — the server runs its own schema migrations at boot, and
the `citext` extension it needs is trusted (no superuser required).

## 4. Environment

Paste the contents of `.env.production.example` into Forge's
**Environment** tab for the site (it lands at `/home/forge/arx.gg/.env`
and Forge links it into each release), and create the data dir:

```bash
mkdir -p /home/forge/arx-data
```

Review the env — set the real credentials in `DB_USERNAME` /
`DB_PASSWORD` (`DB_HOST`/`DB_PORT`/`DB_DATABASE` default sensibly).
`DATA_DIR=/home/forge/arx-data` holds disk-authored content (map
overrides, POI prefabs); the deploy script ships the repo's data/ into
it on every deploy. All player data lives in Postgres.

Production safety defaults: with `NODE_ENV=production`, dev chat
commands, the `/dev` studio API, and guest (accountless) joins are all
**off** unless explicitly enabled.

## 5. Supervisor (the game-server process)

Either install the shipped program (recommended — gives it the stable
name `arx`):

```bash
sudo cp /home/forge/arx.gg/deploy/arx-supervisor.conf /etc/supervisor/conf.d/arx.conf
sudo supervisorctl reread && sudo supervisorctl update
```

…or create a **Forge Daemon** with command
`bash /home/forge/arx.gg/current/scripts/arx-run.sh`, directory
`/home/forge/arx.gg/current`, user `forge` — then set
`ARX_PROGRAM="daemon-<id>:*"` in the environment so the control script
can address it.

Operate it with the control script:

```bash
scripts/arxctl.sh status    # supervisor state + live /healthz probe
scripts/arxctl.sh ping      # {"ok":true,"uptimeSec":…,"players":…}
scripts/arxctl.sh start
scripts/arxctl.sh restart   # after every deploy
scripts/arxctl.sh stop
```

## 6. Forge deploy script

Release-based (Forge's default `$CREATE_RELEASE` scaffold, extended):

```bash
$CREATE_RELEASE()

cd $FORGE_RELEASE_DIRECTORY

# --include=dev is load-bearing: vite + tsx are devDependencies, and if
# NODE_ENV=production leaks into this shell npm would otherwise skip them
npm ci --include=dev
npm run build                      # client bundle → <release>/public/

# Ship authored content into the persistent data dir (one-way:
# repo → server; the world DB itself is never touched).
ENV_FILE=".env"
[ -f "$ENV_FILE" ] || ENV_FILE="/home/forge/arx.gg/.env"
DATA_DIR=$(grep -E '^DATA_DIR=' "$ENV_FILE" | cut -d= -f2)
if [ -n "$DATA_DIR" ]; then
  mkdir -p "$DATA_DIR"
  [ -d data/prefabs ] && rsync -a --delete data/prefabs/ "$DATA_DIR/prefabs/"
  [ -d data/maps ]    && rsync -a data/maps/ "$DATA_DIR/maps/"
fi

$ACTIVATE_RELEASE()

# Swing the game server onto the new release and confirm it's alive.
bash /home/forge/arx.gg/current/scripts/arxctl.sh restart
sleep 2
bash /home/forge/arx.gg/current/scripts/arxctl.sh ping || echo "WARNING: game server not answering /healthz"
```

DB migrations run automatically at server boot. Note the restart drops
connected players for a couple of seconds — a single authoritative
world process can't hand off live sessions, so deploy at quiet hours
once there's a population.

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
  SSH-tunnel instead: `ssh -L 8787:127.0.0.1:8787 forge@arx.gg`, run
  the studio locally against the tunnel with `DEV_COMMANDS=1` set on
  the server only for the session — or better, edit locally and deploy.
- **Backups:** the whole world is the `arx` Postgres database. Forge
  scheduled job (daily): `pg_dump -Fc arx > /home/forge/backups/arx-$(date +\%F).dump`
  — restore with `pg_restore -d arx --clean`. Forge's own database
  backup feature works too.
- **Migrating an old SQLite world:** if you have a pre-Postgres
  `arx.db`, copy it to the server and run
  `npm run migrate:sqlite -w @arx/server -- /path/to/arx.db` once,
  before opening the doors.
- **Scaling:** one process = one world. Keep it on one box; move the
  client to a CDN later if asset bandwidth ever matters.
