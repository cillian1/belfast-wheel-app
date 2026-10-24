# Update 34: Scope and Assignments

Update 34 is a "small improvements" release focused on rule transparency, technical hygiene, and chat usability. With Claude unavailable, the scope is kept strictly to low-risk, non-overlapping changes that can be verified via the existing CI and phone-check routines.

## Scope Validation & Ranking

1. **Rule Transparency: 10c Free-Spin Help** (Rank: 1)
   - **Where:** `src/index.html:16`
   - **What:** The help text omits the requirement that the "first 5 free spins" only apply to 10c bets. This is a common point of confusion for players.
   - **Fix:** Update the bullet point to: `<li><b>Spin</b> to play. Your first 5 10c spins each day are free.</li>`.
   - **Done-when:** Help modal accurately reflects the 10c condition.
   - **Owner:** RolexG.

2. **Technical Hygiene: Photo URL Cleanup** (Rank: 2)
   - **Where:** `src/game/show-me.js:142-149` (`onFile` function).
   - **Status:** **DUPLICATE** (identified in Update 33 analysis but not implemented).
   - **What:** `URL.createObjectURL(f)` is called on every photo selection but never revoked. This causes a memory leak on mobile browsers as users experiment with different photos.
   - **Fix:** Store the object URL and call `URL.revokeObjectURL(url)` in both `im.onload` and `im.onerror` (after the image is processed).
   - **Done-when:** Memory usage remains stable across multiple photo selections; re-selecting the same photo still works.
   - **Owner:** RolexG.

3. **Usability: Banter Jump-to-Latest** (Rank: 3)
   - **Where:** `chat.html`
   - **What:** On long chat threads, scrolling up to read history makes it difficult to quickly return to the bottom to see new messages or type a reply.
   - **Fix:** Add a floating "Jump to latest" button (positioned near the bottom right) that appears when the user has scrolled up more than 300px and disappears when they are near the bottom.
   - **Done-when:** Button is visible only when scrolled up; clicking it scrolls the view to the very bottom.
   - **Owner:** Copilot.

## Suggested Alternative

**Improved Retake Options**
- **Where:** `src/index.html:54-57` (`#photoActions`).
- **What:** Currently, the photo scene only offers a "Retake" button linked to the camera (`for="cam"`). If a user wants to pick a *different* existing photo from their library, they must click "Back" and start over.
- **Fix:** Add a second label to `#photoActions` for the library: `<label class="btn" for="lib">Choose another</label>`.
- **Done-when:** Both camera and library options are available directly from the photo scene.
- **Owner:** RolexG (combine with Photo URL cleanup).

## Workflow Health

**Prerequisite: HANDOFF.md "NOW" Cleanup**
- **Where:** `HANDOFF.md` (top 20 lines).
- **Issue:** The Banter bots are currently hallucinating based on old history (Update 28/31).
- **Fix:** Explicitly state "Update 34 Planning" and "Claude is unavailable" at the very top of the NOW section. Remove stale progress items from previous updates.
- **Done-when:** Bots stop referencing Update 31 in their chat reasoning.
