# Update 25 "Smooth Operator": retrospective

Full report: https://claude.ai/artifact/V4LidbHqE5BT6qPLziAdy6 (times UTC, 21 Oct 2026)

## Summary
Shipped in 52 min (go 22:32, live 23:24): Auto/High/Low quality, low-end mode, instant tap feedback, Phelan's voice (#35), wheat pointer (#37). Shorter/skippable waits were dropped (they tied spin results to frame rate) and moved to #45. It did **not** fix what Cillian meant by "sluggish": the main-wheel freeze when switching to the next wheel. That is #49, top priority in update 26.

## Numbers
- Task 10 (voice): 15 min to DONE, then 25 min waiting to be merged.
- Task 9 (smoothness, #34): 51 min to DONE; no new code pushed 22:35 to 23:13.
- PRs: #35 and #37 merged; #34 closed and merged by hand; 0 release PRs (released by direct commits).
- 4 nudges/corrections to Copilot on #34; ~26 requests to the coordinating thread in the hour, about half planning update 26.
- HANDOFF.md edited 25 times across branches in about an hour; it was the only merge-conflict file.

## Did the plan target the right problem?
No. "Sluggish" was turned into a generic speed checklist. Per-scene draw loops showed the main wheel at ~1.7 ms/frame (healthy), but the freeze is a one-off pause at the wheel switch, which no measurement covered.

## Root causes
1. The slow moment was never pinned down with Cillian.
2. Task 9 was six steps, and its done-when (throttled phone numbers) was out of Copilot's reach, so it waited instead of finishing.
3. The odds risk (fireplace draws global `Math.random()` every frame) was found 40 min in, not at planning.
4. Nobody watched the stalled PR; it was noticed only when Cillian asked.
5. The rushed hand-release skipped the release checklist (HANDOFF not rewritten, #34 closed unmerged, Copilot kept working on it).
6. HANDOFF.md used as a live board edited by everyone on every branch.
7. Kick-off delayed ~22 min by Claude's usage limit.

## Process changes (proposed)
1. **Repro first:** for anything about feel, get the exact moment (or a recording) from Cillian; done-when = "you can't see X any more".
2. **One goal per task, finishable by Copilot** in ~20 min in its sandbox. Real-phone checks are a separate final "Cillian checks on phone" step, never a blocker.
3. **Odds pre-check:** before timing/animation work, ask "can this change which random numbers spins get?". CI (#39) fails if a seeded spin changes.
4. **Stall alarm:** a task PR with no push for 10 min gets checked and unblocked or cut.
5. **Finish before planning:** ideas during an update go to a one-line list; full planning of the next update happens after release.
6. **Timebox:** ~45 min per update; at the limit, ship what works and move the rest, as a planned step.
7. **Always release via the release PR** with the checklist: version bump, HANDOFF NOW rewritten, task PRs merged (not closed), issues closed, Copilot told.
8. **HANDOFF NOW stays small, one editor:** only the coordinator edits it, only on main; task progress lives on each issue.
9. **If blocked, say BLOCKED with the reason** on the issue right away (Copilot), instead of waiting.

## Loose ends
- #49 main-wheel freeze (PR #50 open), #45 shorter waits after frame-rate-independent results.
- COPILOT_TASKS.md Task 9 status still says draft; should say shipped in 25.
