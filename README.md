# Wheel of Life app

Updates for the Wheel of Life Android app. The app reads `version.json` on launch:
- `game` is newer than the installed one: it downloads `game/index.html` inside the app.
- `apk` is newer: it downloads `app/WheelOfLife.apk` and opens the Android installer.

`source/` is how the app is built (see `source/README.md`). The signing key is not in this repo.
