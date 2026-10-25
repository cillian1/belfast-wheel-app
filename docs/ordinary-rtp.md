# Ordinary-prize return target

Cillian’s 25 October 2026 decision is a **99.5% ordinary-prize RTP target**, equivalent to a 0.5% ordinary-prize house edge. He explicitly leaves the progressive jackpot’s funding/payout rules unchanged. Jackpot returns, free spins and promotions are excluded from this target. The separately requested current-pot reset to €60 was completed and verified; do not repeat it.

## Calibration for Update 37

The source-derived conditional room model uses roulette cash/gold/vault probabilities, the actual Monster tank tiers and overflow formula, optimal God higher/lower decisions, Pyramid prizes, recorded chicken multipliers and side-God payouts. Monster dice are modelled as independent fair d12s. Race indexed-tag means approximate the source’s biased shuffle using fixed-seed samples.

- Training: 50,000 full Chromium-core paths, seeds 1–50,000, after fixed-clock physics and exact Plinko launch-position corrections. Mean base prize 14.81475200; standard error 0.18771646.
- Configuration: `edge=0.995`, `ev=14.814752`. The model’s training normalization targets 99.5% before cent rounding. Versioned game calibration takes precedence over legacy host EV/edge overrides; unrelated host configuration still applies.
- Separate holdout: 10,000 full paths, seeds 50,001–60,000. Estimated ordinary return 103.16% with standard error 2.91 percentage points. It passes the combined three-standard-error training/holdout comparison. This noisy holdout is **not** evidence that actual return is exactly 99.5%.

The committed [calibration artifact](ordinary-rtp-calibration.json) includes source fingerprint, sample counts, confidence intervals, conservative per-stake cent-rounding bounds and assumptions. It is a reproducible model calibration, **not certified theoretical or actual RTP**. Physical dice fairness, player God decisions, sampled race indexing and currency rounding are limits beyond path-sampling error. The 1,000-seed quick checker is a comparison diagnostic, not the calibration source.

The previous quick checker incorrectly treated Monster results as roulette and used inaccurate roulette/God/farm estimates. Those diagnostics cannot be compared directly with the corrected model. The corrected baseline/current quick line is reported on the money PR.

## Overflow accounting

Tank capacity is 120 can-units. The full-tank prize is 150 base units; overflow is valued at `excess * 150 / 120`. At 144 can-units this is 150 tank +30 overflow =180 base units. The tank image stays capped; the excess goes into Phelan, he grows, then returns the excess through the animation. Only the combined final amount is converted and credited once; interim animation verdicts never pay.

## Reproduce

```sh
CHROMIUM_PATH=/usr/bin/chromium node tools/sim/run.mjs --engine core --spins 50000 --workers 4 --seed 1 > /tmp/training.json
CHROMIUM_PATH=/usr/bin/chromium node tools/sim/run.mjs --engine core --spins 10000 --workers 2 --seed 50001 > /tmp/holdout.json
node tools/calibrate-ordinary-rtp.mjs /tmp/training.json /tmp/holdout.json docs/ordinary-rtp-calibration.json
node tools/bundle.mjs
node tools/test-ordinary-ev.mjs
```

The calibration command writes the artifact and updates only the bundled ordinary-prize EV/edge configuration. It never writes Firebase, balances or jackpot values. Recalibrate and independently review future ordinary prize/path changes; do not silently retune a progressive jackpot or claim a finite simulation proves an exact long-run edge.
