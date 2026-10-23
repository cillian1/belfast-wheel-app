$ErrorActionPreference = 'Stop'
$LoopPath = Join-Path $PSScriptRoot 'gambler-loop.ps1'
$Tokens = $null
$ParseErrors = $null
$Ast = [System.Management.Automation.Language.Parser]::ParseFile($LoopPath, [ref]$Tokens, [ref]$ParseErrors)
if ($ParseErrors.Count) { throw ($ParseErrors -join "`n") }
$Names = @('Invoke-GamblerGit', 'Assert-GamblerStagedDiff', 'Save-GamblerTaskCheckpoint')
foreach ($Function in $Ast.FindAll({ param($Node) $Node -is [System.Management.Automation.Language.FunctionDefinitionAst] }, $false)) {
  if ($Names -contains $Function.Name) { Invoke-Expression $Function.Extent.Text }
}
if ((Get-Content -Raw $LoopPath) -match 'reset --hard|clean -fd|branch -D') { throw 'Destructive task cleanup returned.' }
$RepoRoot = Join-Path ([IO.Path]::GetTempPath()) ('gambler-recovery-test-' + [Guid]::NewGuid().ToString('N'))
[void](New-Item -ItemType Directory -Path $RepoRoot)
try {
  Invoke-GamblerGit @('init', '-q', '-b', 'main') | Out-Null
  Invoke-GamblerGit @('config', 'user.name', 'Recovery test') | Out-Null
  Invoke-GamblerGit @('config', 'user.email', 'recovery@example.invalid') | Out-Null
  Invoke-GamblerGit @('config', 'commit.gpgsign', 'false') | Out-Null
  Invoke-GamblerGit @('config', 'core.autocrlf', 'false') | Out-Null
  $Tracked = Join-Path $RepoRoot 'tracked.txt'
  [IO.File]::WriteAllText($Tracked, "baseline`n")
  Invoke-GamblerGit @('add', '--all') | Out-Null
  Invoke-GamblerGit @('commit', '-qm', 'baseline') | Out-Null
  Invoke-GamblerGit @('switch', '-qc', 'gambler/recovery-test') | Out-Null
  [IO.File]::WriteAllText($Tracked, "fixed`n`n`n")
  Invoke-GamblerGit @('add', '--all') | Out-Null
  Assert-GamblerStagedDiff
  if ([IO.File]::ReadAllText($Tracked) -ne "fixed`n") { throw 'EOF whitespace retry failed.' }

  [IO.File]::WriteAllText($Tracked, "needs review  `n")
  [IO.File]::WriteAllText((Join-Path $RepoRoot 'new.txt'), "untracked work`n")
  Invoke-GamblerGit @('add', '--all') | Out-Null
  $Failed = $false
  try { Assert-GamblerStagedDiff } catch { $Failed = $true }
  if (-not $Failed) { throw 'A real whitespace failure was incorrectly ignored.' }
  Save-GamblerTaskCheckpoint -IssueNumber 187
  if (@(Invoke-GamblerGit @('status', '--porcelain')).Count) { throw 'Checkpoint left unsaved work.' }
  Invoke-GamblerGit @('switch', '-q', 'main') | Out-Null
  Invoke-GamblerGit @('switch', '-q', 'gambler/recovery-test') | Out-Null
  if ([IO.File]::ReadAllText($Tracked) -ne "needs review  `n") { throw 'Failed tracked work was lost.' }
  if (-not (Test-Path (Join-Path $RepoRoot 'new.txt'))) { throw 'Failed new file was lost.' }

  # A failing commit hook must also leave the work recoverable in place.
  $Hooks = Join-Path $RepoRoot 'hooks'
  [void](New-Item -ItemType Directory -Path $Hooks)
  [IO.File]::WriteAllText((Join-Path $Hooks 'pre-commit'), "#!/bin/sh`nexit 1`n")
  Invoke-GamblerGit @('config', 'core.hooksPath', $Hooks) | Out-Null
  [IO.File]::WriteAllText($Tracked, "checkpoint cannot commit`n")
  $Failed = $false
  try { Save-GamblerTaskCheckpoint -IssueNumber 187 } catch { $Failed = $true }
  if (-not $Failed) { throw 'Expected commit hook failure.' }
  if ([IO.File]::ReadAllText($Tracked) -ne "checkpoint cannot commit`n") { throw 'Checkpoint failure lost work.' }
  Write-Host 'Task recovery passed: EOF retry, genuine error, tracked/new file checkpoint and failed checkpoint.'
} finally {
  $Resolved = [IO.Path]::GetFullPath($RepoRoot)
  $TempPrefix = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\', '/') + [IO.Path]::DirectorySeparatorChar
  if ($Resolved.StartsWith($TempPrefix, [StringComparison]::OrdinalIgnoreCase) -and (Split-Path $Resolved -Leaf) -like 'gambler-recovery-test-*') {
    Remove-Item -LiteralPath $Resolved -Recurse -Force
  }
}
