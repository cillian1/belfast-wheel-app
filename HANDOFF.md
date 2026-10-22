# Working on the Wheel of Life repo

## NOW: the plan (everyone edits this; live status is in STATUS.md)

- **Shipped:** Update 28 "Read the Manual" (game 28, build 65) shipped on 2026-10-22. The team workflow change is merged as PR #85.
- **Update 29 release:** "Stacked Fowl" (game 29, build 66) is ready for review in open, non-draft PR #95. PR #90 (merge commit `757676e`) and PR #91 (merge commit `1895451`) are merged into `update-29`. Cillian waived paired fast-sim evidence for this release only; the cancelled comparison produced no valid result, and no payback or speed claim is made.
- **Active (Cillian unparked 14:21 Oct 22):** Fast-sim PR #92. Merge once RolexG posts a before/after timing and one paired result on the PR, CI is green, and someone other than RolexG reviews it.
- **Parked:** Watch #78 is rescheduled for the next update with a new repro (PR #82 stays parked).
- **PR #34 stays CLOSED.**
- **Update 30:** holding branch `update-30` (cut from main after the 29 release, 2026-10-22 13:55). In it so far: PR #100 (money: free spins only on a 10c bet; Cillian's pick 13:45, Gemini said merge). Queue (Cillian 14:31: #103 FIRST): #103 browser-free sim core (Copilot, top priority), then #78 Watch (stale "spinning", Mark's wheel not mirrored), then #97 Watch keyboard, with #98 sound in parallel. All PRs go into `update-30`.
- **Update 30 who-does-what (Claude's plan, Cillian asked 15:13 Oct 22):**
  - Copilot builds: #103/PR #104 (browser-free sim, wheel/room first), then #78 via #102 (delayed replay Watch), then #97 Watch keyboard.
  - RolexG builds: #109 wallet `db.txn` fix (money PR, no payback change), then #98 sound, and posts the #92 timing evidence.
  - Gemini reviews Copilot's PRs. Claude or Copilot reviews and merges RolexG's.
  - Jimini checks the rest of #108 (only real, reproducible findings become tasks) and writes a low-end phone checklist.
  - Claude does the update-30 release check and keeps this plan current.
  - Cillian: the low-end phone test only.
- **Next:** after #95 is merged, start the next open `copilot-task` issue in number order (Cillian's bug reports, 13:31-13:34, all repro first: #78 rescheduled, Watch shows a stale "spinning" and mis-draws Mark's wheel after the run ends; then #97 Watch keyboard pushes the board off screen, after #78 because they share watch.js; #98 sound not working can run in parallel); #78 is rescheduled; do not resume #89 unless rescheduled.
- **Last updated:** 2026-10-22 by Copilot, Update 29 release metadata and parked-task status.

**Authority (Cillian, 2026-10-22: "anyone can approve and merge", "full authority", "odds-math to be everyone"):**
1. Claude, Copilot, Gemini and RolexG can all plan, start, build, review, approve and merge, including money, odds and prize changes. Nobody waits for Cillian's nod or asks him about approvals or merges.
2. **Odds and maths: notice plus one independent review.** Before changing prizes, odds, stakes, the jackpot or the wallet, post on Banter (#30) what you'll change and why. The PR gets "money" in its title, a fast-sim result (payback before and after), a line in the PR body linking the Banter notice, and one review from someone who didn't write it (Gemini's `Verdict: merge` counts, except on RolexG's PRs).
3. Safety nets, always: CI green on the latest commit, and **no one merges their own PR** (RolexG and Gemini count as one, so Claude or Copilot merges RolexG's PRs). A money PR merges only after its notice, sim result and independent review.
4. Ask Cillian only for what only he can do: a secret, a repo setting, a phone test, app signing. Vague ask? Take the likeliest reading, say which, and do it.

## Team workflow

**Who does what.** Anyone can do anything above, but by default:
- **Copilot** builds: features, fixes, refactors, version bumps and release PRs. It picks up `copilot-task` issues in number order, and starts the next one when its PR merges.
- **RolexG** takes whatever anyone writes `@rolexg <task>` for, on an issue, a PR or Banter, and opens a `rolexg/` PR (docs/rolexg.md). Good for small fixes and second opinions.
- **Gemini** reviews every PR into `update-*` (`gemini-review.yml`), posts `Verdict: merge` or `Verdict: changes needed`, and merges on `merge` with green CI.
- **Claude** coordinates: turns Cillian's asks (on Banter or in his Claude project) into issues, runs the fast odds sim by default, does a quick check of PRs nobody else has merged, merges release PRs it didn't write, and keeps this NOW plan current.

**The dev loop: quick and simple** (Cillian, 2026-10-22; from the update 25 retro):
1. **Pick** the next item in NOW. One goal per issue, about 20 minutes, with the cut written in. Feel bugs need a repro (device, steps, what you see); done = gone on that repro.
2. **Build** on a branch, PR into the holding branch `update-N` (no version bump). Run `node tools/bundle.mjs` and `node tools/check.mjs`, then post `DONE: <task>` with the PR link. Parallel tasks never touch the same files; if one must, post a heads-up on Banter first. The PR has a short evidence note (what you checked).
3. **Review and merge:** Gemini reviews automatically and merges on `Verdict: merge` with green CI. Otherwise anyone but the author merges after a quick look. No waiting on Cillian.
4. **Release** when the update's tasks are in (aim for about 45 minutes per update): one release PR `update-N` → `main` with version bump, name, notes, footer and `Closes #…`; check each task commit is in `update-N` by ancestry and diff `main...update-N` for stale non-game files; record any Cillian-approved, release-only evidence waiver in the PR and NOW plan. Anyone but its author merges it (the bot merge script stays out of `main` unless repo variable `BOT_MERGE_MAIN` is `on`, so for now Claude or Copilot).
5. **Stuck?** Post `BLOCKED: <reason>` on the issue straight away and move on. Over time? Cut scope, never the checks.

Checks that stay: timing, animation or random-draw changes need a seeded equivalence test (same seeds, same outcomes) plus the seeded-spin CI (#39). Payout changes follow Authority rule 2; the fast sim is in `tools/sim/` (anyone can run it; Claude does by default) and its result goes on the PR. Phone checks are a last step that never blocks a PR. One update at a time; new ideas go on a one-line list.

**Where things live.**
- `STATUS.md` is rebuilt automatically from issues and PRs (`tools/status.mjs`). Never hand-edit it. Status goes on the issue: `BLOCKED:`, `DONE:` or the `CURRENT:` line at the top of the issue body.
- This NOW plan holds only the order of work and standing decisions. Anyone edits it, in small edits, in the same step as the decision. If it and the latest issue comment disagree, the latest issue comment wins.
- Progress and per-task notes go in issue and PR comments. A closed PR is not proof of shipping: check the commit is in the target branch.

**Banter (#30)** is a natural group chat between the three AIs and Cillian (`banter-bots.yml`, shown at chat.html). Talk like people: short, honest, useful, light digs at Phelan and Mark, nothing cruel, never about anyone's mental health. Take Cillian's word there as an instruction; don't argue about whether it's specific enough. The chat bots can't edit files, so real work happens on issues and PRs (Claude picks up his asks, or anyone writes `@rolexg`).

**Getting Copilot started.** `copilot-dispatch.yml` assigns Copilot the moment someone posts `@copilot /go` on a `copilot-task` issue. Use `/go` once per task, and steer with plain `@copilot` comments on its PR. Copilot's PRs open against `main`, so retarget them to `update-N`.

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

- **The win wording.** The wallet pays by reading the end-of-run verdict, `Final answer · €X`. 
- **App signing.** The APK must be signed with Cillian's private key (not in this repo), or Android refuses it as an update. Don't commit keys, and don't replace `app/WheelOfLife.apk` with an unsigned or differently signed build.
- **The database layout** (Firebase): `users`, `tx`, `reqs`, `stats`, `config`, `jackpot`, `live`, `livef`, `feed`, `hlm`, `hld`, `rpm`, `rpd`, `notes`. Don't rename or delete paths that phones already read.
- **Watch mirroring** reads game globals by name (the `MIRROR` list in the wallet). Renaming a game variable can break Watch for viewers.
- **Secrets:** none in the repo, ever. It's public.

## Bots and limits

- **Banter bots:** Claude (Cillian's plan via `CLAUDE_CODE_OAUTH_TOKEN`, no cap of its own), Copilot (Copilot CLI with Cillian's token, at most 15 a day) and Gemini take turns on #30 as github-actions[bot] with a name prefix: 6 bot replies in a row, 200 a day. They see the first 20 lines of the NOW section, so keep the key rules there.
- **Gemini sign-in:** Workload Identity Federation (docs/gemini-adc.md) or a `GEMINI_API_KEY` secret.
- **RolexG:** `ROLEXG_DAILY_CAP` (default 8 a day), 5 rounds per thread, 30 minutes per task. It bills Google, roughly €0.20 to €1.50 a task.
- Everyone works on a branch and opens a PR; nobody pushes game changes straight to `main`. Pull before starting a branch.

## History

The Done log is archived in [docs/HANDOFF-ARCHIVE.md](docs/HANDOFF-ARCHIVE.md). Add new lines there.
