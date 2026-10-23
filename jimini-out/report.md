# Performance and Development Analysis Report

This report identifies key bottlenecks in the Belfast Wheel's graphical performance on mobile devices and suggests strategies to streamline the development and testing workflow. The primary performance issues stem from redundant per-frame allocations and un-cached complex scenes, while development speed is hindered by sequential tooling and fragmented test execution.

## 1. Graphic Performance Improvements

### Redundant Per-Frame Gradient Allocation
- **What's wrong:** Multiple rooms and effects (fireplace, dice glows, deep-spin glows) create new `CanvasGradient` objects using `createLinearGradient` or `createRadialGradient` in every single animation frame.
- **Where:** `src/game/room.js:84` (fireplace), `src/game/drawing.js:52` (dice), `src/game/drawing.js:72` (deep glow), `src/game/ultra-bonus.js:215` (Stank Chamber).
- **Why it matters:** In Canvas2D, creating gradient objects is a high-allocation operation that triggers frequent garbage collection (GC) and is significantly slower on mobile browsers (especially older Android). This often accounts for the "sluggish" feel even when frame rates look acceptable.
- **Suggested Fix:** Pre-bake generic gradients into small offscreen canvases (e.g., a 64x64 radial glow or a 1x100 linear flame gradient) during initialization. Use `ctx.drawImage` to stretch and place these pre-rendered assets. For dynamic colors, use `globalCompositeOperation` or a few variations of the pre-baked assets.
- **Confidence:** High.

### Lack of Background Caching in Bonus Rooms
- **What's wrong:** While the main wheel uses a `navCache` to avoid redrawing all layers, bonus rooms like the Stank Chamber and God Room redraw their entire backgrounds and complex wheel faces every frame.
- **Where:** `src/game/ultra-bonus.js:199` (drawStank), `src/game/god-room.js`.
- **Why it matters:** Drawing static decorations, complex ridges, and high-quality wedge text for a dozen slices every frame is expensive. On a 320px-440px phone, this can easily push the frame budget past 8ms.
- **Suggested Fix:** Implement the `navCache` pattern for all bonus rooms. Render the static background and the unrotated wheel face to offscreen canvases once. In the `draw()` loop, only perform a single `rotate()` and `drawImage()`.
- **Confidence:** High.

### Excessive Particle Iteration and Individual Drawing
- **What's wrong:** Effects like `drawDeepGlow` and the God Room's `godParts` iterate through many individual particles, calling `beginPath()`, `arc()`, and `fill()` for each one.
- **Where:** `src/game/drawing.js:72`, `src/game/core.js:101`.
- **Why it matters:** Every individual Canvas call has overhead. Drawing 50-100 individual glow circles per frame can consume a large portion of the mobile GPU/CPU budget.
- **Suggested Fix:** Use a "sprite sheet" approach for particles. Draw a single glow sprite to a hidden canvas, then use the fastest `drawImage` variant to place copies of it. For many particles, consider drawing them all to a single "frame canvas" that only updates occasionally, or use a simpler "particle pool" that skips frames for half the particles in `low` mode.
- **Confidence:** Medium-High.

---

## 2. Streamlining Development and Testing

### Sequential and Monolithic Tooling
- **What's wrong:** `tools/check.mjs` runs syntax validation, version checks, and a 1000-run payback simulation sequentially. It also uses `execFileSync` to fetch base versions from Git for every file.
- **Where:** `tools/check.mjs:1-120`.
- **Why it matters:** The "quick" check takes several seconds, discouraging frequent use during development. Spawning multiple Git processes is particularly slow in some environments.
- **Suggested Fix:** Use `Promise.all` to run independent checks in parallel. Cache the "main" branch payback result in a local temporary file (e.g., `.check-cache.json`) and only re-calculate it when `main` moves. Use a single `git show` command with a pipe or a temporary directory to avoid multiple process spawns.
- **Confidence:** High.

### Fragmented Test Suite
- **What's wrong:** There are over 20 separate `test-*.mjs` files in the `tools/` directory, with no single command to run them all efficiently.
- **Where:** `tools/test-*.mjs`.
- **Why it matters:** Developers have to remember which tests to run or wait for the full CI pipeline, which uses a slow browser-based smoke test.
- **Suggested Fix:** Introduce a unified `tools/test.mjs` runner. This script should scan for `test-*.mjs` files and execute them in parallel using Node's native `child_process` or `worker_threads`. A summary report should show exactly which test failed. Add a `--watch` mode that uses `fs.watch` to re-run only the tests related to changed files.
- **Confidence:** High.

### Dependence on Browser Smoke Tests for Logic
- **What's wrong:** Many invariants are verified by `test-ci-browser.mjs`, which launches a full browser.
- **Where:** `tools/test-ci-browser.mjs`.
- **Why it matters:** Browser-based tests are inherently slower and more brittle than pure-logic tests.
- **Suggested Fix:** Move more "game logic" validation (RNG sequences, state transitions, wallet math) into the browser-free `sim/core.mjs` and test it with fast, pure Node.js scripts. Reserve Playwright/Chromium for layout-critical visual checks only.
- **Confidence:** Medium.
