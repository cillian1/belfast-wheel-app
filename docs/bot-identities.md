# Bot identities

RolexG, Jimini, Gemini Reviewer and Claude Bot each use a separate GitHub App.
App comments and pushes trigger Actions; the default Actions token does not.
Copilot and The Gambler's external sessions keep their existing authentication.

| Bot | Expected login | Repository secrets |
|---|---|---|
| RolexG | `rolexg[bot]` | `ROLEXG_APP_ID`, `ROLEXG_APP_KEY` |
| Jimini | `jimini[bot]` | `JIMINI_APP_ID`, `JIMINI_APP_KEY` |
| Gemini Reviewer | `gemini-reviewer[bot]` | `GEMINI_APP_ID`, `GEMINI_APP_KEY` |
| Claude Bot | `claude-bot[bot]` | `CLAUDE_APP_ID`, `CLAUDE_APP_KEY` |

## Owner setup

Repeat for each row:

1. In GitHub account settings, Developer settings, GitHub Apps, create an App
   with the corresponding name and this repository as its homepage. Disable the
   webhook: Actions receives repository events, so no webhook server or event
   subscriptions are needed.
2. Give repository permissions: Contents, Issues, Pull requests and Actions
   **read and write**, and Checks **read**. Metadata read is automatic. Install
   only on `cillian1/belfast-wheel-app`. No account or organization permissions
   are needed. Model-provider credentials remain separate.
3. Record the **App ID**, generate a private key, and save the full PEM key and
   ID under the exact secret names in the table (repository Settings, Secrets
   and variables, Actions). Never put either key or a token in a comment or file.
4. Verify the App slug: its login must match the table. Names are globally
   unique; if a different slug is necessary, update the login mappings and
   workflow allowlists together before using it.
5. Run one manually dispatched task or review and check the resulting comment's
   author. On Banter, check each configured speaker posts as its own App.
   Verify an App mention wakes a different bot, self-mentions do nothing,
   and Gemini can merge a RolexG PR only after a current merge verdict and green CI.

## Token and compatibility behavior

The workflows mint repository-scoped, short-lived installation tokens with
`actions/create-github-app-token@v1`. If either secret is missing, token minting
is skipped and that bot uses `github.token`. An invalid configured App fails
visibly instead of silently hiding a setup error. Removing either secret returns
that bot to the default token. App creation and these live checks require the owner;
local tests do not contact GitHub.

RolexG and Jimini use their selected token for task comments, publishing and
pushes. Gemini's review and the CI merge job both use the Gemini App token.
Banter selects the posting token for the chosen speaker; Copilot uses the default
token. App comments start the next Banter run automatically; only fallback posts
explicitly dispatch another turn. This prevents two runs for every App reply.

Login takes priority over text prefixes. Old `github-actions[bot]` and Cillian
comments retain their prefix fallback in the chat, status board and tracker.
Task-start markers still include prefixes so daily and thread limits count both
old and new comments. Merge checks compare the authenticated viewer's login with
the PR author's login, including when using the shared fallback identity. The
branch name or model provider no longer makes two Apps the same author.

## Loop limits

RolexG and Jimini accept mentions only from collaborators or the four known App
logins, and reject their own login and the shared Actions identity. Each is
limited to five task rounds per thread (the existing RolexG ping cap, also applied
to Jimini), counting historical and App starts together. Existing daily task caps
remain in force. Banter never selects the last speaker again, and counts App
comments alongside shared-token comments for its existing consecutive, daily
and per-speaker limits. Renaming an App requires updating these guards too.

Offline checks: `node tools/test-bot-identities.mjs`,
`bash .github/scripts/test-bot-merge.sh`,
`bash .github/scripts/test-banter-reply.sh`, `node tools/bundle.mjs`, and
`node tools/check.mjs`. Shell syntax can be checked with `bash -n`.
