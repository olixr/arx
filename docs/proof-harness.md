# THE PROOF HARNESS — `scripts/probes/band-proof.mjs`

One script replaces the improvised per-band proof rigs (band6/live's
seating probe, band8/fix's shots, band9c/l5's shoot.sh, the k34b museum
probes). Give it a manifest, it boots one throwaway server+vite pair (or
rides a running lane), shoots every scene at every hour with the clock
jumped, grades every body stop against the server's own `/routines`
word, composes a contact sheet, runs the stage-parity battery as a child
on the same origin, and writes `report.md`. Exit code is the verdict.

## Usage

```
# self-contained: its own server + vite on free ports, its own DB, torn down on exit
node scripts/probes/band-proof.mjs --manifest scripts/probes/manifests/proof-museum.json --out .proof/band9d --rig

# ride a running lane (a vite proxying its server)
ORIGIN=http://localhost:5231 node scripts/probes/band-proof.mjs --manifest m.json --out .proof/band9d

# re-shoot two fixed scenes at noon only, skip parity
node scripts/probes/band-proof.mjs --manifest m.json --out .proof/band9d --rig --scenes fork,den --hours 12 --no-parity
```

| flag | meaning |
|---|---|
| `--manifest <json>` | the proof manifest (schema below) — required |
| `--out <dir>` | output directory (created) — required |
| `--rig` | stand a throwaway server+vite pair; without it `ORIGIN` (default `http://localhost:5231`) must be a running vite |
| `--db <name>` | the rig's DB name (default `arx_proof_<band>`); created by the server boot, dropped at teardown |
| `--scenes a,b` | shoot only these scene ids (re-shooting fixed scenes) |
| `--hours 12,0` | override every scene's hour list |
| `--zoom <z>` | camera zoom for every shot (default manifest `zoom`, else 1.3) |
| `--dwell <sec>` | per-scene real-time wait AFTER the clock jump and the bake settle, for a timed beat; capped at 120 s; a scene's own `dwell` wins |
| `--no-parity` | skip the stage-parity child |
| `--parity-scenes a,b` | scope the parity battery (`SCENES=` of stage-parity.mjs); manifest `parityScenes` is the default |

Env: `ORIGIN` (a running vite) when not `--rig`; `DB_HOST/DB_PORT/DB_USERNAME/DB_PASSWORD` pass through to both the server boot and the teardown drop.

The account is stage-parity's own (`perf12_probe`), registered on the
spot if the server has never seen it, so the parity child logs into the
same lane without a second registration. The walker is buffed
(`/xp vitality`, `/xp defence`) so a hostile setup never kills the proof.

## Outputs (all under `--out`)

| file | what |
|---|---|
| `<scene>-<hh>-z<zoom>.png` | one shot per scene × hour; `hh` is `12`, `00`, `1630` (minutes only when the hour has them) — deterministic, so a re-shoot overwrites in place |
| `seat-<slug>-<hh>-z<zoom>.png` | the walker standing two tiles west of every graded stop |
| `seating.json`, `seating.md` | per body × stop: expected point, the `/routines` row nearest it (pos, task kind, wp, phase/state), the painted body's pose/dir, Δ tiles, PASS/FAIL and why |
| `contact-<band>.png` (+ `.html`) | the montage: every manifest scene × hour whose file stands on disk, labelled (cells not shot by this run read "(kept)"), max 6 columns (Playwright composes from the shots; no canvas dependency) — so a scoped re-shoot refreshes its cells and keeps the rest |
| `parity.txt` | the stage-parity child's whole transcript |
| `report.md`, `result.json` | counts, per-shot lines, seating verdicts, failures, parity lines, timings, every `[pageerror]`, notes |
| `run.log`, `rig-server.log`, `rig-vite.log` | the run's own log and the rig's process logs |

## Manifest schema

```jsonc
{
  "band": "band9d",                 // names the contact sheet and the default DB
  "zoom": 1.3,                      // optional (default 1.3)
  "hours": [12, null, 0],           // optional default hour list per scene; null = the scene's own `hour`
  "setup": [                        // optional; run once in the overworld before anything is shot
    "/tp 201 292",                  // a /tp is VERIFIED (retried until the renderer lands)
    "/spawnnpc dolmen_setter dolmen_set",   // anything else is said with 1.2 s pacing; the reply is logged
    "/settile 505 4 4"
  ],
  "scenes": [
    { "id": "fork", "x": -140, "y": -165, "hour": 16.5,   // world tile; the shot hours default to [12, hour, 0]
      "plane": "world",             // or "museum" (the harness toggles /museum only when the plane changes)
      "hours": [12, 21.5],          // optional per-scene override
      "dwell": 20,                  // optional real-time seconds for a timed beat (cap 120)
      "dir": "s",                   // recorded only
      "notes": "the oak felled, no stump" }
  ],
  "bodies": [
    { "slug": "dolmen_setter",      // actor slug; the /routines name is read from packages/content/src/actors/defs/<slug>.json
      "name": "Dolmen",             // optional override of that name
      "anchor": "spawn",            // measure dx/dy stops from where /routines first reports the body after setup
      "near": [201, 292],           // which body of that name: the row nearest this point (default: the walker's post-setup position)
      "plane": "world",
      "tol": 1.5,                   // default tolerance, tiles
      "stops": [
        { "hour": 12,   "dx": 0, "dy": 0, "kind": "post" },                 // relative to the anchor
        { "hour": 15.5, "dx": 0, "dy": 0, "tol": 2.6, "kind": "wander" },   // per-stop tolerance
        { "hour": 21.5, "x": 104, "y": 37, "pose": 16, "state": "arrived" } // absolute; pose is the CLIENT pose (14 sit, 16 lie); kind/state are the /routines row's
      ] }
  ],
  "parityScenes": ["dawnmead", "crown-noon"]   // optional scope for the parity child
}
```

