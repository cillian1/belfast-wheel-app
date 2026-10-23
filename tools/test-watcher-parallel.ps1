$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'watcher-parallel.ps1')
$Fixture = Join-Path $env:TEMP ('watcher-parallel-' + [Guid]::NewGuid().ToString('N'))
$RepoRoot = Join-Path $Fixture 'repo'
[void](New-Item -ItemType Directory -Path $RepoRoot -Force)
& git -C $RepoRoot init --initial-branch main --quiet
& git -C $RepoRoot -c user.name=Fixture -c user.email=fixture@example.invalid commit --allow-empty -m fixture --quiet
& git -C $RepoRoot update-ref refs/remotes/origin/main HEAD
if ($LASTEXITCODE) { throw 'Fixture Git initialization failed.' }
$Role = 'fixture-' + [Guid]::NewGuid().ToString('N')
$Script = Join-Path $Fixture 'worker.ps1'
$Code = @'
param([switch]$TaskWorker, [string]$WorkerRoot, [int]$WorkerSlot, [string]$Model)
$Lock = [Threading.Mutex]::new($false, "Local\BelfastWheel-ROLE-Slot$WorkerSlot")
if (-not $Lock.WaitOne(0)) { exit 2 }
[IO.File]::WriteAllText((Join-Path $WorkerRoot 'worker-proof.txt'), "$PID|$WorkerRoot|$Model")
Start-Sleep -Seconds 15
'@
[IO.File]::WriteAllText($Script, $Code.Replace('ROLE', $Role))
$Workers = @{}
try {
  Start-WatcherWorkers -Role $Role -ScriptPath $Script -Model gpt-6-luna -MaxParallelTasks 2 -Workers $Workers
  if ($Workers.Count -ne 2) { throw 'Expected two parallel processes.' }
  $Roots = @(1,2 | ForEach-Object { Join-Path $Fixture "$Role-workers/slot-$_" })
  $Deadline = [DateTime]::UtcNow.AddSeconds(8)
  while (@($Roots | Where-Object { Test-Path (Join-Path $_ 'worker-proof.txt') }).Count -lt 2 -and [DateTime]::UtcNow -lt $Deadline) {
    Start-Sleep -Milliseconds 100
  }
  foreach ($Root in $Roots) {
    $Proof = Get-Content (Join-Path $Root 'worker-proof.txt')
    if ($Proof -notlike '*|gpt-6-luna') { throw 'Model forwarding failed.' }
    if (-not (Test-Path -LiteralPath $Root)) { throw 'Worker lost its worktree.' }
  }
  if (@($Workers.Values | Where-Object { -not $_.HasExited }).Count -ne 2) { throw 'Workers did not overlap.' }
  $Restarted = @{}
  Start-WatcherWorkers -Role $Role -ScriptPath $Script -Model gpt-6-luna -MaxParallelTasks 2 -Workers $Restarted
  if ($Restarted.Count) { throw 'Supervisor restart duplicated a live slot.' }
  Write-Host 'Parallel workers passed: simultaneous separate worktrees, model forwarding, surviving-child locks.'
} finally {
  foreach ($Worker in $Workers.Values) {
    if (-not $Worker.HasExited) { Stop-Process -Id $Worker.Id -Force }
  }
  # Retain the disposable fixture as evidence; never remove production worktrees.
}

$Repo = 'fixture/repo'
$script:Issue = @{state='open'; title='Task'; body='base: main'; labels=@(@{name='gambler-task'})} | ConvertTo-Json -Compress
$script:Comments = @()
function gh {
  $global:LASTEXITCODE = 0
  if ([string]$args[-1] -like '*comments*') { return $script:Comments }
  return $script:Issue
}
Assert-WatcherTaskUnchanged -IssueNumber 1 -OriginalIssue $script:Issue -OriginalComments @() -Persona 'The Gambler'
$script:Comments = @(@{id=1; body='HOLD: changed scope'; user=@{login='cillian1'}} | ConvertTo-Json -Compress)
$Blocked = $false
try { Assert-WatcherTaskUnchanged -IssueNumber 1 -OriginalIssue $script:Issue -OriginalComments @() -Persona 'The Gambler' } catch { $Blocked = $true }
if (-not $Blocked) { throw 'New task instructions were ignored before publication.' }
Write-Host 'Publication re-read passed: new comments preserve work instead of publishing stale instructions.'
