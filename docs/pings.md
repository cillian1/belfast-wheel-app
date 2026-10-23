# Bot pings

Use `.github/scripts/ping.sh <who> <issue-or-pr> "<what you need>"` to leave a visible handoff and wake the target. Set `PING_FROM` to your bot name when calling from automation. Targets are `rolexg`, `jimini`, `gemini`, `copilot`, `renauw`, `gambler`, `stankman`, `claude` and `cillian`. Renauw is handed off through `renauw-task` and the Copilot dispatch workflow with the `renauw` custom agent profile. The workflow also accepts `@renauw` comments on `renauw-task` issues; Copilot uses `copilot-task` and `@copilot /go`. The helper enforces a limit of 30 pings per UTC day and three pings between the same two bots on one item until a human comments or a new PR commit lands.

RolexG and Jimini receive the number and task through workflow dispatch; Gemini receives PR numbers for review. Copilot is assigned through the existing `COPILOT_ASSIGN_TOKEN` workflow. The Gambler is woken by the `gambler-task` label. Claude and Cillian receive comments, with a copy on Banter (#30) for chat.

## If `ping.sh` reaches a limit

If the helper reports its daily or per-pair limit, stop retrying it and use the target's native notification route below. These routes may start paid work; use them only when that work was explicitly intended, and keep the bot's eligibility rules and any task caps in force. Do not change `PING_FROM` or impersonate another bot to get around a limit.

| Target | Fallback |
| --- | --- |
| Gemini | For a PR, run `gh workflow run gemini-review.yml -R cillian1/belfast-wheel-app -f "pr=PR_NUMBER"`. This also reviews drafts; the merge guard still refuses to merge a draft. |
| RolexG | Comment `@rolexg` followed by the task on the issue/PR, or run `gh workflow run rolexg.yml -R cillian1/belfast-wheel-app -f "number=NUMBER" -f "task=TASK"`. This starts the paid coding task. |
| Jimini | Comment `@jimini` followed by the task on the issue/PR, or run `gh workflow run jimini.yml -R cillian1/belfast-wheel-app -f "number=NUMBER" -f "task=TASK"`. This starts the paid report task. |
| Copilot | On a `copilot-task` issue, comment `@copilot /go` followed by the task, or run `gh workflow run copilot-dispatch.yml -R cillian1/belfast-wheel-app -f "number=NUMBER" -f "task=TASK" -f agent=copilot`. This assigns Copilot and starts work. |
| Renauw | On a `renauw-task` issue, comment `@renauw` followed by the task, or use the same `copilot-dispatch.yml` command with `-f agent=renauw`. This assigns Copilot with the Renauw profile and starts work. |
| The Gambler | Run `gh issue edit ISSUE_NUMBER -R cillian1/belfast-wheel-app --add-label gambler-task` on an eligible open issue. Only issues opened by `cillian1` or `github-actions[bot]` are processed; the local watcher polls the queue. There is no dispatch workflow. |
| The Stankman | Run `gh issue edit ISSUE_NUMBER -R cillian1/belfast-wheel-app --add-label stankman-task` on an eligible open issue. Only issues opened by `cillian1` or `github-actions[bot]` are processed; the local watcher polls the queue. There is no dispatch workflow. |
| Claude or Cillian | Leave a direct comment on the issue or PR with `gh issue comment` / `gh pr comment`; for cross-team coordination, also comment on Banter #30. |
| Banter bots | A normal comment on issue #30 starts the next turn-taking Banter reply, but does not guarantee which bot responds. Address the intended bot in plain language; do not include a task-start trigger unless starting that task. |

Manual dispatches are the fallback for notification limits, not a way to bypass task eligibility or launch unrelated work. For a review-only notification, prefer the review workflow; for a task handoff, use the target's documented task trigger.
