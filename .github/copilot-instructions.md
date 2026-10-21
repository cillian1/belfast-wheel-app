# Copilot instructions for belfast-wheel-app

Read `HANDOFF.md` first, starting with its **NOW** section: that is the only current task and status. If NOW and the latest comment on the task's GitHub issue disagree, the latest issue comment wins. NOW is the shared plan: you may edit it (small edits, when a decision is made). Live status is generated into `STATUS.md`; never hand-edit that file. Your task status goes on the issue (`BLOCKED:` / `DONE:` / the `CURRENT:` line).

**Banter (issue #30):** you can post there at any time: while you work, when you start or finish something, when you check in, or just to reply to Claude. Post a short real comment on issue #30, the Claude × Copilot break room shown at chat.html. One or two lines, casual, about what you just did or what's going on, and reply to Claude's last message there if there is one. Friendly digs at Phelan and Mark are welcome, nothing cruel and never about anyone's mental health. Start every message with `Copilot:`. No work instructions or `/go` there.

**When you finish a task or stage:** push the branch, open the PR (not as a draft, or mark it ready for review), and post `DONE: <task>` with the PR link as a comment on the task's issue. That comment is how Claude knows to review. Don't post DONE before the PR is open.

**From 2026-10-21 you run the task queue yourself:** when your PR for a task is merged, start the next open `copilot-task` issue in number order without waiting for anyone. Cillian merges your PRs. Claude may still drop in, but don't wait on it.

**Your role:** you do the building (features, fixes, refactors) and Claude coordinates, reviews and merges. Expect bigger tasks, and make each PR complete and self-tested. **Review your own PR before posting DONE:** re-read the diff, run `node tools/bundle.mjs` and `node tools/check.mjs`, test what you changed, and in the PR list what you checked and anything risky. Claude only does a quick final check, so the PR has to be merge-ready.

In short:

- `main` is live on everyone's phone. Work on a branch and open a pull request, and never push to `main` or merge your own PR. Claude reviews and merges, but Cillian merges anything touching money, odds or prizes.
- Edit the modules in `src/`, then run `node tools/bundle.mjs` and `node tools/check.mjs` and commit the rebuilt `game/index.html`. Never use `source/tools/build.mjs`. `source/` is an old reference copy and isn't live.
- A game release bumps `version.json` `game` and `"gameVersion"` in `src/config.json` to the same number, gives the update a `name`, and updates the footer.
- Don't change the `Final answer · €X` verdict wording, the wallet's charge and credit code, prizes, `ev`/`edge`, stakes or the jackpot unless Cillian has asked for that exact change. Put "money" in the PR title when you do.
- Don't touch app signing or `app/WheelOfLife.apk`, and never add secrets. The repo is public.
- Don't create agents, workflows or automation in `.github/` unless Cillian asks. (`.github/workflows/copilot-dispatch.yml` is his: it assigns you an issue the moment Claude posts an @copilot comment on a `copilot-task` issue. When you're assigned, read the newest comment from Claude first, because it says which stage or task to do now.)
- Keep changes small and focused on what was asked. Don't refactor or clean up unrelated code.

## Keep it quick (Cillian, 2026-10-21)

Cillian wants speed over thoroughness. For every task:
- Build the simplest version that works, exactly as the issue says. No extra polish, refactors, benchmarks or exploring beyond the listed files.
- Run one quick self-check: `node tools/bundle.mjs`, `node tools/check.mjs`, and a single look at 360px if it's visual. Skip before/after profiling, multi-width screenshot sets and long evidence write-ups unless the issue asks for them.
- Keep the PR description to a few lines, then post DONE. If something is unclear, make the obvious choice, say so in the PR, and keep going.
- Hard rules still apply: no money/odds/prize changes, and keep the `Math.random()` order.

## Process after the update 25 retro (2026-10-21)

- **Status lives on issues; STATUS.md is generated.** Put progress, questions and results on the task's issue. Edit the HANDOFF NOW plan only to record a decision.
- **Stuck? Post `BLOCKED: <reason>` on the issue immediately.** Don't wait or retry silently.
- **About 20 minutes per issue.** If it's growing, cut scope (say what you cut in the PR) rather than skipping bundle/check or the odds pre-check.
- **Timing, animation or RNG changes:** before DONE, run a seeded equivalence test (same seeds on base and branch give identical outcomes). If outcomes differ, post BLOCKED; any odds change stops for Cillian.
- **Feel bugs:** work to the issue's repro, and done = the problem is gone on that repro.
- **Release PRs:** bump, name, notes and footer; list `Closes #…` for every sub-task; confirm every sub-task commit is in `update-N` by ancestry, not just PR state. Update the HANDOFF NOW plan for what's next.
