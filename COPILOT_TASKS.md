# Copilot tasks: the big update (from Claude, 2026-10-21)

> **What's current is only in HANDOFF.md → NOW** (or the latest comment on the task's issue). The task specs below stay as reference; any "Status" lines in them are history.

Copilot, these are your tasks for Cillian's next big update. Read `HANDOFF.md` first; its rules still apply. Cillian has lifted the hold on new features for this update.

## Who does what

| Work | Who | Where in `game/index.html` |
|---|---|---|
| Chicken Race bonus room, Ghost Phelan sabotage | Claude | game script (rooms) |
| Wheel graphics: light sweep, glowing win slice, 3D rim and pointer | Claude | game script (`build*`, `draw*` for the wheels) |
| Daily free spin | Claude | wallet + game |
| Prize odds for the new room | Claude, using the fast sim in the odds thread | — |
| **Task 1: stats and leaderboard redesign** | **Copilot** | wallet: `accountSheet`, `meTab`, `lbTab`, wallet CSS |
| **Task 2: trophies** | **Copilot** | wallet only |
| **Task 4: code rewrite in stages** (includes the old Task 3 performance pass) | **Copilot, after Task 2 has merged** | whole `game/index.html`, new `src/` and `tools/` |

Claude ships update 20 to `main`. Copilot's tasks are separate PRs that take the next free version number when they merge (21, 22 …), one release at a time. **Before starting, make sure PR #1 is merged, then branch from the latest `main`.** Make one branch and one PR per task, for example `copilot/stats-redesign`, `copilot/trophies` and `copilot/perf`.

Nothing in your tasks touches money: no balance changes, no prizes, no payout maths, no `Final answer · €X` wording, no stake rules and no jackpot logic. If a task seems to need one of those, stop and write the question in your PR.

---

## Task 1: stats and leaderboard redesign (wallet UI)

**Goal:** Cillian wants the account sheet cleaner, simpler and friendlier, with only the information that matters. It's opened by tapping the name/balance box (`#wWho`) and today has a **Me** tab and a **Leaderboards** tab.

**Today:** `meTab` shows a 6-tile grid, pending withdrawals, Top up and Withdraw buttons, and the last 40 transactions. `lbTab` shows 4 global tiles and four top-5 boards.

**Build:**
1. **Me tab:**
   - A large balance at the top, with Top up and Withdraw directly under it.
   - One line of three small stats: Spins, Biggest win and Up/down. Colour Up/down green or red.
   - Pending withdrawals as a single highlighted line, shown only when there are some.
   - History grouped by day ("Today", "Yesterday", or a date). Collapse consecutive spins into one line, e.g. "12 spins −€1.20". Wins, top-ups, withdrawals, refunds and host adjustments stay as their own lines. Show 15 lines with a "Show more" button.
   - Log out as a small link at the bottom.
2. **Leaderboards tab:**
   - One board at a time, picked with a row of chips: Most won, Biggest win, Most spins, Best up/down.
   - Show every player, not just the top 5. Mark the current player's row ("You").
   - One line of global stats above the chips: total spins and the biggest ever win with the winner's name.
3. Keep it readable at 320–440px wide without horizontal scroll, and keep using the existing colours, fonts and `.wbtn`/`.wlist` styles where they fit.
4. Remember the last chosen board in `pref` (the existing helper) so the tab reopens on it.
5. The `test` account never appears on leaderboards. This is already filtered, so keep it that way.

**Done when:** both tabs look clean at 320, 360 and 412px with 3–5 players, long names (15+ characters) and 4-digit amounts, and the data matches what the old tabs showed. Put a screenshot or a short description of each width in the PR.

**Status (Task 1):** Redesigned the Me history and leaderboard views; validated the game page in headless Edge and `git diff --check`. Layout description for the PR: at 320px the balance/actions and three stats stay in a single-column flow, chips wrap into two columns, and names can wrap; at 360px the same compact layout has more room for amounts and history; at 412px the sheet remains centered and wider, with two rows of chips and the full player list. No live 3–5-player screenshot fixture was available.

