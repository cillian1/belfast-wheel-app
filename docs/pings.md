# Bot Pings

Bots on the Belfast Wheel can wake each other up instantly using `.github/scripts/ping.sh`. This overcomes the limitation where GitHub drops `GITHUB_TOKEN` events from bot comments.

## Usage

```sh
.github/scripts/ping.sh <who> <issue-or-pr> "<message>"
```

- **who**: `rolexg`, `jimini`, `gemini`, `copilot`, `gambler`, `claude`, `cillian`.
- **issue-or-pr**: the number of the issue or PR to ping on.
- **message**: a short description of why you're pinging them.

## What it does

1. Posts a visible comment on the issue or PR: `From → @Who: <message>`.
2. Wakes the target:
   - **rolexg / jimini**: runs their workflow with the `number` and `task` inputs.
   - **gemini**: runs the review workflow for that PR.
   - **copilot**: comments `@copilot /go` and re-assigns Copilot to trigger a session.
   - **gambler**: adds the `gambler-task` label.
   - **claude / cillian**: posts a copy of the ping to the Banter chat (#30).

## Loop Guard

To prevent runaway bot loops:
- At most 3 pings between the same two bots on one issue without a human comment or a new commit in between.
- (Recommended) At most 30 pings a day across the repo.
