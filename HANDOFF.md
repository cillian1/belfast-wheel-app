# Working on the Wheel of Life repo

## NOW (the only current section, rewritten on every task start, finish and merge)

- **Task:** Update 25 (Task 9 smoothness PR #34 + Task 10 Phelan voice PR #35, into `update-25`), then update 26 (Task 11, sub-tasks #39–#43).
- **Owner:** Copilot builds overnight while Cillian sleeps. Copilot opens each PR and posts `DONE: Task …`, and **Claude does a quick check and merges**, then starts the next wave. Copilot does not merge. Anything that changes money, odds, prizes or payouts waits for Cillian.
- **Status / order (in sequence):**
  1. Finish #34 and post DONE (Claude merges #34 and #35 into `update-25`). Then open the release PR `update-25` → `main` (bump to 25, name it) and post DONE.
  2. Create branch `update-26` from main. **Wave 1 in parallel:** #39 (CI, goes first), #40, #41. Claude labels and starts them. Each gets a PR into `update-26`, no version bump.
  3. When #39, #40 and #41 are all merged into `update-26`, Claude starts **wave 2:** #42 and #43.
  4. When wave 2 is merged, Claude starts **wave 3:** #45 (frame-rate-independent RNG + shorter waits; odds check, any odds change waits for Cillian).
  5. When wave 3 is merged, open the release PR `update-26` → `main` (bump to 26, name it) and post DONE.
- **If stuck:** if a step fails twice (CI red you can't fix, a conflict you can't resolve, or anything touching money), stop. Post one note on that issue saying what's blocked and move on to the next independent step. Don't retry forever. Cillian checks in the morning.
- **Last updated:** 2026-10-21 23:00 by Claude

**Rules for this section:**
1. Only NOW is current. Everything below it is reference (rules, layout) or history (Done log). Never act on a status line anywhere else in this file.
2. Whoever starts, finishes or merges a task rewrites NOW in the same commit or PR (Claude does it on every merge), and moves a one-line summary of the finished task to the Done log.
3. If NOW and the latest comment on the task's issue disagree, **the latest issue comment wins**.
4. When Copilot finishes, it opens the PR (ready for review) and posts `DONE: <task>` with the PR link on the task's issue. Claude watches for it.
5. Don't add task notes, questions or statuses anywhere else in this file. Questions go on the issue or the PR.

## How Copilot gets work

Claude gives Copilot its work directly. Cillian isn't in the loop for routine work. Copilot's poll picks up **every open issue labelled `copilot-task`**, plus issues assigned to it and comments that mention @copilot, even when the issue isn't assigned to it (Claude can't assign through the API). Each issue links its section in `COPILOT_TASKS.md`. Do the oldest open one first.

## How an update is planned (Claude, 2026-10-21)

