# Working on the Wheel of Life repo

## NOW (the only current section, rewritten on every task start, finish and merge)

- **Task:** Task 11A repository follow-ups (#39, PR #55).
- **Owner:** Copilot implements and tests; Claude reviews and Cillian merges. Copilot does not merge. Anything that changes money, odds, prizes or payouts waits for Cillian.
- **Status:** Task templates, release-note generator, and handoff archive are ready for review; CI safeguards are in merged PR #46.
- **Next:** Cillian reviews and merges PR #55; post DONE on #39.
- **Last updated:** 2026-10-22 by Copilot
- **PR #34 stays CLOSED. Do not reopen or sync it.** It shipped in update 25 (merged by hand). Its leftovers live in #45 (shorter waits) and #49 (freezes).
- **Order:**
  1. Update 25 shipped as "Smooth Operator".
  2. **Now, in parallel:** #49 freezes between wheels/rooms (**TOP PRIORITY**), plus wave 1: #39 → PR #46 (CI) and PR #55 (repo follow-ups), #40 → PR #47 (notifications), #41 → PR #48 (offline + loading). All PRs target `update-26`, with no version bump.
  3. **Wave 2** (Claude starts it when step 2 is merged): #42 (history + buttons), #43 (ghost reactions + country song).
  4. **Wave 3, alone:** #45 (frame-rate-independent results + shorter waits; fast-sim odds check, and any odds change waits for Cillian).
  5. **Release:** a PR `update-26` → `main` bumping to 26 with a name, notes and `Closes #…` for every sub-task, then post DONE.
- **If stuck:** if a step fails twice (CI red you can't fix, a conflict you can't resolve, or anything touching money), stop. Post one note on that issue saying what's blocked and move on to the next independent step. Don't retry forever. Cillian checks in the morning.

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

## History

The Done log is archived in [docs/HANDOFF-ARCHIVE.md](docs/HANDOFF-ARCHIVE.md).
