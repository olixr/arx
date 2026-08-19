# THE REEL ROOM — capturing the game for the front door

*The pipeline that turns the running game into the footage on arx.gg.*

---

## 1. The argument

A landing page for a game has exactly one job: show the game. Every
substitute — concept art, mocked-up UI, a bullet list of features — is
an admission that the real thing was not ready to be looked at. Ours is.

So the front door plays **reels**: short pieces of the actual client,
performed on the actual server, taped off the actual canvas. Nothing on
the page is pre-rendered, re-drawn, or composited from anything but a
frame the renderer presented. The rule that makes this honest is the
one the whole system is built around:

> **A reel is only allowed to do what a player can do.**
> The director drives the game through the same input layer a thumb
> drives, and the camera is the only thing it is allowed to own.

That rule is not decoration. It is why the footage is trustworthy, and
it is why a shot that looks impossible on the page is impossible in the
game too — a bug, not a licence.

## 2. The shape of it

```
packages/client/src/reel/     THE DIRECTOR — lives inside the game
  types.ts       the shot language (stage steps, beats, camera moves)
  shots.ts       THE SLATE: every reel, written as a storyboard card
  director.ts    runs one shot: pre-roll, then a frame-locked timeline
  puppet.ts      a hand on the touch lane — analog stick, four buttons
  camera.ts      the rig: a move, a spring, a breath, and a hand
  stage.ts       what the frame may contain (clean / drama / play)
  recorder.ts    canvas.captureStream → a VP9 mezzanine
  boot.ts        window.__reel, loaded only when `?reel` is on the URL
  state.ts       the one field main.ts reads (the shot owns the eyes)

packages/tools/src/reel/      THE LANE — drives a browser
  cli.ts         `npm run reel -w @arx/tools -- ...`
  lane.ts        chromium + login + the slate, read from the page
  capture.ts     one take, plus an honest report on how it landed
  encode.ts      the ffmpeg delivery ladder + the contact sheet
  profiles.ts    THE CAST: the bodies the reels are performed by
  scout.ts       location scouting: stand in the place and look at it

scripts/reel-lane.sh          a disposable server+client stack for it
packages/client/public/reels/ the delivery files + reels.json manifest
```

Two seams exist in the game itself, both additive, both documented at
their declaration, both the same shape as the map studio's seams:

- `Renderer.chrome` — `'all' | 'drama' | 'none'`: how much of the game's
  own dashboard the frame may carry.
- `reel.aim` (src/reel/state.ts) — while a director drives, the shot
  owns the aim. One line in main.ts reads it.

Nothing else in the game knows reels exist.

## 3. Running it

```bash
scripts/reel-lane.sh                       # server :8830 + client :5230
npm run reel -w @arx/tools -- all          # capture + encode the slate
npm run reel -w @arx/tools -- the-cut      # one shot by name
npm run reel -w @arx/tools -- all --make   # rebuild the cast first
npm run reel -w @arx/tools -- the-cut --raw        # tape only, no encode
npm run reel -w @arx/tools -- the-cut --encode-only # re-encode the tape
npx tsx src/reel/scout.ts --tour "-84,54; -100,-70" --hour 18.6
```

Output: `packages/client/public/reels/<id>.{webm,-720.webm,mp4,jpg}` and
`reels.json`, which the landing page reads at runtime. Raw mezzanines
and contact sheets stay in `.reels-raw/` and are never committed.

## 4. The laws, learned the hard way

Each of these cost a take to find. They are in the code as comments too;
this is the index.

1. **A FRESH WORLD IS PART OF THE TAKE.** Shots spawn tanky mobs by the
   dozen; survivors linger. After a morning of shooting the meadow holds
   forty ogres and every take comes back TROUBLED for reasons that have
   nothing to do with the shot. `scripts/reel-lane.sh` before a batch.
2. **THE CAPTURE MACHINE MUST BE IDLE, AND THE WINDOW MUST BE IN
   FRONT.** macOS parks an unfocused window's frame loop at 30 Hz —
   no browser flag prevents it — and a typecheck running beside the take
   costs the same again. The take report is the tell: a median frame
   time near 33 ms means the machine, not the shot.
3. **THE TAKE REPORT IS THE VERDICT, NOT THE VIDEO.** Frames, median
   frame time, hitches, worst frame, and any command that fell off the
   server's chat bucket. `TROUBLED` means re-shoot; do not ship a reel
   the lane doubted.
