$ErrorActionPreference = 'Stop'
foreach ($Bot in @('Gambler', 'Stankman')) {
  $Slug = $Bot.ToLowerInvariant()
  $Path = Join-Path (Split-Path $PSScriptRoot -Parent) "$Slug/$Slug-loop.ps1"
  $Tokens = $null
  $Errors = $null
  $Ast = [System.Management.Automation.Language.Parser]::ParseFile($Path, [ref]$Tokens, [ref]$Errors)
  if ($Errors.Count) { throw ($Errors -join "`n") }
  $Function = $Ast.Find({ param($Node) $Node -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $Node.Name -eq "Get-${Bot}TaskBaseBranch" }, $false)
  Invoke-Expression $Function.Extent.Text
  Set-Item "Function:Invoke-${Bot}Git" { return @('origin/update-9', 'origin/update-31') }
  $Cases = @(
    @('base: main. Keep it small.', 'main'),
    @('**For the bot (base: update-31, then one release PR into main):**', 'update-31'),
    @('Base branch: `main`', 'main'),
    @('base: update-9; target main', 'update-9'),
    @('Branch from and target main', 'main'),
    @('target update-9', 'update-9'),
    @('No directive: a game task.', 'update-31')
  )
  foreach ($Case in $Cases) {
    $Actual = & "Get-${Bot}TaskBaseBranch" -IssueBody $Case[0]
    if ($Actual -ne $Case[1]) { throw "$Bot selected $Actual instead of $($Case[1]) for $($Case[0])" }
  }
}
Write-Host 'Task bases passed for both watchers: inline base, punctuation, Markdown, base precedence and numeric fallback.'
