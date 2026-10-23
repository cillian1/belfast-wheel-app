# Bot Identities

Each bot in the Belfast Wheel project has its own GitHub identity through a GitHub App. This allows bots to:
1. Show their own name and avatar in comments and commits.
2. Trigger workflows (like CI or other bots) when they comment or push.
3. Be treated as separate entities for merge rules (e.g., Gemini can merge RolexG's PRs).

## Identities

- **RolexG**: `rolexg[bot]`
- **Jimini**: `jimini[bot]`
- **Gemini Reviewer**: `gemini-reviewer[bot]`
- **Claude Bot**: `claude-bot[bot]`

## Setup (One-off for Owners)

For each bot:
1. Create a GitHub App in the account/organization.
   - **Name**: e.g., "RolexG"
   - **Homepage URL**: The repo URL.
   - **Permissions**:
     - Contents: Read & write (for commits/pushes)
     - Issues: Read & write (for comments/labels)
     - Pull requests: Read & write (for comments/merges)
     - Actions: Read & write (for triggering workflows)
   - **Events**: Subscribe to Issue comments, Issues, Pull requests.
2. Install the App on the repository.
3. Save the following as repository secrets:
   - `<BOT>_APP_ID`: The App ID.
   - `<BOT>_APP_KEY`: The generated Private Key.

## Implementation Details

Workflows use `actions/create-github-app-token` to mint a token from the App secrets. If secrets are missing, they fall back to `github.token`.

Bots are identified by their login (e.g., `rolexg[bot]`). Scripts like `bot-merge.sh` and `banter-turn.sh` handle both the new App identities and the old `github-actions[bot]` identity (with "Name:" prefixes) for backward compatibility.

### Anti-loop Guard
A bot MUST ignore mentions from itself to prevent infinite loops. The workflows filter out comments from the bot's own identity.
