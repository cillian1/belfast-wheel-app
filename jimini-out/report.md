# Update 32 Report: Odds impact of special d20 dice

This report analyzes the proposed changes for Update 32 in the Monster Tank room, specifically making special/bonus dice 20-sided and updating visual styles. While the visual changes are low-risk, the shift from d12 to d20 for special dice represents a significant increase in the expected value (EV) of the bonus round if outcome mapping remains linear.

## Current Monster Tank Odds

The Monster Tank room currently operates as follows:
- **Dice:** 10 ordinary dice + variable "special" dice (Gold for Wilds, Purple for Bonus ankhs > 3).
- **Type:** All dice are currently 12-sided (d12).
- **Dot Mapping:** Each dot on a standard die = 1 "can" (dot). Special dice dots count for 2 ("big cans").
- **Expected Value (EV):**
    - Standard d12: **6.5 dots** (Average of 1-12).
    - 10 Standard dice: **65.0 dots**.
    - Special d12 (weighted x2): **13.0 dots**.
- **Prize Tiers:**
    - €30: 0-67 dots
    - €50: 68-77 dots
    - €80: 78-89 dots
    - €150: 90+ dots

Under the current system, a player with no special dice averages 65 dots, placing them just below the €50 tier. A single special die (EV 13) brings the average to 78, hitting the €80 tier exactly.

## Impact of d20 Special Dice

Changing special dice to 20-sided (d20) while keeping the 1:1 face-to-dot mapping and the "big can" (x2) multiplier has the following impact:
- **d20 EV (Standard):** 10.5 dots (Average of 1-20).
- **d20 EV (Weighted x2):** **21.0 dots**.
- **Impact:** An increase of **+8.0 dots per special die** (+61.5% compared to d12).

### Tank Saturation
The top prize tier is €150 at 90 dots. With 10 standard d12s (EV 65), a player only needs 25 more dots to hit the maximum prize.
- **Current (d12):** Requires ~2 special dice to likely hit the top tier (65 + 13 + 13 = 91).
- **Proposed (d20):** Requires only ~1.2 special dice to likely hit the top tier (65 + 21 = 86).

The maximum possible dots with 10 standard dice and 2 special d12s is 168. With 2 special d20s, it rises to 200. Given the `TANK_CAP` is 120 and the top prize is at 90, the d20 change makes the maximum payout significantly easier to achieve and frequently results in "overflowing" the tank visually.

## Visual Styling Changes

The request includes:
1. **Ordinary dice:** White color.
2. **Special/Bonus dice:** Designated colors (Gold/Purple).

Current ordinary dice are light purple (`[190, 120, 255]`). Shifting to white (`[255, 255, 255]`) is a safe visual update that does not affect odds.

## Decisions Required

To preserve the intended odds and expected return, Cillian or the project coordinator must decide on one of the following mappings for the d20 special dice:

### Option A: Buff (No preservation)
Accept the increased EV. The game becomes significantly more generous when Wilds or extra Bonus ankhs are collected.
*   **Mapping:** 1:1 (Face value = Dots).
*   **Weight:** x2 (Big cans).

### Option B: Weighted Neutrality
Adjust the multiplier for d20 dice so their EV contribution matches the current special d12 (13.0).
*   **Mapping:** 1:1.
*   **Weight:** **x1.25** (instead of x2). *Note: This loses the "big can = 2 dots" simplicity.*

### Option C: Threshold Adjustment
Increase the requirements for the prize tiers to compensate for the higher dot availability.
*   **Proposed Tiers:** 90 dots for €80, 110+ dots for €150.

### Option D: Outcome Remapping
Keep the x2 multiplier but map the d20 faces to a non-linear set of dots (e.g., 1-20 maps to a distribution averaging 6.5). This is visually confusing as the number of pips/dots won't match the face number.

## Recommendation

Acknowledge the visual styling (White/Gold/Purple) as approved. Request a decision on **Option A (Buff)** or **Option C (Thresholds)**, as they preserve the player's intuitive understanding that "Higher number on die = More dots" and "Special die = Double dots".

**Note:** D20 geometry (icosahedron) is not currently implemented in `src/game/dice.js` and will need to be added during the execution phase.
