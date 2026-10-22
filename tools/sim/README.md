# Fast odds sim

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
