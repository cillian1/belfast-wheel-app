$ErrorActionPreference = 'Stop'
$Repo = 'fixture/repo'
$Body = "Quoted `"Double or Nothing`", apostrophe ' and euro $([char]0x20AC).`nSecond line with --repo text."
$Title = 'Release update 31 "Double or Nothing"'
$script:FailRequest = $false
function gh {
  $Arguments = @($args)
  $Flag = if ($Arguments -contains '--body-file') { '--body-file' } else { '--input' }
  $Index = [Array]::IndexOf($Arguments, $Flag)
  if ($Index -lt 0 -or $Arguments -contains '--body') { throw 'Text must be passed through a file.' }
  $script:LastFile = [string]$Arguments[$Index + 1]
  $script:LastText = [IO.File]::ReadAllText($script:LastFile)
  $global:LASTEXITCODE = if ($script:FailRequest) { 1 } else { 0 }
  if ($script:FailRequest) { return 'Fixture: request rejected' }
  return 'https://github.com/fixture/repo/pull/1'
}
foreach ($Bot in @('Gambler', 'Stankman')) {
  $Slug = $Bot.ToLowerInvariant()
  $LoopPath = Join-Path (Split-Path $PSScriptRoot -Parent) "$Slug/$Slug-loop.ps1"
  $Tokens = $null
  $ParseErrors = $null
  $Ast = [System.Management.Automation.Language.Parser]::ParseFile($LoopPath, [ref]$Tokens, [ref]$ParseErrors)
  if ($ParseErrors.Count) { throw ($ParseErrors -join "`n") }
  $Names = @("Post-${Bot}IssueComment", "Commit-${Bot}Task", "New-${Bot}TaskPr")
  foreach ($Function in $Ast.FindAll({ param($Node) $Node -is [System.Management.Automation.Language.FunctionDefinitionAst] }, $false)) {
    if ($Names -contains $Function.Name) { Invoke-Expression $Function.Extent.Text }
  }
  Set-Item -Path "Function:Invoke-${Bot}Git" -Value {
    param([string[]]$GitArgs)
    if ($GitArgs[0] -ne 'commit' -or $GitArgs[1] -ne '--file') { throw 'Commit title must use a file.' }
    $script:LastFile = $GitArgs[2]
    $script:LastText = [IO.File]::ReadAllText($script:LastFile)
  }
  & "Post-${Bot}IssueComment" -IssueNumber 192 -Body $Body
  if ($script:LastText -cne $Body) { throw "$Bot changed comment text." }
  if (Test-Path $script:LastFile) { throw "$Bot left its comment file behind." }
  & "Commit-${Bot}Task" -Title $Title
  if ($script:LastText -cne $Title) { throw "$Bot changed the commit title." }
  if (Test-Path $script:LastFile) { throw "$Bot left its commit file behind." }
  $Url = & "New-${Bot}TaskPr" -BaseBranch main -TaskBranch fixture -Title $Title -Body $Body
  $Request = $script:LastText | ConvertFrom-Json
  if ($Request.title -cne $Title -or $Request.body -cne $Body -or $Url -notlike 'https://*') { throw "$Bot changed PR text." }
  if (Test-Path $script:LastFile) { throw "$Bot left its PR request file behind." }
  $script:FailRequest = $true
  foreach ($Kind in @('comment', 'PR')) {
    $Failed = $false
    try {
      if ($Kind -eq 'comment') { & "Post-${Bot}IssueComment" -IssueNumber 192 -Body $Body }
      else { & "New-${Bot}TaskPr" -BaseBranch main -TaskBranch fixture -Title $Title -Body $Body }
    } catch { $Failed = $true }
    if (-not $Failed -or (Test-Path $script:LastFile)) { throw "$Bot did not clean up its failed $Kind request." }
  }
  $script:FailRequest = $false
}
Write-Host 'GitHub text passed for both watchers: quotes, multiline/Unicode text, commit/PR titles and cleanup after failure.'
