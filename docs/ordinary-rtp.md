# Ordinary-prize return target

Cillian’s 25 October 2026 decision is a **99.5% ordinary-prize RTP target**, equivalent to a 0.5% ordinary-prize house edge. He explicitly leaves the progressive jackpot’s funding/payout rules unchanged. Jackpot returns, free spins and promotions are excluded from this target. The separately requested current-pot reset to €60 was completed and verified; do not repeat it.

## Calibration carried forward to Update 40

Update40 changes only the forming-wedge drawing scale. Prize tables, chicken multipliers, slot counts, RNG calls and normalization are unchanged. The Update39 training/holdout records are reused and the artifact fingerprint is rebound to the visual-only source; this is not a new simulation sample.

The source-derived conditional room model uses roulette cash/gold/vault probabilities, the actual Monster tank tiers and overflow formula, optimal God higher/lower decisions, Pyramid prizes, recorded chicken multipliers and side-God payouts. Monster dice are modelled as independent fair d12s. Race indexed-tag means approximate the source’s biased shuffle using fixed-seed samples.

- Training: 50,000 full Chromium-core paths, seeds 1–50,000, with unchanged deep routes and the revised Pyramid/race/Monster payouts. All50,000 seeded path records match Update38. Mean base prize15.25068635; standard error0.21577255.
- Configuration: `edge=0.995`, `ev=15.25068635`. The model’s training normalization targets 99.5% before cent rounding. Versioned game calibration takes precedence over legacy host EV/edge overrides; unrelated host configuration still applies.
- Separate holdout: 10,000 full paths, seeds 50,001–60,000. Estimated ordinary return 103.88% with standard error3.30 percentage points. It passes the combined three-standard-error training/holdout comparison. This noisy holdout is **not** evidence that actual return is exactly 99.5%.

The committed [calibration artifact](ordinary-rtp-calibration.json) includes source fingerprint, sample counts, confidence intervals, conservative per-stake cent-rounding bounds and assumptions. It is a reproducible model calibration, **not certified theoretical or actual RTP**. Physical dice fairness, player God decisions, sampled race indexing and currency rounding are limits beyond path-sampling error. The 1,000-seed quick checker is a comparison diagnostic, not the calibration source.

The previous quick checker incorrectly treated Monster results as roulette and used inaccurate roulette/God/farm estimates. Those diagnostics cannot be compared directly with the corrected model. The corrected baseline/current quick line is reported on the money PR.

## Update39 redistribution

Ordinary Pyramid doors rise from60–200 to240–380 base units. At a20c stake, the released conversion gives€3.13–€4.96, up from€0.78–€2.60. The Wild door chance and its150/300/500/1000/2500 table are unchanged. All amounts still scale with stake.

Chicken Race deducts8 base units once after each special multiplier and rounding, with minimum1base so winning tags remain positive. This is about10c at20c for typical tags, less for tiny tags; final normalization/cent rounding can alter the exact before/after difference. The Monster tier values27/45/72/135 and overflow are90% of the previous values; fill thresholds/capacity and animations remain unchanged. Source-derived model uses the actual race tag helper, not a haircut on averaged tags.

For identical50,000 paths, mean base contributions per spin move Pyramid2.0930→2.7482 (+0.6552), Monster3.8206→3.4385 (-0.3821), farm/Mark including race2.9352→2.5758 (-0.3594). The reductions fully fund the Pyramid gain; total mean base return15.33689837→15.25068635. Recalibration retains the ordinary-only99.5% model target. The quick comparison now loads each version’s own model and payout source; it no longer reprices the baseline with proposed tables.

## Overflow accounting

Tank capacity is 120 can-units. The full-tank prize is135 base units; overflow is valued at `excess * 135 / 120`. At144 can-units this is135 tank +27 overflow =162 base units. Update39 reduces all tank tiers and overflow by10% before release normalization. The tank image stays capped; the excess goes into Phelan, he grows, then returns the excess through the animation. Only the combined final amount is converted and credited once; interim animation verdicts never pay.

## Reproduce

```sh
CHROMIUM_PATH=/usr/bin/chromium node tools/sim/run.mjs --engine core --spins 50000 --workers 4 --seed 1 > /tmp/training.json
CHROMIUM_PATH=/usr/bin/chromium node tools/sim/run.mjs --engine core --spins 10000 --workers 2 --seed 50001 > /tmp/holdout.json
node tools/calibrate-ordinary-rtp.mjs /tmp/training.json /tmp/holdout.json docs/ordinary-rtp-calibration.json
node tools/bundle.mjs
node tools/test-ordinary-ev.mjs
```

The calibration command writes the artifact and updates only the bundled ordinary-prize EV/edge configuration. It never writes Firebase, balances or jackpot values. Recalibrate and independently review future ordinary prize/path changes; do not silently retune a progressive jackpot or claim a finite simulation proves an exact long-run edge.
