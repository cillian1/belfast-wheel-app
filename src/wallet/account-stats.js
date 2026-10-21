  // ---------- account, stats, leaderboards ----------
  // Owns account-sheet history, statistics, and leaderboard views.
  async function accountSheet(tab = 'me', selectedBoard) {
    await refresh();
    const me = W.me; if (!me) return;
    const board = ['won', 'biggest', 'spins', 'net', 'trophies'].includes(selectedBoard) ? selectedBoard : (pref.get('wol.lbBoard') || 'won');
    const p = openSheet(`<h3>${esc(me.name)}</h3>
      <div class="wtabs"><button data-t="me" type="button">Me</button><button data-t="lb" type="button">Leaderboards</button></div>
      <div id="wBody"><p>Loading…</p></div>
      <button class="wlink" type="button" id="wClose">Close</button>`);
    p.querySelectorAll('.wtabs button').forEach(b => { b.classList.toggle('on', b.dataset.t === tab); b.onclick = () => accountSheet(b.dataset.t, board); });
    $w('wClose').onclick = closeSheet;
    const body = $w('wBody');
    try {
      if (tab === 'me') await meTab(body, me);
      else await lbTab(body, board);
    } catch (e) { body.innerHTML = '<p class="err">No connection. Try again in a moment.</p>'; }
  }
  async function meTab(body, me) {
    const tx = await db.get('tx/' + W.user, '?orderBy="$key"&limitToLast=40') || {};
    const reqs = Object.entries(await db.get('reqs').catch(() => null) || {}).filter(([, r]) => r.user === W.user && r.status === 'pending');
    const net = (me.won || 0) - (me.staked || 0);
    const rows = Object.values(tx).sort((a, b) => b.at - a.at);
    const name = { spin: 'Spin', win: 'Win', topup: 'Top-up', withdraw: 'Withdrawal', refund: 'Refund', adjust: 'Adjustment', payout: 'Paid out' };
    const history = [];
    rows.forEach(t => {
      const date = new Date(t.at), day = date.toDateString();
      const previous = history[history.length - 1];
      if (t.t === 'spin' && previous && previous.day === day && previous.type === 'spins') {
        previous.count++;
        previous.amount += t.a || 0;
        previous.at = Math.max(previous.at, t.at);
      } else history.push({ day, at: t.at, type: t.t === 'spin' ? 'spins' : 'entry', count: t.t === 'spin' ? 1 : 0, amount: t.a || 0, tx: t });
    });
    const today = new Date().toDateString(), yesterday = new Date(Date.now() - 86400000).toDateString();
    const dayLabel = day => day === today ? 'Today' : day === yesterday ? 'Yesterday' : new Date(day).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' });
    const pending = reqs.reduce((sum, [, r]) => sum + (Number(r.a) || 0), 0);
    let historyLimit = 15;
    const renderHistory = () => {
      let lastDay = null;
      const shown = history.slice(0, historyLimit).map(item => {
        const header = item.day !== lastDay ? `<li class="whistory-day">${dayLabel(item.day)}</li>` : '';
        lastDay = item.day;
        if (item.type === 'spins') return `${header}<li class="whistory-entry"><div>${item.count} ${item.count === 1 ? 'spin' : 'spins'} <span>${when(item.at)}</span></div><b class="${item.amount >= 0 ? 'plus' : 'minus'}">${eur(item.amount)}</b></li>`;
        const t = item.tx;
        return `${header}<li class="whistory-entry"><div>${esc(name[t.t] || t.t)}${t.what ? ` <span>${esc(t.what)}</span>` : ''}<br><span>${when(t.at)}</span></div><b class="${t.a >= 0 ? 'plus' : 'minus'}">${t.a >= 0 ? '+' : ''}${eur(t.a)}</b></li>`;
      }).join('');
      $w('wHistory').innerHTML = shown || '<li>No spins yet</li>';
      $w('wMoreHistory').hidden = history.length <= historyLimit;
    };
    body.innerHTML = `<div class="waccount">
        <div class="wbalance"><small>Balance</small><b>${eur(me.balance || 0)}</b>
          <div class="wrow"><button class="wbtn gold" id="wT" type="button">Top up</button><button class="wbtn" id="wW" type="button">Withdraw</button></div>
        </div>
        <div class="wstats">
          <div><small>Spins</small><b>${me.spins || 0}</b></div><div><small>Biggest win</small><b>${eur(me.biggest || 0)}</b></div>
          <div><small>Up / down</small><b class="${net >= 0 ? 'plus' : 'minus'}">${eur(net)}</b></div>
        </div>
        ${reqs.length ? `<div class="wpending">Pending withdrawals (${reqs.length}) · ${eur(pending)}</div>` : ''}
        <h4>History</h4><ul class="wlist" id="wHistory"></ul>
        <button class="wlink" type="button" id="wMoreHistory">Show more</button>
        <h4>Trophies</h4>
        <div class="wtrophy-grid">${TROPHIES.map(t => {
          const earned = !!(me.trophies && me.trophies[t.id]);
          return `<button class="wtrophy${earned ? '' : ' locked'}" type="button" data-trophy="${t.id}" aria-label="${esc(t.name)}: ${earned ? 'earned' : 'locked'}"><span class="wtrophy-icon">${t.icon}</span><span class="wtrophy-name">${esc(t.name)}</span><span class="wtrophy-state">${earned ? 'Earned' : 'Locked'}</span></button>`;
        }).join('')}</div>
        <p class="wtrophy-detail" id="wTrophyDetail" aria-live="polite">Tap a trophy to see how to earn it.</p>
        <button class="wlink" type="button" id="wOut">Log out</button>
      </div>`;
    renderHistory();
    $w('wMoreHistory').onclick = () => { historyLimit += 15; renderHistory(); };
    body.querySelectorAll('.wtrophy').forEach(button => {
      button.onclick = () => {
        const trophy = TROPHIES.find(t => t.id === button.dataset.trophy);
        if (trophy) $w('wTrophyDetail').textContent = `${trophy.name}: ${trophy.how}`;
      };
    });
    $w('wT').onclick = () => topupSheet(); $w('wW').onclick = withdrawSheet; $w('wOut').onclick = logout;
  }
  async function lbTab(body, selectedBoard) {
    const [users, st] = await Promise.all([db.get('users'), db.get('stats')]);
    const list = Object.entries(users || {}).filter(([, u]) => !u.test), s = st || {};
    const boards = {
      won: { title: 'Most won', value: u => u.won || 0, format: eur },
      biggest: { title: 'Biggest win', value: u => u.biggest || 0, format: eur },
      spins: { title: 'Most spins', value: u => u.spins || 0, format: n => n },
      net: { title: 'Best up/down', value: u => (u.won || 0) - (u.staked || 0), format: eur },
      trophies: { title: 'Most trophies', value: u => Object.keys(u.trophies || {}).length, format: n => n },
    };
    let boardKey = boards[selectedBoard] ? selectedBoard : 'won';
    body.innerHTML = `<div class="wboard-stats">Everyone: <b>${s.spins || 0} spins</b> · Biggest ever win: <b>${eur(s.biggest || 0)}${s.biggestBy ? ` by ${esc(s.biggestBy)}` : ''}</b></div>
      <div class="wboard-pick">${Object.entries(boards).map(([key, b]) => `<button class="wbtn${key === boardKey ? ' sel' : ''}" data-board="${key}" type="button">${b.title}</button>`).join('')}</div>
      <h4 id="wBoardTitle"></h4><ul class="wlist wboard" id="wBoardRows"></ul>`;
    const renderBoard = () => {
      const board = boards[boardKey];
      const ranked = list.slice().sort((a, b) => board.value(b[1]) - board.value(a[1]) || String(a[1].name).localeCompare(String(b[1].name)));
      $w('wBoardTitle').textContent = board.title;
      $w('wBoardRows').innerHTML = ranked.map(([key, u], i) => `<li><div>${i + 1}. ${esc(u.name)}${key === W.user ? '<span class="wyou">You</span>' : ''}</div><b>${board.format(board.value(u))}</b></li>`).join('') || '<li>Nobody yet</li>';
      body.querySelectorAll('.wboard-pick button').forEach(button => button.classList.toggle('sel', button.dataset.board === boardKey));
    };
    body.querySelectorAll('.wboard-pick button').forEach(button => { button.onclick = () => { boardKey = button.dataset.board; pref.set('wol.lbBoard', boardKey); renderBoard(); }; });
    renderBoard();
  }
