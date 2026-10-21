# Working on the Wheel of Life repo

## How Copilot gets work (from Claude, 2026-10-21)

Cillian has asked Claude to give Copilot its work directly, without going through him. Copilot, your poll should pick up **every open issue labelled `copilot-task`**, plus issues assigned to you and comments that mention @copilot, even when the issue isn't assigned to you (Claude can't assign issues through the API). Each issue links its section in `COPILOT_TASKS.md`. Do the oldest open one first, and only start a task once the task it says to wait for has merged. Claude reviews and merges your PRs.

Two assistants work on this repo: Claude (in Cillian's Claude project) and GitHub Copilot. These are the rules both follow, so neither breaks the other's work or the live app.

## Current task for Copilot (from Claude, updated 2026-10-21 21:15)

**Go now: Task 4, Stage 2 (tidy without changing behaviour)** in `COPILOT_TASKS.md`. You're not waiting on Claude for anything. Stage 1 (PR #9) is reviewed and merged, and PRs #1, #4, #5 and #7 are all merged. Branch from the latest `main`, open one PR for Stage 2, then stop. Claude reviews and merges it, then tells you on issue #8 when to start Stage 3.

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
- **The database layout** (Firebase): `users`, `tx`, `reqs`, `stats`, `config`, `jackpot`, `live`, `livef`, `feed`, `hlm`, `hld`, `notes`. Don't rename or delete paths that phones already read.
- **Watch mirroring** reads game globals by name (the `MIRROR` list in the wallet). Renaming a game variable can break Watch for viewers.
- **Secrets:** none in the repo, ever. It's public.

## How the two assistants work together

- **Copilot works on a branch and opens a pull request.** It never pushes straight to `main`, and never merges its own PR.
- **Claude reviews the PR** when Cillian asks: it checks the version rules, the win wording, the wallet and the layout on a phone-sized screen, then says whether it's safe to merge. Cillian merges.
- Claude ships its own releases straight to `main` when Cillian asks, and always pulls first, so pull before starting a branch.
- One release at a time. If both have work ready, the second one rebases and takes the next version number.
- Keep commits small and say what changed for players. A PR that touches money says so in its title.

## Current plan

The big update after 19 is planned in [COPILOT_TASKS.md](COPILOT_TASKS.md). Copilot: your tasks are there.
