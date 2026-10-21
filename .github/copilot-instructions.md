# Copilot instructions for belfast-wheel-app

Read `HANDOFF.md` first. In short:

- `main` is live on everyone's phone. Work on a branch and open a pull request, and never push to `main` or merge your own PR. Claude reviews, and Cillian merges.
- Edit `game/index.html` in place. Never regenerate it with `source/tools/build.mjs`. `source/` is a reference copy and isn't live.
- A game release bumps `version.json` `game` and `"gameVersion"` in `game/index.html` to the same number, gives the update a `name`, and updates the footer.
- Don't change the `Final answer · €X` verdict wording, the wallet's charge and credit code, prizes, `ev`/`edge`, stakes or the jackpot unless Cillian has asked for that exact change. Put "money" in the PR title when you do.
- Don't touch app signing or `app/WheelOfLife.apk`, and never add secrets. The repo is public.
- Don't create agents, workflows or automation in `.github/` unless Cillian asks.
- Keep changes small and focused on what was asked. Don't refactor or clean up unrelated code.