1. **Plan:** Cillian picks the items. Claude writes them as one numbered task in `COPILOT_TASKS.md` with an on-hold issue (no `copilot-task` label yet).
2. **Split:** Claude splits the update into sub-task issues (Goal, Files likely touched, Done when, Don't touch), grouped so **no two parallel sub-tasks edit the same files**. Repo/CI work goes in wave 1. Anything touching shared game files (`motion.js`, `ui.js`, ghost code) is spread across waves.
3. **Branch:** Claude creates the holding branch `update-N` from main when the previous update ships, then labels the wave-1 issues `copilot-task` and posts `@copilot /go`.
4. **Build:** each sub-task gets its own PR into `update-N`, with no version bump. Before DONE, merge latest `update-N`, rebuild, run the checks, and post `DONE: Task …`.
5. **Merge:** each PR is merged into `update-N` after a quick check. When a wave is all in, the next wave starts.
6. **Release:** Copilot opens one PR `update-N` → `main` with the version bump, name, notes and footer, and posts DONE. It's merged and phones get it.
7. **Talk:** progress notes and questions go on the sub-task issue. Chat goes on #30.

## What's live

Every phone with the app loads these files straight from `main`. A push to `main` is a release.

| File | What it is | Live? |
|---|---|---|
| `version.json` | What phones check every minute: `game`, `apk`, `gameBuild`, `name`, `notes`, download URLs | Yes |
| `src/` | Source of truth for the game and wallet modules | Build source |
| `game/index.html` | The bundled game and wallet page generated from `src/` | Yes |
| `app/WheelOfLife.apk` | The Android app, downloaded when `apk` goes up | Yes |
| `host.html` | Cillian's host page on GitHub Pages (balances, payouts, gifts) | Yes |
| `source/` | Android source and the old build tools, a reference copy | No |

`src/` is the source of truth for the game and wallet. Edit its modules, then run `node tools/bundle.mjs` and commit the generated `game/index.html`. Never regenerate it with `source/tools/build.mjs`: that would wipe the prize edits Cillian made by hand and every feature added since. `source/wallet.js` is an old reference copy, not the wallet source.

There is also a web copy of the game outside this repo (a Claude artifact). Claude keeps it in step with game changes, and Copilot can't reach it.

## Releasing a game change

Do all of these in one commit:
1. `version.json`: add 1 to `game`, set `name` (every update gets a name) and a short `notes`.
2. `src/config.json`: set `"gameVersion":N` in `window.WALLET_CFG` to the same number. If they differ, phones show the update banner forever.
3. `src/index.html`: update the footer, `<footer>Build B · app N<br><small …>Update name</small></footer>`, and `src/game/core.js` `const BUILD` / `version.json` `gameBuild` if the game build changed. Then run `node tools/bundle.mjs` and commit the generated `game/index.html`.

Phones only take an update between runs. GitHub's raw files can take about 5 minutes to refresh.

## Things that must not change by accident

- **The win wording.** The wallet pays by reading the end-of-run verdict, `Final answer · €X`. Changing that text, or showing it twice in one run, changes what gets paid. Any change to prizes, payout maths (`ev`, `edge`, `$m`), stakes, the jackpot or the wallet's credit and charge code is a real-money change. Cillian has to approve it explicitly, and it should say so in the PR title.
- **App signing.** The APK must be signed with Cillian's private key (not in this repo), or Android refuses it as an update. Don't commit keys, and don't replace `app/WheelOfLife.apk` with an unsigned or differently signed build.
- **The database layout** (Firebase): `users`, `tx`, `reqs`, `stats`, `config`, `jackpot`, `live`, `livef`, `feed`, `hlm`, `hld`, `rpm`, `rpd`, `notes`. Don't rename or delete paths that phones already read.
- **Watch mirroring** reads game globals by name (the `MIRROR` list in the wallet). Renaming a game variable can break Watch for viewers.
- **Secrets:** none in the repo, ever. It's public.

## How the two assistants work together

**Roles (Cillian, 2026-10-21): Copilot does the heavy lifting, Claude coordinates.** Copilot builds the features, fixes and refactors. Claude writes the tasks (COPILOT_TASKS.md plus a `copilot-task` issue), does a quick final check of each PR (Copilot reviews and tests its own work first) and merges it, and keeps NOW current. Claude only codes small fixes it finds in review. Money, odds and prize changes still need Cillian.

- **Copilot works on a branch and opens a pull request.** It never pushes straight to `main` and never merges its own PR.
- **Claude reviews and merges** Copilot's PRs: version rules, the win wording, the wallet, a seeded replay, and the layout on phone-sized screens. **PRs that touch money, odds or prizes are merged by Cillian only.**
- Claude ships its own work to `main` and always pulls first, so pull before starting a branch.
- One release at a time. If both have work ready, the second one merges `main` in and takes the next version number.
- Keep commits small and say what changed for players. A PR that touches money says so in its title.

## Done log (history only, newest first; nothing here is current)

- 2026-10-21: Combined Tasks 6–8 and replay reliability as update 24 “Room to Grow” (Build 61); ready for review in PR #33 to `main`.
- 2026-10-21: Task 6 new ghost merged into `update-24` in PR #21; checked all 10 scenes at 360/412px.
- 2026-10-21: Task 5 replay playback reliability and restart-safe pruning follow-up (PR #24) merged into `update-24`; version 23 / Build 60 unchanged.
- 2026-10-21: Task 7 room glow-ups (PR #20) merged into `update-24`; visual-only wheel, tank and Pyramid polish, with version 23/build 60 unchanged.
- 2026-10-21: Task 8 added synthesized room themes, milestone effects and a saved master mute (PR #22) for the combined update 24.
- 2026-10-21: Task 5 replays + Watch tabs + host watching (PR #16), merged as update 23.
- 2026-10-21: Task 5 replay saving, pruning, player/host watching and legacy request fixes are ready for review in PR #16 as update 23 "Replay Night".
- 2026-10-21: Task 4 Stage 4, performance (PR #14), merged as update 22 "Smoother Wheels". Task 4 is complete.
- 2026-10-21: Task 4 Stage 4 performance pass (PR #14), with a size-keyed Pyramid cache, allocation reductions, and hidden-tab animation pausing.
- 2026-10-21: Task 4 Stage 3, the wallet split into db/ui/money/watch/notes (PR #11), merged. Wallet lines unchanged, and an end-to-end charge and payout passed.
- 2026-10-21: Task 4 Stage 3, split the wallet into five modules; verified `money.js` is an exact extraction and the checker passes.
- 2026-10-21: Task 4 Stage 2, the behaviour-preserving tidy (PR #10), merged. Same 242 `Math.random()` call sites, bundle consistent.
- 2026-10-21: Task 4 Stage 1, the split into `src/` with `tools/bundle.mjs` (PR #9), merged, byte-identical.
- 2026-10-21: update 21 "Trophy Hunt", Task 2 trophies (PR #7), merged.
- 2026-10-21: update 20 "Fowl Play", the Chicken Race and wheel graphics (PR #5), and the Task 1 stats redesign (PR #4), merged.
- 2026-10-21: update 19 "Tomb Raider", the jackpot only on the Phelan's Tomb plaque (PR #1), merged.
