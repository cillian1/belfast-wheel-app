# Update 33: Smoothness and "Show me" investigation

Update 33 focuses on improving the main wheel room's performance on mobile devices and fixing the broken "Show me" (photo) feature. Analysis of the game loop, layout logic, and photo flow reveals several bottlenecks and a logic error in the verdict presentation.

## Smoothness Findings

Likely causes of jank on phones, ranked by impact:

1. **Layout Thrash in `fitStage()`** (`src/game/drawing.js:343`)
   - **What's wrong:** Iterates through all `.app` children and calls `getComputedStyle(el)` and `el.offsetHeight` in a loop.
   - **Why it matters:** This triggers a reflow for every element. It's called by `setVerdict`, which fires at every major milestone in a spin, causing noticeable stutters mid-game.
   - **Fix:** Pre-calculate or cache child visibility/heights, or at least read them in a way that doesn't alternate with writes.

2. **Unthrottled Banter Polling** (`src/wallet/watch.js:208`)
   - **What's wrong:** `pollFeed()` runs every 6 seconds via `setInterval`.
   - **Why it matters:** It doesn't check if the game is `busy` (spinning). A network fetch and JSON parse happening mid-spin is a prime candidate for frame drops.
   - **Fix:** Skip polling if `busy` is true.

3. **Lack of Caching in `drawPhoto()`** (`src/game/drawing.js:217`)
   - **What's wrong:** Redraws `faces.dart` and `faces.base` (two fullscreen canvases) every frame during the photo spin.
   - **Why it matters:** Unlike the main nested wheel (`drawNested`), the photo wheel isn't using `navCache`. Redrawing large canvases per-frame is heavy for mobile GPUs.
   - **Fix:** Cache the static base of the photo wheel (dart + base + photo background) into a single canvas.

4. **Redundant Animation Loops** (`src/game/room.js`, `src/game/perf.js`)
   - **What's wrong:** Three separate `requestAnimationFrame` loops (Room fire, Perf meter, Game loop) running concurrently.
   - **Why it matters:** On old Androids, the overhead of multiple RAF callbacks competing for the main thread can cause micro-stutter.
   - **Fix:** Pause the Room fire animation (`drawRoom`) when `busy` is true; the wheel covers most of it anyway.

5. **Heavy CSS Shadows** (`src/css/app.css`)
   - **What's wrong:** Large `box-shadow` on `.plate`, `.spin`, and `.btn.ti`.
   - **Why it matters:** Huge shadows on large elements require significant paint time on mobile.
   - **Fix:** Reduce blur radius or use `will-change: transform` to promote these to their own layers.

## "Show me" Findings

The feature "no longer works" due to these issues:

1. **Missing Verdict Plate** (`src/game/show-me.js:128`)
   - **What's wrong:** `spinPhoto` calls `setVerdict` for the result but omits `photo: true`.
   - **Why it matters:** When `photo` and `show` are both false, the verdict plate (`#verdict`) is hidden by `ui.js`. The player spins, the wheel stops, and the result is whispered but the text never appears.
   - **Fix:** Ensure `photo: true` is passed to the final `setVerdict` in `spinPhoto`.

2. **Resolution Mismatch** (`src/game/ui.js:52`)
   - **What's wrong:** `setVerdict` calls `fitStage()`, which changes the CSS width of the stage, but it doesn't trigger `resize()`.
   - **Why it matters:** The canvas resolution `N` remains at the old value. The photo wheel is built and drawn at the wrong size, leading to blurriness or clipping.
   - **Fix:** Call `resize()` after `fitStage()` if the dimensions changed.

3. **Resource Leak** (`src/game/show-me.js:136`)
   - **What's wrong:** `URL.createObjectURL(f)` is used but never revoked.
   - **Why it matters:** Multiple photo attempts (retakes) will leak memory until the page is reloaded.
   - **Fix:** Call `URL.revokeObjectURL` after the image is loaded and drawn to the canvas.

## Task List for RolexG

### Task 1: Main wheel room smoothness - Layout & Polls (Small)
- **Goal:** Stop layout thrash and polling during spins.
- **Action:** 
  1. Optimize `fitStage` in `src/game/drawing.js` to avoid redundant `getComputedStyle` calls.
  2. In `src/wallet/watch.js`, check `if (typeof busy !== 'undefined' && busy) return;` at the start of `pollFeed`.
- **Done-when:** `tools/check.mjs` is green, and `fitStage` loop is cleaned up.

### Task 2: Room & Photo Caching (Small)
- **Goal:** Reduce per-frame draw work.
- **Action:**
  1. In `src/game/room.js`, pause `drawRoom` RAF loop if `busy` is true.
  2. In `src/game/faces.js`, add a `buildPhotoBase` to cache the dart and chrome rim for the photo scene.
  3. Update `drawPhoto` in `src/game/drawing.js` to use this cache.
- **Done-when:** Photo spin is visibly smoother; Room animation pauses during main spin.

### Task 3: Fix "Show me" Verdict & Leaks (Small)
- **Goal:** Make the result visible and fix the memory leak.
- **Action:**
  1. In `src/game/show-me.js`, pass `photo: true` to the final `setVerdict` in `spinPhoto`.
  2. Revoke the object URL in `onFile` after the image loads.
  3. In `src/game/ui.js`, ensure `resize()` is called if `fitStage()` changed the stage width.
- **Done-when:** "Show me" result text is visible after spin; photo retakes don't balloon memory.
