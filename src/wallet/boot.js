  // ---------- boot ----------
  // Owns wallet startup and initial state restoration.
  const savedStake = +pref.get('wol.stake'); if (okStake(savedStake)) W.stake = savedStake;
  W.user = pref.get('wol.user');
  W.jackpot = JACKPOT_START;
  paint();
  if (W.user) refresh(); else showLogin();
  refreshJackpot();
  checkUpdate();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { refresh(); refreshJackpot(); } });
  setInterval(() => { if (!busy && !document.hidden) refresh(); }, 30000);
  heartbeat(); setTimeout(heartbeat, 2500); setInterval(() => { if (!streaming) heartbeat(); }, 15000); // the second one runs once the account has loaded
