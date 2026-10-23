# Working on the Wheel of Life repo

## NOW: the plan (everyone edits this; live status is in STATUS.md)

- **Update 32 (current):** holding branch `update-32`. The Deeper zoom is merged as PR #243 (`0c8e29f`). Remaining open Update 32 PRs are #219, #201 and #152; #244 has merged. Cillian confirmed on Banter #30 that the four PRs open at the time should ship in Update 32. Do not start the release while those remaining PRs are open.
- **Mobile smoke result for PR #243:** Ran `node tools/test-zoom-throttle.mjs origin/main` and `node tools/test-zoom-throttle.mjs HEAD` using headless Chromium, mobile emulation at 360x800 / DPR 3, and 6x CPU throttling. The shared wheel phase measured 19.3 fps average / 50 ms p95 on main and 18.8 fps / 50 ms p95 on Update 32. The ball run measured 52 fps / 33.4 ms p95 on main and 52.1 fps / 33.4 ms p95 on Update 32. Update 32's added zoom measured 17.2 fps average, 50 ms median, 66.7 ms p95, and 100.1 ms maximum frame interval. Common phases show no clear regression. The wheel window spans multiple animations and pauses between them, so its multi-second maximum interval is not a continuous animation frame time. These are emulated-browser results, not a physical-phone test; no absolute fps cutoff was agreed.
- **Zoom regression:** `node tools/test-deeper-zoom.mjs` passed on the final rerun; two earlier attempts failed at ball-run landing/completion assertions.
- **Release:** the smoke test is evidence only, not release approval. Keep the game version unchanged on `update-32`; Claude can run the release check once the remaining Update 32 work is merged.
- **Last updated:** 2026-10-23 by Copilot after the paired throttled mobile smoke test for PR #243.

**Authority (Cillian, 2026-10-22: "anyone can approve and merge", "full authority", "odds-math to be everyone"):**
1. Claude, Copilot, Gemini and RolexG can all plan, start, build, review, approve and merge, including money, odds and prize changes. Nobody waits for Cillian's nod or asks him about approvals or merges.
2. **Odds and maths: notice plus one independent review.** Before changing prizes, odds, stakes, the jackpot or the wallet, post on Banter (#30) what you'll change and why. The PR gets "money" in its title, the `payback` line from `node tools/check.mjs --quick` (which compares against `main`) in its summary, a line in the PR body linking the Banter notice, and one review from someone who didn't write it (Gemini's `Verdict: merge` counts, except on RolexG's PRs).
3. **"Is this necessary?" rule.** If a task has taken more than about 30 minutes, 3 runs or 3 push rounds, stop. Post one line on the issue saying what's left and whether it's worth it, and either ship the simple version or ping the coordinator. Cut scope rather than polish.
4. Safety nets, always: CI green on the latest commit, and **no one merges their own PR** (RolexG and Gemini count as one, so Claude or Copilot merges RolexG's PRs). A money PR merges only after its notice, sim result and independent review.
5. Ask Cillian only for what only he can do: a secret, a repo setting, a phone test, app signing. Vague ask? Take the likeliest reading, say which, and do it.

## Team workflow

**Who does what.** Anyone can do anything above, but by default:
- **Copilot** builds: features, fixes, refactors, version bumps and release PRs. It picks up `copilot-task` issues in number order, and starts the next one when its PR merges.
- **RolexG** takes whatever anyone writes `@rolexg <task>` for, on an issue, a PR or Banter, and opens a `rolexg/` PR (docs/rolexg.md). Good for small fixes and second opinions.
- **The Gambler** and **The Stankman** run in separate local Codex checkouts. Gambler is unlimited and serial; Stankman has a four-task UTC daily cap and the big game/dev lane. His D: setup is in tools/stankman/README.md.
- **Renauw** is the Copilot custom helper agent for small tasks, fixes, docs and tests; route work with `.github/scripts/ping.sh renauw <issue> "<task>"`.
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

At every finish, block or wait, ping the exact next owner through `.github/scripts/ping.sh` so the handoff happens immediately; see [docs/pings.md](docs/pings.md).

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

## Task sizes and claiming

| Task | Can claim |
| --- | --- |
| `size:big` game/dev | Copilot, The Gambler, The Stankman |
| `size:small` game/dev | RolexG, Renauw first; Copilot/Gambler after 30 minutes |
| `lane:workflow` | The Gambler, Copilot |
| `lane:report` | Jimini |
| Reviews and merges | Gemini |

When you finish, run/expect claim-next; only claim your lane. See docs/task-claiming.md for sizes, lanes and caps. Phase one is read-only: use tools/claim-next.sh with --dry-run; live claiming and the DONE hook are a follow-up under issue #187's cut line. Game tasks target update-N; non-game tasks target main. Before an update starts, its planner labels every ready issue with one size, its lane and unassigned.
