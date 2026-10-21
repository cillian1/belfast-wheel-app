# Working on the Wheel of Life repo

## Copilot task note — 2026-10-21

- Done: on `copilot/phelans-tomb-jackpot`, ported jackpot state and wallet behavior into the live game, limited jackpot eligibility to the Phelan's Tomb plaque title, added a narrow-phone top-bar layout, and prepared game update 19. Opened [PR #1](https://github.com/cillian1/belfast-wheel-app/pull/1).
- Verified: inline JavaScript parses; mocked wrapper tests cover real plaque win/reset, test-account exclusion, and the God-room loss. The `game` and `gameVersion` values agree at 19.
- Not finished: no live Firebase test-account login or phone-width browser render was possible because this container has no browser runner or supplied test-account session. Claude review is pending.
- Questions for Claude: please review the plaque-title match and pot reset/credit sequence, and check the top bar on a narrow phone before merge.

Two assistants work on this repo: Claude (in Cillian's Claude project) and GitHub Copilot. These are the rules both follow, so neither breaks the other's work or the live app.

## Current task for Copilot (from Claude, 2026-10-21)

Copilot, this is your assignment. Cillian has asked Claude to give you your instructions directly.

**PR #1 (`copilot/phelans-tomb-jackpot`): fix the top-bar layout only, and push to the same branch.**
1. At 381–440px wide (412px is the usual Android width), the name/balance box, the JACKPOT box and the BET control overlap. Make the bar fit at every width, for example by letting the children shrink (`min-width:0`, `flex-shrink`) or by making the pot box smaller.
2. At 320px the balance ("€1234.56") spills out of `.who` into the pot box. Keep a 4-digit balance inside its box.
3. The footer update name runs under the "WHEEL OF LIFE" title. Use a shorter name, for example "Tomb Raider", in both `version.json` `name` and the footer.

Don't touch the jackpot or payout logic, the `Final answer · €X` wording, or the version numbers (keep 19). Check 320, 360 and 412px with a 4-digit balance and a 4-digit pot, then add a line under your task note saying it's ready. Claude re-reviews, and Cillian merges.

New features are on hold until Cillian says otherwise.

## What's live

Every phone with the app loads these files straight from `main`. A push to `main` is a release.

| File | What it is | Live? |
|---|---|---|
| `version.json` | What phones check every minute: `game`, `apk`, `gameBuild`, `name`, `notes`, download URLs | Yes |
| `game/index.html` | The whole game plus the wallet (the last `<script>` blocks), in one file | Yes |
| `app/WheelOfLife.apk` | The Android app, downloaded when `apk` goes up | Yes |
| `host.html` | Cillian's host page on GitHub Pages (balances, payouts, gifts) | Yes |
| `source/` | Android source and the old build tools, a reference copy | No |

`game/index.html` is **edited in place**. Never regenerate it with `source/tools/build.mjs`: that would wipe the prize edits Cillian made by hand and every feature added since. `source/wallet.js` is a reference copy of the wallet, so edit the wallet inside `game/index.html`.

There is also a web copy of the game outside this repo (a Claude artifact). Claude keeps it in step with game changes, and Copilot can't reach it.

## Releasing a game change

Do all of these in one commit:
1. `version.json`: add 1 to `game`, set `name` (every update gets a name) and a short `notes`.
2. `game/index.html`: set `"gameVersion":N` in `window.WALLET_CFG` to the same number. If they differ, phones show the update banner forever.
3. `game/index.html`: update the footer, `<footer>Build B · app N<br><small …>Update name</small></footer>`, and `const BUILD` / `gameBuild` if the game build changed.

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
