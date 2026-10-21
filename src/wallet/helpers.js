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

