# Shared supervisor: one process and independent worktree per slot. Never delete
# worker worktrees: failed checkpoints and untracked files remain recoverable.
function Assert-WatcherTaskUnchanged {
  param([int]$IssueNumber, [string]$OriginalIssue, [string[]]$OriginalComments, [string]$Persona)
  $CurrentIssue = & gh api "repos/$Repo/issues/$IssueNumber"
  if ($LASTEXITCODE -ne 0) { throw 'Cannot re-read task before publication; work preserved.' }
  $CurrentComments = @(& gh api --paginate --jq '.[] | @json' "repos/$Repo/issues/$IssueNumber/comments?per_page=100")
  if ($LASTEXITCODE -ne 0) { throw 'Cannot re-read all task comments before publication; work preserved.' }
  $Before = $OriginalIssue | ConvertFrom-Json
  $After = ($CurrentIssue -join "`n") | ConvertFrom-Json
  if ($After.state -ne 'open' -or $After.body -cne $Before.body -or $After.title -cne $Before.title -or
      (($After.labels.name | Sort-Object) -join ',') -ne (($Before.labels.name | Sort-Object) -join ',')) {
    throw 'Task scope/state/labels changed while working; review latest instructions before retrying. Work preserved.'
  }
  # Our own claim is the only expected new comment. Anything else needs a fresh
  # task decision, rather than publishing against potentially superseded scope.
  $ExpectedComments = @{}
  foreach ($Line in $OriginalComments) {
    $Comment = $Line | ConvertFrom-Json
    $ExpectedComments[[string]$Comment.id] = [string]$Comment.body
  }
  foreach ($Line in $CurrentComments) {
    $Comment = $Line | ConvertFrom-Json
    if ($ExpectedComments.ContainsKey([string]$Comment.id)) {
      if ($ExpectedComments[[string]$Comment.id] -cne [string]$Comment.body) { throw 'Task comment edited during work; review latest instructions before publication.' }
      $ExpectedComments.Remove([string]$Comment.id)
      continue
    }
    if ($Comment.user.login -eq 'cillian1' -and $Comment.body -match ('^' + [regex]::Escape($Persona) + ': on it\b')) { continue }
    throw 'New task comments arrived while working; review them before publication. Work preserved.'
  }
  if ($ExpectedComments.Count) { throw 'Task comments were removed during work; review latest instructions before publication.' }
}

function Start-WatcherWorkers {
  param([string]$Role, [string]$ScriptPath, [string]$Model,
    [int]$MaxParallelTasks, [hashtable]$Workers)
  for ($Slot = 1; $Slot -le $MaxParallelTasks; $Slot++) {
    if ($Workers.ContainsKey($Slot) -and -not $Workers[$Slot].HasExited) { continue }
    # Surviving children retain this lock if a supervisor is closed/restarted.
    $SlotMutex = [Threading.Mutex]::new($false, "Local\BelfastWheel-$Role-Slot$Slot")
    $SlotFree = $false
    try {
      try { $SlotFree = $SlotMutex.WaitOne(0) } catch [Threading.AbandonedMutexException] { $SlotFree = $true }
      if (-not $SlotFree) { continue }
    } finally {
      if ($SlotFree) { [void]$SlotMutex.ReleaseMutex() }
      $SlotMutex.Dispose()
    }
    $WorkerPath = Join-Path (Split-Path $RepoRoot -Parent) "$Role-workers/slot-$Slot"
    if (-not (Test-Path -LiteralPath $WorkerPath)) {
      [void](New-Item -ItemType Directory -Force -Path (Split-Path $WorkerPath -Parent))
      $WorkerBranch = "$Role/worker-$Slot-$([Guid]::NewGuid().ToString('N'))"
      $Output = & git -C $RepoRoot worktree add --quiet -b $WorkerBranch $WorkerPath origin/main 2>&1
      if ($LASTEXITCODE -ne 0) { Write-Warning "Cannot create worker worktree: $Output"; continue }
    }
    # Validate registration before passing a directory to the worker. A directory
    # left by a failed setup must never silently become a shared checkout.
    $ActualRoot = & git -C $WorkerPath rev-parse --show-toplevel 2>$null
    if ($LASTEXITCODE -ne 0 -or [IO.Path]::GetFullPath([string]$ActualRoot) -ne [IO.Path]::GetFullPath($WorkerPath)) {
      Write-Warning "Invalid worker checkout $WorkerPath; preserving it for inspection."
      continue
    }
    $Registered = @(& git -C $RepoRoot worktree list --porcelain) -contains ('worktree ' + $WorkerPath.Replace('\', '/'))
    if ($LASTEXITCODE -ne 0 -or -not $Registered) {
      Write-Warning "Worker checkout is not registered to this repository: $WorkerPath"
      continue
    }
    $Arguments = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File',
      ('"' + $ScriptPath + '"'), '-TaskWorker', '-WorkerSlot', $Slot, '-WorkerRoot', ('"' + $WorkerPath + '"'))
    if ($Model) { $Arguments += @('-Model', $Model) }
    $Log = Join-Path (Split-Path $WorkerPath -Parent) "slot-$Slot"
    $Workers[$Slot] = Start-Process powershell.exe -ArgumentList $Arguments -WorkingDirectory $WorkerPath -WindowStyle Hidden -PassThru -RedirectStandardOutput "$Log.out.log" -RedirectStandardError "$Log.err.log"
    Write-Host "Started $Role worker slot $Slot, PID $($Workers[$Slot].Id), worktree $WorkerPath"
  }
}
