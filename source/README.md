# Wheel of Life Android app

The APK wraps `../wheel-of-life.html` in a full-screen WebView and adds the wallet in `wallet.js`.
There is no Android SDK in the build environment, so the APK is put together by hand:
`tools/mkapk.py` writes the binary manifest and resources, `dx` (Maven Central) makes the dex, `jarsigner` signs it.

## Rebuild after the game changes

1. In `config.json`, add 1 to `release` (and to `apk` too if anything in `src/`, `tools/mkapk.py` or `icons/` changed). Optionally set `notes`.
2. Run `node tools/build.mjs` (takes the latest `../wheel-of-life.html`).
3. Push `out/publish/*` to the root of `cillian1/belfast-wheel-app` on `main`. Phones see the update banner next time they open the app.
4. Copy `out/WheelOfLife.apk` to `../WheelOfLife.apk` for anyone installing for the first time.

Keep `keystore.p12` safe and private. Every APK must be signed with it, or Android refuses to install it as an update.

## Money

- Every amount is in cents. A spin costs the stake (20c to €1 in 10c steps).
- `tools/money.mjs` routes every prize the game shows or says through `$m()`. Payout = base prize × edge / ev × stake, so each stake returns about `edge` (99%) over time.
- `ev` is the average base prize per paid spin, measured by running the real game headless. Re-measure it if the prize tables or room odds change a lot.
- Firebase layout: `users/{name}`, `tx/{name}/{id}`, `reqs/{id}` (top-up and withdraw requests), `stats`, `config` (host PIN hash, edge).
