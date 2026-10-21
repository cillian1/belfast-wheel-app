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
