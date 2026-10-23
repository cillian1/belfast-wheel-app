$ErrorActionPreference = 'Stop'

function Post-StankmanIssueComment {
  param([int]$IssueNumber, [string]$Body)
  $script:PostedComments.Add([pscustomobject]@{ issue = $IssueNumber; body = $Body })
  if ($script:FailPostIssue -eq $IssueNumber) { throw "fixture could not post issue #$IssueNumber" }
}
function Post-GamblerIssueComment {
  param([int]$IssueNumber, [string]$Body)
  $script:PostedComments.Add([pscustomobject]@{ issue = $IssueNumber; body = $Body })
  if ($script:FailPostIssue -eq $IssueNumber) { throw "fixture could not post issue #$IssueNumber" }
}
function Write-StankmanTaskBlocked {
  param([int]$IssueNumber, [string]$Reason)
  $script:BlockedReports.Add([pscustomobject]@{ issue = $IssueNumber; reason = $Reason })
}
function Write-GamblerTaskBlocked {
  param([int]$IssueNumber, [string]$Reason)
  $script:BlockedReports.Add([pscustomobject]@{ issue = $IssueNumber; reason = $Reason })
}

function Assert-Throws {
  param([scriptblock]$Action, [string]$Name, [string]$MessagePattern = '*')
  try {
    & $Action
  } catch {
    if ($_.Exception.Message -notlike $MessagePattern) { throw "${Name}: unexpected error: $($_.Exception.Message)" }
    return
  }
  throw "${Name}: expected an error."
}

$Loops = @(
  @{
    name = 'Stankman'
    path = Join-Path $PSScriptRoot 'stankman\stankman-loop.ps1'
    parser = 'ConvertFrom-StankmanReportOutput'
    changes = 'Assert-StankmanTaskHasChanges'
    complete = 'Complete-StankmanReportTask'
  },
  @{
    name = 'Gambler'
    path = Join-Path $PSScriptRoot 'gambler\gambler-loop.ps1'
    parser = 'ConvertFrom-GamblerReportOutput'
    changes = 'Assert-GamblerTaskHasChanges'
    complete = 'Complete-GamblerReportTask'
  }
)
$ValidOutput = "=== REPORT ===`nEvidence and prioritized recommendations.`n=== BANTER SUMMARY ===`nThe workflow needs smaller tasks and current-head checks; review ownership should be explicit."

foreach ($Loop in $Loops) {
  $Tokens = $null
  $ParseErrors = $null
  $Ast = [System.Management.Automation.Language.Parser]::ParseFile($Loop.path, [ref]$Tokens, [ref]$ParseErrors)
  if ($ParseErrors.Count) { throw "$($Loop.name) parser errors: $($ParseErrors -join "`n")" }
  $RequiredFunctions = @($Loop.parser, $Loop.changes, $Loop.complete)
  foreach ($Function in $Ast.FindAll({ param($Node) $Node -is [System.Management.Automation.Language.FunctionDefinitionAst] }, $false)) {
    if ($RequiredFunctions -contains $Function.Name) { Invoke-Expression $Function.Extent.Text }
  }

  $Parsed = & $Loop.parser -Output $ValidOutput
  if ($Parsed.report -ne 'Evidence and prioritized recommendations.') { throw "$($Loop.name): full report was not parsed." }
  if ($Parsed.summary -ne 'The workflow needs smaller tasks and current-head checks; review ownership should be explicit.') { throw "$($Loop.name): Banter summary was not parsed." }
  Assert-Throws { & $Loop.parser -Output "=== REPORT ===`n`n=== BANTER SUMMARY ===`nSummary." } "$($Loop.name) empty report" '*empty report*'
  Assert-Throws { & $Loop.parser -Output "=== REPORT ===`nReport.`n=== BANTER SUMMARY ===`n  " } "$($Loop.name) empty summary" '*empty Banter summary*'
  Assert-Throws { & $Loop.parser -Output "A report without required delimiters." } "$($Loop.name) malformed report" '*exactly one REPORT section*'

  Assert-Throws { & $Loop.changes -ReportOnly $false -ChangedPathCount 0 } "$($Loop.name) ordinary no-change task" '*Codex completed without changing any files.*'
  & $Loop.changes -ReportOnly $true -ChangedPathCount 0
  Assert-Throws { & $Loop.changes -ReportOnly $true -ChangedPathCount 1 } "$($Loop.name) report-only file change" '*Report-only task changed repository files*'

  $script:PostedComments = [System.Collections.Generic.List[object]]::new()
  $script:BlockedReports = [System.Collections.Generic.List[object]]::new()
  $script:FailPostIssue = -1
  & $Loop.complete -IssueNumber 210 -Report $Parsed.report -Summary $Parsed.summary
  if ($script:PostedComments.Count -ne 3) { throw "$($Loop.name): successful completion did not post three comments." }
  if ($script:PostedComments[0].issue -ne 210 -or $script:PostedComments[0].body -notmatch 'REPORT\r?\n\r?\nEvidence and prioritized recommendations\.') {
    throw "$($Loop.name): full report was not posted to the task issue first."
  }
  if ($script:PostedComments[1].issue -ne 30 -or $script:PostedComments[1].body -notmatch 'The workflow needs smaller tasks') {
    throw "$($Loop.name): Banter summary was not posted second."
  }
  if ($script:PostedComments[2].issue -ne 210 -or $script:PostedComments[2].body -notmatch 'DONE:') {
    throw "$($Loop.name): DONE was not posted to the task issue last."
  }
  if ($script:BlockedReports.Count -ne 0) { throw "$($Loop.name): successful completion was unexpectedly blocked." }

  $script:PostedComments = [System.Collections.Generic.List[object]]::new()
  $script:BlockedReports = [System.Collections.Generic.List[object]]::new()
  $script:FailPostIssue = 30
  & $Loop.complete -IssueNumber 210 -Report $Parsed.report -Summary $Parsed.summary
  if ($script:PostedComments.Count -ne 2 -or $script:PostedComments[1].issue -ne 30) {
    throw "$($Loop.name): posting failure did not stop before DONE."
  }
  if ($script:BlockedReports.Count -ne 1 -or $script:BlockedReports[0].issue -ne 210 -or
    $script:BlockedReports[0].reason -notmatch 'could not post issue #30') {
    throw "$($Loop.name): posting failure did not produce an actionable BLOCKED reason."
  }
}

Write-Host 'Task report-only passed: both loops, report parsing, ordered comments, posting failure and unchanged coding-task guard.'
