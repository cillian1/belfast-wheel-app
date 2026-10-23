# Jimini

Jimini is the team's read-only analyst, on Google's Gemini (Cillian, 2026-10-22). He reads the code and
writes reports and the game's wiki. He never changes the game.

## Asking him
- Write `@jimini <what to look into>` in a comment on any issue, PR or the Banter chat (#30), or label an
  issue `jimini-task`. Only Cillian's account and other collaborators count.
- Reports come back as a new issue labelled `jimini-report` (or a comment when asked on a PR), with a full
  copy under `docs/reports/` on the `jimini-docs` branch.
- Wiki pages go to the repo's GitHub wiki. Until the wiki is switched on (Settings → General → Features →
  Wikis, then create any first page), they land in `docs/wiki/` on the `jimini-docs` branch instead.
- Findings are suggestions. Turning one into a fix is a separate task for Copilot, RolexG or Claude.
- He also chats in Banter, like RolexG: when he's named in the last message, or now and then, at most 8
  times a day.

## How he stays read-only
- The Gemini CLI gets read tools and `write_file`, and no shell, so he can't run commands, push or use gh.
- `.github/scripts/jimini.sh finish` keeps only `jimini-out/` and throws away any other change.
- Nothing he does goes to `main` or opens a PR.

## Limits and cost
- `JIMINI_DAILY_CAP` tasks a day (default 4), 40 minutes and 80 model turns per task.
- Model: `JIMINI_MODEL` (default `gemini-2.5-pro`) for tasks; Banter replies use `GEMINI_MODEL` (Flash).
- A whole-codebase report or a full wiki reads a lot, so expect roughly €1 to €4 a task on Cillian's Google
  bill. A question about one file is a few cents. Banter replies cost a fraction of a cent.

## Temporary write mode (update 31)

For update 31, Jimini can be switched to write mode by setting the repo variable `JIMINI_WRITE=on`.
In this mode, he gets full tools (including shell) and opens PRs on branches named `jimini/issue-N`
or `jimini/pr-N`. He follows the same rules as RolexG: no self-merge, no merging into `main`, and
CI must be green.

This mode is temporary and MUST be turned off (or the code reverted) once update 31 ships.
When `JIMINI_WRITE` is off or unset, Jimini goes back to being read-only.
