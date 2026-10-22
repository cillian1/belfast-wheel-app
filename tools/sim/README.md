# Fast odds sim

Runs the real game code headless with fake time (no waiting, no drawing) and records where each spin ends.
Use this for every odds or prize check. Never time real-game runs.

    node tools/sim/run.mjs game/index.html

The new `run.mjs` script is a complete replacement for the older `fastsim.mjs`, `rooms.js`, and `race.py` scripts. It performs the simulation and payback calculations in a single, much faster step.

A 10,000-spin simulation now takes about 2 minutes, down from ~19 minutes with the old scripts. The new script also provides more accurate results by using analytic expected values for room prizes, which reduces the noise from rare, high-payout events like the Pyramid.

When comparing two versions of the game, `run.mjs` can take two file paths as arguments:

    node tools/sim/run.mjs game/index.html game-v2.html

The script will then run a comparative simulation, using common random numbers to reduce the number of spins required for a good comparison, and output the difference in payback between the two versions.

- Needs Playwright + Chromium at /opt/node-tools and /opt/pw-browsers (preinstalled in Claude cloud sessions).
