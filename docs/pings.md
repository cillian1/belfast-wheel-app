# Bot pings

Use `.github/scripts/ping.sh <who> <issue-or-pr> "<what you need>"` to leave a visible handoff and wake the target. Set `PING_FROM` to your bot name when calling from automation. Targets are `rolexg`, `jimini`, `gemini`, `copilot`, `renauw`, `gambler`, `claude` and `cillian`. Renauw is handed off through `renauw-task` and the Copilot dispatch workflow with the `renauw` custom agent profile. The workflow also accepts `@renauw` comments on `renauw-task` issues; Copilot uses `copilot-task` and `@copilot /go`. The helper enforces a limit of 30 pings per UTC day and three pings between the same two bots on one item until a human comments or a new PR commit lands.

RolexG and Jimini receive the number and task through workflow dispatch; Gemini receives PR numbers for review. Copilot is assigned through the existing `COPILOT_ASSIGN_TOKEN` workflow. The Gambler is woken by the `gambler-task` label. Claude and Cillian receive comments, with a copy on Banter (#30) for chat.
