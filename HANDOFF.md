# Working on the Wheel of Life repo

## NOW (the only current section, rewritten on every task start, finish and merge)

- **Task:** Task 5 follow-up: persist replay-pruning cadence across restarts (Issue #12), alongside Tasks 6–8 in parallel (issues #17, #18, #19).
- **Owner:** Copilot builds; Cillian verifies and merges. Claude has stepped back.
- **Status:** Task 5 shipped as update 23 in PR #16. The persistence fix and restart/pruning regression test are in progress; Tasks 6–8 remain parallel work.
- **Next:** Validate and open a ready-for-review follow-up PR; Cillian verifies and merges it, with auto-merge off until then.
- **Last updated:** 2026-10-21 22:08 by Copilot

**Rules for this section:**
1. Only NOW is current. Everything below it is reference (rules, layout) or history (Done log). Never act on a status line anywhere else in this file.
2. Whoever starts, finishes or merges a task rewrites NOW in the same commit or PR (Claude does it on every merge), and moves a one-line summary of the finished task to the Done log.
3. If NOW and the latest comment on the task's issue disagree, **the latest issue comment wins**.
4. When Copilot finishes, it opens the PR (ready for review) and posts `DONE: <task>` with the PR link on the task's issue. Claude watches for it.
5. Don't add task notes, questions or statuses anywhere else in this file. Questions go on the issue or the PR.

## How Copilot gets work

Claude gives Copilot its work directly. Cillian isn't in the loop for routine work. Copilot's poll picks up **every open issue labelled `copilot-task`**, plus issues assigned to it and comments that mention @copilot, even when the issue isn't assigned to it (Claude can't assign through the API). Each issue links its section in `COPILOT_TASKS.md`. Do the oldest open one first.

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