---

## Task 2: trophies (wallet only, no money)

**Goal:** collectible badges for things players do. They're for bragging only and **never add money**.

**Storage:** `users/{key}/trophies/{trophyId}` holds the time it was earned (ms). Add it with a single `db.put` the first time only, and check the local copy in `W.me.trophies` first. The `test` account can earn trophies, but test trophies never show on leaderboards.

**Trophies to build (ids in brackets):**
| Trophy | When |
|---|---|
| First spin (`first`) | first paid spin |
| Regular (`spins100`) | 100 spins |
| Lifer (`spins1000`) | 1000 spins |
| Stank Chamber (`stank`) | reaching the Stank Chamber room |
| Monster tank (`monster`) | reaching the Monster tank room |
| God room (`god`) | reaching the God room |
| Pyramid (`pyramid`) | all six tiles lit |
| Phelan's Tomb (`tomb`) | winning the Tomb plaque |
| Even deeper (`deep5`) | reaching the hidden 5th inner wheel |
| Golden run (`golden`) | a golden run |
| Big winner (`big`) | a single win of 50× the bet or more |
| Chicken Race (`race`) | winning the Chicken Race. Claude is building the room, so wire this one after update 20 merges. Its final verdict title will start with `Chicken Race`. |

**How to detect them:** use what the wallet already sees. It wraps `spin()` and `setVerdict()`, and the highlight recorder reads `scene` (room names are in the `ROOMS` map), so read game globals the same way and don't edit the game script. For the 5th wheel and golden runs, look for the existing globals (`DEPTH`, and the golden-run flag set in `runMain`). If something can't be detected without changing the game script, leave that trophy out and list it in the PR.

