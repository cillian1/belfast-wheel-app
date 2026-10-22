# Fast odds sim

## Browser-free core: wheel/room stage only (#103 cut line)

    node tools/sim/core-check.mjs       # 200 browser/core seeds; CI runs 50
    node tools/sim/core-test.mjs        # isolation, path coverage and worker partitioning
    node tools/sim/run.mjs --engine core --spins 10000 > wheel-paths.json

`core.mjs` loads the game's own `src/game/` functions in a private function scope.
It has no browser dependency, DOM, real canvas, audio or timers. Presentation
sinks retain setup/drawing RNG calls rather than silently skipping them. The
browser oracle uses the bundled game with fastsim-style room stops. Each seed
starts from the same fresh wheel/dice state; worker count does not change results.
Records retain `k`, `w`, `b`, `g`, `god`; **`k: "D"` means unresolved dice/farm,
not a losing spin. Do not feed these partial records to `rooms.js` or `race.py`,
or use them for payback.** The legacy full browser sampler below remains required.

Measured here: 200 identical browser/core wheel paths and room choices in 1.325 s;
10,000 partial paths in 0.982 s on four workers. These are not full-path timings.
`--workers`, `--seed` (first seed, default 1) and `--tip` (default .10) are optional.
`CHROMIUM_PATH` optionally selects the browser executable for `core-check.mjs`;
otherwise it uses the existing Playwright test installation.

**BLOCKED: dice, ball drop, pipes, chickens and race records remain.** With the
unmodified dice physics, Node 22/24 and Chromium 155/156 produce different
last-bit `Math.sin`/`Math.cos` results. Full-path seed 9 diverged during dice
physics despite identical starting state and wheel RNG counts. For example,
`Math.sin(13 * .318301)` is `-0.8394771672857622` in Node 22 and
`-0.8394771672857623` in Chromium 155. Fixed time steps alone do not make
transcendental maths identical across engines. No game maths was changed to hide
that discrepancy; the full physics port needs a numerically compatible runtime
or a separately approved portable-maths approach.

## Full browser sampler

Runs the real game code headless with fake time (no waiting, no drawing) and records where each spin ends.
Use this for every odds or prize check. Never time real-game runs.

    node tools/sim/fastsim.mjs game/index.html 10000 .10 3 > runs.json     # ~19 min on 4 cores
    TABLES=tools/sim/tables.json node tools/sim/rooms.js runs.json > /dev/null   # rooms EV per spin ("EV/spin base")
    python3 tools/sim/race.py runs.json <rooms EV>                         # adds Chicken Race + Mark's wheel, prints payback

- `fastsim.mjs` swaps the game's `wait()` for fake time, strips the wallet script and stubs `$m`, forces `RACE_CHANCE` to 1
  (race.py weights races back to the real chance) and stubs every room so it stops as soon as the room is known.
  It throws "wait() changed" / "race changed" if those lines move.
- `rooms.js` draws prizes from the room tables in `tables.json` (keep them in step with the game).
- `race.py` scores races and Mark's wheel from the recorded chickens (`sw`/`sb` = gold/purple special chickens).
  Payback = total base per spin × edge / ev (src/config.json).
- Noise: the Pyramid (about 1 in 250 spins, prizes up to 2500 base) dominates the spread, so a 10k-spin total is only
  good to a few points. Compare variants on the same runs (as race.py does) rather than across separate runs.
- Needs Playwright + Chromium at /opt/node-tools and /opt/pw-browsers (preinstalled in Claude cloud sessions).
