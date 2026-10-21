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
  // ---------- small helpers ----------
  // Owns shared wallet formatting, preferences, and hashing helpers.
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
  const TROPHIES = [
    { id: 'first', name: 'First spin', icon: '🎡', how: 'Complete your first paid spin.' },
    { id: 'spins100', name: 'Regular', icon: '🔁', how: 'Complete 100 paid spins.' },
    { id: 'spins1000', name: 'Lifer', icon: '♾️', how: 'Complete 1,000 paid spins.' },
    { id: 'stank', name: 'Stank Chamber', icon: '🧪', how: 'Reach the Stank Chamber.' },
    { id: 'monster', name: 'Monster tank', icon: '🥫', how: 'Reach the Monster tank.' },
    { id: 'god', name: 'God room', icon: '⚡', how: 'Reach the God room.' },
    { id: 'pyramid', name: 'Pyramid', icon: '🔺', how: 'Light all six Wild and ankh tiles at once.' },
    { id: 'tomb', name: "Phelan's Tomb", icon: '🏺', how: "Win the Phelan's Tomb plaque." },
    { id: 'deep5', name: 'Even deeper', icon: '🌀', how: 'Reach the hidden fifth inner wheel.' },
    { id: 'golden', name: 'Golden run', icon: '✨', how: 'Trigger a Golden run.' },
    { id: 'big', name: 'Big winner', icon: '🏆', how: 'Win at least 50× your bet in a single payout.' },
    { id: 'race', name: 'Chicken Race', icon: '🐔', how: 'Win the Chicken Race.' },
  ];
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
  // Owns database REST requests and transaction logging.
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
