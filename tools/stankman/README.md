# The Stankman

The Stankman is a separate Codex watcher for Banter and `stankman-task` issues. Keep its clone separate from The Gambler's checkout so the two watchers never share a working tree.

Both task work and Banter replies use `gpt-6-luna`. To change Stankman's model for a session, add `-Model <model-id>` when launching the watcher.

## Windows setup

```powershell
New-Item -ItemType Directory -Force D:\bots\stankman | Out-Null
git clone https://github.com/cillian1/belfast-wheel-app.git D:\bots\stankman\belfast-wheel-app
Set-Location D:\bots\stankman\belfast-wheel-app
gh auth status
codex --version
powershell -NoExit -ExecutionPolicy Bypass -File tools\stankman\stankman-loop.ps1
```

There is no daily task ceiling. The watcher stores a telemetry-only daily task counter in `D:\bots\stankman\state\task-state.json`. Override that path with `$env:STANKMAN_STATE_DIR` before starting it. It polls every two minutes, runs up to three tasks in parallel by default (`-MaxParallelTasks N`) in separate linked worktrees and supports `-DryRun` to show the oldest eligible issue without claiming it or invoking Codex.

Extra blank lines at EOF are repaired once. Other failures keep a local task-branch checkpoint, named in the BLOCKED comment. If checkpointing fails, the checkout is left intact. Run powershell -NoProfile -ExecutionPolicy Bypass -File tools\stankman\test-task-recovery.ps1 to check these recovery paths.

Add the explicit `report-only` issue label to a `stankman-task` or `gambler-task` issue for a read-only report. The runner requires its final output to contain exactly one `=== REPORT ===` section and one `=== BANTER SUMMARY ===` section, posts those to the task issue and Banter #30, then marks the task DONE. Empty or malformed output, file changes, and comment-post failures remain BLOCKED. Coding issues without this label still require a file change. Run `powershell -NoProfile -ExecutionPolicy Bypass -File tools\test-task-report-only.ps1` to check report-only handling in both runners.

The shared claim preview supports stankman in the big game/dev lane. Live DONE-trigger claiming remains the documented follow-up from #187; this watcher handles stankman-task issues independently.

## Parallel workers (both bots)

The single supervisor handles Banter and starts hidden task processes, one per slot. Gambler worker worktrees are beside its checkout under `gambler-workers/slot-N`; Stankman uses `stankman-workers/slot-N`. Both use the shared `tools/watcher-parallel.ps1` supervisor helper. The claim lock is held only through selection and branch setup; per-issue locks span the whole task across both roles. Per-slot locks prevent a restarted supervisor from reusing a surviving child's checkout. Logs live beside the worker worktrees as `slot-N.out.log` and `slot-N.err.log`.

Worktrees and checkpoints are retained on failure; dirty worktrees stop that slot rather than discarding files. No worker merges PRs. Keep exactly one supervisor per role. Before upgrading scripts, check all worker children/slot locks as well as the claim lock; never update a checkout used by an active process. Start Stankman with explicit `-Model gpt-6-luna`. A parallelism setting is a process budget, not a daily task cap.
