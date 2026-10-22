# Fast odds sim

## Compute-only Chromium core

    node tools/sim/core-check.mjs       # 200 full browser/core seeds; CI runs 50
    node tools/sim/core-test.mjs        # isolation, path coverage and worker partitioning
    node tools/sim/run.mjs --engine core --spins 10000 --workers 4 > runs.json

`core.mjs` is a browser-loadable module with no Node imports. `core-source.mjs`
reads the real `src/game/` functions; `core-browser.mjs` imports the module into
blank Chromium pages, one compute context per worker. There is no game DOM,
canvas, audio or real timer. The core uses the original dice, fixed-240Hz drop,
pipe and farm physics, with synchronous virtual frames. A conservative peg
broad-phase skips only tests that would all reject a ball below the lowest peg.
Presentation sinks retain setup/drawing RNG calls rather than skipping them.

The independent oracle loads the bundled game, fixes the canvas at 396px and uses
fastsim-style room stops without the core's broad-phase or synchronous frame
draining. Comparisons include wheel choices, dice values, drop slots, pipes,
Wilds/ankhs, special-chicken stacks/multipliers and RNG-call counts. The runner's
100-spin batches get fresh core closures, and output remains in seed order
regardless of worker scheduling.

Records use the existing fastsim format: `k` (`W/B/G/P/M/-`), `w`, `b`, `g`, `god`,
and farm fields `race`, `n`, `sp`, `sw`, `sb`, plus `ch` records containing each
special chicken's `special`, `count`, and `mult`, consumable by `rooms.js`/`race.py`.
As in fastsim, races are forced on for sampling and stopped at the survivor
roster; the downstream analysis supplies the race weighting and prize EVs.
This does not update or validate those analytic tables or their weighting.

Measured here: **10,000 full paths in 57.278 s on four cores**, including browser
startup; all 200 browser/core seeds match. No game, money or prize files changed.
`--workers` and `--seed` (first seed, default 1) are optional; `--tip` defaults to
the live `TIP_CHANCE` read from `src/game/motion.js`.
`CHROMIUM_PATH` optionally selects the browser executable for both commands;
otherwise they use the existing Playwright test installation.

### Node fallback (wheel-only; not EV-ready)

    node tools/sim/run.mjs --engine node --spins 10000 > wheel-paths.json

Node runs only the wheels and pre-dice room choice, because its `Math.sin`/`cos`
rounding can differ from Chromium and change physics outcomes. `k: "D"` marks an
unresolved dice/farm path, **not a loss**. Never feed Node fallback records to
`rooms.js` or `race.py` for payback. Game maths is unchanged.

## Paired payback analysis

Use the full-path Chromium core sampler above and analyze one shared path sample for both Mark-wheel cases:

    node tools/sim/run.mjs --engine core --spins 30000 --workers 4 --seed 1 > runs.json
    TABLES=tools/sim/tables.json node tools/sim/rooms.js runs.json         # read evSpinBase from the JSON output
    python3 tools/sim/race.py runs.json <evSpinBase>

- `rooms.js` draws prizes from the room tables in `tables.json` (keep them in step with the game).
- `race.py` scores races and Mark's wheel from the recorded chickens (`sw`/`sb` = gold/purple special chickens).
  It reads live race chance and payout constants from `src/`, weights Mark's special wedges by their token counts,
  and reports paired payback before (uniform Mark wedges) and after (token-weighted wedges) on the same path sample.
  Payback = total base per spin × edge / ev (src/config.json).
- Noise: the Pyramid (about 1 in 250 spins, prizes up to 2500 base) dominates the spread, so a 10k-spin total is only
  good to a few points. Compare variants on the same runs (as race.py does) rather than across separate runs.
- `fastsim.mjs` is legacy and expects `RACE_CHANCE = .25`; it does not run against the current `.16` game source.
