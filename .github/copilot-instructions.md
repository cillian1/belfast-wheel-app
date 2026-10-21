# Copilot instructions for belfast-wheel-app

Read `HANDOFF.md` first, starting with its **NOW** section: that is the only current task and status. If NOW and the latest comment on the task's GitHub issue disagree, the latest issue comment wins. When you start or finish a task, rewrite NOW (task, owner, status, next, last updated) in the same PR, and move a one-line summary of the finished task to the Done log. Never leave status notes anywhere else in HANDOFF.md.

**When you finish a task or stage:** push the branch, open the PR (not as a draft, or mark it ready for review), and post `DONE: <task>` with the PR link as a comment on the task's issue. That comment is how Claude knows to review. Don't post DONE before the PR is open.

In short:

- `main` is live on everyone's phone. Work on a branch and open a pull request, and never push to `main` or merge your own PR. Claude reviews and merges, but Cillian merges anything touching money, odds or prizes.
- Edit the modules in `src/`, then run `node tools/bundle.mjs` and `node tools/check.mjs` and commit the rebuilt `game/index.html`. Never use `source/tools/build.mjs`. `source/` is an old reference copy and isn't live.
- A game release bumps `version.json` `game` and `"gameVersion"` in `src/config.json` to the same number, gives the update a `name`, and updates the footer.
- Don't change the `Final answer · €X` verdict wording, the wallet's charge and credit code, prizes, `ev`/`edge`, stakes or the jackpot unless Cillian has asked for that exact change. Put "money" in the PR title when you do.
- Don't touch app signing or `app/WheelOfLife.apk`, and never add secrets. The repo is public.
- Don't create agents, workflows or automation in `.github/` unless Cillian asks.
- Keep changes small and focused on what was asked. Don't refactor or clean up unrelated code.
