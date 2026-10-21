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
