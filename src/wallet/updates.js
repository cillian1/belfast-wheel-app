  // ---------- updates (version.json in the GitHub repo) ----------
  // Owns update checks and update prompts.
  async function checkUpdate() {
    if (!CFG.updateUrl) return;
    try {
      const v = await (await fetch(CFG.updateUrl + '?t=' + now(), { cache: 'no-store' })).json();
      const apkHave = app && app.apkVersion ? +app.apkVersion() : 0;
      if (busy || (W.run && W.run.live) || !sheet.hidden) return; // only between runs; the next check offers it
      if (app && v.apk > apkHave && v.apkUrl) return offer(`New app version${v.name ? ' · ' + v.name : ''}${v.notes ? ': ' + v.notes : ''}`, () => { app.installApk(v.apkUrl); banner.innerHTML = '<span>Downloading… Android will ask to install it.</span>'; });
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
  window.wolUpdateFailed = msg => { banner.hidden = false; banner.innerHTML = `<span>Update failed: ${esc(msg || 'no connection')}</span><button class="wbtn small" type="button" onclick="this.parentNode.hidden=true">OK</button>`; };
