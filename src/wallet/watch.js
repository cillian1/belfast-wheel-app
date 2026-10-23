  // ---------- live: who is on now, and watching them play ----------
  // Owns watcher heartbeats and the live game-state stream.
  // live/{key} = { name, at, play } is a heartbeat. A watcher writes live/{key}/w/{them} = time every few seconds;
  // only then does the player's phone send small game-state updates to livef/{key}. No watchers, no updates.
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
  const MIRROR = ['N', 'c', 'R', 'D', 'scene', 'zoom', 'wheelZoom', 'fade', 'DEPTH', 'evenA', 'FINAL', 'B', 'dice', 'rotF', 'flatT', 'balls', 'ballR', 'counts', 'winner', 'banner', 'achievement',
    'rotP', 'hi', 'hiA', 'domeBulge', 'pAng', 'ghost', 'ghostSay', 'dots', 'boostA', 'boostNew', 'wellBalls', 'introT', 'camT', 'hallZ', 'doorT', 'flash', 'rotS',
    'bingo', 'ballSpeed', 'ballPhase', 'pickIdx', 'handT', 'liftT', 'handClosed', 'prize', 'roul', 'vault', 'coaster', 'planet', 'mon', 'rotC', 'zena', 'god', 'pyr',
    'pipes', 'carried', 'd6', 'd6Sum', 'chickens', 'arrows', 'fires', 'feathers', 'camX', 'markItems', 'rotM', 'formT', 'showMark', 'chainNote', 'raceLine',
    'rot', 'deadA', 'deadTo', 'deadFrom', 'markSpinning', 'markWin', 'liveK'];
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
    st.gamble = JSON.stringify(W.gamble || null);
    st.fin = JSON.stringify(document.querySelector('.stage.done') ? [...document.querySelectorAll('#finalList li')].map(li => li.textContent).slice(0, 10) : null);
    return st;
  }
  const join = (st, keys) => '{' + keys.map(k => JSON.stringify(k) + ':' + st[k]).join(',') + '}';
  const changed = (a, b) => Object.keys(a).filter(k => a[k] !== (b && b[k]));
  const pause = ms => new Promise(r => setTimeout(r, ms));
  let liveBase = null, liveBaseId = 0, liveBaseAt = 0, liveI = 0, liveSent = '', liveSentAt = 0;
  async function sendLive(st, playing) {
    const capEl = document.getElementById('caption');
    if (!liveBase || SLOW.some(k => st[k] !== liveBase[k]) || now() - liveBaseAt > 5000) {
      liveBase = st; liveBaseId++; liveBaseAt = now();
      await db.put('livef/' + W.user + '/base', { id: liveBaseId, st: join(st, Object.keys(st)) });
    }
    const d = join(st, changed(st, liveBase)), extra = JSON.stringify([lastVerdict, capEl ? capEl.textContent : '', W.run && W.run.live ? W.run.stake : W.stake, W.me ? W.me.balance || 0 : 0, playing]);
    if (d + extra === liveSent && now() - liveSentAt < 4000) return; // nothing moved (still resent now and then, so watchers know we're here)
    liveSent = d + extra; liveSentAt = now();
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
  let rec = null, wasBusy = false;
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
    if (playing && !wasBusy) { rec = { t0: now(), last: null, frames: [], room: '', win: null, stake: W.run && W.run.live ? W.run.stake : W.stake, user: W.user, name: W.me && W.me.name, test: isTest() || W.user === TEST_KEY }; }
    wasBusy = playing;
    if (!rec) return;
    try {
      const st = capture(), sc = JSON.parse(st.scene || '""');
      if (ROOMS[sc] && !rec.room) rec.room = ROOMS[sc];
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
      if (r.user && !r.test) saveReplay(r).catch(e => { console.error('Replay save failed', e); toast('Could not save this replay.'); });
      if (r.win && r.room && r.user && !r.test && parseFloat(r.win.amt.slice(1)) >= Math.max(1, (r.stake || 10) / 10)) saveHighlight(r); // big wins only: €1+ and 10x the bet
    }
  }, 250);
  async function pruneReplays(user) {
    // Persist the per-user cadence so relaunching the app does not repeat shallow listings.
    const cadenceKey = 'wol.replayPrune.' + user;
    const savedCount = Number(pref.get(cadenceKey));
    const saves = Number.isSafeInteger(savedCount) && savedCount >= 0 ? savedCount : 0;
    if (saves < 49) { pref.set(cadenceKey, String(saves + 1)); return; }
    pref.set(cadenceKey, '0');
    const keys = Object.keys(await db.get('rpm/' + user, '?shallow=true') || {}).sort();
    if (keys.length <= 3000) return;
    const oldest = keys.slice(0, keys.length - 3000);
    for (let i = 0; i < oldest.length; i += 50) {
      const batch = oldest.slice(i, i + 50);
      await Promise.all(batch.flatMap(id => [db.put('rpm/' + user + '/' + id, null), db.put('rpd/' + id, null)]));
    }
  }
  async function saveReplay(r) {
    const data = await pack(JSON.stringify(r.frames));
    const id = await db.push('rpm/' + r.user, {
      at: r.t0, stake: r.stake, amt: r.win ? r.win.amt : '', title: r.win ? r.win.title.slice(0, 80) : '',
      room: r.room || 'Main wheel', len: r.frames.length ? r.frames[r.frames.length - 1][0] : 0,
    });
    await db.put('rpd/' + id, data);
    try { await pruneReplays(r.user); }
    catch (e) { console.error('Replay pruning failed', e); toast('Could not prune old replays.'); }
  }
  async function saveHighlight(r) {
    try {
      if (W.user === r.user && W.me) feed(`${r.name || W.me.name} won ${r.win.amt} in ${r.room} 💰`);
      const data = await pack(JSON.stringify(r.frames));
      const id = await db.push('hlm', { by: r.user, name: r.name || '', at: now(), amt: r.win.amt, title: r.win.title.slice(0, 80), room: r.room, len: r.frames.length ? r.frames[r.frames.length - 1][0] : 0 });
      await db.put('hld/' + id, data);
    } catch (e) {}
  }
  // ---------- messages from watchers: Ghost Phelan carries them across, see-through so they don't get in the way ----------
  // Owns watcher messages and the Ghost Phelan overlay.
  let lastMsg = '';
  function ghostImg() { return GHOST_IMAGE; }
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
    const box = el('div', 'wghost'), img = el('img');
    img.src = ghostImg().src; img.alt = '';
    box.innerHTML = `<p><b>${esc(from)}</b> ${esc(text)}</p>`; box.prepend(img);
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
    let tab = 'live', scope = 'mine', player = 'all', limit = 20;
    const showLoadError = (body, retry) => {
      body.innerHTML = '<button class="wlink" type="button">Couldn\'t load, tap to retry</button>';
      body.firstElementChild.onclick = retry;
    };
    const render = async () => {
      const p = openSheet(`<h3>Watch</h3>
        <div class="wtabs">${[['live', 'Live'], ['wins', 'Big wins'], ['replays', 'Replays']].map(([key, label]) => `<button data-tab="${key}" type="button">${label}</button>`).join('')}</div>
        <div id="wBody"><p>Loading…</p></div><button class="wlink" type="button" id="wClose">Close</button>`);
      p.querySelectorAll('[data-tab]').forEach(b => { b.classList.toggle('on', b.dataset.tab === tab); b.onclick = () => { tab = b.dataset.tab; render(); }; });
      $w('wClose').onclick = closeSheet;
      const body = $w('wBody');
      const timer = setTimeout(() => showLoadError(body, render), 10000);
      try {
        if (tab === 'live') {
          await heartbeat();
          body.innerHTML = others.length ? others.slice().sort((a, b) => (b.play ? 1 : 0) - (a.play ? 1 : 0)).map(o => `<div class="wpl"><div><b>${esc(o.name)}</b><small class="${o.play ? 'on' : ''}">${o.play ? '● Spinning now' : 'Online'}</small></div><button class="wbtn gold small" type="button" data-watch="${esc(o.key)}">Watch</button></div>`).join('')
            : '<p>Nothing here yet</p>';
          body.querySelectorAll('[data-watch]').forEach(b => b.onclick = () => { const o = others.find(x => x.key === b.dataset.watch); if (o) { closeSheet(); watch(o.key, o.name); } });
        } else if (tab === 'wins') {
          const hl = Object.entries(await db.get('hlm', '?orderBy="$key"&limitToLast=20') || {}).sort((a, b) => b[1].at - a[1].at);
          body.innerHTML = hl.map(([id, h]) => `<div class="wpl"><div><b>${esc(h.name)}</b> <span class="amt">${esc(h.amt)}</span><small>${esc(h.room)} · ${when(h.at)}</small></div><button class="wbtn small" type="button" data-h="${esc(id)}">Replay</button></div>`).join('') || '<p>Nothing here yet</p>';
          body.querySelectorAll('[data-h]').forEach(b => b.onclick = () => { const item = hl.find(x => x[0] === b.dataset.h); if (item) replay(item[0], item[1], 'hld'); });
        } else {
          const users = Object.entries(await db.get('users') || {}).filter(([key, user]) => key !== TEST_KEY && !user.test);
          const owners = scope === 'mine' ? users.filter(([key]) => key === W.user) : player === 'all' ? users : users.filter(([key]) => key === player);
          body.innerHTML = `<div class="wtabs"><button data-scope="mine" type="button">Mine</button><button data-scope="everyone" type="button">Everyone</button></div>
            ${scope === 'everyone' ? `<div class="wplayers"><button class="wbtn small${player === 'all' ? ' sel' : ''}" data-player="all" type="button">All</button>${users.map(([key, user]) => `<button class="wbtn small${player === key ? ' sel' : ''}" data-player="${esc(key)}" type="button">${esc(user.name)}</button>`).join('')}</div>` : ''}
            <div id="wReplayRows"><p>Loading replays…</p></div>`;
          body.querySelectorAll('[data-scope]').forEach(b => { b.classList.toggle('on', b.dataset.scope === scope); b.onclick = () => { scope = b.dataset.scope; player = 'all'; limit = 20; render(); }; });
          body.querySelectorAll('[data-player]').forEach(b => b.onclick = () => { player = b.dataset.player; limit = 20; render(); });
          const cards = (await Promise.all(owners.map(async ([key, user]) => Object.entries(await db.get('rpm/' + key, `?orderBy="$key"&limitToLast=${limit}`) || {}).map(([id, card]) => ({ id, by: key, name: user.name, ...card })))))
            .flat().sort((a, b) => b.at - a.at || b.id.localeCompare(a.id)).slice(0, limit);
          const rows = $w('wReplayRows');
          rows.innerHTML = cards.map(card => `<div class="wpl"><div><b>${esc(card.name)}</b> <span class="amt">${card.amt ? esc(card.amt) : 'no win'}</span><small>${esc(card.room || 'Main wheel')} · ${when(card.at)}</small></div><button class="wbtn small" type="button" data-replay="${esc(card.id)}">Replay</button></div>`).join('') || '<p>Nothing here yet</p>';
          rows.querySelectorAll('[data-replay]').forEach(b => b.onclick = () => { const card = cards.find(x => x.id === b.dataset.replay); if (card) replay(card.id, card, 'rpd'); });
          if (cards.length === limit) {
            const more = el('button', 'wbtn'); more.type = 'button'; more.textContent = 'Show more';
            more.onclick = () => { limit += 20; render(); }; rows.appendChild(more);
          }
        }
      } catch (e) { showLoadError(body, render); }
      finally { clearTimeout(timer); }
    };
    await render();
  }
  const view = el('div', 'wwatch'); view.hidden = true; document.body.appendChild(view);
  let viewing = null, vhMax = 0, kbShrunk = false;
  // the viewer fills the visible screen (above the keyboard when it's open) and the board takes whatever height the other rows leave
  function fitWatch() {
    const scr = view.querySelector('.wscr'); if (view.hidden || !scr) return;
    const vv = window.visualViewport, vh = vv ? vv.height : innerHeight;
    // Android's Back can close the keyboard without blurring the input, so the verdict rows come back once the screen grows again
    vhMax = Math.max(vhMax, vh); const small = vh < vhMax * .85;
    const typing = document.activeElement && document.activeElement.id === 'wwSay';
    if (small && (typing || view.classList.contains('wkb'))) { kbShrunk = true; view.classList.add('wkb'); } // reopened on a still-focused input fires no focus event
    else if (!small && kbShrunk) { kbShrunk = false; view.classList.remove('wkb'); }
    view.style.top = (vv ? vv.offsetTop : 0) + 'px'; view.style.bottom = 'auto'; view.style.height = vh + 'px';
    const cs = getComputedStyle(view), gap = parseFloat(cs.rowGap) || 0;
    let used = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom), n = 0;
    [...view.children].forEach(k => { if (k === scr || getComputedStyle(k).display === 'none') return; used += k.offsetHeight; n++; });
    const w = Math.floor(Math.max(120, Math.min(view.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight), 560, vh - used - gap * n)) - (scr.offsetWidth - scr.clientWidth));
    if (scr.style.width !== w + 'px') scr.style.width = w + 'px';
    view.scrollTop = 0;
  }
  addEventListener('resize', fitWatch); if (window.visualViewport) { visualViewport.addEventListener('resize', fitWatch); visualViewport.addEventListener('scroll', fitWatch); }
  // the watcher's own game sits idle underneath; it borrows its canvas to draw the other phone's state, then reloads
  const lerpAng = (a, b, t) => { const d = Math.atan2(Math.sin(b - a), Math.cos(b - a)); return a + d * t; };
  function mirApply(st, prev, t) {
    if (st.N && st.N !== N) { N = st.N; cv.width = cv.height = N; c = N / 2; R = N / 2 * .935 * .82; }
    for (const n in st) {
      if (!mirGet[n]) continue;
      let v = st[n];
      if (prev && t < 1) {
        if (ANGLES.includes(n) && typeof prev[n] === 'number') v = lerpAng(prev[n], v, t);
        else if (n === 'rot' && Array.isArray(prev.rot) && Array.isArray(v)) v = v.map((a, k) => typeof prev.rot[k] === 'number' ? lerpAng(prev.rot[k], a, t) : a);
        else if (n === 'zoom' && typeof prev.zoom === 'number' && prev.zoom > 0 && v > 0) v = prev.zoom * Math.pow(v / prev.zoom, t);
        else if (n === 'wheelZoom' && typeof prev.wheelZoom === 'number' && prev.wheelZoom > 0 && v > 0) v = prev.wheelZoom * Math.pow(v / prev.wheelZoom, t);
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
      if (/farm|pipes/.test(s) && markItems && markItems.length && (!faces.mark || faces.mark.width !== N || faces.markFor !== JSON.stringify(markItems))) { faces.mark = buildMarkWheel(markItems); faces.markFor = JSON.stringify(markItems); }
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
    view.hidden = false; view.classList.remove('wkb'); vhMax = 0; kbShrunk = false;
    view.innerHTML = `<div class="wwh"><div><b>${esc(title)}</b><small id="wwSub">${esc(sub)}</small></div>${live ? '<div><button class="wbtn small" id="wwMode" type="button" aria-pressed="false">Go live</button> <span class="wlive" id="wwModeBadge" style="margin:0"><i></i><span id="wwModeLabel">DELAYED</span></span></div>' : '<span class="wlive" style="margin:0"><i></i>REPLAY</span>'}</div>
      <div class="wscr"><canvas id="wwCv"></canvas><ol id="wwFin" hidden></ol><p id="wwMsg">${live ? 'Connecting…' : 'Loading…'}</p></div>
      <div class="wwt" id="wwTiles"></div>
      <div class="wvd"><small id="wwE"></small><h3 id="wwT"></h3><p id="wwB"></p><p id="wwC" style="color:var(--mute);margin-top:6px"></p><div class="wgamble" id="wwGamble" hidden></div></div>
      ${live ? '<div class="wsay"><input id="wwSay" maxlength="60" placeholder="Send a message with Ghost Phelan"><button class="wbtn gold small" type="button" id="wwSend">Send</button></div>' : ''}
      <button class="wbtn" type="button" id="wwX" style="width:100%;max-width:560px">${live ? 'Stop watching' : 'Close'}</button>`;
    $w('wwX').onclick = stopWatch;
    const kb = on => () => { view.classList.toggle('wkb', on); kbShrunk = false; fitWatch(); }; // typing: the verdict rows step aside so the board keeps its room
    if (live) { $w('wwSay').onfocus = kb(true); $w('wwSay').onblur = kb(false); }
    fitWatch();
    const vc = $w('wwCv'), vg = vc.getContext('2d');
    const S = { cur: null, prev: null, tCur: 0, span: 120, fresh: false, alive: true, failed: false };
    const frame = () => {
      if (!S.alive || S.failed || view.hidden) return;
      S.raf = requestAnimationFrame(frame);
      if (!S.cur) return;
      const p = Math.min(1, (performance.now() - S.tCur) / S.span);
      try {
        if (S.fresh) { S.fresh = false; mirApply(S.cur, null, 1); mirFaces(S.cur); }
        if (p < 1 && S.prev) { mirApply(S.cur, S.prev, p); mirFaces(S.cur); S.lerped = true; }
        else if (S.lerped) { S.lerped = false; mirApply(S.cur, null, 1); mirFaces(S.cur); }
        draw();
        const w = Math.round(vc.clientWidth * Math.min(2, devicePixelRatio || 1)); if (w && vc.width !== w) vc.width = vc.height = w;
        vg.clearRect(0, 0, vc.width, vc.height); vg.drawImage(cv, 0, 0, vc.width, vc.height);
      } catch (e) {
        S.failed = true;
        console.error('Watch viewer render failed', e);
        cv.width = cv.width; // drop any transform or clip the broken draw left behind
        S.say(live ? 'This live view could not be drawn. Close and retry.' : 'This replay could not be drawn. Close it and try another replay.');
      }
    };
    S.raf = requestAnimationFrame(frame);
    S.push = (st, info) => {
      const t = performance.now(); S.span = Math.max(60, Math.min(600, t - (S.tCur || t - 120)));
      S.prev = S.cur; S.cur = st; S.tCur = t; S.fresh = true;
      if (S.failed && live) { S.failed = false; cancelAnimationFrame(S.raf); S.raf = requestAnimationFrame(frame); } // one bad frame doesn't freeze the live view: try again with the next state
      $w('wwMsg').hidden = true;
      if (info && info.sub) $w('wwSub').textContent = info.sub;
      const v = st.v || {}; $w('wwE').textContent = v.e || ''; $w('wwT').textContent = v.t || ''; $w('wwB').textContent = v.b || ''; $w('wwC').textContent = st.cap || '';
      const fin = $w('wwFin'), fl = st.fin; fin.hidden = !fl; if (fl) fin.innerHTML = fl.map(x => `<li>${esc(x)}</li>`).join('');
      renderGamble($w('wwGamble'), parse(st.gamble) || null, true);
      const ach = parse(st.achievement);
      if (ach && ach.id !== S.achId) {
        S.achId = ach.id;
        const b = el('div', 'wbanner');
        b.innerHTML = `<b class="wbig">${esc(ach.title)}</b><p>${esc(ach.sub)}</p>`;
        $w('wwCv').parentNode.appendChild(b);
        setTimeout(() => { b.style.opacity = '0'; b.style.transition = 'opacity 0.5s'; setTimeout(() => b.remove(), 500); }, 2500);
      }
      const tw = +st.tw || 0, tb = +st.tb || 0;
      $w('wwTiles').innerHTML = `<span class="g">${'●'.repeat(Math.min(tw, 9))}${'○'.repeat(Math.max(0, 3 - tw))} WILDS</span><span class="p">${'●'.repeat(Math.min(tb, 9))}${'○'.repeat(Math.max(0, 3 - tb))} BONUS</span>`;
      const vk = [v.e, v.t, v.b, st.cap, JSON.stringify(st.gamble)].join('|'); if (vk !== S.vk) { S.vk = vk; fitWatch(); } // refit only when the verdict text changes
    };
    S.say = text => { const m = $w('wwMsg'); if (m) { m.hidden = !text; m.textContent = text || ''; } };
    return S;
  }
  const parse = s => { try { return JSON.parse(s); } catch (e) { return {}; } };
  const WATCH_DELAY_MS = 3000, WATCH_BUFFER_MS = 8000, WATCH_BUFFER_MAX = 128;
  function addWatchFrame(buffer, frame) {
    buffer.push(frame);
    while (buffer.length > WATCH_BUFFER_MAX) buffer.shift();
  }
  function pruneWatchFrames(buffer, at) {
    while (buffer.length && at - buffer[0].at > WATCH_BUFFER_MS) buffer.shift();
  }
  function alignWatchBuffer(buffer, at) {
    while (buffer.length > 1 && buffer[1].at <= at) buffer.shift();
  }
  function takeWatchFrame(buffer, at) {
    return buffer.length && buffer[0].at <= at ? buffer.shift() : null;
  }
  function watchOfflineMessage(name, lastI, got, at) {
    if (at - got <= 15000) return '';
    return lastI < 0 ? `Connecting to ${name}'s phone…` : `${name} has stepped away. Waiting…`;
  }
  function decodeReplayFrames(text) {
    const frames = JSON.parse(text);
    if (!Array.isArray(frames)) throw new Error('Replay frames are not a list.');
    if (!frames.length) return [];
    if (!Array.isArray(frames[0]) || frames[0].length !== 2) throw new Error('The first replay frame is malformed.');
    const firstAt = frames[0][0];
    if (!Number.isFinite(firstAt) || firstAt < 0) throw new Error('The first replay timestamp is invalid.');
    let previousAt = firstAt;
    return frames.map((frame, i) => {
      if (!Array.isArray(frame) || frame.length !== 2) throw new Error(`Replay frame ${i + 1} is malformed.`);
      const [at, deltaText] = frame;
      if (!Number.isFinite(at) || at < previousAt) throw new Error(`Replay frame ${i + 1} has an invalid timestamp.`);
      previousAt = at;
      let delta;
      try { delta = JSON.parse(deltaText); } catch (e) { throw new Error(`Replay frame ${i + 1} has invalid state data.`); }
      if (!delta || typeof delta !== 'object' || Array.isArray(delta)) throw new Error(`Replay frame ${i + 1} has invalid state data.`);
      if (i === 0 && (!(Number.isFinite(delta.N) && delta.N > 0) || typeof delta.scene !== 'string' || !delta.scene)) throw new Error('The first replay frame is missing its game state.');
      return [at - firstAt, delta];
    });
  }
  async function watch(key, name) {
    if (gambleBusy) return toast('Wait for the card.');
    if (typeof busy !== 'undefined' && busy) return toast('Finish your spin first');
    collectGamble(); if (W.run) W.run.gambleClosed = true;
    closeSheet();
    viewing = 'live:' + key; const mine = viewing;
    const S = mirrorScreen(name, 'Connecting…', true);
    S.say(`Connecting to ${name}'s phone…`);
    $w('wwSend').onclick = async () => {
      const inp = $w('wwSay'), text = inp.value.trim().slice(0, 60); if (!text) return;
      inp.value = '';
      try { await db.put('live/' + key + '/msg', { id: now().toString(36) + Math.random().toString(36).slice(2, 6), from: W.me ? W.me.name : 'A watcher', text, at: now() }); toast('Ghost Phelan is on his way'); } catch (e) { toast('No connection'); }
    };
    let delayed = true, latestFrame = null, lastFrameAt = 0, starting = true;
    const buffer = [], modeButton = $w('wwMode'), modeBadge = $w('wwModeBadge'), modeLabel = $w('wwModeLabel');
    modeButton.onclick = () => {
      delayed = !delayed;
      modeButton.textContent = delayed ? 'Go live' : 'Use delay';
      modeButton.setAttribute('aria-pressed', String(!delayed));
      modeLabel.textContent = delayed ? 'DELAYED' : 'LIVE';
      modeBadge.classList.toggle('on', !delayed);
      if (delayed) {
        alignWatchBuffer(buffer, now() - WATCH_DELAY_MS);
        starting = true; S.say('Starting Watch…');
      }
      else if (latestFrame) S.push(latestFrame.state, latestFrame.info);
    };
    modeButton.textContent = 'Go live';
    modeButton.setAttribute('aria-pressed', 'false');
    modeLabel.textContent = 'DELAYED';
    modeBadge.classList.remove('on');
    const renderFrame = frame => { starting = false; S.push(frame.state, frame.info); };
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
            const state = Object.assign({}, base, parse(f.d));
            latestFrame = { at: Math.max(now(), lastFrameAt), state, info: { v: f.v, cap: f.cap, sub: `Bet ${stakeLbl(f.s || 10)} · balance ${eur(f.bal || 0)}${f.play ? ' · spinning' : ''}` } };
            lastFrameAt = latestFrame.at;
            addWatchFrame(buffer, latestFrame);
            if (!delayed) renderFrame(latestFrame);
          }
        }
        const at = now();
        pruneWatchFrames(buffer, at);
        if (delayed) {
          const ready = takeWatchFrame(buffer, at - WATCH_DELAY_MS);
          if (ready) renderFrame(ready);
          else if (starting && lastI >= 0 && at - got <= 15000) S.say('Starting Watch…');
        }
        const offline = watchOfflineMessage(name, lastI, got, at);
        if (offline) S.say(offline);
      } catch (e) { S.say('No connection. Retrying…'); await pause(1500); }
      const gap = 80 - (now() - t0); if (gap > 0) await pause(gap);
    }
  }
  async function replay(id, card, path = 'hld') {
    if (gambleBusy) return toast('Wait for the card.');
    collectGamble(); if (W.run) W.run.gambleClosed = true;
    if (typeof busy !== 'undefined' && busy) return toast('Finish your spin first');
    closeSheet();
    viewing = (path === 'hld' ? 'hl:' : 'rp:') + id; const mine = viewing;
    card = card || {};
    const S = mirrorScreen(`${card.name || 'Replay'}${card.amt ? ': ' + card.amt : ''}`, `${card.room || 'Replay'}${card.at ? ' · ' + when(card.at) : ''}`, false);
    let frames;
    let loadTimer;
    try {
      const loading = (async () => {
        const packed = await db.get(path + '/' + id);
        const text = await unpack(packed);
        if (typeof text !== 'string') throw new Error('Replay frame data is missing.');
        return decodeReplayFrames(text);
      })();
      const timeout = new Promise((_, reject) => {
        loadTimer = setTimeout(() => {
          const error = new Error('Replay loading timed out.');
          error.name = 'TimeoutError';
          reject(error);
        }, 15000);
      });
      frames = await Promise.race([loading, timeout]);
    } catch (e) {
      console.error('Replay load failed', e);
      if (e && e.name === 'TimeoutError') return S.say('This replay is taking too long to load. Check your connection and try again.');
      return S.say('This replay could not be loaded. It may be incomplete.');
    } finally {
      clearTimeout(loadTimer);
    }
    if (!frames || !frames.length) return S.say('That replay is empty.');
    try {
      let st = {}; const t0 = performance.now();
      for (const [t, d] of frames) {
        if (viewing !== mine) return;
        const wait = t - (performance.now() - t0); if (wait > 0) await pause(wait);
        st = Object.assign({}, st, d);
        S.push(st, null);
      }
      if (viewing === mine) S.say('');
    } catch (e) {
      console.error('Replay playback failed', e);
      if (viewing === mine) S.say('This replay stopped unexpectedly. Close it and try another replay.');
    }
  }
  function stopWatch() {
    const key = viewing; viewing = null; view.hidden = true; view.innerHTML = '';
    const done = () => {
      if (viewerMode) {
        if (window.parent !== window) window.parent.postMessage({ type: 'wol-viewer-close' }, location.origin);
      } else location.reload(); // the game underneath was drawing someone else's run: start it fresh
    };
    if (key && key.startsWith('live:')) db.put('live/' + key.slice(5) + '/w/' + me4(), null).then(done, done); else done();
  }
  // ---------- boot ----------
  // Owns wallet startup and initial state restoration.
  const viewerParams = new URLSearchParams(location.search);
  const viewerWatch = viewerParams.get('watch'), viewerReplay = viewerParams.get('replay');
  const viewerMode = !!(viewerWatch || viewerReplay);
  const savedStake = +pref.get('wol.stake'); if (okStake(savedStake)) W.stake = savedStake;
  W.user = viewerMode ? null : pref.get('wol.user');
  W.jackpot = JACKPOT_START;
  paint();
  if (viewerMode) {
    liveBtn.hidden = true; ticker.hidden = true;
    if (viewerWatch) watch(viewerWatch, viewerParams.get('name') || viewerWatch);
    else replay(viewerReplay, { name: 'Replay', room: 'Replay' }, 'rpd');
  } else {
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
  }
