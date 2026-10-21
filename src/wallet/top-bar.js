  // ---------- top bar ----------
  const bar = el('div', 'wbar');
  bar.innerHTML = `<button class="who" type="button" id="wWho"><small>Log in</small><b>€0</b></button>
    <div class="wmid"><div class="wpot"><small>JACKPOT</small><b id="wPot">€50</b></div></div>
    <div class="wright"><div class="wstake" aria-label="Bet per spin"><button type="button" id="wLess" aria-label="Lower bet">−</button><span><small>BET</small><b id="wStake">10c</b></span><button type="button" id="wMore" aria-label="Raise bet">+</button></div>
    <button class="wtop" type="button" id="wTop">Top up</button></div>`;
  const appEl = document.querySelector('.app');
  appEl.insertBefore(bar, appEl.querySelector('.stage'));
  const $w = id => document.getElementById(id);

  const sheet = el('div', 'wsheet'); sheet.hidden = true; sheet.innerHTML = '<div class="wpanel" id="wPanel"></div>';
  sheet.addEventListener('click', e => { if (e.target === sheet) closeSheet(); });
  const login = el('div', 'wlogin'); login.hidden = true;
  const banner = el('div', 'wbanner'); banner.hidden = true;
  document.body.append(sheet, login, banner);
  function openSheet(html) { $w('wPanel').innerHTML = html; sheet.hidden = false; return $w('wPanel'); }
  function closeSheet() { sheet.hidden = true; }
  let toastT = 0;
  function toast(msg, gold) {
    let t = document.querySelector('.wtoast'); if (!t) { t = el('div', 'wtoast'); document.body.appendChild(t); }
    t.textContent = msg; t.className = 'wtoast' + (gold ? ' gold' : ''); t.style.opacity = 1;
    clearTimeout(toastT); toastT = setTimeout(() => { t.style.opacity = 0; }, 2600);
  }
  let trophyToasts = [], trophyToastTimer = 0;
  const pendingTrophies = new Set();
  function showTrophyToast() {
    if (!trophyToasts.length) { trophyToastTimer = 0; return; }
    const t = trophyToasts.shift();
    toast(`${t.icon} ${t.name} trophy earned!`, true);
    trophyToastTimer = setTimeout(showTrophyToast, 2700);
  }
  function awardTrophy(id) {
    const trophy = TROPHIES.find(t => t.id === id), me = W.me, user = W.user;
    if (!trophy || !me || !user || (me.trophies && me.trophies[id])) return;
    const pendingId = user + '/' + id;
    if (pendingTrophies.has(pendingId)) return;
    const earnedAt = now();
    me.trophies = Object.assign({}, me.trophies || {}, { [id]: earnedAt });
    pendingTrophies.add(pendingId);
    db.put('users/' + user + '/trophies/' + id, earnedAt).then(() => {
      if (W.user === user && W.me && W.me !== me) W.me.trophies = Object.assign({}, W.me.trophies || {}, { [id]: earnedAt });
      trophyToasts.push(trophy);
      if (!trophyToastTimer) showTrophyToast();
    }).catch(() => {
      const rollback = account => {
        if (!account.trophies || account.trophies[id] !== earnedAt) return;
        delete account.trophies[id];
        if (!Object.keys(account.trophies).length) delete account.trophies;
      };
      rollback(me);
      if (W.user === user && W.me && W.me !== me) rollback(W.me);
      toast(`Could not save ${trophy.name}. Try again when online.`);
    }).finally(() => pendingTrophies.delete(pendingId));
  }

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

  function paint() {
    const me = W.me;
    $w('wWho').innerHTML = `<small>${me ? (me.test ? 'TEST' : esc(me.name)) : 'Log in'}</small><b>${eur(me ? me.balance || 0 : 0)}</b>`;
    $w('wWho').classList.toggle('test', isTest()); document.body.classList.toggle('wtest', isTest());
    $w('wStake').textContent = stakeLbl(W.stake);
    $w('wLess').disabled = W.stake <= STAKES[0]; $w('wMore').disabled = !nextStake();
    const pot = $w('wPot'); if (pot) pot.textContent = eur(W.jackpot || JACKPOT_START);
    if (typeof fitStage === 'function') fitStage();
  }
  function setStake(c) {
    if (busy || (W.run && W.run.live)) return;
    W.stake = c; pref.set('wol.stake', String(c));
    // wheels with prizes painted on them are cached; drop them so they repaint at the new stake
    try { faces.godWheel = null; faces.cosmic = null; } catch (e) {}
    paint();
  }
  // 10c steps up to the last listed stake, then €1 steps with no cap beyond what the player holds
  const TOP = STAKES[STAKES.length - 1];
  function nextStake() {
    const i = STAKES.indexOf(W.stake);
    if (i >= 0 && i < STAKES.length - 1) return STAKES[i + 1];
    const n = W.stake + 100;
    return W.me && (W.me.balance || 0) >= n ? n : 0;
  }
  function prevStake() { const i = STAKES.indexOf(W.stake); return i > 0 ? STAKES[i - 1] : W.stake > TOP ? W.stake - 100 : 0; }
  const okStake = c => STAKES.includes(c) || (c > TOP && (c - TOP) % 100 === 0);
  $w('wLess').addEventListener('click', () => { const c = prevStake(); if (c) setStake(c); });
  $w('wMore').addEventListener('click', () => { const c = nextStake(); if (c) setStake(c); });
  $w('wTop').addEventListener('click', () => W.me ? topupSheet() : showLogin());
  $w('wWho').addEventListener('click', () => W.me ? accountSheet() : showLogin());

