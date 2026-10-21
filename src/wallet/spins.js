  // ---------- spins: pay the stake, play, collect ----------
  // Owns spin charging, collection, and refund handling.
  const gameSpin = spin;
  let charging = false;
  spin = async function () {
    if (busy || charging) return;
    if (scene === 'photo' && !photoDone) return gameSpin(); // finishing a Show me run is part of the spin already paid for
    if (!W.me) return showLogin('Log in to spin.');
    const s = W.stake;
    if ((W.me.balance || 0) < s) return topupSheet(`You need ${stakeLbl(s)} for a spin. Top up from €1.`);
    charging = true; setBtn('Paying ' + stakeLbl(s), true);
    try {
      let short = false;
      const u = await db.txn('users/' + W.user, u => { if (!u || (u.balance || 0) < s) { short = true; return undefined; } u.balance -= s; u.spins = (u.spins || 0) + 1; u.staked = (u.staked || 0) + s; u.last = now(); return u; });
      if (short) { if (u) W.me = u; paint(); setBtn('Spin', false); charging = false; return topupSheet('Not enough credit for that stake.'); }
      W.me = u; paint();
      awardTrophy('first');
      if ((u.spins || 0) >= 100) awardTrophy('spins100');
      if ((u.spins || 0) >= 1000) awardTrophy('spins1000');
      log(W.user, 'spin', -s);
      if (!isTest()) {
        db.txn('stats', st => { st = st || {}; st.spins = (st.spins || 0) + 1; st.staked = (st.staked || 0) + s; return st; }).catch(() => {});
        db.txn('jackpot', cur => { cur = cur || { amount: JACKPOT_START }; cur.amount = (cur.amount || 0) + s; return cur; }).then(() => refreshJackpot()).catch(() => {});
      }
    } catch (e) { setBtn('Spin', false); charging = false; toast('No connection. Spin not charged.'); return; }
    W.run = { stake: s, paid: false, live: true };
    charging = false;
    try { await gameSpin(); } finally { if (W.run) W.run.live = false; }
  };

  window.wolResetOk = () => !(W.run && W.run.paid); // no resetting once the prize is being paid
  window.wolNextRoom = () => { if (W.run) W.run.paid = false; }; // a second room in the same run (God room, then a full set) pays its own prize
  const gameVerdict = setVerdict;
  let lastVerdict = null; // what the player's screen says, for anyone watching
  setVerdict = function (o) {
    const r = gameVerdict(o);
    lastVerdict = { e: String(o.eyebrow || ''), t: String(o.title || ''), b: String(o.body || '').slice(0, 240) };
    try {
      const run = W.run;
      if (run && run.live && o.title === 'Golden run') awardTrophy('golden');
      if (run && !run.paid) {
        let m = /^Final answer · €([\d.]+)/.exec(o.eyebrow || '');
        if (!m && o.eyebrow === 'Final answer' && /^€[\d.]+$/.test(o.title || '')) m = [0, o.title.slice(1)];
        const isPhelanTomb = /, Phelan['’]s Tomb$/.test(String(o.title || ''));
        if (m && isPhelanTomb && !isTest()) {
          run.paid = true;
          const prizeCents = W.payCents(m[1]);
          (async () => {
            let jackpot = 0;
            await db.txn('jackpot', cur => {
              const curAmt = Number((cur && cur.amount) || JACKPOT_START);
              jackpot = Number.isFinite(curAmt) ? curAmt : JACKPOT_START;
              return { amount: JACKPOT_START };
            });
            await credit(prizeCents + jackpot, run.stake, o.title || 'Phelan\'s Tomb');
            W.jackpot = JACKPOT_START;
            paint();
          })().catch(() => {});
          return r;
        }
        if (m) { run.paid = true; credit(W.payCents(m[1]), run.stake, o.title); }
        else if (o.title === 'That run broke halfway') { run.paid = true; refund(run.stake); }
      }
    } catch (e) {}
    return r;
  };
  async function credit(c, stake, what) {
    if (!c) return;
    toast('You won ' + eur(c) + '!', true);
    try {
      const u = await db.txn('users/' + W.user, u => { u.balance = (u.balance || 0) + c; u.won = (u.won || 0) + c; if (c > (u.biggest || 0)) u.biggest = c; return u; });
      W.me = u; paint();
      if (/, Phelan['’]s Tomb$/.test(String(what || ''))) awardTrophy('tomb');
      if (String(what || '').indexOf('Chicken Race') === 0) awardTrophy('race');
      if (stake > 0 && c >= stake * 50) awardTrophy('big');
      log(W.user, 'win', c, { stake, what: String(what || '').slice(0, 60) });
      if (!isTest()) db.txn('stats', st => { st = st || {}; st.won = (st.won || 0) + c; if (c > (st.biggest || 0)) { st.biggest = c; st.biggestBy = W.me.name; } return st; }).catch(() => {});
    } catch (e) { pendingWins.push([c, stake, what]); savePending(); toast('Win saved on this phone. It adds when you are back online.'); }
  }
  // wins that could not reach the database are kept and retried
  let pendingWins = []; try { pendingWins = JSON.parse(pref.get('wol.pendingWins') || '[]'); } catch (e) {}
  const savePending = () => pref.set('wol.pendingWins', JSON.stringify(pendingWins));
  setInterval(() => { if (pendingWins.length && W.user && navigator.onLine !== false) { const p = pendingWins; pendingWins = []; savePending(); p.forEach(a => credit(...a)); } }, 15000);
  async function refund(s) {
    try { const u = await db.txn('users/' + W.user, u => { u.balance += s; u.staked -= s; u.spins -= 1; return u; }); W.me = u; paint(); log(W.user, 'refund', s); toast('Run broke, stake refunded.'); } catch (e) {}
  }