4. **SPAWN, THEN WALK OFF.** `/spawnmob` puts foes at your elbow. Stage
   them, walk six tiles away, and let them charge into frame on the
   first second. A fight already touching at frame one has no first act.
5. **THE PAIR IS THE SUBJECT.** A melee framed on the player alone puts
   the thing being fought at the edge of the plate. `followFoe` centres
   the exchange; combat sits around zoom 1.9–2.2, landscape 1.3–1.5.
6. **FOES ARE WHAT THE AIM ASSIST SAYS THEY ARE.** A looser filter locks
   the camera onto a chicken the moment the last juggernaut falls and
   sails across the village with the tape still rolling. (It did.)
7. **WAVES, NOT PACKS.** At mastery a masterwork greatsword ends a
   juggernaut in two swings. A single spawn is over before the second
   act; write reinforcements onto the timeline.
8. **THE BUCKET IS ONE PER SECOND, BURST FOUR.** Pre-roll pays 1.15 s a
   command and nobody watches. Mid-take commands spend the burst.
9. **A FIGHT UNDER CANOPY IS A FIGHT NOBODY CAN SEE.** Stage on open
   ground with a landmark that reads at a glance.
10. **LET THE HERALD FINISH.** Teleporting into a named place raises the
    Place Herald. Wait it out in the pre-roll unless the ceremony IS the
    shot.
11. **HMR OFF, WATCHER ON.** The capture lane must reload client changes
    on the next navigation, or it silently tapes yesterday's renderer.
12. **NEVER STAGE A FIGHT INSIDE A TOWN.** The watch joins in and kills
    your foes off-camera in the first two seconds, the camera's
    foe-picker locks onto a guard, and the boss never gets to be the
    subject. Learned at Silverfall's gate, re-learned in Amberford's
    south field, written down the second time.
13. **VERIFY THE MARK.** `/tp` refuses silently when there is no
    walkable tile within four of the point, and a shot that stages
    somewhere else performs perfectly in the wrong place. The `at`
    stage step asks, checks, nudges, and finally fails loudly.
14. **WATCH FOR THE SNAP.** A death is over in a frame — the body is on
    the respawn stone before its HP has been read twice — but the
    teleport it leaves is unmistakable. The director watches for a
    jump greater than eight tiles and marks the take died. (An adept
    in cloth does not survive six Old Crown kingsmen. Four is the
    number.)
15. **RELEASE THE CANVAS TAP.** `captureStream` keeps pulling frames
    for as long as its tracks live, whatever the recorder is doing —
    nine reels through one page meant nine taps on one canvas and a
    frame rate that halved with every take.
16. **REMUX BEFORE ENCODING.** A MediaRecorder blob is a LIVE container
    with no duration, no frame count and no index; every pass that
    reads it works blind and the constant-rate conversion crawls. One
    copy-mode remux turns fifteen minutes into five seconds.

## 5. What the lane found in the game

The capture lane is the first thing in the project that watches whole
fights with the console open, and it earned its keep on day one:

- `Renderer.queueFxGlow` recursed into itself for any effect style
  without an authored light — an infinite recursion that blew the stack
  every frame such an effect was on screen. Fixed to call `queueGlow`,
  which is what the comment above it always said it did.

## 6. The slate

Nine reels, three casts. `hero: true` marks the ones the front page's
cold open cuts between.

| id | pillar | cast | what it argues |
| --- | --- | --- | --- |
| `the-cut` | combat | blade | steel, waves of juggernauts, the Art landing |
| `the-crown` | crown | blade | a crowned boss and its banner |
| `the-arts` | arcana | adept | staff, sigil, night, 309 abilities |
| `the-road` | road | blade | mounted, north, one long road |
| `the-tended-earth` | homestead | steader | the other half of the game |
| `the-town` | town | steader | 188 people keeping their own day |
| `the-wild-at-heel` | wild | blade | a companion in a real fight |
| `the-long-dark` | dark | blade | the Undercroft, torchlit |
| `the-night` | town | steader | every lantern throwing its own light |

## 7. Adding a shot

1. Scout it: `npx tsx src/reel/scout.ts --tour "x,y" --hour 18.6`.
2. Write the card in `packages/client/src/reel/shots.ts`.
3. `npm run reel -w @arx/tools -- <id> --raw`, then look at the contact
   sheet in `.reels-raw/<id>.sheet.jpg`.
4. Re-frame, re-shoot, and only then drop `--raw`.
5. If the page should show it, give it a home in `landing.html` (a
   `data-reel="<id>"` well) or add it to `ROADS` in `landing.ts`.
