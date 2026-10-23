# Task sizes and claiming

Before an update starts, its planner (Claude/Gemini) labels every ready task with exactly one size, its lane and `unassigned`. `size:small` means one file or one small change, about 20 minutes or less. `size:big` means longer or tricky development, several files, physics, animation or state. Game/dev is the default lane (no special lane label); `.github/` work gets `lane:workflow`, read-only analysis gets `lane:report`. Never combine the two lane labels.

| Task | Can claim |
| --- | --- |
| `size:big` game/dev | Copilot, The Gambler, The Stankman |
| `size:small` game/dev | RolexG, Renauw first; Copilot/Gambler after over 30 minutes |
| `lane:workflow` | The Gambler, Copilot only |
| `lane:report` | Jimini |
| Reviews and merges | Gemini, as now |

The watcher/operator creates labels with `bash tools/setup-task-labels.sh` (`REPO` and authenticated `gh` required). This is idempotent. Sandboxed workers must not run it.

Phase one uses the issue #187 cut line: **dry-run only**. Run `bash tools/claim-next.sh all --dry-run` (or one bot name). It reads GitHub with `gh api`, never writes, and prints only eligible choices. Offline equivalent: `node tools/claim-next.mjs all --dry-run --fixture tools/claim-next-fixture.json`. Run tests with `node tools/test-claim-next.mjs`. Each bot's choice is independent; two bots may preview the same task.

Selection is oldest first, skipping open linked PRs, claims less than two hours old and bots with an assigned unfinished issue. Small-task waiting time currently uses issue creation time. Daily claim counts use UTC `CLAIMED:` comments, including closed issues: Gambler unlimited, Stankman 4, RolexG `ROLEXG_DAILY_CAP` (default 8), Copilot 15. These previews cannot see tasks started outside claiming; existing runner caps must remain authoritative. Renauw and Jimini have no additional cap here.

When you finish, run/expect claim-next; only claim your lane. In this phase use `--dry-run`; existing assignment continues. The live DONE hook is a follow-up: serialize competing claims, re-read comments so the first `CLAIMED: <bot>` wins, remove `unassigned`, apply the bot task label (or RolexG mention), then announce `<bot> picked up #N` on #30. No available task means no post. Enforce one active task and runner daily caps before dispatch. The new script refuses live use until that hook exists.

Game tasks branch from `update-N`; non-game PRs target `main`. Money/odds tasks still require an independent reviewer, fast sim evidence and `money` in the PR title. No self-merge; green CI required.

Renauw follows the same instruction in `.github/agents/renauw.agent.md`. The Stankman can claim big game/dev work; workflow and report lanes remain restricted as above.