A stop PASSes when the nearest `/routines` row of that name lies within
`tol` of the expected point AND every declared `kind` / `state` / `pose`
matches. A body missing from `/routines` (or an anchor the harness could
not read after setup) is a FAIL, never a skip.

## The laws

1. **The clock is jumped, never waited.** Every hour is `/time <h>`,
   verified by its `Time set:` broadcast (the chat rate limiter eats
   commands; a verified jump retries). A timed beat gets `--dwell` /
   `scene.dwell`, capped at 120 s. There is no real-time in-game-day
   wait in this harness and no flag adds one.
2. **One boot for everything.** Setup, shots, seating, parity and the
   contact sheet all run against the one origin; `--rig` boots exactly
   one server+vite pair and tears it down on exit — normal, error,
   SIGINT, SIGTERM.
3. **Deterministic names.** `<scene>-<hh>-z<zoom>.png`; a `--scenes` /
   `--hours` re-shoot overwrites only those files.
4. **Non-zero on any FAIL.** A seating FAIL, a parity FAIL (its own exit
   code), a shot that never landed or never wrote, or an aborting error
   all exit 1; a bad invocation exits 2; a crash in teardown exits 3.
5. **The rig touches nothing that stood before it.** Free ports by
   `lsof` (never 5231/8814/5242/5243); its DB is created by the server
   boot and dropped afterward; the vite config is a copy of
   `packages/client/vite.config.rig.ts` with HMR off and the watcher
   blinded (a concurrent build's saves never reload a shot), deleted on
   exit; every `data/prefabs/*.json` the boot seeds — and a `data/maps`
   born by it — is pruned; files that existed before the boot are never
   removed. `git status --porcelain` after a run shows nothing the run
   made except your `--out` if it lies inside the repo (`.proof/` is
   ignored).
6. **Readiness before a shot.** After the teleport and the clock jump
   the harness waits for the ground bake queue to drain (no chunk with a
   pending sliced bake, `chunkJobQueue` empty; 15 s cap, noted if it
   never settles), then the 1.2 s pacing wait, then the optional dwell.
7. **The plane check.** `/museum` is a toggle and the probe account
   keeps its plane across logins; the harness reads `dcGame.plane` and
   crosses only when a scene or body asks for the other side, and
   leaves the account in the overworld at noon for the parity child.
8. **Server word over client eye.** Seating verdicts read `/routines`
   (position, task kind, waypoint, phase); the painted body supplies only
   pose/dir. Both are recorded so a disagreement is visible.

## Recipe for a band's L3 lane (the proof deliverable)

1. Write `scripts/probes/manifests/<band>.json`: one scene per plinth /
   POI / beat the band changed, at the hour the change reads best
   (`hour`); the default hour list adds noon and midnight. List every
   body whose day the band touched with the stops the plan promises
   (pins.ts gives posts; routine defs give slots; use `dx/dy` + `anchor`
   for bodies the setup spawns, absolute `x/y` for zone-pinned ones).
   Put fixture commands in `setup` (`/spawnnpc <slug> <routine>`,
   `/spawnmob`, `/settile`, `/tp`).
2. Run it with `--rig` into `.proof/<band>/`. Read `report.md` first,
   then `contact-<band>.png`, then the seating table.
3. Fix, then re-shoot only what changed: `--scenes a,b [--hours h]
   --no-parity`. The names overwrite in place.
4. Before the commit, run the full manifest once more WITHOUT
   `--scenes` (the parity child included) and attach the contact sheet
   path and the report's counts to the band's ledger entry.
5. `git status --porcelain | grep -v dist-types` must show only your
   band's files: the harness leaves no rig behind (check the report's
   teardown lines in `run.log` if in doubt: ports 0, db dropped, config
   removed, seeded prefabs pruned).

## Idioms it carries (and their scars)

- The VERIFIED TELEPORT (stage-parity v4): a battery once measured four
  scenes at the graveyard while PASSing because the limiter ate its
  `/tp`s.
- The register-or-login door (k34b): a fresh rig DB has no account; the
  Hero's Mirror is confirmed once and the look panel waited out.
- `/routines` parsed to rows (band6 seating audit): the only honest
  timeline of a routine body — the client's pose rides beside it.
- The blinded vite (rig30): `hmr: false`, `watch.ignored: ['**/*']`.
- The bake-queue readiness read (`baked` entries with `pending`,
  `chunkJobQueue`) is the renderer's own; if those fields move, the
  wait degrades to the pacing wait and the report notes it.
