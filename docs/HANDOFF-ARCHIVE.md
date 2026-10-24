# Handoff archive

## Done log (newest first)

- 2026-10-22: Update 29 "Stacked Fowl" (game 29, Build 66) is ready for review in release PR #95. PRs #90 and #91 are merged into `update-29`; Cillian waived paired fast-sim evidence for this release only. The cancelled #89/#92 comparison has no valid result or speed claim; Watch #78/#82 remains parked and unresolved.
- 2026-10-22: Task 11A repo follow-ups (#39, PR #55) add task templates, release-note generation, parallel-file guidance, and archive the handoff log; remote branch deletion remains for Cillian.
- 2026-10-21: Task 11B (#40, PR #47) removed routine room-landing live-feed posts; big-win and other notable-event notifications remain unchanged.
- 2026-10-21: Combined Tasks 6–8 and replay reliability as update 24 “Room to Grow” (Build 61); ready for review in PR #33 to `main`.
- 2026-10-21: Task 6 new ghost merged into `update-24` in PR #21; checked all 10 scenes at 360/412px.
- 2026-10-21: Task 5 replay playback reliability and restart-safe pruning follow-up (PR #24) merged into `update-24`; version 23 / Build 60 unchanged.
- 2026-10-21: Task 7 room glow-ups (PR #20) merged into `update-24`; visual-only wheel, tank and Pyramid polish without odds, timings, prizes or `Math.random()` changes.
- 2026-10-21: Task 8 added synthesized room themes, milestone effects and a saved master mute (PR #22) for the combined update 24.
- 2026-10-21: update 25 "Smooth Operator": Task 9 smoothness (shorter waits moved to #45), Task 10 Phelan voice, wheat pointer on Mark's farm.
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
- 2026-10-21: Task 7 room glow-ups (PR #20) merged into `update-24`; visual-only wheel, tank and Pyramid polish, with version 23/build 60 unchanged.
- 2026-10-21: update 25 "Smooth Operator": Task 9 smoothness (#34, shorter waits moved to #45), Task 10 Phelan voice (#35), wheat pointer (#37).


## Plan snapshot before update 34 (2026-10-24)

Historical context only; current assignments are in HANDOFF.md and docs/update-34.md.

- **Shipped:** Update 28 "Read the Manual" (game 28, build 65) shipped on 2026-10-22. The team workflow change is merged as PR #85.
- **Update 29 release:** "Stacked Fowl" (game 29, build 66) is ready for review in open, non-draft PR #95. PR #90 (merge commit `757676e`) and PR #91 (merge commit `1895451`) are merged into `update-29`. Cillian waived paired fast-sim evidence for this release only; the cancelled comparison produced no valid result, and no payback or speed claim is made.
- **Active (Cillian unparked 14:21 Oct 22):** Fast-sim PR #92. Merge once RolexG posts a before/after timing and one paired result on the PR, CI is green, and someone other than RolexG reviews it.
- **Parked:** Watch #78 is rescheduled for the next update with a new repro (PR #82 stays parked).
- **PR #34 stays CLOSED.**
- **Update 30:** holding branch `update-30` (cut from main after the 29 release, 2026-10-22 13:55). In it so far: PR #100 (money: free spins only on a 10c bet; Cillian's pick 13:45, Gemini said merge). Queue (Cillian 14:31: #103 FIRST): #103 browser-free sim core (Copilot, top priority), then #78 Watch (stale "spinning", Mark's wheel not mirrored), then #97 Watch keyboard, with #98 sound in parallel. All PRs go into `update-30`.
- **Update 30 who-does-what (Claude's plan, Cillian asked 15:13 Oct 22):**
  - Copilot builds: #103/PR #104 (browser-free sim, wheel/room first), then #78 via #102 (delayed replay Watch), then #97 Watch keyboard.
  - RolexG builds: #98 sound (from tomorrow; it hit its 8-task cap today). #109 wallet `db.txn` fix moved to Copilot (PR #110, money, no payback change). #92 is closed for good.
  - Gemini reviews Copilot's PRs. Claude or Copilot reviews and merges RolexG's.
  - Jimini checks the rest of #108 (only real, reproducible findings become tasks) and lists what that smoke test should cover.
  - Claude does the update-30 release check and keeps this plan current.
  - Low-end phone check: Cillian won't test it (15:16). Copilot runs a Playwright smoke test with 6x CPU throttling and a mobile viewport before release, and checks frame time on the wheel and the ball run. Skip it if it blocks the release.
- **Update 31 (coordinator: Claude, Cillian's vote 20:53-20:58 Oct 22). Branch `update-31`, cut from main. All PRs go there.**
  - Copilot: #119/PR #120, URGENT money fix. Mark's farm stacked gold chicken must keep 2:1 landing odds (Austin's bug). Also #115/PR #121, fast sim parity (live tip chance, keep stacks), which is the evidence for #119. Then #98 sound.
  - Jimini: #122, design report on Austin's double-arrow and double-bonus segments. Cillian picks a version, then it gets built.
  - Gemini: reviews Copilot's PRs. #120 is a money PR: notice on Banter, payback before/after, one non-author review.
  - RolexG: picks up #98 sound if Copilot hasn't started it once RolexG's daily cap resets. Claude or Copilot merge RolexG's PRs.
  - The Gambler: #141 (independent odds check of #120), then #140 (its watcher honours the issue's base branch).
  - Rebalanced 21:57 (Cillian: assign idle bots): #98 sound merged (PR #112). RolexG: #142, run the sound test in CI. Jimini: re-check #108 findings against main; the still-real ones become the next tasks. Copilot keeps #120, #134 (double arrows), #136 (gamble or collect), #137/PR #138 (labels), all already in progress. Gemini reviews them.
  - Claude: coordinates, merges, release check.
- **Update 32 release:** "The Watchful Gambler" (game 32, build 69) is ready for release check.
- **Shipped: Update 33 “Picture This” (game 33, build 70), 2026-10-24 at 10:36 Europe/Dublin.** Release PR #268 was independently reviewed and merged by Gemini with green CI (merge `16bc150`). APK remains version 3.
  - Jimini completed the #258 diagnosis and task split. RolexG delivered Show me #261 and layout/feed polling #265; #265 landed early on main and was preserved in integration #266.
  - Copilot delivered room pause/resume and the stationary photo-background cache in #264. The Gambler independently reviewed/merged #261 and #264, coordinated integration #266, and prepared release metadata #267 and release #268. Gemini independently merged The Gambler's PRs.
  - Combined checks passed: unchanged payback 117.2% → 117.2%, frame RNG and 50 full browser/core paths, seeded spins at 10/30/60/120fps, Show me at 320/390/440px with mocked wallet/no extra charge, and room pause/cache resize at 6× CPU throttle. Physical-phone/camera behavior was not checked; no live wallet operations were performed.
  - Renauw needs no duplicate #263 implementation; that issue is completed by #265. Stankman has no update-33 assignment in this scope.
- **Next:** no further update-33 implementation remains. Do not restart #258/#259/#262/#263; check current issue/PR evidence before picking older queued work. New release scope requires a new explicit task.
- **Last updated:** 2026-10-24 by The Gambler after the update-33 release.
