// ---------- wallet layer for the Android app ----------
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
  const TEST_KEY = 'test', isTest = () => !!(W.me && W.me.test);
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
.wbar{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:14px;margin-bottom:-2px}
.wbar .who{display:flex;flex-direction:column;align-items:flex-start;background:none;border:1px solid var(--line);border-radius:12px;padding:4px 10px;color:var(--chrome);min-width:0}
.wbar .who small{font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:var(--mute);max-width:9em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wbar .who b{font-family:var(--display);font-weight:400;font-size:15px;letter-spacing:.04em;color:#f5d27a}
.wbar .wmid{display:flex;align-items:center;justify-content:center;flex:1;min-width:0}
.wbar .wright{display:flex;align-items:center;gap:8px;flex:0 0 auto}
.wpot{display:flex;flex-direction:column;align-items:center;background:none;border:1px solid var(--line);border-radius:12px;padding:4px 10px;min-width:110px}
.wpot small{font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:var(--mute)}
.wpot b{font-family:var(--display);font-weight:400;font-size:15px;letter-spacing:.04em;color:#f5d27a}
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
.wpanel{width:100%;max-width:560px;max-height:92vh;overflow:auto;background:linear-gradient(180deg,#1c1f24,#121418);border:1px solid var(--line);border-bottom:0;border-radius:20px 20px 0 0;padding:18px 18px 22px;display:flex;flex-direction:column;gap:12px;box-shadow:0 -10px 30px rgba(0,0,0,.36)}
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
.app>.stage{max-width:none}
html,body{overflow-x:hidden}
body{box-sizing:border-box;margin:0}
.wilds canvas.wt{width:50px;height:50px}
.app>.spin{min-height:62px}
.wbanner{position:fixed;left:10px;right:10px;top:calc(10px + env(safe-area-inset-top,0px));z-index:40;display:flex;flex-direction:column;gap:14px;align-items:stretch;text-align:center;padding:20px 16px;border-radius:18px;background:rgba(20,22,26,.94);border:1px solid var(--line);box-shadow:0 12px 30px rgba(0,0,0,.38)}
.wbanner .wbig{font-size:26px;padding:18px 10px;border-radius:16px;flex:2}
.wbanner .wrow{gap:10px}
.wbanner .wrow .wbtn:not(.wbig){font-size:17px;flex:1}
.wbanner[hidden]{display:none}
.wlogin{position:fixed;inset:0;z-index:60;background:radial-gradient(circle at 50% 30%,#1e2228,#0a0c0f 70%);display:flex;align-items:center;justify-content:center;padding:20px}
.wlogin[hidden]{display:none}
.wlogin .wpanel{border-radius:20px;border-bottom:1px solid var(--line);max-width:420px}
.wlogin h1{text-align:center;margin-bottom:6px}
.wtoast{position:fixed;left:50%;top:calc(14px + env(safe-area-inset-top,0px));transform:translateX(-50%);z-index:70;background:#20252c;border:1px solid var(--line);border-radius:999px;padding:8px 14px;color:var(--chrome);opacity:1;transition:opacity .25s ease}
.wtoast.gold{border-color:#f5d27a;color:#f8e4a6}
.wbar .who.test{border:2px dashed #4fd1c5;background:rgba(20,70,68,.5)}.wbar .who.test small{color:#8ef0e6}.wbar .who.test b{color:#8ef0e6}
body.wtest::after{content:'TEST ACCOUNT · PLAY MONEY';position:fixed;left:0;right:0;bottom:0;z-index:30;text-align:center;font:700 11px/1 var(--body);letter-spacing:.2em;padding:6px 0 calc(6px + env(safe-area-inset-bottom,0px));background:#0f4f4c;color:#c8fff8;pointer-events:none}
.wlive{display:inline-flex;vertical-align:middle;margin-left:12px;align-items:center;gap:6px;padding:6px 12px;border-radius:999px;border:1.5px solid #ff4d4d;background:rgba(60,8,8,.85);color:#fff;font-weight:700;letter-spacing:.12em}
.wlive i{width:9px;height:9px;border-radius:50%;background:#9b5de5;box-shadow:0 0 6px #9b5de5}
.wlive.on i{background:#ff3b3b;box-shadow:0 0 8px #ff3b3b;animation:wblink 1.2s ease-in-out infinite}
.wlive em{font-style:normal;background:#ff3b3b;border-radius:999px;padding:2px 7px;letter-spacing:0;font-size:12px}
.wlive em:empty{display:none}
@keyframes wblink{50%{opacity:.25}}
.wpl{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 4px;border-bottom:1px solid var(--line)}
.wpl b{font-size:17px}.wpl small{display:block;color:var(--mute);font-size:12px;letter-spacing:.06em}
.wpl small.on{color:#7dff9a}
.wwatch{position:fixed;inset:0;z-index:60;background:#07090c;display:flex;flex-direction:column;align-items:center;gap:10px;padding:calc(12px + env(safe-area-inset-top,0px)) 12px calc(12px + env(safe-area-inset-bottom,0px)) 12px}
.wwatch[hidden]{display:none}
.wghost{position:absolute;right:4%;top:18%;z-index:6;display:flex;flex-direction:column;align-items:center;max-width:62%;opacity:0;transform:translateX(60%);transition:opacity .9s ease,transform 1.1s ease;pointer-events:none}
.wghost.in{opacity:.55;transform:none}.wghost.out{opacity:0;transform:translate(-40%,-30%)}
.wghost canvas{width:70px;height:auto}
.wghost p{margin:-6px 0 0;background:rgba(235,250,245,.85);color:#1b2a26;border-radius:14px;padding:6px 10px;font-size:14px;line-height:1.25;text-align:center}
.wghost p b{display:block;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#3d4a2e}
.wfeed{position:fixed;left:8px;right:8px;top:calc(6px + env(safe-area-inset-top,0px));z-index:45;display:flex;align-items:center;gap:10px;padding:9px 14px;border-radius:999px;background:rgba(40,10,10,.9);border:1px solid #ff4d4d;color:#fff;font-size:14px;box-shadow:0 6px 20px rgba(0,0,0,.5);overflow:hidden;white-space:nowrap}
.wfeed[hidden]{display:none}.wfeed span{color:#ff6b6b;font-weight:700;font-size:11px;letter-spacing:.14em;flex:none}.wfeed b{overflow:hidden;text-overflow:ellipsis}
.wfeed.go{animation:wfeedIn .5s ease-out}@keyframes wfeedIn{from{transform:translateY(-120%)}to{transform:none}}
.wwatch .wsay{width:100%;max-width:560px;display:flex;gap:8px}.wwatch .wsay input{flex:1;min-width:0}
.wpl .amt{color:#f5d27a;font-weight:700}
.wwatch .wwh{width:100%;max-width:560px;display:flex;align-items:center;justify-content:space-between;gap:8px}
.wwatch .wwh b{font-size:18px}.wwatch .wwh small{display:block;color:var(--mute);font-size:12px}
.wwatch .wscr{position:relative;width:min(100%,66vh,560px);aspect-ratio:1;border-radius:18px;overflow:hidden;background:#120b07;border:1px solid var(--line)}
.wwatch .wscr canvas{width:100%;height:100%;display:block}
.wwatch .wwt{display:flex;gap:18px;font:700 13px/1 var(--body);letter-spacing:.14em}.wwatch .wwt .g{color:#f5d27a}.wwatch .wwt .p{color:#c9a2ff}
.wwatch .wscr p{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;text-align:center;padding:20px;margin:0;color:var(--mute);font-size:15px}
.wwatch .wscr ol{position:absolute;inset:0;margin:0;padding:18px 18px 18px 38px;display:flex;flex-direction:column;justify-content:center;gap:6px;font-size:15px;color:#f8e4a6;background:rgba(10,8,7,.77)}
.wwatch .wvd{width:100%;max-width:560px;text-align:center}
.wwatch .wvd small{font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:var(--mute)}
.wwatch .wvd h3{margin:4px 0;font-family:var(--display);font-weight:400;font-size:24px;color:#f5d27a}
.wwatch .wvd p{margin:0;font-size:15px;color:var(--chrome)}
`;
  document.head.appendChild(el('style', null, css));

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

  async function refreshJackpot() {
    try {
      const j = await db.get('jackpot').catch(() => ({ amount: JACKPOT_START }));
      W.jackpot = j && typeof j.amount === 'number' ? j.amount : JACKPOT_START;
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
      if (run && !run.paid) {
        let m = /^Final answer · €([\d.]+)/.exec(o.eyebrow || '');
        if (!m && o.eyebrow === 'Final answer' && /^€[\d.]+$/.test(o.title || '')) m = [0, o.title.slice(1)];
        const isPhelanTomb = /phelan/i.test(String(o.title || '') + ' ' + String(o.body || '') + ' ' + String(o.eyebrow || ''));
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
      log(W.user, 'win', c, { stake, what: String(what || '').slice(0, 60) });
      if (!isTest()) db.txn('stats', st => { st = st || {}; st.won = (st.won || 0) + c; if (c > (st.biggest || 0)) { st.biggest = c; st.biggestBy = W.me.name; } return st; }).catch(() => {});
    } catch (e) { pendingWins.push([c, stake, what]); savePending(); toast('Win saved on this phone. It adds when you are back online.'); }
  }
  // wins that could not reach the database are kept and retried
  let pendingWins = []; try { pendingWins = JSON.parse(pref.get('wol.pendingWins') || '[]'); } catch (e) {}
  const savePending = () => pref.set('wol.pendingWins', JSON.stringify(pendingWins));
  setInterval(() => { if (pendingWins.length && W.user && navigator.onLine !== false) { const p = pendingWins; pendingWins = []; savePending(); p.forEach(a => credit(...a)); } }, 15000);
  async function refund(s) {
    try { const u = await db.txn('users/' + W.user, u => { u.balance += s; u.staked -= s; u.spins -= 1; return u; }); W.me = u; paint(); log(W.user, 'refund', s); toast('Run broke, stake refunded.'); } catch (e) { toast('No connection. Your stake stays on this phone.'); }
  }

  // ---------- top up (player pays Cillian on Revolut and confirms; the host page can reverse) ----------
  function topupSheet(msg) {
    if (!W.me) return showLogin();
    if (isTest()) {
      openSheet(`<h3>Play money</h3>${msg ? `<p class="err">${esc(msg)}</p>` : ''}<p>This is the test account. Its money is not real, so top it up for free.</p>
        <button class="wbtn gold" id="wPlay" type="button">Add €50 play money</button><button class="wlink" type="button" id="wClose">Close</button>`);
      $w('wPlay').onclick = async () => { try { W.me = await db.txn('users/' + W.user, u => { u.balance = (u.balance || 0) + 5000; return u; }); paint(); closeSheet(); toast('€50 play money added'); } catch (e) { toast('No connection'); } };
      $w('wClose').onclick = closeSheet;
      return;
    }
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
      <ul class="wlist">${rows.map(t => `<li><div>${name[t.t] || t.t}${t.what ? ` <span>${esc(t.what)}</span>` : ''}<br><span>${when(t.at)}</span></div><b class="${t.a >= 0 ? 'plus' : 'minus'}">${eur(t.a)}</b></li>`).join('') || '<li><span>No spins yet</span></li>'}</ul>
      <button class="wlink" type="button" id="wOut">Log out</button>`;
    $w('wT').onclick = () => topupSheet(); $w('wW').onclick = withdrawSheet; $w('wOut').onclick = logout;
  }
  async function lbTab(body) {
    const [users, st] = await Promise.all([db.get('users'), db.get('stats')]);
    const list = Object.values(users || {}).filter(u => !u.test), s = st || {};
    const board = (title, f, fmt) => {
      const top = list.filter(u => f(u)).sort((a, b) => f(b) - f(a)).slice(0, 5);
      return `<h4>${title}</h4><ul class="wlist">${top.map((u, i) => `<li><div>${['🥇', '🥈', '🥉', '4.', '5.'][i]} ${esc(u.name)}</div><b>${fmt(f(u))}</b></li>`).join('') || '<li>Nobody yet</li>'}</ul>`;
    };
    body.innerHTML = `<div class="wgrid">
        <div><small>Spins, everyone</small><b>${s.spins || 0}</b></div><div><small>Players</small><b>${list.length}</b></div>
        <div><small>Won, everyone</small><b>${eur(s.won || 0)}</b></div><div><small>Biggest win</small><b>${eur(s.biggest || 0)}</b>${s.biggestBy ? `<small>${esc(s.biggestBy)}</small>` : ''}</div>
        <div><small>Jackpot</small><b>${eur(W.jackpot || JACKPOT_START)}</b></div><div><small>Live</small><b>${Object.keys(users || {}).filter(k => !((users || {})[k].test || false)).length}</b></div></div>
      ${board('Most won', u => u.won || 0, eur)}
      ${board('Biggest single win', u => u.biggest || 0, eur)}
      ${board('Most spins', u => u.spins || 0, n => n)}
      ${board('Best up / down', u => (u.won || 0) - (u.staked || 0) || 0, eur)}`;
  }

  // ---------- withdraw (request goes to the host screen; Cillian pays on Revolut) ----------
  function withdrawSheet() {
    const me = W.me;
    if (isTest()) return toast('Test account money is not real, so it cannot be withdrawn.');
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

  // ---------- live: who is on now, and watching them play ----------
  // live/{key} = { name, at, play } is a heartbeat. A watcher writes live/{key}/w/{them} = time every few seconds;
  // only then does the player's phone send small JPEG frames of the wheel to livef/{key}. No watchers, no frames.
  const ONLINE_MS = 90000, WATCH_MS = 20000, me4 = () => W.user || 'guest';
  const liveBtn = el('button', 'wlive'); liveBtn.type = 'button'; liveBtn.innerHTML = '<i></i>WATCH<em></em>';
  const hdr = document.querySelector('.app header > span'); if (hdr) hdr.appendChild(liveBtn); else appEl.prepend(liveBtn);
  let others = [], watchers = 0, streaming = false;
  function paintLive() { ($w('wLive') || liveBtn).classList.toggle('on', others.length > 0); ($w('wLive') || liveBtn).querySelector('em').textContent = watchers ? '👁 ' + watchers : others.length ? String(others.length) : ''; }
  async function heartbeat() {
    if (document.hidden) return;
    try {
      if (W.user && W.me) await db.put('live/' + W.user + '/p', { name: W.me.name, at: now(), play: !!(W.run && W.run.live) }); // PUT, not PATCH: PATCH goes through a method-override header on Android
      const all = await db.get('live') || {}, t = now();
      others = Object.entries(all).map(([k, v]) => Object.assign({ key: k }, v && v.p && v.p.name ? v.p : v)).filter(o => o.key !== W.user && o.name && t - (o.at || 0) < ONLINE_MS);
      const w = (W.user && all[W.user] && all[W.user].w) || {};
      watchers = Object.entries(w).filter(([k, v]) => k !== W.user && t - v < WATCH_MS).length;
      paintLive();
      if (watchers && !streaming && W.user) streamLoop();
    } catch (e) {}
  }
  // Watching mirrors the game, it doesn't film it: the player's phone sends the game's own state (wheel angles,
  // which room, balls, dice, chickens, doors...) several times a second, and the watcher's phone draws it with
  // the same game code, so it looks exactly like the real thing. Only small JSON goes over the wire:
  // livef/{key}/base holds the whole state (refreshed every few seconds), livef/{key}/d only what changed since.
  const MIRROR = ['N', 'c', 'R', 'D', 'scene', 'zoom', 'fade', 'DEPTH', 'evenA', 'FINAL', 'B', 'dice', 'rotF', 'flatT', 'balls', 'ballR', 'counts', 'winner', 'banner',
    'rotP', 'hi', 'hiA', 'domeBulge', 'pAng', 'ghost', 'ghostSay', 'dots', 'boostA', 'boostNew', 'wellBalls', 'introT', 'camT', 'hallZ', 'doorT', 'flash', 'rotS',
    'bingo', 'ballSpeed', 'ballPhase', 'pickIdx', 'handT', 'liftT', 'handClosed', 'prize', 'roul', 'vault', 'coaster', 'planet', 'mon', 'rotC', 'zena', 'god', 'pyr',
    'pipes', 'carried', 'd6', 'd6Sum', 'chickens', 'arrows', 'fires', 'feathers', 'camX', 'markItems', 'rotM', 'formT', 'showMark', 'chainNote',
    'rot', 'deadA', 'deadTo', 'deadFrom'];
  const SLOW = ['N', 'c', 'R', 'D', 'FINAL', 'B', 'ord', 'boostNew', 'markItems'];
  const ANGLES = ['rotF', 'rotP', 'rotS', 'rotC', 'rotM', 'pAng'];
  const ROOMS = { stank: 'the Stank Chamber', roul: 'the Stank Chamber', vault: 'the golden locksafe', pyramid: "Phelan's Pyramid", god: 'the God room', zena: 'the God room', coaster: 'the Monster bonus', planet: 'the Monster bonus', monster: 'the Monster tank', pipes: "Mark's farm", farm: "Mark's farm" };
  const mirGet = {}, mirSet = {};
  MIRROR.forEach(n => {
    try { mirGet[n] = new Function('return ' + n); mirGet[n](); } catch (e) { delete mirGet[n]; return; }
    try { mirSet[n] = new Function('v', n + ' = v'); } catch (e) {}
  });
  const isThing = v => v && typeof v === 'object' && ((typeof Node !== 'undefined' && v instanceof Node) || (typeof CanvasRenderingContext2D !== 'undefined' && v instanceof CanvasRenderingContext2D) || (typeof ImageBitmap !== 'undefined' && v instanceof ImageBitmap) || v instanceof Map || v instanceof Set);
  const slim = (k, v) => typeof v === 'function' || isThing(v) ? undefined : typeof v === 'number' ? (Number.isFinite(v) ? Math.round(v * 1000) / 1000 : 0) : v;
  // the game right now, one JSON string per piece of state
  function capture() {
    const st = {};
    for (const n in mirGet) { try { const j = JSON.stringify(mirGet[n](), slim); if (j !== undefined) st[n] = j; } catch (e) {} }
    st.ord = JSON.stringify(typeof runOrders !== 'undefined' ? runOrders : null);
    const tiles = [...document.querySelectorAll('.wilds .wt')];
    st.tw = String(tiles.slice(0, 3).filter(t => t.classList.contains('lit')).length); st.tb = String(tiles.slice(3).filter(t => t.classList.contains('lit')).length);
    const capEl = document.getElementById('caption');
    st.v = JSON.stringify(lastVerdict); st.cap = JSON.stringify(capEl ? capEl.textContent : '');
    st.fin = JSON.stringify(document.querySelector('.stage.done') ? [...document.querySelectorAll('#finalList li')].map(li => li.textContent).slice(0, 10) : null);
    return st;
  }
  const join = (st, keys) => '{' + keys.map(k => JSON.stringify(k) + ':' + st[k]).join(',') + '}';
  const changed = (a, b) => Object.keys(a).filter(k => a[k] !== (b && b[k]));
  const pause = ms => new Promise(r => setTimeout(r, ms));
  let liveBase = null, liveBaseId = 0, liveBaseAt = 0, liveI = 0, liveSent = '';
  async function sendLive(st, playing) {
    const capEl = document.getElementById('caption');
    if (!liveBase || SLOW.some(k => st[k] !== liveBase[k]) || now() - liveBaseAt > 5000) {
      liveBase = st; liveBaseId++; liveBaseAt = now();
      await db.put('livef/' + W.user + '/base', { id: liveBaseId, st: join(st, Object.keys(st)) });
    }
    const d = join(st, changed(st, liveBase)), extra = JSON.stringify([lastVerdict, capEl ? capEl.textContent : '', W.run && W.run.live ? W.run.stake : W.stake, W.me ? W.me.balance || 0 : 0, playing]);
    if (d + extra === liveSent) return; // nothing moved
    liveSent = d + extra;
    await db.put('livef/' + W.user + '/d', { i: ++liveI, b: liveBaseId, at: now(), d, v: lastVerdict, cap: capEl ? capEl.textContent : '', s: W.run && W.run.live ? W.run.stake : W.stake, bal: W.me ? W.me.balance || 0 : 0, play: playing });
  }
  async function streamLoop() {
    streaming = true; let sinceCheck = now(), sinceMsg = now();
    try {
      while (watchers && !document.hidden && W.user) {
        const t0 = now(), playing = typeof busy !== 'undefined' && busy;
        try { await sendLive(capture(), playing); } catch (e) { await pause(1500); }
        const gap = (playing ? 90 : 700) - (now() - t0); if (gap > 0) await pause(gap);
        if (now() - sinceMsg > 2000) { sinceMsg = now(); await checkMsgs(); }
        if (now() - sinceCheck > 5000) { sinceCheck = now(); await heartbeat(); }
      }
    } finally { streaming = false; }
  }

  // ---------- big wins are saved as their state frames, so anyone can rewatch them later ----------
  // hlm/{id} is the small card for the list, hld/{id} the frames (gzipped where the phone can)
  let rec = null, wasBusy = false, feedRoom = '';
  async function pack(text) {
    try {
      if (typeof CompressionStream === 'undefined') return { z: 0, s: text };
      const buf = await new Response(new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer();
      let bin = ''; const u = new Uint8Array(buf); for (let i = 0; i < u.length; i += 8192) bin += String.fromCharCode.apply(null, u.subarray(i, i + 8192));
      return { z: 1, s: btoa(bin) };
    } catch (e) { return { z: 0, s: text }; }
  }
  async function unpack(o) {
    if (!o) return null;
    if (!o.z) return o.s;
    const bin = atob(o.s), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return new Response(new Blob([u]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
  }
  function feed(text) { if (W.user && !isTest()) db.push('feed', { by: W.user, name: W.me ? W.me.name : '', text, at: now() }).catch(() => {}); }
  // runs on every phone a few times a second: records the run, spots the big moments for the live feed
  setInterval(() => {
    const playing = typeof busy !== 'undefined' && busy;
    if (playing && !wasBusy) { rec = { t0: now(), last: null, frames: [], room: '', win: null, stake: W.run && W.run.live ? W.run.stake : W.stake }; feedRoom = ''; }
    wasBusy = playing;
    if (!rec) return;
    try {
      const st = capture(), sc = JSON.parse(st.scene || '""');
      if (ROOMS[sc] && !rec.room) { rec.room = ROOMS[sc]; if (feedRoom !== rec.room) { feedRoom = rec.room; feed(`${W.me ? W.me.name : 'Someone'} just hit ${rec.room} 🔥`); } }
      if (rec.frames.length < 1200) { const ks = changed(st, rec.last); if (ks.length) rec.frames.push([now() - rec.t0, join(st, ks)]); rec.last = st; }
      const m = lastVerdict && /^Final answer · (€[\d.]+)/.exec(lastVerdict.e);
      if (m && !rec.win) rec.win = { amt: m[1], title: lastVerdict.t };
    } catch (e) {}
    if (!playing) { // the run is over
      const r = rec; rec = null;
      if (r.win && r.room && W.user && !isTest() && parseFloat(r.win.amt.slice(1)) >= Math.max(1, (r.stake || 10) / 10)) saveHighlight(r); // big wins only: €1+ and 10x the bet
    }
  }, 250);
  async function saveHighlight(r) {
    try {
      feed(`${W.me.name} won ${r.win.amt} in ${r.room} 💰`);
      const data = await pack(JSON.stringify(r.frames));
      const id = await db.push('hlm', { by: W.user, name: W.me.name, at: now(), amt: r.win.amt, title: r.win.title.slice(0, 80), room: r.room, len: r.frames.length ? r.frames[r.frames.length - 1][0] : 0 });
      await db.put('hld/' + id, data);
    } catch (e) {}
  }

  // ---------- messages from watchers: Ghost Phelan carries them across, see-through so they don't get in the way ----------
  let lastMsg = '', ghostSprite = null;
  function ghostImg() {
    if (ghostSprite) return ghostSprite;
    const k = document.createElement('canvas'); k.width = 180; k.height = 200;
    const keep = [ctx, ghost, R];
    try { ctx = k.getContext('2d'); ghost = { x: 90, y: 110, a: 1, side: 1 }; R = 300; drawGhost(); } catch (e) {}
    finally { ctx = keep[0]; ghost = keep[1]; R = keep[2]; }
    return (ghostSprite = k);
  }
  async function checkMsgs() {
    if (!W.user) return;
    try {
      const m = await db.get('live/' + W.user + '/msg');
      if (m && m.id && m.id !== lastMsg) { const first = !lastMsg; lastMsg = m.id; if (!first || now() - (m.at || 0) < 30000) showGhostMsg(m.from || 'Someone', m.text || ''); }
      else if (!lastMsg) lastMsg = '-';
    } catch (e) {}
  }
  function showGhostMsg(from, text) {
    const st = document.querySelector('.stage'); if (!st || !text) return;
    const box = el('div', 'wghost'), img = ghostImg();
    const k = document.createElement('canvas'); k.width = img.width; k.height = img.height; k.getContext('2d').drawImage(img, 0, 0);
    box.innerHTML = `<p><b>${esc(from)}</b> ${esc(text)}</p>`; box.prepend(k);
    st.appendChild(box);
    requestAnimationFrame(() => box.classList.add('in'));
    setTimeout(() => { box.classList.remove('in'); box.classList.add('out'); }, 5200);
    setTimeout(() => box.remove(), 6400);
  }

  // ---------- live feed: the big moments from everyone, across the top ----------
  const ticker = el('div', 'wfeed'); ticker.hidden = true; document.body.appendChild(ticker);
  let feedSeen = null, feedQ = [], feedShowing = false;
  async function pollFeed() {
    try {
      const f = await db.get('feed', '?orderBy="$key"&limitToLast=5') || {};
      const items = Object.entries(f).sort((a, b) => a[0] < b[0] ? -1 : 1);
      if (feedSeen === null) { feedSeen = items.length ? items[items.length - 1][0] : ''; return; } // only news from now on
      items.forEach(([id, it]) => { if (id > feedSeen) { feedSeen = id; if (now() - (it.at || 0) < 120000) feedQ.push(it); } });
      showFeed();
    } catch (e) {}
  }
  function showFeed() {
    if (feedShowing || !feedQ.length) return;
    const it = feedQ.shift(); feedShowing = true;
    ticker.innerHTML = `<span>● LIVE</span><b>${esc(it.text)}</b>`; ticker.hidden = false;
    ticker.onclick = () => { if (it.by && it.by !== W.user) { const o = others.find(x => x.key === it.by); watch(it.by, o ? o.name : it.name || it.by); } };
    ticker.classList.remove('go'); void ticker.offsetWidth; ticker.classList.add('go');
    setTimeout(() => { ticker.hidden = true; feedShowing = false; showFeed(); }, 7000);
  }
  setInterval(() => { if (!document.hidden) pollFeed(); }, 6000); setTimeout(pollFeed, 3000);
  liveBtn.id = 'wLive';
  document.addEventListener('click', e => { if (e.target.closest && e.target.closest('#wLive')) watchList(); });
  async function watchList() {
    const p = openSheet(`<h3>Watch live</h3><div id="wBody"><p>Looking for players…</p></div><button class="wlink" type="button" id="wClose">Close</button>`);
    $w('wClose').onclick = closeSheet;
    await heartbeat();
    const body = $w('wBody'); if (!body) return;
    body.innerHTML = others.length ? others.sort((a, b) => (b.play ? 1 : 0) - (a.play ? 1 : 0)).map(o => `<div class="wpl"><div><b>${esc(o.name)}</b><small class="${o.play ? 'on' : ''}">${o.play ? 'Spinning now' : 'Waiting'}</small></div><button class="wbtn small" data-k="${esc(o.key)}" type="button">Watch</button></div>`).join('') : '<p>Nobody else has the wheel open right now. Check back in a minute.</p>';
    body.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { const o = others.find(x => x.key === b.dataset.k); closeSheet(); watch(o.key, o.name); });
    // big wins anyone can rewatch
    try {
      const hl = Object.entries(await db.get('hlm', '?orderBy="$key"&limitToLast=15') || {}).reverse();
      if (hl.length && $w('wBody')) {
        const box = el('div'); box.innerHTML = '<h4>Big wins to rewatch</h4>' + hl.map(([id, h]) => `<div class="wpl"><div><b>${esc(h.name)}</b> <span class="amt">${esc(h.amt)}</span><small>${esc(h.room)} · ${when(h.at)}</small></div><button class="wbtn small" type="button" data-h="${esc(id)}">Replay</button></div>`).join('');
        $w('wBody').appendChild(box);
        box.querySelectorAll('[data-h]').forEach(b => b.onclick = () => replay(b.dataset.h, (hl.find(x => x[0] === b.dataset.h) || [])[1]));
      }
    } catch (e) {}
  }
  const view = el('div', 'wwatch'); view.hidden = true; document.body.appendChild(view);
  let viewing = null;
  // the watcher's own game sits idle underneath; it borrows its canvas to draw the other phone's state, then reloads
  const lerpAng = (a, b, t) => { const d = Math.atan2(Math.sin(b - a), Math.cos(b - a)); return a + d * t; };
  function mirApply(st, prev, t) {
    if (st.N && st.N !== N) { cv.width = cv.height = st.N; }
    for (const n in st) {
      if (!mirGet[n]) continue;
      let v = st[n];
      if (prev && t < 1) {
        if (ANGLES.includes(n) && typeof prev[n] === 'number') v = lerpAng(prev[n], v, t);
        else if (n === 'rot' && Array.isArray(prev.rot) && Array.isArray(v)) v = v.map((a, k) => typeof prev.rot[k] === 'number' ? lerpAng(prev.rot[k], a, t) : a);
        else if (n === 'zoom' && typeof prev.zoom === 'number' && prev.zoom > 0 && v > 0) v = prev.zoom * Math.pow(v / prev.zoom, t);
        else if (n === 'camX' && typeof prev.camX === 'number') v = prev.camX + (v - prev.camX) * t;
      }
      const cur = mirGet[n]();
      if (Array.isArray(cur) && Array.isArray(v) && (!mirSet[n] || n === 'rot' || n === 'deadA' || n === 'deadTo' || n === 'deadFrom')) { v.forEach((x, k) => cur[k] = x); continue; }
      try { mirSet[n](v); } catch (e) {}
    }
  }
  // the faces each room needs are built on the watcher's phone the first time it shows that room
  let builtN = 0, lastOrd = '', pTmp = null, pSrc = null;
  function mirFaces(st) {
    if (st.N !== builtN) { builtN = st.N; try { build(); lastOrd = ''; pTmp = pSrc = null; } catch (e) {} }
    const ord = JSON.stringify(st.ord || null);
    if (st.ord && ord !== lastOrd) { lastOrd = ord; st.ord.forEach((o, j) => { try { if (runOrders[j].join() !== o.join()) setLayerOrder(j + 1, o); } catch (e) {} }); navCache = null; }
    const s = st.scene;
    try {
      if (/stank|roul|vault/.test(s)) ensureStank();
      if (s === 'roul' && (!faces.roulBowl || faces.roulBowl.width !== N)) faces.roulBowl = buildRoulBowl();
      if (/coaster|planet|monster/.test(s)) {
        if (!faces.cosmic) faces.cosmic = buildCosmic();
        if (!faces.can || faces.can.height !== Math.round(N * .066)) { faces.can = buildCan(); faces.canW = buildCan('W'); faces.canB = buildCan('B'); }
      }
      if (s === 'pipes' && (!faces.pipeBg || faces.pipeBg.width !== N)) faces.pipeBg = buildPipeBg();
      if (/farm|pipes/.test(s) && !faces.farm) faces.farm = buildFarm();
      if (s === 'god' && (!faces.godWheel || faces.godWheel.width !== N)) faces.godWheel = buildGodWheel(GOD_PRIZES);
      if (s === 'zena' && zena && zena.items && (!faces.phelanWheel || faces.phelanWheel.width !== N || faces.phelanFor !== JSON.stringify(zena.items))) { faces.phelanWheel = buildPhelanWheel(zena.items); faces.phelanFor = JSON.stringify(zena.items); }
    } catch (e) {}
    if (planet) { // the melting planet wheel draws from two scratch canvases of its own
      if (!pTmp || pTmp.width !== N >> 1) pTmp = mk(N >> 1, N >> 1);
      planet.tmp = pTmp;
      if (planet.melt > 0) {
        if (!pSrc && faces.cosmic) { pSrc = mk(); const g = pSrc.getContext('2d'); g.translate(c, c); g.rotate(rotC); g.drawImage(faces.cosmic, -c, -c); }
        planet.src = pSrc;
      } else pSrc = null;
    }
    snapA = 0; godParts = [];
  }
  // one screen for both live watching and replays: push() states in, it draws them smoothly
  function mirrorScreen(title, sub, live) {
    view.hidden = false;
    view.innerHTML = `<div class="wwh"><div><b>${esc(title)}</b><small id="wwSub">${esc(sub)}</small></div>${live ? '<span class="wlive on" style="margin:0"><i></i>LIVE</span>' : '<span class="wlive" style="margin:0"><i></i>REPLAY</span>'}</div>
      <div class="wscr"><canvas id="wwCv"></canvas><ol id="wwFin" hidden></ol><p id="wwMsg">${live ? 'Connecting…' : 'Loading…'}</p></div>
      <div class="wwt" id="wwTiles"></div>
      <div class="wvd"><small id="wwE"></small><h3 id="wwT"></h3><p id="wwB"></p><p id="wwC" style="color:var(--mute);margin-top:6px"></p></div>
      ${live ? '<div class="wsay"><input id="wwSay" maxlength="60" placeholder="Send a message with Ghost Phelan"><button class="wbtn gold small" type="button" id="wwSend">Send</button></div>' : ''}
      <button class="wbtn" type="button" id="wwX" style="width:100%;max-width:560px">${live ? 'Stop watching' : 'Close'}</button>`;
    $w('wwX').onclick = stopWatch;
    const vc = $w('wwCv'), vg = vc.getContext('2d');
    const S = { cur: null, prev: null, tCur: 0, span: 120, fresh: false, alive: true };
    const frame = () => {
      if (!S.alive || view.hidden) return;
      requestAnimationFrame(frame);
      if (!S.cur) return;
      const p = Math.min(1, (performance.now() - S.tCur) / S.span);
      try {
        if (S.fresh) { S.fresh = false; mirApply(S.cur, null, 1); mirFaces(S.cur); }
        if (p < 1 && S.prev) { mirApply(S.cur, S.prev, p); mirFaces(S.cur); S.lerped = true; }
        else if (S.lerped) { S.lerped = false; mirApply(S.cur, null, 1); mirFaces(S.cur); }
        draw();
        const w = Math.round(vc.clientWidth * Math.min(2, devicePixelRatio || 1)); if (w && vc.width !== w) vc.width = vc.height = w;
        vg.clearRect(0, 0, vc.width, vc.height); vg.drawImage(cv, 0, 0, vc.width, vc.height);
      } catch (e) {}
    };
    requestAnimationFrame(frame);
    S.push = (st, info) => {
      const t = performance.now(); S.span = Math.max(60, Math.min(600, t - (S.tCur || t - 120)));
      S.prev = S.cur; S.cur = st; S.tCur = t; S.fresh = true;
      $w('wwMsg').hidden = true;
      if (info && info.sub) $w('wwSub').textContent = info.sub;
      const v = st.v || {}; $w('wwE').textContent = v.e || ''; $w('wwT').textContent = v.t || ''; $w('wwB').textContent = v.b || ''; $w('wwC').textContent = st.cap || '';
      const fin = $w('wwFin'), fl = st.fin; fin.hidden = !fl; if (fl) fin.innerHTML = fl.map(x => `<li>${esc(x)}</li>`).join('');
      const tw = +st.tw || 0, tb = +st.tb || 0;
      $w('wwTiles').innerHTML = `<span class="g">${'●'.repeat(Math.min(tw, 9))}${'○'.repeat(Math.max(0, 3 - tw))} WILDS</span><span class="p">${'●'.repeat(Math.min(tb, 9))}${'○'.repeat(Math.max(0, 3 - tb))} BONUS</span>`;
    };
    S.say = text => { const m = $w('wwMsg'); if (m) { m.hidden = false; m.textContent = text; } };
    return S;
  }
  const parse = s => { try { return JSON.parse(s); } catch (e) { return {}; } };
  async function watch(key, name) {
    if (typeof busy !== 'undefined' && busy) return toast('Finish your spin first');
    closeSheet();
    viewing = key; const mine = viewing;
    const S = mirrorScreen(name, 'Connecting…', true);
    S.say(`Connecting to ${name}'s phone…`);
    $w('wwSend').onclick = async () => {
      const inp = $w('wwSay'), text = inp.value.trim().slice(0, 60); if (!text) return;
      inp.value = '';
      try { await db.put('live/' + key + '/msg', { id: now().toString(36) + Math.random().toString(36).slice(2, 6), from: W.me ? W.me.name : 'A watcher', text, at: now() }); toast('Ghost Phelan is on his way'); } catch (e) { toast('No connection'); }
    };
    let lastI = -1, ping = 0, got = now(), base = null, baseId = -1;
    while (viewing === mine) {
      const t0 = now();
      if (t0 - ping > 4000) { ping = t0; db.put('live/' + key + '/w/' + me4(), now()).catch(() => {}); }
      try {
        const f = await db.get('livef/' + key + '/d');
        if (viewing !== mine) break;
        if (f && f.i !== lastI && f.d) {
          if (f.b !== baseId) { const b = await db.get('livef/' + key + '/base'); if (b && b.st) { base = parse(b.st); baseId = b.id; } }
          if (viewing !== mine) break;
          if (base && baseId === f.b) {
            lastI = f.i; got = now();
            S.push(Object.assign({}, base, parse(f.d)), { v: f.v, cap: f.cap, sub: `Bet ${stakeLbl(f.s || 10)} · balance ${eur(f.bal || 0)}${f.play ? ' · spinning' : ''}` });
          }
        } else if (now() - got > 15000) { // nothing new for a while: their app is closed or in the background
          S.say(lastI < 0 ? `Connecting to ${name}'s phone…` : `${name} has stepped away. Waiting…`);
        }
      } catch (e) { S.say('No connection. Retrying…'); await pause(1500); }
      const gap = 80 - (now() - t0); if (gap > 0) await pause(gap);
    }
  }
  async function replay(id, card) {
    if (typeof busy !== 'undefined' && busy) return toast('Finish your spin first');
    closeSheet();
    viewing = 'hl:' + id; const mine = viewing;
    const S = mirrorScreen(`${card.name}: ${card.amt}`, `${card.room} · ${when(card.at)}`, false);
    let frames;
    try { frames = JSON.parse(await unpack(await db.get('hld/' + id))); } catch (e) { return S.say('That replay would not load.'); }
    if (!frames || !frames.length) return S.say('That replay is empty.');
    let st = {}; const t0 = performance.now();
    for (const [t, d] of frames) {
      if (viewing !== mine) return;
      const wait = t - (performance.now() - t0); if (wait > 0) await pause(wait);
      st = Object.assign({}, st, parse(d));
      S.push(st, null);
    }
    if (viewing === mine) S.say('');
  }
  function stopWatch() {
    const key = viewing; viewing = null; view.hidden = true; view.innerHTML = '';
    const done = () => location.reload(); // the game underneath was drawing someone else's run: start it fresh
    if (key && !key.startsWith('hl:')) db.put('live/' + key + '/w/' + me4(), null).then(done, done); else done();
  }

  // ---------- updates (version.json in the GitHub repo) ----------
  async function checkUpdate() {
    if (!CFG.updateUrl) return;
    try {
      const v = await (await fetch(CFG.updateUrl + '?t=' + now(), { cache: 'no-store' })).json();
      const apkHave = app && app.apkVersion ? +app.apkVersion() : 0;
      if (busy || (W.run && W.run.live) || !sheet.hidden) return; // only between runs; the next check offers it
      if (app && v.apk > apkHave && v.apkUrl) return offer(`New app version${v.name ? ' · ' + v.name : ''}${v.notes ? ': ' + v.notes : ''}`, () => { app.installApk(v.apkUrl); banner.innerHTML = '<span>Downloading… Android will restart when it is ready.</span><button class="wbtn gold wbig" type="button">OK</button>'; });
      if (v.game > CFG.gameVersion && v.gameUrl) return offer(`Update ${v.game}${v.name ? ' · ' + v.name : ''}${v.notes ? ': ' + v.notes : ''}`, () => {
        if (busy) return toast('Finish this spin first');
        banner.innerHTML = '<span>Updating…</span>';
        if (app && app.updateGame) app.updateGame(v.gameUrl, String(v.game)); else location.reload();
      });
    } catch (e) {}
  }
  let offered = '', snooze = 0;
  function offer(text, go) {
    if (!banner.hidden && offered === text) return;
    if (now() < snooze) return;
    banner.hidden = false; offered = text;
    banner.innerHTML = `<span>⬇ ${esc(text)}</span><div class="wrow"><button class="wbtn gold wbig" id="wUp" type="button">⬇ UPDATE</button><button class="wbtn" id="wLater" type="button">Later</button></div>`;
    $w('wUp').onclick = go; $w('wLater').onclick = () => { banner.hidden = true; snooze = now() + 10 * 60000; };
  }
  window.wolUpdateFailed = msg => { banner.hidden = false; banner.innerHTML = `<span>Update failed: ${esc(msg || 'no connection')}</span><button class="wbtn small" type="button" onclick="this.parentNode.hidden=true">Close</button>`; };

  // ---------- boot ----------
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
  // a quick look every 3s for someone who just started watching, so their picture starts fast
  setInterval(async () => {
    if (W.user && !streaming && !document.hidden) checkMsgs();
    if (streaming || !W.user || document.hidden) return;
    try { const w = await db.get('live/' + W.user + '/w') || {}, t = now(); watchers = Object.entries(w).filter(([k, v]) => k !== W.user && t - v < WATCH_MS).length; paintLive(); if (watchers && !streaming && W.user) streamLoop(); }
    catch (e) {}
  }, 3000);
  // version.json is ~200 bytes; once a minute while the app is open is nothing for the phone
  setInterval(() => { if (!document.hidden) checkUpdate(); }, 60000);
})();
