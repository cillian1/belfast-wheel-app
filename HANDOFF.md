# Working on the Wheel of Life repo

## NOW

- **Task:** Task 11A (#39), repo/CI housekeeping, as a PR into `update-26`; no version bump.
- **Owner:** Copilot implements and tests; Claude reviews and merges. Cillian merges anything touching money, odds or prizes.
- **Status:** In progress.
- **Next:** Finish the CI/template/release-notes work, update this section and the archive, then request review.
- **Last updated:** 2026-10-21 23:25 UTC by Copilot

## Rules

- This section is the only current status. On task start, finish or merge, update it and move a one-line completion summary to `docs/HANDOFF-ARCHIVE.md`.
- Work on a branch and open a PR; do not push to `main` or merge your own PR. Put `Closes #N` in task PR bodies.
- Keep changes focused. No version bump on update branches. Build game changes from `src/` with `node tools/bundle.mjs`; never build from `source/`.

## Planning

1. Cillian chooses tasks; Claude records them in `COPILOT_TASKS.md` and creates task issues.
2. Parallel tasks must have non-overlapping files. List intended files on the issue; wait or coordinate on #30 if they overlap.
3. Each task gets its own PR into the update branch. Claude reviews and merges; start the next wave only after the current wave is merged.
4. After all tasks, open one release PR from `update-N` to `main`; use the release steps below.

## Release steps

1. Run `node tools/release-notes.mjs update-N --apply` and include its output in the release PR body.
2. Bump `version.json` `game`, set its `name` and generated `notes`, and set `src/config.json` `gameVersion` to the same number.
3. Update the footer and build number if needed, then run `node tools/bundle.mjs` and `node tools/check.mjs`.

## Must not change by accident

- The verdict wording `Final answer · €X`, wallet charge/credit code, prizes, `ev`/`edge`, stakes, jackpot, or `Math.random()` order. Cillian must explicitly approve money, odds or prize changes.
- App signing or `app/WheelOfLife.apk`; never add secrets.
- Firebase paths already used by phones: `users`, `tx`, `reqs`, `stats`, `config`, `jackpot`, `live`, `livef`, `feed`, `hlm`, `hld`, `rpm`, `rpd`, `notes`.
- Game source belongs in `src/`; `game/index.html` is generated. `source/` is an old reference copy.
