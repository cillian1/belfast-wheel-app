// ---------- wallet layer for the Android app ----------
// Injected after the game's own script by tools/build.mjs. It wraps spin() and setVerdict(),
// and money shown by the game goes through $m() (see tools/money.mjs).
// Accounts, balances, requests and stats live in a Firebase Realtime Database (REST, no SDK).
// Amounts are whole cents everywhere.
(function () {
  const CFG = window.WALLET_CFG; // { db, revolut, updateUrl, gameVersion, ev, edge, stakes }
  const STAKES = CFG.stakes, MIN_TOPUP = 100;
  const app = window.Android && Android.isApp ? Android : null;
  const W = window.W = { user: null, me: null, stake: STAKES[0], run: null, cfg: { edge: CFG.edge, ev: CFG.ev, pin: null } };

  // <shared> (also used by host.html, see tools/build.mjs)
  // ---------- small helpers ----------
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const eur = c => { const v = Math.abs(c) / 100, s = Number.isInteger(v) ? String(v) : v.toFixed(2); return (c < 0 ? '−€' : '€') + s; };
  const stakeLbl = c => c < 100 ? c + 'c' : eur(c);
  const now = () => Date.now();
  const when = t => { const d = new Date(t); return d.toLocaleDateString('en-IE', { day: 'numeric', month: 'short' }) + ' ' + d.toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit' }); };
  const pref = {
    get(k) { try { if (app && app.getPref) return app.getPref(k) || null; } catch (e) {} try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { if (app && app.setPref) app.setPref(k, v == null ? '' : v); } catch (e) {} try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} },
  };
  const keyOf = name => name.trim().toLowerCase().replace(/[.#$\[\]\/\s]+/g, '_');
  function sha256(str) { // small pure-JS SHA-256 (crypto.subtle is not always there on file:// pages)
    const K = [], H = [], isP = n => { for (let f = 2; f * f <= n; f++) if (n % f === 0) return false; return true; };
    for (let n = 2, i = 0; i < 64; n++) if (isP(n)) { if (i < 8) H[i] = (Math.pow(n, 1 / 2) * 2 ** 32) | 0; K[i++] = (Math.pow(n, 1 / 3) * 2 ** 32) | 0; }
    const b = unescape(encodeURIComponent(str)), l = b.length, w = [];
    for (let i = 0; i < l; i++) w[i >> 2] |= b.charCodeAt(i) << (24 - (i % 4) * 8);
    w[l >> 2] |= 0x80 << (24 - (l % 4) * 8); w[(((l + 8) >> 6) << 4) + 15] = l * 8;
    const r = (x, n) => (x >>> n) | (x << (32 - n));
    for (let j = 0; j < w.length; j += 16) {
      const s = H.slice(0, 8), m = [];
      for (let i = 0; i < 64; i++) {
        if (i < 16) m[i] = w[j + i] | 0;
        else { const a = m[i - 15], c = m[i - 2]; m[i] = (m[i - 16] + (r(a, 7) ^ r(a, 18) ^ (a >>> 3)) + m[i - 7] + (r(c, 17) ^ r(c, 19) ^ (c >>> 10))) | 0; }
        const [A, B, C, D, E, F, G, Hh] = s;
        const t1 = (Hh + (r(E, 6) ^ r(E, 11) ^ r(E, 25)) + ((E & F) ^ (~E & G)) + K[i] + m[i]) | 0;
        const t2 = ((r(A, 2) ^ r(A, 13) ^ r(A, 22)) + ((A & B) ^ (A & C) ^ (B & C))) | 0;
        s.unshift((t1 + t2) | 0); s[4] = (s[4] + t1) | 0; s.pop();
      }
      for (let i = 0; i < 8; i++) H[i] = (H[i] + s[i]) | 0;
    }
    return H.map(x => (x >>> 0).toString(16).padStart(8, '0')).join('');
  }

  // ---------- Firebase REST ----------
  // in the app, requests go through Java (no CORS from a file:// page); in a browser, plain fetch
  const waiting = {}; let reqN = 0;
  window.__httpDone = id => { const raw = app.httpTake(id), w = waiting[id]; delete waiting[id]; if (!w) return;
    const i = raw.indexOf('\n'), j = raw.indexOf('\n', i + 1), status = +raw.slice(0, i), tag = raw.slice(i + 1, j), body = raw.slice(j + 1);
    if (!status) return w.no(new TypeError('offline'));
    w.ok({ ok: status >= 200 && status < 300, status, headers: { get: k => /etag/i.test(k) ? tag || null : null }, json: async () => JSON.parse(body || 'null') });
  };
  const fetch = (app && app.http) ? (url, o = {}) => new Promise((ok, no) => {
    const id = 'r' + (++reqN), h = o.headers || {};
    waiting[id] = { ok, no };
    app.http(id, o.method || 'GET', url, h['if-match'] || '', !!h['X-Firebase-ETag'], o.body == null ? null : o.body);
  }) : window.fetch.bind(window);
  const db = {
    url: p => CFG.db.replace(/\/$/, '') + '/' + p + '.json',
    async get(p, q = '') { const r = await fetch(db.url(p) + q, { cache: 'no-store' }); if (!r.ok) throw new Error('db ' + r.status); return r.json(); },
    async put(p, v) { const r = await fetch(db.url(p), { method: 'PUT', body: JSON.stringify(v) }); if (!r.ok) throw new Error('db ' + r.status); return r.json(); },
    async patch(p, v) { const r = await fetch(db.url(p), { method: 'PATCH', body: JSON.stringify(v) }); if (!r.ok) throw new Error('db ' + r.status); return r.json(); },
    async push(p, v) { const r = await fetch(db.url(p), { method: 'POST', body: JSON.stringify(v) }); if (!r.ok) throw new Error('db ' + r.status); return (await r.json()).name; },
    // read-modify-write with an ETag so two phones never overwrite each other's balance change
    async txn(p, fn) {
      let tags = db.tags !== false;
      for (let i = 0; i < 8; i++) {
        let r;
        try { r = await fetch(db.url(p), { headers: tags ? { 'X-Firebase-ETag': 'true' } : {}, cache: 'no-store' }); }
        catch (e) { if (!tags) throw e; db.tags = tags = false; i--; continue; } // the ETag header was refused (CORS): plain read-then-write
        if (!r.ok) throw new Error('db ' + r.status);
        const tag = tags && r.headers.get('ETag'), cur = await r.json(), next = fn(cur);
        if (next === undefined) return cur; // fn said abort
        const w = await fetch(db.url(p), { method: 'PUT', headers: tag ? { 'if-match': tag } : {}, body: JSON.stringify(next) }).catch(() => null);
        if (!w) { if (!tag) throw new Error('offline'); db.tags = tags = false; continue; }
        if (w.ok) return next;
        if (w.status !== 412) throw new Error('db ' + w.status);
      }
      throw new Error('busy, try again');
    },
  };
  const log = (k, t, a, extra) => db.push('tx/' + k, Object.assign({ t, a, at: now() }, extra || {})).catch(() => {});

  // </shared>

  // ---------- payouts: every prize the game shows is scaled to the stake (house keeps ~1%) ----------
  // ev = the game's average base prize per paid spin (in game euros), measured by simulation.
  window.$m = function (v) {
    const s = W.run ? W.run.stake : W.stake;
    const c = Math.max(0, Math.round(+v * W.cfg.edge / W.cfg.ev * s));
    return (c / 100).toFixed(2).replace(/\.00$/, '');
  };
  W.payCents = v => Math.round(+v * 100);

  // ---------- styles ----------
  const css = `
.wbar{display:flex;align-items:center;gap:8px;justify-content:space-between;font-size:14px;margin-bottom:-2px}
.wbar .who{display:flex;flex-direction:column;align-items:flex-start;background:none;border:1px solid var(--line);border-radius:12px;padding:4px 10px;color:var(--chrome);min-width:0}
.wbar .who small{font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:var(--mute);max-width:9em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wbar .who b{font-family:var(--display);font-weight:400;font-size:15px;letter-spacing:.04em;color:#f5d27a}
.wstake{display:flex;align-items:center;gap:4px;border:1px solid var(--line);border-radius:999px;padding:2px}
.wstake button{width:30px;height:30px;border:0;background:#1d2228;color:var(--chrome);font-size:18px;line-height:1}
.wstake button:disabled{opacity:.3}
.wstake span{min-width:64px;text-align:center;line-height:1.1}
.wstake span small{display:block;font-size:9px;letter-spacing:.22em;color:var(--mute)}
.wstake span b{display:block;font-size:16px}
.wtop{border:0;padding:9px 14px;font-weight:700;letter-spacing:.06em;color:#0d1013;background:linear-gradient(180deg,#f8e4a6,#d7a944);box-shadow:0 4px 14px rgba(0,0,0,.45)}
.locked .wstake{opacity:.5;pointer-events:none}
.wsheet{position:fixed;inset:0;z-index:50;display:flex;align-items:flex-end;justify-content:center;background:rgba(5,6,8,.72)}
.wsheet[hidden]{display:none}
.wpanel{width:100%;max-width:560px;max-height:92vh;overflow:auto;background:linear-gradient(180deg,#1c1f24,#121418);border:1px solid var(--line);border-bottom:0;border-radius:20px 20px 0 0;padding:20px 18px calc(22px + env(safe-area-inset-bottom,0px));display:flex;flex-direction:column;gap:12px;color:var(--chrome)}
.wpanel h3{margin:0;font-family:var(--display);font-weight:400;font-size:18px;letter-spacing:.06em}
.wpanel h4{margin:8px 0 0;font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:var(--mute);font-weight:600}
.wpanel p{margin:0;color:#c3cbd3}
.wpanel .err{color:#ff9b8a;min-height:1.2em;font-size:14px}
.wpanel input{font:inherit;font-size:17px;padding:12px 14px;border-radius:12px;border:1px solid var(--line);background:#0e1013;color:var(--chrome);width:100%;box-sizing:border-box}
.wrow{display:flex;gap:8px;flex-wrap:wrap}
.wrow>*{flex:1}
.wbtn{border:1px solid var(--line);background:#20252c;color:var(--chrome);padding:12px 14px;font-weight:600}
.wbtn.gold{border:0;color:#0d1013;background:linear-gradient(180deg,#f8e4a6,#d7a944)}
.wbtn.red{border-color:#6b2a22;background:#2a1512;color:#ffb3a6}
.wbtn.sel{border-color:#f5d27a;color:#f5d27a}
.wbtn.small{padding:7px 10px;font-size:13px;flex:none}
.wlink{background:none;border:0;color:var(--mute);text-decoration:underline;padding:6px 0;font-size:14px}
.wgrid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.wgrid div{border:1px solid var(--line);border-radius:12px;padding:8px 10px;background:#15181c}
.wgrid small{display:block;font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:var(--mute)}
.wgrid b{font-family:var(--display);font-weight:400;font-size:16px}
.wlist{display:flex;flex-direction:column;gap:6px;margin:0;padding:0;list-style:none}
.wlist li{display:flex;justify-content:space-between;gap:10px;align-items:center;border-bottom:1px solid #22272e;padding:6px 0;font-size:14px}
.wlist li span{color:var(--mute);font-size:12px}
.wlist .plus{color:#9be38a}.wlist .minus{color:#ff9b8a}
.wtabs{display:flex;gap:6px}
.wtabs button{flex:1;border:1px solid var(--line);background:none;color:var(--mute);padding:8px;font-size:13px}
.wtabs button.on{color:#f5d27a;border-color:#f5d27a}
.wbanner{position:fixed;left:10px;right:10px;bottom:calc(10px + env(safe-area-inset-bottom,0px));z-index:40;display:flex;gap:10px;align-items:center;justify-content:space-between;padding:10px 14px;border-radius:14px;background:#2a2312;border:1px solid #f5d27a;color:#f8e4a6;font-size:14px}
.wbanner[hidden]{display:none}
.wlogin{position:fixed;inset:0;z-index:60;background:radial-gradient(circle at 50% 30%,#1e2228,#0a0c0f 70%);display:flex;align-items:center;justify-content:center;padding:20px}
.wlogin[hidden]{display:none}
.wlogin .wpanel{border-radius:20px;border-bottom:1px solid var(--line);max-width:420px}
.wlogin h1{text-align:center;margin-bottom:6px}
.wtoast{position:fixed;left:50%;top:calc(14px + env(safe-area-inset-top,0px));transform:translateX(-50%);z-index:70;background:#20252c;border:1px solid var(--line);border-radius:999px;padding:8px 16px;font-size:14px;color:var(--chrome);box-shadow:0 8px 20px rgba(0,0,0,.5);transition:opacity .3s}
.wtoast.gold{border-color:#f5d27a;color:#f8e4a6}
`;
  document.head.appendChild(el('style', null, css));

  // ---------- top bar ----------
  const bar = el('div', 'wbar');
  bar.innerHTML = `<button class="who" type="button" id="wWho"><small>Log in</small><b>€0</b></button>
    <div class="wstake" aria-label="Bet per spin"><button type="button" id="wLess" aria-label="Lower bet">−</button><span><small>BET</small><b id="wStake">10c</b></span><button type="button" id="wMore" aria-label="Raise bet">+</button></div>
    <button class="wtop" type="button" id="wTop">Top up</button>`;
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

  function paint() {
    const me = W.me;
    $w('wWho').innerHTML = `<small>${me ? esc(me.name) : 'Log in'}</small><b>${eur(me ? me.balance || 0 : 0)}</b>`;
    $w('wStake').textContent = stakeLbl(W.stake);
    const i = STAKES.indexOf(W.stake);
    $w('wLess').disabled = i <= 0; $w('wMore').disabled = i >= STAKES.length - 1;
    if (typeof fitStage === 'function') fitStage();
  }
  function setStake(c) {
    if (busy || (W.run && W.run.live)) return;
    W.stake = c; pref.set('wol.stake', String(c));
    // wheels with prizes painted on them are cached; drop them so they repaint at the new stake
    try { faces.godWheel = null; faces.cosmic = null; } catch (e) {}
    paint();
  }
  $w('wLess').addEventListener('click', () => { const i = STAKES.indexOf(W.stake); if (i > 0) setStake(STAKES[i - 1]); });
  $w('wMore').addEventListener('click', () => { const i = STAKES.indexOf(W.stake); if (i < STAKES.length - 1) setStake(STAKES[i + 1]); });
  $w('wTop').addEventListener('click', () => W.me ? topupSheet() : showLogin());
  $w('wWho').addEventListener('click', () => W.me ? accountSheet() : showLogin());

  // ---------- accounts ----------
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
          await db.put('users/' + k, { name, pass: h, balance: 0, spins: 0, staked: 0, won: 0, biggest: 0, topped: 0, withdrawn: 0, created: now() });
          db.txn('stats/players', n => (n || 0) + 1).catch(() => {});
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
      const [me, cfg] = await Promise.all([db.get('users/' + W.user), db.get('config')]);
      if (cfg) Object.assign(W.cfg, cfg);
      if (!me || me.pass !== pref.get('wol.pass')) { logout(); return; }
      W.me = me; paint();
    } catch (e) {}
  }
  function logout() { W.user = W.me = null; pref.set('wol.user', null); pref.set('wol.pass', null); paint(); closeSheet(); showLogin(); }

  // ---------- spins: pay the stake, play, collect ----------
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
      log(W.user, 'spin', -s);
      db.txn('stats', st => { st = st || {}; st.spins = (st.spins || 0) + 1; st.staked = (st.staked || 0) + s; return st; }).catch(() => {});
    } catch (e) { setBtn('Spin', false); charging = false; toast('No connection. Spin not charged.'); return; }
    W.run = { stake: s, paid: false, live: true };
    charging = false;
    try { await gameSpin(); } finally { if (W.run) W.run.live = false; }
  };

  const gameVerdict = setVerdict;
  setVerdict = function (o) {
    const r = gameVerdict(o);
    try {
      const run = W.run;
      if (run && !run.paid) {
        let m = /^Final answer · €([\d.]+)/.exec(o.eyebrow || '');
        if (!m && o.eyebrow === 'Final answer' && /^€[\d.]+$/.test(o.title || '')) m = [0, o.title.slice(1)];
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
      log(W.user, 'win', c, { stake, what: String(what || '').slice(0, 60) });
      db.txn('stats', st => { st = st || {}; st.won = (st.won || 0) + c; if (c > (st.biggest || 0)) { st.biggest = c; st.biggestBy = W.me.name; } return st; }).catch(() => {});
    } catch (e) { pendingWins.push([c, stake, what]); savePending(); toast('Win saved on this phone. It adds when you are back online.'); }
  }
  // wins that could not reach the database are kept and retried
  let pendingWins = []; try { pendingWins = JSON.parse(pref.get('wol.pendingWins') || '[]'); } catch (e) {}
  const savePending = () => pref.set('wol.pendingWins', JSON.stringify(pendingWins));
  setInterval(() => { if (pendingWins.length && W.user && navigator.onLine !== false) { const p = pendingWins; pendingWins = []; savePending(); p.forEach(a => credit(...a)); } }, 15000);
  async function refund(s) {
    try { const u = await db.txn('users/' + W.user, u => { u.balance += s; u.staked -= s; u.spins -= 1; return u; }); W.me = u; paint(); log(W.user, 'refund', s); toast('Run broke, stake refunded.'); } catch (e) {}
  }

  // ---------- top up (player pays Cillian on Revolut and confirms; the host page can reverse) ----------
  function topupSheet(msg) {
    if (!W.me) return showLogin();
    openSheet(`<h3>Top up</h3>
      ${msg ? `<p class="err">${esc(msg)}</p>` : ''}
      <p>Send any amount from €1 to <b>@${esc(CFG.revolut)}</b> on Revolut. When you come back, confirm what you sent and it goes straight on your balance.</p>
      <button class="wbtn gold" id="wRev" type="button">Open Revolut</button>
      <button class="wlink" type="button" id="wPaid">I've already paid</button>
      <button class="wlink" type="button" id="wClose">Close</button>`);
    $w('wRev').onclick = () => {
      const url = 'https://revolut.me/' + CFG.revolut;
      confirmSheet(); // already waiting when they come back from Revolut
      if (app) app.openUrl(url); else window.open(url, '_blank');
    };
    $w('wPaid').onclick = confirmSheet;
    $w('wClose').onclick = closeSheet;
  }
  // back from Revolut: the player says what they sent and it is credited at once
  function confirmSheet() {
    if (!W.me) return showLogin();
    let amt = 0;
    const p = openSheet(`<h3>Confirm money sent</h3>
      <p>How much did you send to @${esc(CFG.revolut)}?</p>
      <div class="wrow" id="wAmts">${[100, 200, 500, 1000, 2000].map(a => `<button class="wbtn" type="button" data-a="${a}">${eur(a)}</button>`).join('')}</div>
      <input id="wAmt" inputmode="decimal" placeholder="Other amount, e.g. 7.50">
      <p class="err" id="wErr"></p>
      <button class="wbtn gold" id="wSent" type="button">Confirm money sent</button>
      <button class="wlink" type="button" id="wClose">I didn't send anything</button>`);
    const sel = a => { amt = a; p.querySelectorAll('#wAmts button').forEach(b => b.classList.toggle('sel', +b.dataset.a === a)); $w('wSent').textContent = a ? 'Confirm ' + eur(a) + ' sent' : 'Confirm money sent'; };
    p.querySelectorAll('#wAmts button').forEach(b => b.onclick = () => { $w('wAmt').value = ''; sel(+b.dataset.a); });
    $w('wAmt').oninput = () => { const v = Math.round(parseFloat($w('wAmt').value.replace(',', '.')) * 100); sel(v > 0 ? v : 0); };
    $w('wClose').onclick = closeSheet;
    $w('wSent').onclick = async () => {
      if (!amt) return ($w('wErr').textContent = 'Pick or type the amount you sent.');
      if (amt < MIN_TOPUP) return ($w('wErr').textContent = 'The minimum top-up is €1.');
      try {
        const u = await db.txn('users/' + W.user, u => { u.balance = (u.balance || 0) + amt; u.topped = (u.topped || 0) + amt; return u; });
        W.me = u; paint();
        await db.push('reqs', { user: W.user, name: u.name, kind: 'topup', a: amt, at: now(), status: 'credited' });
        log(W.user, 'topup', amt, { what: 'Revolut' });
        closeSheet(); toast(eur(amt) + ' added. Good luck!', true);
      } catch (e) { $w('wErr').textContent = 'No connection. Try again.'; }
    };
  }

  // ---------- account, stats, leaderboards ----------
  async function accountSheet(tab = 'me') {
    await refresh();
    const me = W.me; if (!me) return;
    const p = openSheet(`<h3>${esc(me.name)}</h3>
      <div class="wtabs"><button data-t="me" type="button">Me</button><button data-t="lb" type="button">Leaderboards</button></div>
      <div id="wBody"><p>Loading…</p></div>
      <button class="wlink" type="button" id="wClose">Close</button>`);
    p.querySelectorAll('.wtabs button').forEach(b => { b.classList.toggle('on', b.dataset.t === tab); b.onclick = () => accountSheet(b.dataset.t); });
    $w('wClose').onclick = closeSheet;
    const body = $w('wBody');
    try {
      if (tab === 'me') await meTab(body, me);
      else await lbTab(body);
    } catch (e) { body.innerHTML = '<p class="err">No connection. Try again in a moment.</p>'; }
  }
  async function meTab(body, me) {
    const tx = await db.get('tx/' + W.user, '?orderBy="$key"&limitToLast=40') || {};
    const reqs = Object.entries(await db.get('reqs').catch(() => null) || {}).filter(([, r]) => r.user === W.user && r.status === 'pending');
    const net = (me.won || 0) - (me.staked || 0);
    const rows = Object.values(tx).sort((a, b) => b.at - a.at);
    const name = { spin: 'Spin', win: 'Win', topup: 'Top-up', withdraw: 'Withdrawal', refund: 'Refund', adjust: 'Adjustment', payout: 'Paid out' };
    body.innerHTML = `<div class="wgrid">
        <div><small>Balance</small><b>${eur(me.balance || 0)}</b></div><div><small>Won in game</small><b>${eur(me.won || 0)}</b></div>
        <div><small>Spins</small><b>${me.spins || 0}</b></div><div><small>Up / down</small><b>${eur(net)}</b></div>
        <div><small>Biggest win</small><b>${eur(me.biggest || 0)}</b></div><div><small>Topped up</small><b>${eur(me.topped || 0)}</b></div></div>
      ${reqs.length ? `<h4>Pending</h4><ul class="wlist">${reqs.map(([, r]) => `<li>Withdrawal ${eur(r.a)}<span>${when(r.at)}</span></li>`).join('')}</ul>` : ''}
      <div class="wrow"><button class="wbtn gold" id="wT" type="button">Top up</button><button class="wbtn" id="wW" type="button">Withdraw</button></div>
      <h4>History</h4>
      <ul class="wlist">${rows.map(t => `<li><div>${name[t.t] || t.t}${t.what ? ` <span>${esc(t.what)}</span>` : ''}<br><span>${when(t.at)}</span></div><b class="${t.a >= 0 ? 'plus' : 'minus'}">${t.a >= 0 ? '+' : ''}${eur(t.a)}</b></li>`).join('') || '<li>No spins yet</li>'}</ul>
      <button class="wlink" type="button" id="wOut">Log out</button>`;
    $w('wT').onclick = () => topupSheet(); $w('wW').onclick = withdrawSheet; $w('wOut').onclick = logout;
  }
  async function lbTab(body) {
    const [users, st] = await Promise.all([db.get('users'), db.get('stats')]);
    const list = Object.values(users || {}), s = st || {};
    const board = (title, f, fmt) => {
      const top = list.filter(u => f(u)).sort((a, b) => f(b) - f(a)).slice(0, 5);
      return `<h4>${title}</h4><ul class="wlist">${top.map((u, i) => `<li><div>${['🥇', '🥈', '🥉', '4.', '5.'][i]} ${esc(u.name)}</div><b>${fmt(f(u))}</b></li>`).join('') || '<li>Nobody yet</li>'}</ul>`;
    };
    body.innerHTML = `<div class="wgrid">
        <div><small>Spins, everyone</small><b>${s.spins || 0}</b></div><div><small>Players</small><b>${list.length}</b></div>
        <div><small>Won, everyone</small><b>${eur(s.won || 0)}</b></div><div><small>Biggest win</small><b>${eur(s.biggest || 0)}</b>${s.biggestBy ? `<small>${esc(s.biggestBy)}</small>` : ''}</div></div>
      ${board('Most won', u => u.won || 0, eur)}
      ${board('Biggest single win', u => u.biggest || 0, eur)}
      ${board('Most spins', u => u.spins || 0, n => n)}
      ${board('Best up / down', u => (u.won || 0) - (u.staked || 0) || 0, eur)}`;
  }

  // ---------- withdraw (request goes to the host screen; Cillian pays on Revolut) ----------
  function withdrawSheet() {
    const me = W.me;
    const p = openSheet(`<h3>Withdraw</h3>
      <p>Your balance is <b>${eur(me.balance || 0)}</b>. It stays pending until Cillian sends it to your Revolut.</p>
      <input id="wAmt" inputmode="decimal" placeholder="Amount, e.g. 10">
      <input id="wTag" placeholder="Your Revolut @username" value="${esc(me.revtag || '')}">
      <p class="err" id="wErr"></p>
      <div class="wrow"><button class="wbtn gold" id="wGo" type="button">Request withdrawal</button><button class="wbtn" id="wAll" type="button">All of it</button></div>
      <button class="wlink" type="button" id="wClose">Close</button>`);
    $w('wAll').onclick = () => { $w('wAmt').value = ((me.balance || 0) / 100).toFixed(2); };
    $w('wClose').onclick = closeSheet;
    $w('wGo').onclick = async () => {
      const a = Math.round(parseFloat($w('wAmt').value.replace(',', '.')) * 100), tag = $w('wTag').value.trim().replace(/^@/, '');
      if (!(a > 0)) return ($w('wErr').textContent = 'Type an amount.');
      if (!tag) return ($w('wErr').textContent = 'Add your Revolut @username so Cillian knows where to send it.');
      try {
        let short = false;
        const u = await db.txn('users/' + W.user, u => { if ((u.balance || 0) < a) { short = true; return undefined; } u.balance -= a; u.revtag = tag; return u; });
        if (short) { W.me = u; paint(); return ($w('wErr').textContent = 'That is more than your balance.'); }
        W.me = u; paint();
        await db.push('reqs', { user: W.user, name: u.name, kind: 'withdraw', a, tag, at: now(), status: 'pending' });
        log(W.user, 'withdraw', -a, { what: 'to @' + tag });
        closeSheet(); toast('Withdrawal of ' + eur(a) + ' pending. Cillian will send it to @' + tag + '.', true);
      } catch (e) { $w('wErr').textContent = 'No connection. Try again.'; }
    };
  }

  // ---------- updates (version.json in the GitHub repo) ----------
  async function checkUpdate() {
    if (!CFG.updateUrl) return;
    try {
      const v = await (await fetch(CFG.updateUrl + '?t=' + now(), { cache: 'no-store' })).json();
      const apkHave = app && app.apkVersion ? +app.apkVersion() : 0;
      if (app && v.apk > apkHave && v.apkUrl) return offer(`New app version${v.notes ? ': ' + v.notes : ''}`, () => { app.installApk(v.apkUrl); banner.innerHTML = '<span>Downloading… Android will ask to install it.</span>'; });
      if (v.game > CFG.gameVersion && v.gameUrl) return offer(`Game update${v.notes ? ': ' + v.notes : ''}`, () => {
        if (busy) return toast('Finish this spin first');
        banner.innerHTML = '<span>Updating…</span>';
        if (app && app.updateGame) app.updateGame(v.gameUrl, String(v.game)); else location.reload();
      });
    } catch (e) {}
  }
  function offer(text, go) {
    banner.hidden = false;
    banner.innerHTML = `<span>${esc(text)}</span><div class="wrow" style="flex:none"><button class="wbtn small gold" id="wUp" type="button">Update</button><button class="wbtn small" id="wLater" type="button">Later</button></div>`;
    $w('wUp').onclick = go; $w('wLater').onclick = () => { banner.hidden = true; };
  }
  window.wolUpdateFailed = msg => { banner.hidden = false; banner.innerHTML = `<span>Update failed: ${esc(msg || 'no connection')}</span><button class="wbtn small" type="button" onclick="this.parentNode.hidden=true">OK</button>`; };

  // ---------- boot ----------
  const savedStake = +pref.get('wol.stake'); if (STAKES.includes(savedStake)) W.stake = savedStake;
  W.user = pref.get('wol.user');
  paint();
  if (W.user) refresh(); else showLogin();
  checkUpdate();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { refresh(); } });
  setInterval(() => { if (!busy && !document.hidden) refresh(); }, 30000);
})();
