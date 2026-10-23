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
