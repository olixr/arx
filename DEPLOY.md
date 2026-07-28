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

- **Node.js ≥ 22.13** on the server (the world DB uses the built-in
  `node:sqlite` — no native deps). Pick Node 22 LTS when provisioning
  in Forge, or install via nvm for the forge user.
- No PHP, no MySQL/Redis needed.

## 1. Forge site

- Create the site for **arx.gg** with type **Static HTML** (or General
  PHP — the type only shapes the nginx template; we override the root).
- **Web directory / root: `/home/forge/arx.gg/public`** ← this is the
  answer to "what do I point the document root at". The repo checks out
  at `/home/forge/arx.gg`; the build step creates `public/` inside it.
- Install the repository on the site (Forge → site → Git Repository),
  branch `main`.
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

## 3. Environment

```bash
cp .env.production.example /home/forge/arx.gg/.env
mkdir -p /home/forge/arx-data
```

Review `.env` — notably `DATA_DIR=/home/forge/arx-data` keeps the
SQLite world **outside the repo** so no git operation can ever touch
player data. The deploy script ships authored content (prefabs, map
overrides) into it on every deploy.

Production safety defaults: with `NODE_ENV=production`, dev chat
commands, the `/dev` studio API, and guest (accountless) joins are all
**off** unless explicitly enabled.

## 4. Supervisor (the game-server process)

Either install the shipped program (recommended — gives it the stable
name `arx`):

```bash
sudo cp /home/forge/arx.gg/deploy/arx-supervisor.conf /etc/supervisor/conf.d/arx.conf
sudo supervisorctl reread && sudo supervisorctl update
```

…or create a **Forge Daemon** with command
`bash /home/forge/arx.gg/scripts/arx-run.sh`, directory
`/home/forge/arx.gg`, user `forge` — then set
`ARX_PROGRAM="daemon-<id>:*"` in `.env` so the control script can
address it.

Operate it with the control script:

```bash
scripts/arxctl.sh status    # supervisor state + live /healthz probe
scripts/arxctl.sh ping      # {"ok":true,"uptimeSec":…,"players":…}
scripts/arxctl.sh start
scripts/arxctl.sh restart   # after every deploy
scripts/arxctl.sh stop
```

## 5. Forge deploy script

```bash
cd /home/forge/arx.gg
git pull origin $FORGE_SITE_BRANCH

npm ci
npm run build                      # client bundle → public/

# Ship authored content into the persistent data dir (one-way:
# repo → server; the world DB itself is never touched).
DATA_DIR=$(grep -E '^DATA_DIR=' .env | cut -d= -f2)
if [ -n "$DATA_DIR" ]; then
  mkdir -p "$DATA_DIR"
  [ -d data/prefabs ] && rsync -a --delete data/prefabs/ "$DATA_DIR/prefabs/"
  [ -d data/maps ]    && rsync -a data/maps/ "$DATA_DIR/maps/"
fi

bash scripts/arxctl.sh restart
bash scripts/arxctl.sh ping || echo "WARNING: server not answering /healthz yet"
```

(DB migrations run automatically at server boot.)

## 6. Verify

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
- **Backups:** the whole world is `$DATA_DIR/arx.db` (plus `-wal`).
  Forge scheduled job: `sqlite3 /home/forge/arx-data/arx.db ".backup /home/forge/backups/arx-$(date +\%F).db"`.
- **Scaling:** one process = one world. Keep it on one box; move the
  client to a CDN later if asset bandwidth ever matters.
