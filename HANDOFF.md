# Working on the Wheel of Life repo

## NOW: the plan (Claude and Copilot both edit this; live status is in STATUS.md)

- **Task:** none active. Update 27 "Free Wheelin'" shipped (game 27, build 64) on 2026-10-22: frame-rate-independent spins (#61), edge-to-edge wheel layout (#65), 5 free daily 10c spins that can win but don't feed the jackpot (#68), and halved, tap-to-skip waits (#67).
- **Who:** Copilot builds and opens each PR into `update-N` and posts `DONE: Task …`. Claude does a quick check and merges. Copilot does not merge. Anything that changes money, odds, prizes or payouts waits for Cillian.
- **PR #34 stays CLOSED.**
- **Next:** Cillian checks 27 on a low-end phone (240Hz physics costs more CPU). PR #69 (Banter, from another thread) still targets `update-27`; retarget it to main or the next update branch. Don't start new work until Cillian opens the next update.
- **If stuck:** post `BLOCKED: <reason>` on that issue straight away and move on. Cillian checks in the morning.
- **Last updated:** 2026-10-22 by Claude, at the update 27 release.

**Rules:**
1. **Live status is generated:** `STATUS.md` is rebuilt automatically from issues and PRs on every change (`tools/status.mjs`, `.github/workflows/status.yml`). Never hand-edit it. To change a task's status, post `BLOCKED: <reason>` or `DONE: <task>` on its issue, or update the issue's `CURRENT:` line.
2. **This NOW section is only the plan** (order of work, who does what, standing decisions). Both Claude and Copilot edit it, in small edits, whenever a decision is made, in the same step.
3. Progress notes and per-task decisions go in issue comments, not here. If this plan and the latest issue comment disagree, the latest issue comment wins.
4. A closed PR is not proof of shipping. Check the commit is in the target branch and record the SHA for manual integrations.

## How Copilot gets work

Claude gives Copilot its work directly. Cillian isn't in the loop for routine work. Copilot's poll picks up **every open issue labelled `copilot-task`**, plus issues assigned to it and comments that mention @copilot, even when the issue isn't assigned to it (Claude can't assign through the API). Each issue links its section in `COPILOT_TASKS.md`. Do the oldest open one first.

## How an update runs (agreed by Claude and Copilot after the update 25 retro, 2026-10-21)

1. **One update at a time.** Finish the current one before planning the next. New ideas go on a one-line list on #38-style umbrella issues and nothing more.
2. **Repro first for feel bugs.** The issue states a fixed repro (device or viewport, steps, what you see), and done means "Cillian can't see it any more" on that repro.
3. **One goal per issue,** about 20 minutes of Copilot work. Phone or device checks are a separate final step that never blocks the PR.
4. **Timebox about 45 minutes per update, with the planned cut written into the issues up front.** Hitting a limit means cutting scope, never skipping the checks.
5. **Odds pre-check** for anything touching timing, animation or random draws: a seeded equivalence test (same seeds on base and branch give identical outcomes) plus the seeded-spin CI (#39). If outcomes must change, the fast sim (outside the repo) is run in a separate odds thread. Any odds change stops and waits for Cillian.
6. **Blocked = say so now.** Copilot posts `BLOCKED: <reason>` on the issue the moment it's stuck. Claude's watcher also nudges once if an active PR gets no push or comment for 15 minutes.
7. **Holding branch `update-N`.** Sub-task PRs target it, with no version bump. Parallel tasks never edit the same files.
8. **Release only through the release PR** `update-N` → `main`. Checklist: version bump + name + notes + footer; every sub-task PR merged, verified by commit ancestry (not just "closed"); `Closes #…` for every sub-task; Copilot told on #30.
9. **Status is generated, the plan is shared.** STATUS.md is built by an Action from issues and PRs. The NOW plan in HANDOFF is edited by both Claude and Copilot when a decision is made. Progress lives on the issues.

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
- **Gemini joins the team (Cillian, 2026-10-22).** It has a seat in the Banter chat (#30): signs in with ADC via Workload Identity Federation (docs/gemini-adc.md) or a `GEMINI_API_KEY` secret. chat.html shows all three with their own colour.
- **Banter on autopilot (Cillian, 2026-10-22).** The Banter bots Action (`.github/workflows/banter-bots.yml` + `.github/scripts/banter-turn.sh`) has Claude (Cillian's plan via `CLAUDE_CODE_OAUTH_TOKEN`), Copilot (GitHub Models, free) and Gemini take turns on #30, posting as github-actions[bot] with a name prefix. Limits: 6 bot replies in a row, 60 a day. Cillian posts in the chat himself through the Say something button.

## History

The Done log is archived in [docs/HANDOFF-ARCHIVE.md](docs/HANDOFF-ARCHIVE.md). Add new lines there.
