  // ---------- accounts ----------
  // Owns account login, refresh, and logout flows.
  function showLogin(msg) {
    login.hidden = false;
    login.innerHTML = `<div class="wpanel"><h1>WHEEL OF LIFE</h1>
      <p>Log in with your name and password, or make a new account. No email needed.</p>
      <input id="wName" autocomplete="username" placeholder="Name" maxlength="20">
      <input id="wPass" type="password" autocomplete="current-password" placeholder="Password" maxlength="40">
      <p class="err" id="wErr">${esc(msg || '')}</p>
      <div class="wrow"><button class="wbtn gold" id="wIn" type="button">Log in</button><button class="wbtn" id="wNew" type="button">New account</button></div></div>`;
    const go = async isNew => {
      const name = $w('wName').value.trim(), pass = $w('wPass').value;
      if (name.length < 2) return ($w('wErr').textContent = 'Type a name (2 letters or more).');
      if (pass.length < 3) return ($w('wErr').textContent = 'Password needs 3 characters or more.');
      $w('wErr').textContent = isNew ? 'Making your account…' : 'Logging in…';
      const k = keyOf(name), h = sha256(k + ':' + pass);
      try {
        const u = await db.get('users/' + k);
        if (isNew) {
          if (u) return ($w('wErr').textContent = 'That name is taken. Log in instead, or pick another.');
          const test = k === TEST_KEY; // play money, not real
          await db.put('users/' + k, { name, pass: h, balance: test ? 10000 : 0, spins: 0, staked: 0, won: 0, biggest: 0, topped: 0, withdrawn: 0, created: now(), test: test || null });
          if (!test) db.txn('stats/players', n => (n || 0) + 1).catch(() => {});
        } else {
          if (!u) return ($w('wErr').textContent = 'No account with that name. Tap New account.');
          if (u.pass !== h) return ($w('wErr').textContent = 'Wrong password.');
        }
        W.user = k; pref.set('wol.user', k); pref.set('wol.pass', h);
        login.hidden = true; await refresh(); toast(isNew ? 'Welcome, ' + name + '. Top up to start spinning.' : 'Welcome back, ' + (W.me ? W.me.name : name), true);
      } catch (e) { $w('wErr').textContent = 'No connection to the wheel. Check your internet and try again.'; }
    };
    $w('wIn').onclick = () => go(false); $w('wNew').onclick = () => go(true);
  }
  async function refresh() {
    if (!W.user) return;
    try {
      const [me, cfg, jackpot] = await Promise.all([db.get('users/' + W.user), db.get('config').catch(() => null), db.get('jackpot').catch(() => ({ amount: JACKPOT_START }))]);
      if (cfg) Object.assign(W.cfg, cfg);
      if (!me || me.pass !== pref.get('wol.pass')) { logout(); return; }
      W.me = me; W.jackpot = jackpot && typeof jackpot.amount === 'number' ? jackpot.amount : JACKPOT_START;
      paint();
    } catch (e) {}
  }
  function logout() { W.user = W.me = null; pref.set('wol.user', null); pref.set('wol.pass', null); paint(); closeSheet(); showLogin(); }
