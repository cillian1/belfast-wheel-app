  // ---------- payouts: every prize the game shows is scaled to the stake (house keeps ~1%) ----------
  // Owns payout-value conversion and payment display helpers.
  // ev = the game's average base prize per paid spin (in game euros), measured by simulation.
  window.$m = function (v) {
    const s = W.run ? W.run.stake : W.stake;
    const c = Math.max(0, Math.round(+v * W.cfg.edge / W.cfg.ev * s));
    return (c / 100).toFixed(2).replace(/\.00$/, '');
  };
  W.payCents = v => Math.round(+v * 100);
  async function refreshJackpot() {
    try {
      let jackpot = await db.get('jackpot');
      if (!jackpot || !Number.isFinite(Number(jackpot.amount))) {
        jackpot = await db.txn('jackpot', current => current && Number.isFinite(Number(current.amount)) ? current : { amount: JACKPOT_START });
      }
      W.jackpot = Number(jackpot.amount);
    } catch (e) {
      W.jackpot = JACKPOT_START;
    }
    const pot = $w('wPot'); if (pot) pot.textContent = eur(W.jackpot);
  }

  // ---------- spins: pay the stake, play, collect ----------
  // Owns spin charging, collection, and refund handling.
  // 5 free spins a day per player (Cillian, update 27): a real 10c spin that can win the jackpot but doesn't feed it
  const FREE_SPINS = 5, FREE_STAKE = 10; W.freeStake = FREE_STAKE;
  const today = () => new Date().toLocaleDateString('en-CA');
  W.freeLeft = u => !u ? 0 : Math.max(0, FREE_SPINS - (u.free && u.free.day === today() ? u.free.used || 0 : 0));
  const dropPrizeFaces = () => { try { faces.godWheel = null; faces.cosmic = null; } catch (e) {} };
  const gameSpin = spin;
  let charging = false;
  spin = async function () {
    if (gambleBusy) return toast('Wait for the card.');
    if (W.connected === false && !(scene === 'photo' && !photoDone)) return toast('No connection, reconnecting…');
    if (busy || charging) return;
    if (scene === 'photo' && !photoDone) return gameSpin(); // finishing a Show me run is part of the spin already paid for
    collectGamble();
    if (W.run) W.run.gambleClosed = true;
    if (!W.me) return showLogin('Log in to spin.');
    // free spins are only used on a 10c bet, so a bigger bet always plays (and pays) at that bet
    if (W.stake === FREE_STAKE && W.freeLeft(W.me) > 0) return freeSpin();
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
    W.run = { stake: s, paid: false, live: true, auto: autoOn };
    charging = false;
    try { await gameSpin(); } finally { if (W.run) { W.run.live = false; offerGamble(W.run); } }
  };

  async function freeSpin() {
    const s = FREE_STAKE;
    charging = true; setBtn('Free spin', true);
    try {
      let none = false;
      const u = await db.txn('users/' + W.user, u => {
        if (!u || W.freeLeft(u) <= 0) { none = true; return undefined; }
        const used = u.free && u.free.day === today() ? u.free.used || 0 : 0;
        u.free = { day: today(), used: used + 1 }; u.spins = (u.spins || 0) + 1; u.last = now(); return u;
      });
      if (none) { if (u) W.me = u; paint(); setBtn('Spin', false); charging = false; return spin(); }
      W.me = u; paint();
      awardTrophy('first');
      if ((u.spins || 0) >= 100) awardTrophy('spins100');
      if ((u.spins || 0) >= 1000) awardTrophy('spins1000');
      log(W.user, 'spin', 0, { what: 'Free spin' });
      if (!isTest()) db.txn('stats', st => { st = st || {}; st.spins = (st.spins || 0) + 1; st.free = (st.free || 0) + 1; return st; }).catch(() => {});
    } catch (e) { setBtn('Spin', false); charging = false; toast('No connection. Free spin not used.'); return; }
    toast(`Free spin! ${W.freeLeft(W.me)} left today.`);
    if (W.stake !== s) dropPrizeFaces(); // prizes on the wheels show at 10c for this run
    W.run = { stake: s, paid: false, live: true, free: true, auto: autoOn }; paint();
    charging = false;
    try { await gameSpin(); } finally { if (W.run) { W.run.live = false; offerGamble(W.run); } paint(); if (W.stake !== s) dropPrizeFaces(); }
  }

  window.wolResetOk = () => !gambleBusy && !(W.run && W.run.paid); // no resetting once the prize is being paid
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
        if (isPhelanTomb) run.gambleClosed = true;
        if (m && isPhelanTomb && !isTest()) {
          try { playSfx('jackpot'); } catch (e) { console.warn('Jackpot sound failed', e); }
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
        if (m) {
          run.paid = true;
          const cents = W.payCents(m[1]);
          credit(cents, run.stake, o.title).then(ok => {
            if (ok) { run.gambleCredit = cents; offerGamble(run); }
          });
        }
        else if (o.title === 'That run broke halfway') { run.paid = true; run.gambleClosed = true; run.free ? refundFree() : refund(run.stake); }
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
      return true;
    } catch (e) { pendingWins.push([c, stake, what]); savePending(); toast('Win saved on this phone. It adds when you are back online.'); }
  }
  // ---------- a separate, fair wager on money already banked ----------
  function gambleAllowed(amount, count) {
    return Number.isSafeInteger(amount) && amount > 0 && amount <= 2000 && Number.isInteger(count) && count >= 0 && count < 5;
  }
  function gambleDecision(pick, random) {
    if (pick !== 'red' && pick !== 'black') throw new Error('Pick red or black');
    const colour = (random & 1) === 0 ? 'red' : 'black';
    return { colour, won: pick === colour };
  }
  function settleGamble(u, bet) {
    if (!u) return undefined;
    if (u.gambleResults && Object.prototype.hasOwnProperty.call(u.gambleResults, bet.id)) return u;
    if (!gambleAllowed(bet.amount, bet.count) || (u.balance || 0) < bet.amount) return undefined;
    const delta = bet.won ? bet.amount : -bet.amount, field = bet.won ? 'gambleWon' : 'gambleLost';
    u.balance = (u.balance || 0) + delta;
    u[field] = (u[field] || 0) + bet.amount;
    // Keep the receipt in the same write: an acknowledged-late PUT must not settle twice.
    u.gambleResults = u.gambleResults || {};
    u.gambleResults[bet.id] = delta;
    return u;
  }
  let gambleBusy = false, gambleTimer = 0;
  function collectGamble() {
    if (gambleBusy) return;
    clearTimeout(gambleTimer);
    W.gamble = null;
    renderGamble(gambleBox, null);
  }
  function armGamble() {
    clearTimeout(gambleTimer);
    W.gamble.expiresAt = now() + 15000;
    gambleTimer = setTimeout(collectGamble, 15000);
    renderGamble(gambleBox, W.gamble);
  }
  function offerGamble(run) {
    if (W.run !== run || run.live || run.auto || autoOn || run.gambleClosed || !gambleAllowed(run.gambleCredit, 0)) return;
    run.gambleClosed = true;
    W.gamble = { amount: run.gambleCredit, count: 0, phase: 'offer', user: W.user };
    armGamble();
  }
  function dealGamble() {
    const g = W.gamble;
    if (!g || gambleBusy || autoOn || busy || g.user !== W.user || g.phase !== 'offer' || !gambleAllowed(g.amount, g.count)) return;
    if (now() >= g.expiresAt) return collectGamble();
    phelanStop();
    g.phase = 'pick'; g.pick = null; g.colour = null;
    armGamble();
  }
  async function pickGamble(pick) {
    const g = W.gamble;
    if (!g || gambleBusy || g.phase !== 'pick' || g.user !== W.user || autoOn || busy) return;
    if (now() >= g.expiresAt) return collectGamble();
    if (W.connected === false) { collectGamble(); return toast('No connection. Keep your banked win.'); }
    const user = W.user, test = isTest(), amount = g.amount;
    let bet;
    try {
      const random = crypto.getRandomValues(new Uint32Array(5));
      const result = gambleDecision(pick, random[0]);
      bet = { id: Array.from(random.slice(1), n => n.toString(16).padStart(8, '0')).join(''), amount, count: g.count, won: result.won };
      g.pick = pick;
      gambleBusy = true; clearTimeout(gambleTimer); g.phase = 'settling';
      renderGamble(gambleBox, g);
      const u = await db.txn('users/' + user, u => settleGamble(u, bet));
      if (!u || !u.gambleResults || !Object.prototype.hasOwnProperty.call(u.gambleResults, bet.id)) {
        if (u) W.me = u;
        gambleBusy = false; collectGamble(); paint();
        return toast('Not enough balance. No gamble placed.');
      }
      W.me = u; paint();
      const delta = bet.won ? amount : -amount, what = bet.won ? 'Gamble win' : 'Gamble lose';
      log(user, 'gamble', delta, { what, pick, colour: result.colour, gambleId: bet.id });
      if (!test) db.txn('stats', st => { st = st || {}; const field = bet.won ? 'gambleWon' : 'gambleLost'; st[field] = (st[field] || 0) + amount; return st; }).catch(() => {});
      g.phase = 'flipping'; renderGamble(gambleBox, g);
      await new Promise(resolve => setTimeout(resolve, 350));
      g.colour = result.colour; g.won = bet.won; g.count++; g.amount = bet.won ? amount * 2 : 0;
      g.phase = 'reveal'; renderGamble(gambleBox, g);
      if (!bet.won) {
        try {
          if (!Music.muted && window.speechSynthesis) {
            const laugh = new SpeechSynthesisUtterance('Hahah not so easy!');
            laugh.pitch = 2; laugh.rate = 1.35; laugh.lang = sayVoice ? sayVoice.lang : 'en-GB';
            if (sayVoice) laugh.voice = sayVoice;
            speechSynthesis.cancel(); speechSynthesis.speak(laugh);
          }
        } catch (e) {}
      }
      await new Promise(resolve => setTimeout(resolve, 900));
      gambleBusy = false;
      g.phase = bet.won && gambleAllowed(g.amount, g.count) ? 'offer' : 'done';
      armGamble();
    } catch (e) {
      gambleBusy = false; collectGamble();
      toast(bet ? 'Connection interrupted. Check your balance/history before playing again.' : 'Card unavailable. Keep your banked win.');
    }
  }
  gambleBox.addEventListener('click', e => {
    const action = e.target.dataset.gamble;
    if (action === 'collect') collectGamble();
    else if (action === 'deal') dealGamble();
    else if (action === 'red' || action === 'black') pickGamble(action);
  });
  $w('autoBtn').addEventListener('click', e => {
    if (gambleBusy) { e.stopImmediatePropagation(); return toast('Wait for the card.'); }
    collectGamble();
    if (W.run) W.run.gambleClosed = true;
  }, true);
  // wins that could not reach the database are kept and retried
  let pendingWins = []; try { pendingWins = JSON.parse(pref.get('wol.pendingWins') || '[]'); } catch (e) {}
  const savePending = () => pref.set('wol.pendingWins', JSON.stringify(pendingWins));
  setInterval(() => { if (pendingWins.length && W.user && navigator.onLine !== false) { const p = pendingWins; pendingWins = []; savePending(); p.forEach(a => credit(...a)); } }, 15000);
  async function refundFree() {
    try { const u = await db.txn('users/' + W.user, u => { if (u.free && u.free.day === today() && u.free.used > 0) u.free.used -= 1; u.spins -= 1; return u; }); W.me = u; paint(); toast('Run broke, free spin given back.'); } catch (e) {}
  }
  async function refund(s) {
    try { const u = await db.txn('users/' + W.user, u => { u.balance += s; u.staked -= s; u.spins -= 1; return u; }); W.me = u; paint(); log(W.user, 'refund', s); toast('Run broke, stake refunded.'); } catch (e) {}
  }
