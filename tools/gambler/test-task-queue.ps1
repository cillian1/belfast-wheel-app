$ErrorActionPreference = 'Stop'
$Tokens = $null
$ParseErrors = $null
$Ast = [System.Management.Automation.Language.Parser]::ParseFile((Join-Path $PSScriptRoot 'gambler-loop.ps1'), [ref]$Tokens, [ref]$ParseErrors)
if ($ParseErrors.Count) { throw ($ParseErrors -join "`n") }
$Queue = $Ast.Find({ param($Node) $Node -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $Node.Name -eq 'Invoke-GamblerTaskQueue' }, $false)
Invoke-Expression $Queue.Extent.Text
$Repo = 'fixture/repo'
$RepoRoot = $PSScriptRoot
$AllowedAuthors = @('cillian1', 'github-actions[bot]')
$TaskMutex = [Threading.Mutex]::new($false, ('Local\GamblerQueueTest-' + [Guid]::NewGuid().ToString('N')))
$Now = [DateTimeOffset]::UtcNow
function Comment($Body, $Minutes, $Login = 'cillian1') {
  @{ body = $Body; created_at = $Now.AddMinutes($Minutes).ToString('o'); user = @{ login = $Login } }
}
function Issue($Number, $Title = 'Task', $Body = '') {
  @{ number = $Number; title = $Title; body = $Body; state = 'open'; author = @{login = 'cillian1'}; user = @{login = 'cillian1'}; labels = @(@{name = 'gambler-task'}) }
}
# Replace every external effect. The worker is deliberately stopped before Git fetch.
function gh {
  $global:LASTEXITCODE = 0
  if ($args[0] -eq 'issue') { return ConvertTo-Json -InputObject @($script:Issues) -Depth 12 -Compress }
  if ($args[0] -eq 'pr' -and $args[1] -eq 'list') { return ConvertTo-Json -InputObject @($script:Prs) -Depth 12 -Compress }
  if ($args[0] -eq 'pr' -and $args[1] -eq 'view') { return 'OPEN' }
  $Endpoint = [string]$args[-1]
  if ($Endpoint -match '/issues/(\d+)/comments') {
    foreach ($Item in @($script:Comments[[int]$Matches[1]])) {
      if ($Item) { ConvertTo-Json -InputObject $Item -Depth 12 -Compress }
    }
    return
  }
  if ($Endpoint -match '/issues/(\d+)$') {
    $Number = [int]$Matches[1]
    $Item = @($script:Issues | Where-Object { $_.number -eq $Number })[0]
    if (-not $Item) { $Item = Issue $Number }
    return ConvertTo-Json -InputObject $Item -Depth 12 -Compress
  }
  throw "Unexpected fixture request: $args"
}
function git {
  $global:LASTEXITCODE = 0
  if ($args -contains 'status') { return }
  if ($args -contains '--show-current') { return 'main' }
  throw "Unexpected fixture git command: $args"
}
function Invoke-GamblerGit { throw 'Fixture stops before executing worker' }
function Post-GamblerIssueComment {
  param([int]$IssueNumber, [string]$Body)
  $script:Picked = $IssueNumber
}
function Write-GamblerTaskBlocked { param($IssueNumber, $Reason) }
function Check($Name, $Expected, $Candidates, $History = @{}, $Pulls = @()) {
  $script:Issues = $Candidates
  $script:Comments = $History
  $script:Prs = $Pulls
  $script:Picked = $null
  Invoke-GamblerTaskQueue
  if ($script:Picked -ne $Expected) { throw "${Name}: expected #$Expected, got #$script:Picked" }
}
try {
  $Started = Comment 'The Gambler: on it' -90
  $Blocked = Comment 'The Gambler: BLOCKED: fixture' -60
  $Retry = Comment 'Please retry.' -30
  $OpenPr = @{number = 300; body = 'Closes #3'; headRefName = 'gambler/3-task'}
  Check 'all waiting cases continue' 5 @((Issue 1), (Issue 2), (Issue 3), (Issue 4 'Task' 'after #99'), (Issue 5)) @{
    1 = @($Started, (Comment 'The Gambler: DONE: awaiting handoff' -80))
    2 = @((Comment 'The Gambler: on it' -5))
    3 = @($Started)
  } @($OpenPr)
  Check 'release first' 20 @((Issue 1), (Issue 20 'Release update 31'))
  Check 'human retry after block' 1 @((Issue 1), (Issue 2)) @{1 = @($Started, $Blocked, $Retry)}
  Check 'retry before block ignored' 2 @((Issue 1), (Issue 2)) @{1 = @($Started, $Retry, $Blocked)}
  Check 'bot retry ignored' 2 @((Issue 1), (Issue 2)) @{1 = @($Started, $Blocked, (Comment 'retry' -30 'github-actions[bot]'))}
  Check 'own retry ignored' 2 @((Issue 1), (Issue 2)) @{1 = @($Started, $Blocked, (Comment 'The Gambler: retry' -30))}
  Check 'retry does not duplicate PR' 2 @((Issue 1), (Issue 2)) @{1 = @($Started, $Blocked, $Retry)} @(@{number = 301; body = 'Closes #1'; headRefName = 'gambler/1-task'})
  Write-Host 'Task queue passed: four wait cases, release priority, explicit retries and duplicate-PR guard.'
} finally {
  $TaskMutex.Dispose()
}
