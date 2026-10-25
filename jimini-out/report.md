# Update 38 Audit: "Stay Deep" Invariant

I have conducted an independent read-only audit of the "stay deep" invariant requested in issue #303. The goal is to ensure that once a player enters the nested wheels (Wheel 1 or deeper), they cannot be routed back to the main wheel (Wheel 0) through any "back" transitions (UP, U2, UW, UB).

## Findings

### 1. Verification of Reported Bug
**Status:** Confirmed.
In the current `src/game/ui.js` (L110), the transition logic for "up" slices uses `Math.max(0, k - dist)`. When a player is on Wheel 1 (`k=1`) and hits an `UP` slice (`dist=1`), or on Wheel 2 (`k=2`) and hits a `U2` slice (`dist=2`), `targetK` becomes 0. This causes the loop to spin the main wheel (Wheel 0) in the next iteration. If the resulting slice on Wheel 0 is not a "deep" slice, the run ends prematurely. This matches the behavior reported by Austin.

### 2. Audit of Proposed Fix
**Status:** Correct and Effective.
The Gambler's plan to use a `floor1` route (clamping `targetK` to at least 1) is the correct architectural fix. 
- **Clamping:** Changing `Math.max(0, k - dist)` to `Math.max(1, k - dist)` in `src/game/ui.js` ensures that `targetK` is always at least 1 when triggered from within the deep loop (where `k >= 1`).
- **Unreachable Code:** The `if (k === 0)` block inside the `runMain` loop (L83-93) becomes unreachable if `targetK` is clamped to 1. Removing this block is a clean and safe refactor that aligns with the new invariant.

### 3. Regression Test Requirements
**Status:** Action Required.
The existing regression test `tools/test-depth-routes.mjs` currently expects `U2` from Wheel 1 to route to Wheel 0 (`const nextK = key === 'U2' ? 0 : 2`). 
- **Update Needed:** This test must be updated to expect `nextK = 1` for `U2` transitions from Wheel 1.
- **New Coverage:** Additional test cases should be added to verify that `U2` from Wheel 2 also floors at Wheel 1, and that repeated "back" hits maintain the `k=1` boundary.

### 4. RTP Recalibration
**Status:** Mandatory.
This change is player-favorable as it removes paths that lead to a premature end of a run. Consequently, the ordinary prize EV will increase. To maintain the 99.5% target, a full 50k+10k recalibration is required. I have verified that the Gambler has initiated this process.

## Blockers
The implementation branch `gambler/update-38-stay-deep` was not present in the workspace at the time of this audit. This report is based on the intended plan and the existing source code. A final verification against the actual pushed code is required once available.

## Recommendation
Approve the "stay deep" logic as planned. Ensure the regression tests are updated to reflect the new floor before merging.
