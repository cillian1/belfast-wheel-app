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

## Full browser sampler

Runs the real game code headless with fake time (no waiting, no drawing) and records where each spin ends.
Use this for every odds or prize check. Never time real-game runs.

    node tools/sim/fastsim.mjs game/index.html 10000 .10 3 > runs.json     # ~19 min on 4 cores
    TABLES=tools/sim/tables.json node tools/sim/rooms.js runs.json > /dev/null   # rooms EV per spin ("EV/spin base")
    python3 tools/sim/race.py runs.json <rooms EV>                         # adds Chicken Race + Mark's wheel, prints payback

- `fastsim.mjs` swaps the game's `wait()` for fake time, strips the wallet script and stubs `$m`, forces `RACE_CHANCE` to 1
  (race.py weights races back to the real chance) and stubs every room so it stops as soon as the room is known.
  It throws "wait() changed" / "race changed" if those lines move.
  Set `CHROMIUM_PATH` to use a local Chromium-compatible browser instead of `/opt/pw-browsers/chromium`.
- `rooms.js` draws prizes from the room tables in `tables.json` (keep them in step with the game).
- Use the same `SEED` and full-path records with `MONSTER_SPECIAL_SIDES=12` and `20` for paired Monster Tank odds; the simulator defaults to 20.
- Its JSON includes the Monster Tank sample count, physical-can mean, weighted-fill mean, and rates at each tank threshold.
- `race.py` scores races and Mark's wheel from the recorded chickens (`sw`/`sb` = gold/purple special chickens).
  Payback = total base per spin × edge / ev (src/config.json).
- Noise: the Pyramid (about 1 in 250 spins, prizes up to 2500 base) dominates the spread, so a 10k-spin total is only
  good to a few points. Compare variants on the same runs (as race.py does) rather than across separate runs.
- Needs Playwright + Chromium at /opt/node-tools and /opt/pw-browsers (preinstalled in Claude cloud sessions).
