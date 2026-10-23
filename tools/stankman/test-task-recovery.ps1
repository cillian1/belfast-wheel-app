$ErrorActionPreference = 'Stop'
$LoopPath = Join-Path $PSScriptRoot 'stankman-loop.ps1'
$Tokens = $null
$ParseErrors = $null
$Ast = [System.Management.Automation.Language.Parser]::ParseFile($LoopPath, [ref]$Tokens, [ref]$ParseErrors)
if ($ParseErrors.Count) { throw ($ParseErrors -join "`n") }
$Names = @('Invoke-StankmanGit', 'Assert-StankmanStagedDiff', 'Save-StankmanTaskCheckpoint')
foreach ($Function in $Ast.FindAll({ param($Node) $Node -is [System.Management.Automation.Language.FunctionDefinitionAst] }, $false)) {
  if ($Names -contains $Function.Name) { Invoke-Expression $Function.Extent.Text }
}
if ((Get-Content -Raw $LoopPath) -match 'reset --hard|clean -fd|branch -D') { throw 'Destructive task cleanup returned.' }
$RepoRoot = Join-Path ([IO.Path]::GetTempPath()) ('stankman-recovery-test-' + [Guid]::NewGuid().ToString('N'))
[void](New-Item -ItemType Directory -Path $RepoRoot)
try {
  Invoke-StankmanGit @('init', '-q', '-b', 'main') | Out-Null
  Invoke-StankmanGit @('config', 'user.name', 'Recovery test') | Out-Null
  Invoke-StankmanGit @('config', 'user.email', 'recovery@example.invalid') | Out-Null
  Invoke-StankmanGit @('config', 'commit.gpgsign', 'false') | Out-Null
  Invoke-StankmanGit @('config', 'core.autocrlf', 'false') | Out-Null
  $Tracked = Join-Path $RepoRoot 'tracked.txt'
  [IO.File]::WriteAllText($Tracked, "baseline`n")
  Invoke-StankmanGit @('add', '--all') | Out-Null
  Invoke-StankmanGit @('commit', '-qm', 'baseline') | Out-Null
  Invoke-StankmanGit @('switch', '-qc', 'stankman/recovery-test') | Out-Null
  [IO.File]::WriteAllText($Tracked, "fixed`n`n`n")
  Invoke-StankmanGit @('add', '--all') | Out-Null
  Assert-StankmanStagedDiff
  if ([IO.File]::ReadAllText($Tracked) -ne "fixed`n") { throw 'EOF whitespace retry failed.' }

  [IO.File]::WriteAllText($Tracked, "needs review  `n")
  [IO.File]::WriteAllText((Join-Path $RepoRoot 'new.txt'), "untracked work`n")
  Invoke-StankmanGit @('add', '--all') | Out-Null
  $Failed = $false
  try { Assert-StankmanStagedDiff } catch { $Failed = $true }
  if (-not $Failed) { throw 'A real whitespace failure was incorrectly ignored.' }
  Save-StankmanTaskCheckpoint -IssueNumber 187
  if (@(Invoke-StankmanGit @('status', '--porcelain')).Count) { throw 'Checkpoint left unsaved work.' }
  Invoke-StankmanGit @('switch', '-q', 'main') | Out-Null
  Invoke-StankmanGit @('switch', '-q', 'stankman/recovery-test') | Out-Null
  if ([IO.File]::ReadAllText($Tracked) -ne "needs review  `n") { throw 'Failed tracked work was lost.' }
  if (-not (Test-Path (Join-Path $RepoRoot 'new.txt'))) { throw 'Failed new file was lost.' }

  # A failing commit hook must also leave the work recoverable in place.
  $Hooks = Join-Path $RepoRoot 'hooks'
  [void](New-Item -ItemType Directory -Path $Hooks)
  [IO.File]::WriteAllText((Join-Path $Hooks 'pre-commit'), "#!/bin/sh`nexit 1`n")
  Invoke-StankmanGit @('config', 'core.hooksPath', $Hooks) | Out-Null
  [IO.File]::WriteAllText($Tracked, "checkpoint cannot commit`n")
  $Failed = $false
  try { Save-StankmanTaskCheckpoint -IssueNumber 187 } catch { $Failed = $true }
  if (-not $Failed) { throw 'Expected commit hook failure.' }
  if ([IO.File]::ReadAllText($Tracked) -ne "checkpoint cannot commit`n") { throw 'Checkpoint failure lost work.' }
  Write-Host 'Task recovery passed: EOF retry, genuine error, tracked/new file checkpoint and failed checkpoint.'
} finally {
  $Resolved = [IO.Path]::GetFullPath($RepoRoot)
  $TempPrefix = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\', '/') + [IO.Path]::DirectorySeparatorChar
  if ($Resolved.StartsWith($TempPrefix, [StringComparison]::OrdinalIgnoreCase) -and (Split-Path $Resolved -Leaf) -like 'stankman-recovery-test-*') {
    Remove-Item -LiteralPath $Resolved -Recurse -Force
  }
}
