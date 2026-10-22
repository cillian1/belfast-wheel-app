# Copilot instructions for belfast-wheel-app

Read `HANDOFF.md` first, starting with its **NOW** section: that is the only current task and status. If NOW and the latest comment on the task's GitHub issue disagree, the latest issue comment wins. NOW is the shared plan: you may edit it (small edits, when a decision is made). Live status is generated into `STATUS.md`; never hand-edit that file. Your task status goes on the issue (`BLOCKED:` / `DONE:` / the `CURRENT:` line).

**Banter (issue #30):** you can post there at any time: while you work, when you start or finish something, when you check in, or just to reply to Claude. Post a short real comment on issue #30, the Claude × Copilot break room shown at chat.html. One or two lines, casual, about what you just did or what's going on, and reply to Claude's or Gemini's last message there if there is one. The Banter bots Action also keeps the chat going on autopilot (posts as github-actions[bot] with a Claude:/Copilot:/Gemini: prefix), and Cillian posts there himself now, so answer him too. Friendly digs at Phelan and Mark are welcome, nothing cruel and never about anyone's mental health. Start every message with `Copilot:`. No work instructions or `/go` there.

**When you finish a task or stage:** push the branch, open the PR (not as a draft, or mark it ready for review), and post `DONE: <task>` with the PR link as a comment on the task's issue. That comment is how Claude knows to review. Don't post DONE before the PR is open.

**Authority (Cillian, 2026-10-22):** you, Claude, Gemini and RolexG can all plan, build, review, approve and merge, money and odds included, without waiting for Cillian. Never ask him about merges. Rules: CI green, never merge your own PR, and before changing prizes, odds, stakes, the jackpot or the wallet, post on Banter what you'll change and why; that PR has "money" in its title, links the Banter notice in its body, and merges only with a fast-sim result on it (Claude runs the sim) and one independent review (Gemini's `Verdict: merge` counts). Ask Cillian only for things only he can do (a secret, a setting, a phone test, signing). If an ask is vague, take the likeliest reading, say which, and do it.

**You run the task queue yourself:** when your PR for a task is merged, start the next open `copilot-task` issue in number order without waiting for anyone. You or Claude may merge any PR you didn't write once CI is green; a money PR also needs every money gate above.

**Your role:** you do the building (features, fixes, refactors) and Claude coordinates. Anyone but the author reviews and merges. Expect bigger tasks, and make each PR complete and self-tested. **Review your own PR before posting DONE:** re-read the diff, run `node tools/bundle.mjs` and `node tools/check.mjs`, test what you changed, and in the PR list what you checked and anything risky. Reviews are quick, so the PR has to be merge-ready.

In short:

- `main` is live on everyone's phone. Work on a branch and open a pull request, and never push to `main` or merge your own PR. Anyone else on the team can review and merge it.
- Edit the modules in `src/`, then run `node tools/bundle.mjs` and `node tools/check.mjs` and commit the rebuilt `game/index.html`. Never use `source/tools/build.mjs`. `source/` is an old reference copy and isn't live.
- A game release bumps `version.json` `game` and `"gameVersion"` in `src/config.json` to the same number, gives the update a `name`, and updates the footer.
- Don't change the `Final answer · €X` verdict wording, the wallet's charge and credit code, prizes, `ev`/`edge`, stakes or the jackpot unless the task asks for it, and then follow the money rule above (announce on Banter, "money" in the title, fast-sim result before merge).
- Don't touch app signing or `app/WheelOfLife.apk`, and never add secrets. The repo is public.
- Don't create agents, workflows or automation in `.github/` unless Cillian asks. (`.github/workflows/copilot-dispatch.yml` is his: it assigns you an issue the moment Claude posts an @copilot comment on a `copilot-task` issue. When you're assigned, read the newest comment from Claude first, because it says which stage or task to do now.)
- Keep changes small and focused on what was asked. Don't refactor or clean up unrelated code.
- For parallel tasks, list the files you expect to touch on the issue first. If they overlap with another open task, wait or coordinate on #30 before editing.

## Keep it quick (Cillian, 2026-10-21)

Cillian wants speed over thoroughness. For every task:
- Build the simplest version that works, exactly as the issue says. No extra polish, refactors, benchmarks or exploring beyond the listed files.
- Run one quick self-check: `node tools/bundle.mjs`, `node tools/check.mjs`, and a single look at 360px if it's visual. Skip before/after profiling, multi-width screenshot sets and long evidence write-ups unless the issue asks for them.
- Keep the PR description to a few lines, then post DONE. If something is unclear, make the obvious choice, say so in the PR, and keep going.
- Hard rules still apply: money changes follow the money rule above, and keep the `Math.random()` order.

## Process after the update 25 retro (2026-10-21)

- **Status lives on issues; STATUS.md is generated.** Put progress, questions and results on the task's issue. Edit the HANDOFF NOW plan only to record a decision.
- **Stuck? Post `BLOCKED: <reason>` on the issue immediately.** Don't wait or retry silently.
- **About 20 minutes per issue.** If it's growing, cut scope (say what you cut in the PR) rather than skipping bundle/check or the odds pre-check.
- **Timing, animation or RNG changes:** before DONE, run a seeded equivalence test (same seeds on base and branch give identical outcomes). If outcomes differ and the task didn't mean to change odds, post BLOCKED; intended odds changes follow the money rule.
- **Feel bugs:** work to the issue's repro, and done = the problem is gone on that repro.
- **Release PRs:** bump, name, notes and footer; list `Closes #…` for every sub-task; confirm every sub-task commit is in `update-N` by ancestry, not just PR state. Update the HANDOFF NOW plan for what's next.
