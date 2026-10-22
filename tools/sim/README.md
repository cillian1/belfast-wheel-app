# Fast odds sim

Run the real game headlessly with fake time and drawing disabled. The browser still samples every spin's path; room prizes and the race/Mark payouts are averaged analytically from each recorded path.

    node tools/sim/run.mjs game/index.html

The default is 10,000 spins, a `.10` tip chance, three parallel pages, and seed `1`. Options can be set with `--spins N`, `--pages N`, `--seed N`, and `--tip P`. The output lists rooms, Chicken Race, Mark's wheel, total payback, and a normal-approximation 95% confidence interval. Room prizes use `tables.json`; keep it in step with `src/game/wild-room.js`, `src/game/pyramid.js`, and `src/game/god-room.js`. Race chance is read from each game's `RACE_CHANCE` and the fast sampler forces races on so the analysis can weight them back to their real chance.

The documented Claude environment paths are used by default. For a preinstalled Playwright/Chromium elsewhere, set `SIM_PLAYWRIGHT_MODULE` to its `playwright/index.mjs` path and `SIM_CHROMIUM_EXECUTABLE` to the browser executable.

Compare two files with common random numbers, resetting the same seeded random stream at the start of every spin:

    node tools/sim/run.mjs --spins 10000 --seed 1 game/index.html game-v2.html

The paired result is the second file minus the first and includes a 95% interval. The confidence intervals describe variation in sampled game paths after integrating out prize/winner draws; they do not claim an exact confidence bound for all possible behavior changes between different game builds. The `fastsim.mjs`, `rooms.js`, and `race.py` scripts remain available as the original sampled method and fallback.

**Game 28 baseline:** the previous 10,000-spin method reported about 12.9 room, 2.5 race, and 0.4 Mark base/spin at `.10` tip. Compare that result to the new total interval; this environment could not run the browser sampler, so equivalence has not yet been demonstrated here.

**Timing:** the previous 10,000-spin, three-page run was reported at about 19 minutes on four cores. A comparable end-to-end timing for this runner is not yet available: this checkout does not have the documented Playwright/Chromium installation (`/opt/node-tools` and `/opt/pw-browsers`). Do not claim a speed-up until the new command is timed in that environment.
