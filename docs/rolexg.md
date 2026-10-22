# RolexG, the Gemini coding agent

RolexG is a coding agent that runs on Google's Gemini, the way Copilot's coding agent runs on GitHub.
It lives in `.github/workflows/rolexg.yml` and uses Google's Gemini CLI.

## Giving it work

Write a comment that contains `@rolexg` followed by what you want, anywhere on GitHub in this repo:

- **On an issue:** `@rolexg make the spin button bigger on small phones`. It branches `rolexg/issue-N`
  from `main` (or from another branch if you add `base: update-28`), does the work, opens a PR and
  replies on the issue with what it did. Ask again on the same issue and it keeps adding to that PR.
- **On its own PR:** `@rolexg the button overlaps the counter now, fix that`. It pushes to the PR.
- **On someone else's PR:** it opens a follow-up PR on top of that PR's branch.
- **In Banter (#30):** same as an issue; it posts its result in the chat.
- **Label an issue `rolexg-task`:** it takes the issue's title and description as the task.
- **Merge:** `@rolexg merge` on a PR merges it if the rules below allow.

Only comments from Cillian's account (and any collaborators) count. A comment from anyone else is
ignored, so strangers on the public repo can't run up the bill. Each task takes a few minutes; watch
it under the repo's Actions tab ("RolexG").

## Who can merge (Cillian, 2026-10-22)

Gemini's review and RolexG can both merge, through `.github/scripts/bot-merge.sh`:

1. No bot merges its own PR. RolexG's PRs (`rolexg/...` branches) are merged by Claude or Cillian, not
   by RolexG or Gemini's review (same model).
2. CI must be green on the PR's latest commit.
3. Not into `main`, because a push to `main` is a release to every phone. Set the repo variable
   `BOT_MERGE_MAIN` to `on` to allow it.

Gemini's review now starts with `Verdict: merge` or `Verdict: changes needed`. On "merge" with green CI,
it merges by itself (whichever finishes last, CI or the review, does the merge).

## Limits

- `ROLEXG_DAILY_CAP` repo variable: tasks per day across the repo (default 8).
- 5 rounds per issue or PR, then it waits for Claude or Cillian.
- 30 minutes and 60 model turns per task.
- Its own comments never start new runs, so it can't loop.

## Cost

It uses the same Google sign-in as the Banter and review bots (Vertex AI billing on the Google Cloud
project, `docs/gemini-adc.md`). The default model is `gemini-2.5-pro`. A typical small task reads the
code several times and costs roughly €0.20 to €1.50; at the default cap of 8 a day that's at most about
€10 a day, usually far less. Set the repo variable `ROLEXG_MODEL` to `gemini-2.5-flash` to make it about
four times cheaper, at some cost to quality. GitHub Actions minutes are free on a public repo.

## Talking to it directly (Cloud Shell)

Google Cloud Shell has the Gemini CLI built in and already knows who you are, so you can chat with
RolexG's brain and let it edit code live:

```sh
git clone https://github.com/cillian1/belfast-wheel-app && cd belfast-wheel-app
export GOOGLE_CLOUD_PROJECT=project-a15fec7f-5743-4ae8-a42 GOOGLE_CLOUD_LOCATION=global GOOGLE_GENAI_USE_VERTEXAI=true
gemini
```

It reads `GEMINI.md` (the house rules) automatically. Changes you make there stay in Cloud Shell until
you push them yourself.
