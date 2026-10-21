# Copilot tasks: the big update (from Claude, 2026-10-21)

Copilot, these are your tasks for Cillian's next big update. Read `HANDOFF.md` first; its rules still apply. Cillian has lifted the hold on new features for this update.

## Who does what

| Work | Who | Where in `game/index.html` |
|---|---|---|
| Chicken Race bonus room, Ghost Phelan sabotage | Claude | game script (rooms) |
| Wheel graphics: light sweep, glowing win slice, 3D rim and pointer | Claude | game script (`build*`, `draw*` for the wheels) |
| Daily free spin | Claude | wallet + game |
| Prize odds for the new room | Claude, using the fast sim in the odds thread | — |
| **Task 1: stats and leaderboard redesign** | **Copilot** | wallet: `accountSheet`, `meTab`, `lbTab`, wallet CSS |
| **Task 2: trophies** | **Copilot** | wallet only |
| **Task 3: performance pass** | **Copilot, after Claude's update has merged** | game script |

Claude ships update 20 to `main`. Copilot's tasks are separate PRs that take the next free version number when they merge (21, 22 …), one release at a time. **Before starting, make sure PR #1 is merged, then branch from the latest `main`.** Make one branch and one PR per task, for example `copilot/stats-redesign`, `copilot/trophies` and `copilot/perf`.

Nothing in your tasks touches money: no balance changes, no prizes, no payout maths, no `Final answer · €X` wording, no stake rules and no jackpot logic. If a task seems to need one of those, stop and write the question in your PR.

---

## Task 1: stats and leaderboard redesign (wallet UI)

**Goal:** Cillian wants the account sheet cleaner, simpler and friendlier, with only the information that matters. It's opened by tapping the name/balance box (`#wWho`) and today has a **Me** tab and a **Leaderboards** tab.

**Today:** `meTab` shows a 6-tile grid, pending withdrawals, Top up and Withdraw buttons, and the last 40 transactions. `lbTab` shows 4 global tiles and four top-5 boards.

**Build:**
1. **Me tab:**
   - A large balance at the top, with Top up and Withdraw directly under it.
   - One line of three small stats: Spins, Biggest win and Up/down. Colour Up/down green or red.
   - Pending withdrawals as a single highlighted line, shown only when there are some.
   - History grouped by day ("Today", "Yesterday", or a date). Collapse consecutive spins into one line, e.g. "12 spins −€1.20". Wins, top-ups, withdrawals, refunds and host adjustments stay as their own lines. Show 15 lines with a "Show more" button.
   - Log out as a small link at the bottom.
2. **Leaderboards tab:**
   - One board at a time, picked with a row of chips: Most won, Biggest win, Most spins, Best up/down.
   - Show every player, not just the top 5. Mark the current player's row ("You").
   - One line of global stats above the chips: total spins and the biggest ever win with the winner's name.
3. Keep it readable at 320–440px wide without horizontal scroll, and keep using the existing colours, fonts and `.wbtn`/`.wlist` styles where they fit.
4. Remember the last chosen board in `pref` (the existing helper) so the tab reopens on it.
5. The `test` account never appears on leaderboards. This is already filtered, so keep it that way.

**Done when:** both tabs look clean at 320, 360 and 412px with 3–5 players, long names (15+ characters) and 4-digit amounts, and the data matches what the old tabs showed. Put a screenshot or a short description of each width in the PR.

**Status (Task 1):** Redesigned the Me history and leaderboard views; validated the game page in headless Edge and `git diff --check`. Layout description for the PR: at 320px the balance/actions and three stats stay in a single-column flow, chips wrap into two columns, and names can wrap; at 360px the same compact layout has more room for amounts and history; at 412px the sheet remains centered and wider, with two rows of chips and the full player list. No live 3–5-player screenshot fixture was available.

---

## Task 2: trophies (wallet only, no money)

**Goal:** collectible badges for things players do. They're for bragging only and **never add money**.

**Storage:** `users/{key}/trophies/{trophyId}` holds the time it was earned (ms). Add it with a single `db.put` the first time only, and check the local copy in `W.me.trophies` first. The `test` account can earn trophies, but test trophies never show on leaderboards.

**Trophies to build (ids in brackets):**
| Trophy | When |
|---|---|
| First spin (`first`) | first paid spin |
| Regular (`spins100`) | 100 spins |
| Lifer (`spins1000`) | 1000 spins |
| Stank Chamber (`stank`) | reaching the Stank Chamber room |
| Monster tank (`monster`) | reaching the Monster tank room |
| God room (`god`) | reaching the God room |
| Pyramid (`pyramid`) | all six tiles lit |
| Phelan's Tomb (`tomb`) | winning the Tomb plaque |
| Even deeper (`deep5`) | reaching the hidden 5th inner wheel |
| Golden run (`golden`) | a golden run |
| Big winner (`big`) | a single win of 50× the bet or more |
| Chicken Race (`race`) | winning the Chicken Race. Claude is building the room, so wire this one after update 20 merges. Its final verdict title will start with `Chicken Race`. |

**How to detect them:** use what the wallet already sees. It wraps `spin()` and `setVerdict()`, and the highlight recorder reads `scene` (room names are in the `ROOMS` map), so read game globals the same way and don't edit the game script. For the 5th wheel and golden runs, look for the existing globals (`DEPTH`, and the golden-run flag set in `runMain`). If something can't be detected without changing the game script, leave that trophy out and list it in the PR.

**Show them:**
- When a trophy is earned, show a small gold toast with the trophy name and an icon, once.
- Add a **Trophies** section to the Me tab (Task 1's layout): a grid of all trophies with the earned ones lit and the rest greyed. Tapping one shows how to earn it.
- On the Leaderboards tab, add a "Most trophies" chip.

**Done when:** each trophy you could wire fires exactly once per player, survives an app restart, and never changes a balance. Say in the PR how you tested it.

**Status:** Implemented 11 trophies and the Most trophies leaderboard on the current account UI. Inline scripts parse; mocked runtime checks cover single-write deduplication, restart state, and failed-write retry. Live Firebase/account gameplay remains untested here. Chicken Race is deferred until update 20 merges, and release versioning remains pending that update.

---

## Task 3: performance pass (start only after update 20 has merged)

**Goal:** the game runs smoother on mid-range Android phones and looks the same.

**Rules:**
- **Same visuals.** Compare before and after screenshots of the main wheel, the inner wheels, each room and the ball chart. They should be indistinguishable.
- **Don't rename game globals.** Watch mirrors read them by name (the `MIRROR` list in the wallet). If you must rename one, update `MIRROR`, `SLOW` and `ANGLES` too, and say so in the PR.
- Don't change odds, timings players can feel, or anything in the wallet's money code.

**Where to look:**
1. `draw()` redraws everything every frame. Cache what doesn't change between frames, such as wheel faces at rest, the dartboard and static room backgrounds, in offscreen canvases, and only rebuild them when `N` changes or the slice order changes (`runOrders`).
2. Find per-frame allocations (new gradients, arrays and closures inside animation loops) and hoist them.
3. The fireplace room (`drawRoom`) already runs at about 15fps. Make sure it stops while the tab is hidden.
4. `shadowBlur` is expensive on Android. Find it in per-frame code and pre-bake it where you can.
5. Measure: add a temporary frame-time counter (not committed) and report average frame time on a long deep run before and after, at 412px width with DPR 2.

**Done when:** the PR shows before and after frame times, a list of what changed, and confirms the visuals match.

---

## When you finish a task

Add a short status line under that task in this file (done, how tested, open questions), open the PR with a clear title, and stop. Claude reviews it and Cillian merges.
