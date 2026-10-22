# Fast odds sim

Run the real game headlessly with fake time and drawing disabled. The browser still samples every spin's path; room prizes and the race/Mark payouts are averaged analytically from each recorded path.

    node tools/sim/run.mjs game/index.html

The default is 10,000 spins, three parallel pages, and seed `1`. The simulator reads each file's own `TIP_CHANCE`, `TEASE_CHANCE`, and race chance; `--tip P` explicitly overrides the tip chance for every file. Omit `--tip` when comparing versions with different game settings. Options can be set with `--spins N`, `--pages N`, `--seed N`, and `--tip P`. The output lists rooms, Chicken Race, Mark's wheel, total payback, and a normal-approximation 95% confidence interval. Room prizes use `tables.json`; keep it in step with `src/game/wild-room.js`, `src/game/pyramid.js`, and `src/game/god-room.js`. Race chance is read from each game's `RACE_CHANCE` and the fast sampler forces races on so the analysis can weight them back to their real chance.

The documented Claude environment paths are used by default. For a preinstalled Playwright/Chromium elsewhere, set `SIM_PLAYWRIGHT_MODULE` to its `playwright/index.mjs` path and `SIM_CHROMIUM_EXECUTABLE` to the browser executable.

Compare two files with common random numbers, resetting the same seeded random stream at the start of every spin. The paired result is the second file minus the first and includes a 95% interval:

    node tools/sim/run.mjs --spins 10000 --seed 1 game/index.html game-v2.html

The confidence intervals describe variation in sampled game paths after integrating out prize/winner draws; they do not claim an exact confidence bound for all possible behavior changes between different game builds. Race and Mark EVs include each surviving special chicken's multiplier when the game exposes stacked specials. The `fastsim.mjs`, `rooms.js`, and `race.py` scripts remain available as the original sampled method and fallback.

The CI workflow's manual dispatch on `rolexg/issue-89` runs the fixed 10,000-spin paired comparisons for PRs #90 and #91. It keeps each artifact's built-in tip/race settings and uploads the game snapshots, manifest, and full stdout/stderr logs.

**Game 28 baseline:** a 10,000-spin run at `.10` tip, seed `1`, and three pages reported rooms 14.294 [13.375, 15.214], race 2.546 [2.462, 2.630], Mark's wheel 0.397 [0.381, 0.413], and total 17.237 [16.330, 18.144] base/spin. The reported existing-method values were about 12.9 / 2.5 / 0.4; race and Mark are within their intervals, but rooms is not. Equivalence is therefore not demonstrated.

**Timing:** the 10,000-spin command above took 888.6 seconds (14.8 minutes) on a Windows host using Microsoft Edge, three pages, and seed `1`. The existing-method README reports about 19 minutes on four cores, measured on a different host; this is not a like-for-like comparison, and the new run does not meet the issue's few-minutes target. CI also runs a 10-spin game-28 smoke test, which confirms the CLI launches and prints the required fields but does not establish baseline equivalence or performance.
