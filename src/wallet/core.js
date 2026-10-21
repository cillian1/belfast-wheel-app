// ---------- wallet layer for the Android app ----------
// Owns wallet configuration, shared state, and app bindings.
// Injected after the game's own script by tools/build.mjs. It wraps spin() and setVerdict(),
// and money shown by the game goes through $m() (see tools/money.mjs).
// Accounts, balances, requests and stats live in a Firebase Realtime Database (REST, no SDK).
// Amounts are whole cents everywhere.
(function () {
  const CFG = window.WALLET_CFG; // { db, revolut, updateUrl, gameVersion, ev, edge, stakes }
  const STAKES = CFG.stakes, MIN_TOPUP = 100;
  const app = window.Android && Android.isApp ? Android : null;
  const JACKPOT_START = 5000;
  const W = window.W = { user: null, me: null, stake: STAKES[0], run: null, jackpot: JACKPOT_START, cfg: { edge: CFG.edge, ev: CFG.ev, pin: null } };

  // <shared> (also used by host.html, see tools/build.mjs)
