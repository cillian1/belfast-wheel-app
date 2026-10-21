  // ---------- live: who is on now, and watching them play ----------
  // Owns watcher heartbeats and the live game-state stream.
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
    'pipes', 'carried', 'd6', 'd6Sum', 'chickens', 'arrows', 'fires', 'feathers', 'camX', 'markItems', 'rotM', 'formT', 'showMark', 'chainNote', 'raceLine',
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
  // Owns highlight recording, compression, and live-feed publishing.
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
      if (sc === 'stank' || sc === 'roul') awardTrophy('stank');
      if (sc === 'monster') awardTrophy('monster');
      if (sc === 'god' || sc === 'zena') awardTrophy('god');
      if ([...document.querySelectorAll('.wilds .wt')].filter(t => t.classList.contains('lit')).length === 6) awardTrophy('pyramid');
      try { if (typeof DEPTH !== 'undefined' && DEPTH >= 5) awardTrophy('deep5'); } catch (e) {}
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
  // Owns watcher messages and the Ghost Phelan overlay.
  let lastMsg = '', ghostSprite = null;
  async function ghostImg() {
    if (ghostSprite) return ghostSprite;
    if (!GHOST_IMAGE.complete) await new Promise(resolve => {
      GHOST_IMAGE.addEventListener('load', resolve, { once: true });
      GHOST_IMAGE.addEventListener('error', resolve, { once: true });
    });
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
  async function showGhostMsg(from, text) {
    const st = document.querySelector('.stage'); if (!st || !text) return;
    const box = el('div', 'wghost'), img = await ghostImg();
    const k = document.createElement('canvas'); k.width = img.width; k.height = img.height; k.getContext('2d').drawImage(img, 0, 0);
    box.innerHTML = `<p><b>${esc(from)}</b> ${esc(text)}</p>`; box.prepend(k);
    st.appendChild(box);
    requestAnimationFrame(() => box.classList.add('in'));
    setTimeout(() => { box.classList.remove('in'); box.classList.add('out'); }, 5200);
    setTimeout(() => box.remove(), 6400);
  }
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
  // ---------- boot ----------
  // Owns wallet startup and initial state restoration.
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
    try { const w = await db.get('live/' + W.user + '/w') || {}, t = now(); watchers = Object.entries(w).filter(([k, v]) => k !== W.user && t - v < WATCH_MS).length; paintLive(); if (watchers && !streaming) streamLoop(); } catch (e) {}
  }, 3000);
