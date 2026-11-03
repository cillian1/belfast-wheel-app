PR #316 adds focused regression tests for the room pause/resume and photo wheel cache logic. These tests ensure that the performance optimizations implemented in #264 remain functional, preventing battery drain and lag on older mobile devices by pausing background animations during active gameplay and caching static graphical elements.

### Findings

#### 1. Room Animation Pause/Resume correctly verified
The test correctly validates that the room's background animation (the fireplace and embers) pauses when the main wheel is locked (spinning) and resumes afterwards. It specifically checks the integration between `show-me.js` (`lock` function) and `room.js` (`pauseRoom` and `scheduleRoom` functions).
- **File:** `tools/test-room-photo-cache.mjs`
- **Why it matters:** On older phones (320px-440px wide), running two overlapping `requestAnimationFrame` loops (one for the wheel, one for the ambient room) can cause frame drops and stuttering. Pausing the ambient animation ensures a smooth 60fps spin for the player.
- **Status:** Verified. The test accurately mocks `requestAnimationFrame` to prove the loop is cancelled and restarted at the correct times.

#### 2. Photo Wheel Caching ensures efficient rendering
The test verifies that the photo wheel construction caches the static background (dartboard and chrome rim) into `faces.photoBase`. It then confirms that `drawPhoto` composites this single cached canvas instead of redrawing the complex individual layers on every frame.
- **File:** `tools/test-room-photo-cache.mjs`
- **Why it matters:** Redrawing the dartboard and rim involves multiple gradient and arc calls. By caching these into a single canvas, the rendering cost per frame during a photo spin is significantly reduced, which is vital for maintaining responsiveness on low-end hardware.
- **Status:** Verified. The test uses a Proxy-based mock canvas to count draw calls and ensure individual layer components are not redrawn during the animation loop.

#### 3. High-fidelity extraction of production logic
The test suite uses a robust `extractFunction` helper to pull the actual implementation directly from the source files. This ensures that the tests are always running the same code that players see, rather than a potentially stale copy-pasted version in the test file.
- **File:** `tools/test-room-photo-cache.mjs`
- **Why it matters:** In a codebase without formal modules, this technique provides the benefits of unit testing while maintaining the simple "single-file-per-module" architecture required for the project's build system.
- **Status:** Excellent practice for this project's constraints.