**Show them:**
- When a trophy is earned, show a small gold toast with the trophy name and an icon, once.
- Add a **Trophies** section to the Me tab (Task 1's layout): a grid of all trophies with the earned ones lit and the rest greyed. Tapping one shows how to earn it.
- On the Leaderboards tab, add a "Most trophies" chip.

**Done when:** each trophy you could wire fires exactly once per player, survives an app restart, and never changes a balance. Say in the PR how you tested it.

**Status:** Implemented all 12 trophies, including Chicken Race now that update 20 is on `main`, and added the Most trophies board to Task 1's leaderboard chips. Inline scripts parse; mocked runtime checks cover trophy deduplication, restart state, and failed-write retry. Live Firebase/account gameplay remains untested here. Release metadata is version 21.

---

## Task 3: performance pass (now part of Task 4, stage 4)

Merged into Task 4 below. Don't open a separate PR for it.

---

## Task 4: code rewrite in stages (issue "Copilot task: Code rewrite")

**Goal:** Cillian wants the code cleaned up properly. `game/index.html` is about 5,700 lines in one file: two `<style>` blocks, the game script (lines ~290–4728), `WALLET_CFG`, and the wallet script. Split it into readable modules, remove duplication and dead code, and make it run smoother. **Players must not be able to tell anything changed**, except that it's smoother.

**Start after the Trophies PR (Task 2) has merged**, so you don't fight your own work. Do **one PR per stage**, in order, each branched from the latest `main` after the previous stage merged. Claude reviews each stage (screenshots in a real browser and a fast-sim odds check) and merges it.

### Hard rules for every stage

1. **Phones still load one file.** The app and GitHub Pages fetch `game/index.html` from `main` as a single self-contained page. Keep it that way: modules live in a new `src/` folder, and a new `tools/bundle.mjs` (plain Node, no npm dependencies) inlines them back into `game/index.html`. **Commit the bundled `game/index.html` in every PR**, built from `src/` with `node tools/bundle.mjs`.
2. **`src/` becomes the source of truth from stage 1 on.** Build `src/` *from the current `game/index.html`*, never from `source/` or `source/tools/build.mjs` (those are old and would wipe live features and Cillian's prize edits). Update HANDOFF.md's "What's live" table to say so.
3. **Same odds, same money.** Don't change any prize table, `ev`, `edge`, `TIP_CHANCE`, `RACE_CHANCE`, chances, the jackpot, `Final answer · €X` wording, the wallet's `credit`/`refund`/stake code, or anything else that decides what pays. Don't change the *order or number* of `Math.random()` calls in game logic either: Claude checks this by replaying seeded runs. If you think something in that area is a bug, write it in the PR and leave it.
4. **Same names for watched globals.** The watch mirror reads game globals by name (`MIRROR`, `SLOW`, `ANGLES` in the wallet), and the wallet wraps `spin` and `setVerdict` by reassigning them. These must stay reachable as globals with the same names. Keeping the game as classic scripts (not ES modules) is the simplest way: the bundler concatenates them in order inside one `<script>`.
5. **Versions.** Stages 1–3 change no behaviour, so leave `version.json` and `gameVersion` alone (they ship with the next real update). Stage 4 (performance) takes the next free version number, bumping `version.json` `game` and `gameVersion` together, plus `const BUILD`/`gameBuild` and the footer, with an update name.
6. **No tests skipped, no new dependencies, no build step on the phone.**

### Stage 1: mechanical split (no code changes at all)

- Move each `<style>` block to `src/css/*.css`, the game script to `src/game/*.js` split at its existing `// ---------- section ----------` headers (about 24 of them, e.g. `wheels.js`, `rooms-stank.js`, `farm.js`, `photo.js`, `audio.js`), the `WALLET_CFG` line to `src/config.json` (or `src/config.js`), and the wallet to `src/wallet/*.js`. Put the HTML shell in `src/index.html` with markers the bundler replaces.
- Add `tools/bundle.mjs` and `tools/check.mjs`. `check.mjs` parses every inline script with `node --check`-style parsing (e.g. `new Function` or `vm.Script`), and checks that `version.json` `game` equals `gameVersion`.
- **Acceptance:** `node tools/bundle.mjs` produces a `game/index.html` that is **byte-for-byte identical** to the one on `main` before your PR (`git diff --exit-code game/index.html` is clean after bundling). Say so in the PR. This proves the split lost nothing.

### Stage 2: tidy without changing behaviour

- Remove dead code: functions and variables nothing calls (search the whole file first, including the wallet's `MIRROR` list and string-based lookups).
- Merge duplicated helpers (e.g. several near-identical wedge/slice drawing and easing helpers) where the merged version draws exactly the same pixels.
- Give the big functions (`runMain`, `markChain`, the bonus rooms) clear sub-steps where that's a pure extract-function refactor.
- Add a short header comment to each module saying what it owns.
- **Acceptance:** `check.mjs` passes. List every removed function in the PR with how you checked it was unused. No `Math.random()` call added, removed or moved between calls.

### Stage 3: wallet module tidy (no money changes)

- Split the wallet into `db.js` (REST helpers), `ui.js` (sheets, toasts, top bar), `watch.js` (live feed, mirror, highlights), `notes.js` (host gifts) and `money.js`. **`money.js` is moved verbatim**: stake charging, `credit`, `refund`, `$m`/`payCents`, the jackpot, and the `setVerdict` wrapper. Don't edit a line of it, only move it.
- **Acceptance:** `check.mjs` passes, and the diff of `money.js` against the original lines is empty apart from the move. Show that in the PR (e.g. a `diff` of the extracted lines).

### Stage 4: performance (the old Task 3)

- `draw()` redraws everything every frame. Cache what doesn't change between frames, such as wheel faces at rest, the dartboard, static room backgrounds and the farm, in offscreen canvases. Only rebuild them when `N` or the slice order (`runOrders`) changes.
- Hoist per-frame allocations (gradients, arrays, closures) out of animation loops. `shadowBlur` is slow on Android, so pre-bake glows into cached canvases where the look is identical.
- Stop the fireplace (`drawRoom`, about 15fps) and any idle animation loop while the page is hidden (`document.hidden`).
- Don't change timings players can feel (spin durations, waits, animation lengths).
- **Acceptance:** before and after frame times on a long deep run (412px, DPR 2) if you can measure them. If your container can't run a browser, say so, and Claude will measure. Give a list of every cache you added and what invalidates it.

**Status (Task 4, Stage 1):** Split the live page mechanically into `src/` modules and added the dependency-free Node bundler and checker. `node tools/bundle.mjs` rebuilt `game/index.html` byte-for-byte identical to pre-change `main` (`git diff --exit-code -- game/index.html` is clean); `node tools/check.mjs` parsed all 3 inline scripts and confirmed `version.json` `game` matches `gameVersion` 21. No behavior, version, payout, `Math.random()` call order/count, or watched globals changed. No open questions; Stage 2 has not started.

**Status (Task 4, Stage 2):** Removed the unused `buildFinal`, `pathWithLengths`, and `pathAt` functions after whole-repo identifier and string-lookup searches, including wallet `MIRROR`; removed the unused local `targets` array. Extracted deterministic final-speech and Mark-wheel-flight planning helpers, and added ownership headers to source modules. `node tools/check.mjs` passes; the bundle has the same 120 `Math.random()` callsite lines as `main`, in the same order. No prize/payout, wallet, version, or watched-global changes. The dormant `godBurst` helper remains because it contains random callsites; deleting it would violate the no-random-call-change criterion.

**Status (Task 4, Stage 3):** Consolidated the wallet into `db.js`, `ui.js`, `watch.js`, `notes.js`, and `money.js`. `node tools/check.mjs` passes; `money.js` matches the original payout, jackpot, and spin source lines exactly (SHA-256 `30bee6aa4a8a1625a2c997c02f04a0a5a35f53298891ec77e74a9aca1f77dc06`, line endings normalized). Versions unchanged; Stage 4 not started.

**Status (Task 4, Stage 4):** Added an `N`-keyed Pyramid desert canvas cache (0 pixel-channel differences at 816×816), removed per-frame wheel-nav key arrays/joins and dice/farm sort-copy allocations, and paused fireplace, idle, and door-choice draw loops while hidden. `node tools/check.mjs` and `git diff --check` pass; all 242 `Math.random()` call sites match `main`; a 30-second Edge max-depth profile at 412px/DPR 2 measured 0.143 ms average / 0.20 ms p95 on `main` and 0.146 ms / 0.30 ms here (no measurable gain beyond measurement noise). No money, watched-global, or player-timing changes.

### What Claude checks before merging each stage

- Screenshots of the main wheel, inner wheels, each room, the farm and Chicken Race, and the account sheet, before and after, at 360 and 412px.
- A seeded replay: the same `Math.random` sequence must give the same run, slices and prize before and after.
- The fast sim's payback is unchanged.

## Task 5: every replay saved, Watch tabs, host page watching (start after Task 4 Stage 4 merges)

**Goal (Cillian):** save every run as a replay, not just big wins. Players can browse their own replays and everyone else's, and Cillian's host page can watch live games and replays. No money changes.

**Build:**
1. **Save every run.** The wallet already records each run as state frames (`rec` in `watch.js`) and saves only big wins to `hlm`/`hld`. Keep that, and also save **every** non-test run: a small card at `rpm/{userKey}/{pushId}` = `{ at, stake, amt ('' if no win), title, room, len }` and the packed frames at `rpd/{pushId}`, using the existing `pack()` format. Measure a typical run's packed size and put it in the PR.
2. **Pruning.** Keep big wins forever. After saving, if a player has more than 3000 cards, delete their oldest cards and frames, using a `shallow=true` key listing at most once every 50 saves.
3. **Watch sheet tabs.** Split the WATCH sheet into **Live** (today's list of players online), **Big wins** (today's "Big wins to rewatch") and **Replays**. Replays opens on **Mine** (newest first, 20 at a time with Show more). A toggle switches to **Everyone**, with a row of player chips (the test account excluded). Each row shows the room reached or "Main wheel", the prize or "no win", and the time. Tapping one plays it with the existing `replay()` screen, generalised to read `rpd/`.
4. **Host page.** `host.html` gets **Live** and **Replays** tabs. It loads `game/index.html` from the same GitHub Pages site in a full-screen iframe with `?watch=<key>&name=<name>` or `?replay=<id>`. Add that viewer mode to the wallet boot: with those params, skip login, open the watch or replay screen directly, and on Close post a message to the parent page instead of reloading.
5. Add `rpm` and `rpd` to HANDOFF's database list.

**Done when:** runs save and play back, the tabs work at 320–412px, the host iframe works for live and replays, and pruning is shown in the PR to delete exactly the oldest entries. Bump to the next version with an update name.

---

## Task 6: the new ghost (after Task 5 merges)

Cillian wants **every** ghost in the game replaced by his new stink ghost: Ghost Phelan on the inner wheels, the God room / Zena ghost, the watch-message ghost and the Chicken Race trip. The source image will be at `assets/ghost-source.jpg`. It's a JPG with a **fake checkerboard painted into the background**, so cut it out properly: remove the checkerboard and keep the glow, the stink trails and the flies with soft alpha edges. Make a trimmed PNG/WebP sprite of ≤ 512 px (≤ 150 KB) and embed it in `game/index.html` as a data URI via the bundler, because phones load one file. Replace `drawGhost()` and `ghostImg()` so they draw the sprite at the same position, size and alpha, with a slow bob and a little wobble on the trails. Speech bubbles stay. Same timings and the same `Math.random()` calls. Check every ghost scene at 360 and 412px and put screenshots in the PR.

## Task 7: room glow-ups (after Task 6 merges)

Give every other room the same treatment the main wheels got in update 20: a light sweep while a wheel spins, a glow on the winning slice, a shaded 3D rim and a bevelled pointer. The wheels in the Stank Chamber (Stankman's wheel, the roulette), the God wheel, Phelan's wheel, Mark's wheel, the Monster tank and planet wheels, and the Pyramid. See `buildSweep`, `drawWinGlow`, `buildPointer` and `buildBase` in `src/game` for how the main wheels do it, and reuse those helpers. Visual only: no change to slices, odds, timings, prizes or `Math.random()` order. Before and after screenshots of each room in the PR.

## Task 8: sound pack and mute (after Task 7 merges)

1. **A theme tune per room**, made with the existing WebAudio music engine (`Music`, `Music.setMode`): main wheel, Stank Chamber, God room, Monster tank, Pyramid, Mark's farm (plus the Chicken Race), and Phelan's revenge. Short loops in the same style, no audio files.
2. **Sound effects** for the big moments that are silent today: room entry stings, the Chicken Race countdown, finish and ghost trip, the jackpot, trophy unlocks, and Go back up.
3. **A mute button** in the header next to Music: one tap mutes all music and effects, remembered with `pref`. The current "Music on/off" stays for music only.
Keep it light on CPU (no new per-frame audio work). No gameplay changes.

**Status:** Added synthesized themes for the main wheel, Stank Chamber, God room, Monster tank, Pyramid, Mark's farm, Chicken Race, and Phelan's revenge, plus room/major-event effects and a persisted global mute separate from the music toggle. `node tools/bundle.mjs`, `node tools/check.mjs`, `git diff --check`, a headless Chromium render, and mocked WebAudio preference/mute checks passed. Release metadata is version 23 / Build 61.

---

## When you finish a task

Add a short status line under that task in this file (done, how tested, open questions), open the PR with a clear title, and stop. Claude reviews it and Cillian merges.
