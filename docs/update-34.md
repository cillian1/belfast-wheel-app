# Update 34 scope and assignments

Released in PR #285 as “Little Things”, game 34/build 71. The three feature tasks are complete; Jimini final source review and all combined checks passed. This page preserves the agreed scope and ownership.

Cillian requested a small improvements/light-features release on 2026-10-24. The Gambler coordinates. The discussion is [#270](https://github.com/cillian1/belfast-wheel-app/issues/270); Jimini's source-based review is [#271](https://github.com/cillian1/belfast-wheel-app/pull/271), with Gemini's narrow-screen review notes. Other proposals and status belong on the issues, not in generated chat alone.

Claude is unavailable due to usage limits. No assignment, review, merge, release or fallback depends on Claude. The workflow prerequisite pauses his automatic chat seat; explicitly set the non-secret repository variable `BANTER_CLAUDE_ENABLED=on` only when he is available again. Leaving it unset keeps him paused, including explicit speaker requests. His credentials and normal daily cap remain intact.

## Selected scope

| Priority | Issue | Owner | Deliverable | Files and sequencing |
| --- | --- | --- | --- | --- |
| 0 | [#275](https://github.com/cillian1/belfast-wheel-app/issues/275) | The Gambler | Current context, durable scope and reversible Claude-chat pause | HANDOFF, archive, this plan, Banter workflow/script/tests; main-only prerequisite |
| 1 | [#272](https://github.com/cillian1/belfast-wheel-app/issues/272) | Renauw | Help explicitly says the existing five free daily spins apply to 10c bets | src/index.html and generated game/index.html |
| 1 | [#274](https://github.com/cillian1/belfast-wheel-app/issues/274) | Copilot | Jump to latest and a new-message indication while reading older Banter | chat.html and a focused browser test; can run alongside #272 |
| 2 | [#273](https://github.com/cillian1/belfast-wheel-app/issues/273) | RolexG | Clean up photo object URLs; choose a different library photo from retake controls | src/game/show-me.js, src/index.html, generated bundle, narrow wrapping adjustment only if needed; starts after #272 merges |

The issues contain the complete done-when and cut lines. Exactly one worker owns each task. Stankman has no critical-path assignment while availability is unconfirmed; do not start a duplicate local watcher. If a dispatched bot is capped/unavailable, record it and The Gambler reassigns the existing issue rather than filing a duplicate.

## Why these changes

- The help promises five free spins but omits the 10c condition already enforced in src/wallet/money.js and already explained by the free-spin counter. This is wording, not a new free-spin rule.
- onFile creates object URLs without revoking them. The photo scene exposes camera Retake and Back but no direct library-retake option. This is an unfinished follow-up identified during update 33, not another Show me implementation.
- chat.html already preserves reading position and scrolls automatically near the bottom, but lacks a quick return to the newest message while reading history. The feature must preserve that behavior.
- Banter receives only the first 20 lines of NOW. Historical plans at the top made bots discuss old updates as if current. The current scope now comes first; historical text is preserved in the archive.

## Reviews, evidence and release

Feature branches and PRs target `update-34`, created from main after update 33. Workflow-only changes target main. Source ownership is separate; #273 waits for #272 because both edit the shell/bundle. Regenerate bundles after integration instead of hand-merging generated HTML. Keep all version bumps out of feature PRs.

Gemini reviews PRs. The Gambler can independently merge other authors' PRs after green CI; Gemini independently reviews/merges The Gambler's PRs. Never self-merge. Jimini independently checks the final phone-width usability once the feature PRs are ready; his source-based planning report is already complete. Final review is not dispatched against an empty branch.

Required acceptance: help is truthful and opens/closes accessibly; photo selection cleans up success/error URLs, allows the same file again, preserves cancellation/current photo and current no-extra-charge picture-spin behavior; Banter does not move a history reader on refresh, flags new messages, clears on returning to the bottom, and supports keyboard activation without overlapping the existing Say something link. Check 320/390/440px and reduced motion. Mock network/wallet data; do not operate live accounts.

Run the repository bundle/quick check and relevant focused tests. Animation/random-draw changes require seeded equivalence and seeded-spin CI. Expected money/odds impact is zero; do not change stakes, prizes, wallet credit/charge logic, jackpot, RNG or daily free-spin rules. If such a change becomes necessary, stop that item for explicit scope review and use the existing money notice/evidence/independent-review process.

Each task has about a 20-minute cut, with the standing three-round/30-minute escalation rule. A simple New messages label is sufficient; exact unread counts and animation are optional. Defer photo editing/cropping, streak counters, hub/result overlays, feed/backend rewrites, speculative financial fixes and old backlog resurrection.

After the three feature issues are integrated and accepted, The Gambler synchronizes main, checks ancestry/scope, prepares one matching game/build/config/footer/bundle version update and opens the update-34 → main release. Gemini performs the independent review/merge with green CI. Publishing this plan or dispatching tasks is not a claim that update 34 is released.
