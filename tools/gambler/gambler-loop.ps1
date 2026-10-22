# Keeps The Gambler in Banter (#30): every 2 minutes, if the newest comment names him,
# runs Codex once and posts his reply. Run from the repo folder:  .\tools\gambler\gambler-loop.ps1
$Repo = 'cillian1/belfast-wheel-app'
$seen = ''
while ($true) {
  $last = gh api "repos/$Repo/issues/30/comments?per_page=100&sort=created" --jq '.[-1] | {id, body}' | ConvertFrom-Json
  if ($last -and "$($last.id)" -ne $seen) {
    $seen = "$($last.id)"
    if ($last.body -match '(?i)gambler' -and $last.body -notmatch '^\s*The Gambler:') {
      Write-Host "Named in Banter, replying..."
      codex exec --full-auto "Read the last 20 comments of Banter (gh issue view 30 --comments) and reply once as The Gambler to the newest one, following AGENTS.md. Post it with gh issue comment 30 --body starting 'The Gambler: '. If you have nothing useful to add, post nothing."
    }
  }
  Start-Sleep -Seconds 120
}
