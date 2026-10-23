# The Stankman

The Stankman is a separate Codex watcher for Banter and `stankman-task` issues. Keep its clone separate from The Gambler's checkout so the two watchers never share a working tree.

## Windows setup

```powershell
New-Item -ItemType Directory -Force D:\bots\stankman | Out-Null
git clone https://github.com/cillian1/belfast-wheel-app.git D:\bots\stankman\belfast-wheel-app
Set-Location D:\bots\stankman\belfast-wheel-app
gh auth status
codex --version
powershell -NoExit -ExecutionPolicy Bypass -File tools\stankman\stankman-loop.ps1
```

The watcher stores its four-per-day task counter in `D:\bots\stankman\state\task-state.json`. Override that path with `$env:STANKMAN_STATE_DIR` before starting it. It polls every two minutes, handles one task at a time and supports `-DryRun` to show the oldest eligible issue without claiming it or invoking Codex.

Extra blank lines at EOF are repaired once. Other failures keep a local task-branch checkpoint, named in the BLOCKED comment. If checkpointing fails, the checkout is left intact. Run powershell -NoProfile -ExecutionPolicy Bypass -File tools\stankman\test-task-recovery.ps1 to check these recovery paths.

The shared claim preview supports stankman in the big game/dev lane. Live DONE-trigger claiming remains the documented follow-up from #187; this watcher handles stankman-task issues independently.
