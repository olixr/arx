# Arx

An open-world multiplayer RPG in the spirit of classic RuneScape —
classless progression, gathering, crafting, real-time combat, dungeons,
and building — built entirely in-house on web tech: TypeScript,
Canvas 2D, WebSockets, and SQLite. No game engine, no frameworks beyond
Vite (bundler) and `ws` (WebSocket transport). Live at
[arx.gg](https://arx.gg).

## Quick start

```bash
npm install
npm run dev        # game server (ws://localhost:8787) + client (http://localhost:5173)
```

Open `http://localhost:5173`, create an account, and you wake in
Dawnmead. Everyone on your network can join the same world by pointing
a browser at your machine.

Other commands:

```bash
npm test                            # simulation, codec, worldgen, pathfinding suites
npm run typecheck                   # strict TS across all packages
npm run build                       # production client bundle → public/
npm run bot -w @arx/tools -- 30     # 30-bot load/soak test
```

## Production

See [DEPLOY.md](DEPLOY.md) — static client served from `public/` by
nginx, game server on loopback under supervisor, `/ws` proxied through
the same origin (the client always connects to `wss://<host>/ws`, so
no URLs are baked into the bundle). Operate the live server with
`scripts/arxctl.sh {start|stop|restart|status|ping}`.

The map editor lives at `http://localhost:5173/editor.html` — paint a zone,
Save, and drop the JSON into `data/maps/` to load it on the server.

## Controls

| Input | Keyboard / mouse | Gamepad | Touch |
| --- | --- | --- | --- |
| Move | WASD / arrows | Left stick | Left-side virtual stick |
| Aim | Mouse | Right stick | Faces walk direction |
| Attack | Click / Space | RT / R1 / A | ⚔️ button |
| Interact (chop, mine, fish, portals…) | E or click tile | X | Tap the tile |
| Walk to | — | — | Tap open ground |
| Pack / Skills / Handiwork / Build | I / K / C / B | — | Bottom-right buttons |
| Demolish own construction | X + click | — | — |

Click items in the pack to equip or eat them. With the bank or shop open,
pack clicks deposit or sell instead.

## What's in the world

- **12 skills**, RS-style XP curve to 99: vitality, melee, defence, archery,
  magic, mining, woodcutting, fishing, smithing, crafting, cooking,
  construction. No classes — train what you like.
- **The Dawnlands**: hand-authored settlements — Dawnmead, Amberford,
  Silverfall — linked by authored roads and ringed by procedurally
  generated wilderness that goes on forever.
- **Gathering**: trees, oaks, copper/iron rocks, fishing spots — nodes
  deplete and respawn for everyone in the shared world.
- **Real-time combat**: swords swing in arcs, bows consume arrows, staves
  hurl bolts. Monsters aggro, chase, leash, and drop loot tables.
- **Economy**: smelt → smith → wield; fish → cook (burns happen) → eat;
  bank storage; a general store.
- **The Undercroft**: an authored underground beneath Silverfall, with
  **delve portals** that generate personal procedural dungeons (rooms,
  corridors, ore veins, champions) — torn down and re-rolled every visit.
- **Construction**: build floors, walls, fences, campfires, workbenches,
  even furnaces and anvils on open ground. Constructions persist in the
  database and survive restarts. Only you can demolish yours.

## Architecture

npm workspaces monorepo:

```
packages/
  shared/    protocol (JSON control plane + binary snapshots/chunks),
             fixed-tick movement sim, ECS-lite stores, A* pathfinding,
             tile registry, RS xp curve, seeded RNG/noise
  content/   data-driven definitions: items, NPCs, loot, recipes, shops,
             buildables, zone builder + authored maps (town, dungeon)
  server/    authoritative 20 Hz simulation over ws: interest management
             (chunk-based), NPC AI, combat, gathering/crafting/building
             actions, portals + delve instancing, SQLite persistence
             (accounts, characters, skills, inventory, bank, built tiles)
  client/    Canvas renderer (baked chunk layers, y-sorted hard-shadow
             pass, procedural character rig with stepping feet), client
             prediction + reconciliation, snapshot interpolation, DOM UI
             panels, WebAudio SFX, gamepad + touch input
  tools/     headless bot client for load testing
```

Key netcode properties:

- Server is authoritative for everything; clients send *intents* only.
- Client-side prediction with input replay keeps your own movement at
  0 ms perceived latency; other entities interpolate ~120 ms behind.
- Interest management streams only the 3×3 chunks around each player —
  world data (4 KB binary per chunk), entity enter/leave, and 20 Hz
  quantized binary snapshots.
- Everything client-triggered is validated and rate-limited server-side:
  movement speed, reach, levels, materials, cooldowns, ownership.
- `FAKE_LAG_MS=150 FAKE_JITTER_MS=30 npm run dev:server` simulates a bad
  connection (order-preserving) for honest netcode testing.

Server env knobs: `PORT`, `WORLD_SEED`, `MOTD`, `ALLOW_GUEST=0`,
`DATA_DIR`, `FAKE_LAG_MS`, `FAKE_JITTER_MS`, `COMBAT_DEBUG=1`.
