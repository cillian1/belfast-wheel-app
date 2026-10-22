# Chicken Race + Mark-wheel EV per spin, baseline and the update-29 variants. usage: python3 tools/sim/race.py runs.json ROOMS_EV (ROOMS_EV = "EV/spin base" printed by rooms.js)
import json, random, sys
random.seed(1)
runs = json.load(open(sys.argv[1])); n = len(runs); ROOMS = float(sys.argv[2])
CH, EV, EDGE = .25, 16.24, .995
VALS = [5, 8, 10, 12, 15, 20, 25, 30]
M = [r for r in runs if r.get('race')]
def chickens(r, stack, inc):
    # returns list of multipliers for special chickens (None = plain), and plain count
    sw, sb = r['sw'], r['sb']; plain = r['n'] - sw - sb
    if not stack: sp = [('W', 1.5)] * sw + [('B', 1.5)] * sb
    else:
        sp = []
        for k, c in (('W', sw), ('B', sb)):
            if c: sp.append((k, inc(c)))
    return sp, plain
def race_ev(sp, plain, mode, it):
    racers = (sp + [None] * plain)[:8]; r = len(racers); tot = 0.0
    if r == 0: return 0
    for _ in range(it):
        vals = random.sample(VALS, 8)
        if mode in ('top', 'win') and any(racers):
            idx = [i for i, c in enumerate(racers) if c]; big = max(idx, key=lambda i: racers[i][1])
        else: big = random.randrange(r)
        w = big if (mode == 'win' and any(racers)) else random.randrange(r)
        base = random.choice([80, 100, 120]) if w == big else vals[w % 8]
        c = racers[w]
        tot += round(base * c[1]) if c else base
    return tot / it
def mark_ev(sp, plain):
    m = min(len(sp) + plain, 16)
    if not m: return 0
    s = sp[:m]
    return sum((10 if k == 'W' else 5) * mult / 1.5 for k, mult in s) / m
def run(label, stack=False, inc=None, mode='plain', it=300):
    race = mark = 0
    for r in M:
        sp, plain = chickens(r, stack, inc)
        race += race_ev(sp, plain, mode, it); mark += mark_ev(sp, plain)
    race *= CH / n; mark *= (1 - CH) / n
    tot = ROOMS + race + mark
    print(f"{label:44s} race/spin {race:6.3f}  mark/spin {mark:5.3f}  total {tot:6.3f}  payback {100*tot*EDGE/EV:6.1f}%  ev-for-same {EV*tot/(BASE or tot):6.2f}")
    return tot
BASE = None
BASE = run('baseline (game 28)')
run('2a special carries the top tag', mode='top')
run('2b special always wins with top tag', mode='win')
dbl = lambda c: 1.5 * 2 ** (c - 1)
run('3 stacking, x2 per extra token', True, dbl)
run('3 stacking, x2 per extra, cap 6x', True, lambda c: min(6, dbl(c)))
run('3 stacking, +1.5x per extra (1.5,3,4.5..)', True, lambda c: 1.5 * c)
run('3 stacking, +1x per extra (1.5,2.5,3.5..)', True, lambda c: .5 + c)
run('2a + 3 (x2 per extra)', True, dbl, 'top')
run('2a + 3 (x2, cap 6x)', True, lambda c: min(6, dbl(c)), 'top')
run('2a + 3 (+1x per extra)', True, lambda c: .5 + c, 'top')
from collections import Counter
print('races', len(M), 'of', n, 'spins; avg racers', sum(min(r['n'], 8) for r in M) / max(1, len(M)))
print('gold tokens per farm run', Counter(r['sw'] for r in M)); print('purple', Counter(r['sb'] for r in M))
