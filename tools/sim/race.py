# Chicken Race + Mark-wheel EV per spin, current odds and historical variants. Usage: python3 tools/sim/race.py runs.json ROOMS_EV
import json, random, re, sys
from pathlib import Path

random.seed(1)
runs = json.load(open(sys.argv[1])); n = len(runs); ROOMS = float(sys.argv[2])
root = Path(__file__).resolve().parents[2]
cfg = json.loads((root / 'src/config.json').read_text())
race_source = (root / 'src/game/chicken-race.js').read_text()
match = re.search(r'\bconst RACE_CHANCE\s*=\s*([0-9]*\.?[0-9]+)', race_source)
if not match: raise ValueError('Could not read RACE_CHANCE from src/game/chicken-race.js')
CH, EV, EDGE = float(match.group(1)), float(cfg['ev']), float(cfg['edge'])
print(f"payback inputs: race chance={CH:.3f} EV={EV:.2f} edge={EDGE:.3f}")
VALS = [5, 8, 10, 12, 15, 20, 25, 30]
M = [r for r in runs if r.get('race')]
def chickens(r, stack, inc):
    # returns list of multipliers for special chickens (None = plain), and plain count
    sw, sb = r['sw'], r['sb']
    specials = r.get('ch')
    if specials is None:
        specials = ([{'special': 'W', 'count': 1, 'mult': 1.5}] * sw +
                    [{'special': 'B', 'count': 1, 'mult': 1.5}] * sb)
    plain = r['n'] - len(specials)
    if not stack: sp = [(ch['special'], ch.get('mult', 1.5), ch.get('count', 1)) for ch in specials]
    else:
        sp = [(ch['special'], inc(ch.get('count', 1)), ch.get('count', 1)) for ch in specials]
    return sp, plain
def race_ev(sp, plain, mode, it):
    racers = (sp + [None] * plain)[:8]; r = len(racers); tot = 0.0
    if r == 0: return 0
    for _ in range(it):
        vals = random.sample(VALS, 8)
        if mode in ('top', 'win') and any(racers):
            idx = [i for i, c in enumerate(racers) if c]; big = max(idx, key=lambda i: (racers[i][1], racers[i][0] == 'W'))
        else: big = random.randrange(r)
        w = big if (mode == 'win' and any(racers)) else random.randrange(r)
        base = random.choice([80, 100, 120]) if w == big else vals[w % 8]
        c = racers[w]
        tot += round(base * c[1]) if c else base
    return tot / it
def mark_ev(sp, plain, weighted):
    m = min(len(sp) + plain, 16)
    if not m: return 0
    s = sp[:m]; plain_n = m - len(s)
    weights = [ch[2] if weighted else 1 for ch in s]
    total = sum(weights) + plain_n
    return sum((10 if ch[0] == 'W' else 5) * ch[1] / 1.5 * weight
               for ch, weight in zip(s, weights)) / total
def run(label, stack=False, inc=None, mode='plain', it=300):
    race = mark_before = mark_after = 0
    for r in M:
        sp, plain = chickens(r, stack, inc)
        race += race_ev(sp, plain, mode, it)
        mark_before += mark_ev(sp, plain, False); mark_after += mark_ev(sp, plain, True)
    race *= CH / n
    mark_before *= (1 - CH) / n; mark_after *= (1 - CH) / n
    mark = mark_after
    tot = ROOMS + race + mark
    print(f"{label:44s} race/spin {race:6.3f}  mark/spin {mark:5.3f}  total {tot:6.3f}  payback {100*tot*EDGE/EV:6.1f}%  ev-for-same {EV*tot/(BASE or tot):6.2f}")
    if label == 'current odds (weighted Mark wedges)':
        before = ROOMS + race + mark_before
        before_ev = mark_before * n / ((1 - CH) * max(1, len(M)))
        after_ev = mark_after * n / ((1 - CH) * max(1, len(M)))
        print(f"Mark wheel EV/farm before {before_ev:.3f} after {after_ev:.3f}; "
              f"payback before {100*before*EDGE/EV:.3f}% after {100*tot*EDGE/EV:.3f}%")
    return tot
BASE = None
BASE = run('current odds (weighted Mark wedges)', mode='top')
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
