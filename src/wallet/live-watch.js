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
