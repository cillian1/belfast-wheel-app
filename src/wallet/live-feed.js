  // ---------- live feed: the big moments from everyone, across the top ----------
  // Owns the feed ticker, watch list, mirror playback, and replay UI.
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
    body.innerHTML = others.length ? others.sort((a, b) => (b.play ? 1 : 0) - (a.play ? 1 : 0)).map(o => `<div class="wpl"><div><b>${esc(o.name)}</b><small class="${o.play ? 'on' : ''}">${o.play ? '● Spinning now' : 'Online'}</small></div><button class="wbtn gold small" type="button" data-k="${esc(o.key)}">Watch</button></div>`).join('')
      : '<p>Nobody else has the wheel open right now. Check back in a minute.</p>';
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
