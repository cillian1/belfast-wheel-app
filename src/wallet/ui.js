  // ---------- styles ----------
  // Owns wallet-specific visual styles.
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
.wpanel{box-sizing:border-box;width:100%;max-width:560px;max-height:92vh;overflow:auto;background:linear-gradient(180deg,#1c1f24,#121418);border:1px solid var(--line);border-bottom:0;border-radius:20px 20px 0 0;padding:20px 18px calc(22px + env(safe-area-inset-bottom,0px));display:flex;flex-direction:column;gap:12px;color:var(--chrome)}
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
.waccount{display:flex;flex-direction:column;gap:12px}
.wbalance{border:1px solid var(--line);border-radius:14px;padding:12px;background:#15181c;text-align:center}
.wbalance small{display:block;font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:var(--mute)}
.wbalance b{display:block;font-family:var(--display);font-weight:400;font-size:30px;color:#f5d27a;overflow-wrap:anywhere}
.waccount .wrow{margin-top:8px}
.waccount .wstats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}
.waccount .wstats div{min-width:0;text-align:center;border:1px solid var(--line);border-radius:10px;padding:7px 4px;background:#15181c}
.waccount .wstats small{display:block;font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:var(--mute)}
.waccount .wstats b{display:block;overflow-wrap:anywhere;font-family:var(--display);font-weight:400;font-size:15px}
.waccount .wstats .plus{color:#9be38a}.waccount .wstats .minus{color:#ff9b8a}
.wpending{border:1px solid #8c6a20;border-radius:10px;padding:8px 10px;background:#2a2312;color:#f8e4a6;font-size:13px}
.whistory-day{margin-top:8px;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--mute)}
.whistory-entry{min-width:0;overflow-wrap:anywhere;gap:8px}
.whistory-entry .whistory-icon{flex:none;width:1.4em;text-align:center}
.whistory-entry .whistory-detail{flex:1;min-width:0}
.whistory-entry .whistory-detail>span{display:block}
.whistory-entry>b{flex:none;white-space:nowrap}
.wboard-pick{display:flex;gap:6px;flex-wrap:wrap}
.wboard-pick .wbtn{flex:1 1 40%;min-width:0;padding:8px 6px;font-size:12px;white-space:normal}
.wboard-stats{font-size:13px;line-height:1.5;color:#c3cbd3}
.wboard-stats b{color:#f5d27a}
.wboard li>div{min-width:0;overflow-wrap:anywhere}
.wboard li>b{flex:none}
.wyou{margin-left:5px;color:#f5d27a;font-size:11px;white-space:nowrap}
.wplayers{display:flex;gap:6px;overflow-x:auto;padding:2px 0;max-width:100%}
.wplayers .wbtn{white-space:nowrap}
.wlist{display:flex;flex-direction:column;gap:6px;margin:0;padding:0;list-style:none}
.wlist li{display:flex;justify-content:space-between;gap:10px;align-items:center;border-bottom:1px solid #22272e;padding:6px 0;font-size:14px}
.wlist li span{color:var(--mute);font-size:12px}
.wlist .plus{color:#9be38a}.wlist .minus{color:#ff9b8a}
.wtabs{display:flex;gap:6px}
.wtabs button{flex:1;border:1px solid var(--line);background:none;color:var(--mute);padding:8px;font-size:13px}
.wtabs button.on{color:#f5d27a;border-color:#f5d27a}
.wtrophy-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}
.wtrophy{min-width:0;display:flex;flex-direction:column;align-items:center;gap:3px;padding:7px 4px;border:1px solid var(--line);border-radius:10px;background:#15181c;color:var(--chrome);text-align:center}
.wtrophy.locked{filter:grayscale(1);opacity:.5}
.wtrophy-icon{font-size:22px;line-height:1.1}
.wtrophy-name{font-size:11px;overflow-wrap:anywhere}
.wtrophy-state{font-size:9px;color:var(--mute)}
.wtrophy-detail{font-size:12px!important;min-height:30px}
.app>.stage{max-width:none}
html,body{overflow-x:hidden}
body{box-sizing:border-box;margin:0}
.wilds canvas.wt{width:50px;height:50px}
.app>.spin{min-height:62px}
.wbanner{position:fixed;left:10px;right:10px;top:calc(10px + env(safe-area-inset-top,0px));z-index:40;display:flex;flex-direction:column;gap:14px;align-items:stretch;text-align:center;padding:20px 18px;border-radius:20px;background:#2a2312;border:2px solid #f5d27a;color:#f8e4a6;font-size:20px;font-weight:600;box-shadow:0 10px 40px rgba(0,0,0,.7),0 0 30px rgba(245,210,122,.35)}
.wbanner .wbig{font-size:26px;padding:18px 10px;border-radius:16px;flex:2}
.wbanner .wrow{gap:10px}
.wbanner .wrow .wbtn:not(.wbig){font-size:17px;flex:1}
.wbanner[hidden]{display:none}
.wnote{position:fixed;left:16px;right:16px;top:calc(70px + env(safe-area-inset-top,0px));z-index:45;max-width:420px;margin:0 auto;padding:18px;border-radius:18px;background:#2a2312;border:2px solid #f5d27a;color:#f8e4a6;text-align:center;display:flex;flex-direction:column;gap:8px;box-shadow:0 10px 40px rgba(0,0,0,.7),0 0 30px rgba(245,210,122,.35);animation:wnIn .4s ease-out}
.wnote small{letter-spacing:.18em;text-transform:uppercase;font-size:11px;color:#c9a85a}.wnote b{font-size:32px;color:#fff1b8}.wnote p{margin:0;font-size:18px;line-height:1.35}
@keyframes wnIn{from{transform:translateY(-20px);opacity:0}}
.wlogin{position:fixed;inset:0;z-index:60;background:radial-gradient(circle at 50% 30%,#1e2228,#0a0c0f 70%);display:flex;align-items:center;justify-content:center;padding:20px}
.wlogin[hidden]{display:none}
.wlogin .wpanel{border-radius:20px;border-bottom:1px solid var(--line);max-width:420px}
.wlogin h1{text-align:center;margin-bottom:6px}
.wtoast{position:fixed;left:50%;top:calc(14px + env(safe-area-inset-top,0px));transform:translateX(-50%);z-index:70;background:#20252c;border:1px solid var(--line);border-radius:999px;padding:8px 16px;font-size:14px;color:var(--chrome);box-shadow:0 8px 20px rgba(0,0,0,.5);transition:opacity .3s}
.wtoast.gold{border-color:#f5d27a;color:#f8e4a6}
.wbar .who.test{border:2px dashed #4fd1c5;background:rgba(20,70,68,.5)}.wbar .who.test small{color:#8ef0e6}.wbar .who.test b{color:#8ef0e6}
body.wtest::after{content:'TEST ACCOUNT · PLAY MONEY';position:fixed;left:0;right:0;bottom:0;z-index:30;text-align:center;font:700 11px/1 var(--body);letter-spacing:.2em;padding:6px 0 calc(6px + env(safe-area-inset-bottom,0px));background:#0f4f4c;color:#c8fff8;pointer-events:none}
.wfree{margin-right:8px;padding:3px 10px;border-radius:999px;border:1px solid rgba(245,210,122,.7);color:#f5d27a;font-size:12px;letter-spacing:.04em;white-space:nowrap}
.wfree.none{border-color:rgba(255,255,255,.15);color:var(--mute)}
.wfree[hidden]{display:none}
.wlive{display:inline-flex;vertical-align:middle;align-items:center;gap:5px;padding:4px 8px;border-radius:999px;border:1.5px solid #ff4d4d;background:rgba(60,8,8,.85);color:#fff;font:700 12px/1 var(--body);letter-spacing:.06em;box-shadow:0 0 14px rgba(255,60,60,.35)}
.wlive i{width:9px;height:9px;border-radius:50%;background:#9b5de5;box-shadow:0 0 6px #9b5de5}
.wlive.on i{background:#ff3b3b;box-shadow:0 0 8px #ff3b3b;animation:wblink 1.2s ease-in-out infinite}
.wlive em{font-style:normal;background:#ff3b3b;border-radius:999px;padding:2px 7px;letter-spacing:0;font-size:12px}
.wlive em:empty{display:none}
@keyframes wblink{50%{opacity:.25}}
.woffline{position:fixed;top:env(safe-area-inset-top,0px);left:0;right:0;z-index:80;padding:10px 14px;background:#2a1512;border-bottom:1px solid #ff9b8a;color:#ffb3a6;text-align:center;font-size:14px;font-weight:600}
.woffline[hidden]{display:none}
.wpl{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 4px;border-bottom:1px solid var(--line)}
.wpl b{font-size:17px}.wpl small{display:block;color:var(--mute);font-size:12px;letter-spacing:.06em}
.wpl small.on{color:#7dff9a}
.wwatch{position:fixed;inset:0;z-index:60;background:#07090c;display:flex;flex-direction:column;align-items:center;gap:10px;padding:calc(12px + env(safe-area-inset-top,0px)) 12px calc(12px + env(safe-area-inset-bottom,0px));overflow-y:auto;color:var(--chrome)}
.wwatch[hidden]{display:none}
.wghost{position:absolute;right:4%;top:18%;z-index:6;display:flex;flex-direction:column;align-items:center;max-width:62%;opacity:0;transform:translateX(60%);transition:opacity .9s ease,transform 1.1s ease;pointer-events:none}
.wghost.in{opacity:.55;transform:none}.wghost.out{opacity:0;transform:translate(-40%,-30%)}
.wghost img{width:70px;height:auto}
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
.wwatch .wscr ol{position:absolute;inset:0;margin:0;padding:18px 18px 18px 38px;display:flex;flex-direction:column;justify-content:center;gap:6px;font-size:15px;color:#f8e4a6;background:rgba(10,8,6,.88)}
.wwatch .wvd{width:100%;max-width:560px;text-align:center}
.wwatch .wvd small{font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:var(--mute)}
.wwatch .wvd h3{margin:4px 0;font-family:var(--display);font-weight:400;font-size:24px;color:#f5d27a}
.wwatch .wvd p{margin:0;font-size:15px;color:var(--chrome)}
@media(max-width:440px){
  .wbar{gap:4px}
  .wbar .who{flex:0 1 76px;min-width:0;padding:3px 5px;overflow:hidden}
  .wbar .who small{font-size:8px;max-width:100%}
  .wbar .who b{max-width:100%;font-family:var(--body);font-size:12px;letter-spacing:0;white-space:nowrap}
  .wbar .wmid{flex:1 1 0;min-width:0}
  .wbar .wright{flex:0 1 auto;min-width:0;gap:3px}
  .wpot{flex:0 1 auto;min-width:0;padding:3px 6px}
  .wpot small{font-size:8px;letter-spacing:.1em}
  .wpot b{font-family:var(--body);font-size:12px;letter-spacing:0;white-space:nowrap}
  .wstake{flex:0 1 auto;min-width:0;gap:1px;padding:1px}
  .wstake button{flex:0 0 24px;width:24px;height:26px}
  .wstake span{flex:1 1 42px;min-width:34px}
  .wstake span b{font-size:14px}
  .wtop{flex:0 0 auto;padding:7px 8px;font-size:12px;white-space:nowrap}
}
@media(max-width:360px){
  .wbar .who{flex-basis:68px;padding:3px 4px}
  .wbar .who b{font-size:11px}
  .wpot b{font-size:11px}
  .wstake button{flex-basis:22px;width:22px}
  .wstake span{min-width:32px}
  .wtop{padding:6px}
}
.whow{box-sizing:border-box;min-width:0;padding:14px;border:1px solid var(--line);border-radius:14px;background:#1c1f24;color:var(--chrome);font-size:14px;line-height:1.45;overflow-wrap:anywhere}
.whow[hidden]{display:none}
.whow h2{margin:0 0 8px;font-size:18px}
.whow ul{margin:0 0 12px;padding-left:18px}
.whow li+li{margin-top:5px}
header>span{flex-wrap:wrap}
`;
  document.head.appendChild(el('style', null, css));
  // ---------- how to play ----------
  const howTo = document.getElementById('howToPlay');
  const helpButton = document.getElementById('helpBtn');
  function closeHowTo() {
    if (howTo.hidden) return;
    howTo.hidden = true;
    helpButton.setAttribute('aria-expanded', 'false');
    if (typeof fitStage === 'function') fitStage();
    try { localStorage.setItem('wol.howToSeen', '1'); }
    catch (e) { console.warn('Could not save how-to preference.', e); }
  }
  function openHowTo() {
    howTo.hidden = false;
    howToSeen = true;
    helpButton.setAttribute('aria-expanded', 'true');
    if (typeof fitStage === 'function') fitStage();
    try { localStorage.setItem('wol.howToSeen', '1'); }
    catch (e) { console.warn('Could not save how-to preference.', e); }
  }
  helpButton.addEventListener('click', openHowTo);
  document.addEventListener('click', e => {
    if (!helpButton.contains(e.target)) closeHowTo();
  }, true);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeHowTo();
  });
  let howToSeen = false;
  try { howToSeen = localStorage.getItem('wol.howToSeen') === '1'; }
  catch (e) { console.warn('Could not read how-to preference.', e); }
  // ---------- top bar ----------
  // Owns the wallet header, stake controls, and toast UI.
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
  const offline = el('div', 'woffline', 'No connection, reconnecting…'); offline.hidden = true; offline.setAttribute('role', 'status');
  document.body.append(sheet, login, banner, offline);
  function paintConnection() { offline.hidden = W.connected; }
  window.addEventListener('wol-connectivity', paintConnection);
  paintConnection();
  function openSheet(html) { $w('wPanel').innerHTML = html; sheet.hidden = false; return $w('wPanel'); }
  function closeSheet() { sheet.hidden = true; }
  let toastT = 0;
  function toast(msg, gold) {
    let t = document.querySelector('.wtoast'); if (!t) { t = el('div', 'wtoast'); document.body.appendChild(t); }
    t.textContent = msg; t.className = 'wtoast' + (gold ? ' gold' : ''); t.style.opacity = 1;
    clearTimeout(toastT); toastT = setTimeout(() => { t.style.opacity = 0; }, 2600);
  }
  const spinButton = $w('spinBtn');
  if (spinButton) spinButton.addEventListener('click', e => {
    if (W.connected !== false || (scene === 'photo' && !photoDone)) return;
    e.preventDefault(); e.stopImmediatePropagation(); toast('No connection, reconnecting…');
  }, true);
  function showLoadError(container, retry) {
    const button = el('button', 'wlink', "Couldn't load, tap to retry"); button.type = 'button'; button.onclick = retry;
    container.replaceChildren(button);
  }
  let trophyToasts = [], trophyToastTimer = 0;
  const pendingTrophies = new Set();
  function showTrophyToast() {
    if (!trophyToasts.length) { trophyToastTimer = 0; return; }
    const t = trophyToasts.shift();
    playSfx('trophy');
    toast(`${t.icon} ${t.name} trophy earned!`, true);
    trophyToastTimer = setTimeout(showTrophyToast, 2700);
  }
  function awardTrophy(id) {
    const trophy = TROPHIES.find(t => t.id === id), me = W.me, user = W.user;
    if (!trophy || !me || !user || (me.trophies && me.trophies[id])) return;
    const pendingId = user + '/' + id;
    if (pendingTrophies.has(pendingId)) return;
    const earnedAt = now();
    me.trophies = Object.assign({}, me.trophies || {}, { [id]: earnedAt });
    pendingTrophies.add(pendingId);
    db.put('users/' + user + '/trophies/' + id, earnedAt).then(() => {
      if (W.user === user && W.me && W.me !== me) W.me.trophies = Object.assign({}, W.me.trophies || {}, { [id]: earnedAt });
      trophyToasts.push(trophy);
      if (!trophyToastTimer) showTrophyToast();
    }).catch(() => {
      const rollback = account => {
        if (!account.trophies || account.trophies[id] !== earnedAt) return;
        delete account.trophies[id];
        if (!Object.keys(account.trophies).length) delete account.trophies;
      };
      rollback(me);
      if (W.user === user && W.me && W.me !== me) rollback(W.me);
      toast(`Could not save ${trophy.name}. Try again when online.`);
    }).finally(() => pendingTrophies.delete(pendingId));
  }

  function paint() {
    const me = W.me;
    $w('wWho').innerHTML = `<small>${me ? (me.test ? 'TEST' : esc(me.name)) : 'Log in'}</small><b>${eur(me ? me.balance || 0 : 0)}</b>`;
    $w('wWho').classList.toggle('test', isTest()); document.body.classList.toggle('wtest', isTest());
    $w('wStake').textContent = W.run && W.run.live && W.run.free ? 'FREE 10c' : stakeLbl(W.stake);
    $w('wLess').disabled = W.stake <= STAKES[0]; $w('wMore').disabled = !nextStake();
    const pot = $w('wPot'); if (pot) pot.textContent = eur(W.jackpot || JACKPOT_START);
    paintFree();
    if (me && !howToSeen) openHowTo();
    if (typeof fitStage === 'function') fitStage();
  }
  // free daily spins counter, in the row under Spin
  const freeTag = el('span', 'wfree'); freeTag.setAttribute('aria-live', 'polite');
  function paintFree() {
    const row = document.getElementById('resetRow'); if (row && freeTag.parentNode !== row) row.prepend(freeTag);
    const n = W.me && W.freeLeft ? W.freeLeft(W.me) : 0;
    freeTag.hidden = !W.me; freeTag.classList.toggle('none', !n);
    freeTag.textContent = !n ? 'Free spins back at midnight' : W.stake === W.freeStake ? `${n} of 5 free spins left today` : `${n} free 10c spins: set bet to 10c`;
  }
  setInterval(() => { if (W.me) paintFree(); }, 60000); // ticks over at midnight
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
  // Owns account login, refresh, and logout flows.
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
  // ---------- top up (player pays Cillian on Revolut and confirms; the host page can reverse) ----------
  // Owns the top-up confirmation sheets.
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
  // Owns account-sheet history, statistics, and leaderboard views.
  async function accountSheet(tab = 'me', selectedBoard) {
    await refresh();
    const me = W.me; if (!me) return;
    const board = ['won', 'biggest', 'spins', 'net', 'trophies'].includes(selectedBoard) ? selectedBoard : (pref.get('wol.lbBoard') || 'won');
    const p = openSheet(`<h3>${esc(me.name)}</h3>
      <div class="wtabs"><button data-t="me" type="button">Me</button><button data-t="lb" type="button">Leaderboards</button></div>
      <div id="wBody"><p>Loading…</p></div>
      <button class="wlink" type="button" id="wClose">Close</button>`);
    p.querySelectorAll('.wtabs button').forEach(b => { b.classList.toggle('on', b.dataset.t === tab); b.onclick = () => accountSheet(b.dataset.t, board); });
    $w('wClose').onclick = closeSheet;
    const body = $w('wBody');
    const load = async () => {
      body.innerHTML = '<p>Loading…</p>';
      const timer = setTimeout(() => showLoadError(body, load), 10000);
      try {
        if (tab === 'me') await meTab(body, me);
        else await lbTab(body, board);
      } catch (e) { showLoadError(body, load); }
      finally { clearTimeout(timer); }
    };
    await load();
  }
  async function meTab(body, me) {
    const tx = await db.get('tx/' + W.user, '?orderBy="$key"&limitToLast=40') || {};
    const reqs = Object.entries(await db.get('reqs').catch(() => null) || {}).filter(([, r]) => r.user === W.user && r.kind === 'withdraw' && r.status === 'pending');
    const net = (me.won || 0) - (me.staked || 0);
    const rows = Object.values(tx).sort((a, b) => b.at - a.at);
    const name = { spin: 'Spin', win: 'Win', topup: 'Top-up', gift: 'Gift', withdraw: 'Withdrawal', refund: 'Refund', adjust: 'Adjustment', payout: 'Paid out' };
    const icon = { spin: '🎡', win: '🏆', topup: '➕', gift: '🎁', withdraw: '↗', refund: '↩', adjust: '⚙', payout: '✓' };
    const history = [];
    rows.slice().reverse().forEach(t => {
      if (isTest() && (t.t === 'spin' || t.t === 'win')) return;
      const previous = t.t === 'win' && Number.isFinite(Number(t.stake)) && Number(t.stake) > 0
        ? history.slice().reverse().find(item => !item.win && item.tx.t === 'spin' && new Date(item.tx.at).toDateString() === new Date(t.at).toDateString() && Math.abs(Number(item.tx.a)) === Number(t.stake))
        : null;
      if (previous) {
        previous.win = t;
        previous.at = t.at;
      } else {
        const type = t.t === 'topup' && t.what === 'by host' ? 'gift' : t.t;
        history.push({ at: t.at, type, tx: t });
      }
    });
    history.sort((a, b) => b.at - a.at);
    const today = new Date().toDateString(), yesterday = new Date(Date.now() - 86400000).toDateString();
    const dayLabel = day => day === today ? 'Today' : day === yesterday ? 'Yesterday' : new Date(day).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' });
    const historyTime = at => new Date(at).toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit' });
    const pending = reqs.reduce((sum, [, r]) => sum + (Number(r.a) || 0), 0);
    let historyLimit = 15;
    const renderHistory = () => {
      let lastDay = null;
      const shown = history.slice(0, historyLimit).map(item => {
        const day = new Date(item.at).toDateString(), header = day !== lastDay ? `<li class="whistory-day">${dayLabel(day)}</li>` : '';
        lastDay = day;
        const t = item.tx;
        if (item.win) return `${header}<li class="whistory-entry"><span class="whistory-icon" aria-hidden="true">${icon.spin}</span><div class="whistory-detail"><b>Spin <span class="minus">${eur(t.a)}</span> → Win <span class="plus">${item.win.a >= 0 ? '+' : ''}${eur(item.win.a)}</span></b>${item.win.what ? `<span>${esc(item.win.what)}</span>` : ''}<span>${historyTime(t.at)} → ${historyTime(item.win.at)}</span></div></li>`;
        return `${header}<li class="whistory-entry"><span class="whistory-icon" aria-hidden="true">${icon[item.type] || '•'}</span><div class="whistory-detail"><b>${esc(name[item.type] || item.type)}${t.what && item.type !== 'gift' ? ` <span>${esc(t.what)}</span>` : ''}</b><span>${historyTime(t.at)}</span></div><b class="${t.a >= 0 ? 'plus' : 'minus'}">${t.a >= 0 ? '+' : ''}${eur(t.a)}</b></li>`;
      }).join('');
      $w('wHistory').innerHTML = shown || '<li>Nothing here yet</li>';
      $w('wMoreHistory').hidden = history.length <= historyLimit;
    };
    body.innerHTML = `<div class="waccount">
        <div class="wbalance"><small>Balance</small><b>${eur(me.balance || 0)}</b>
          <div class="wrow"><button class="wbtn gold" id="wT" type="button">Top up</button><button class="wbtn" id="wW" type="button">Withdraw</button></div>
        </div>
        <div class="wstats">
          <div><small>Spins</small><b>${me.spins || 0}</b></div><div><small>Biggest win</small><b>${eur(me.biggest || 0)}</b></div>
          <div><small>Up / down</small><b class="${net >= 0 ? 'plus' : 'minus'}">${eur(net)}</b></div>
        </div>
        ${reqs.length ? `<div class="wpending">Pending withdrawals (${reqs.length}) · ${eur(pending)}</div>` : ''}
        <h4>History</h4><ul class="wlist" id="wHistory"></ul>
        <button class="wlink" type="button" id="wMoreHistory">Show more</button>
        <h4>Trophies</h4>
        <div class="wtrophy-grid">${TROPHIES.map(t => {
          const earned = !!(me.trophies && me.trophies[t.id]);
          return `<button class="wtrophy${earned ? '' : ' locked'}" type="button" data-trophy="${t.id}" aria-label="${esc(t.name)}: ${earned ? 'earned' : 'locked'}"><span class="wtrophy-icon">${t.icon}</span><span class="wtrophy-name">${esc(t.name)}</span><span class="wtrophy-state">${earned ? 'Earned' : 'Locked'}</span></button>`;
        }).join('')}</div>
        <p class="wtrophy-detail" id="wTrophyDetail" aria-live="polite">Tap a trophy to see how to earn it.</p>
        <button class="wlink" type="button" id="wOut">Log out</button>
      </div>`;
    renderHistory();
    $w('wMoreHistory').onclick = () => { historyLimit += 15; renderHistory(); };
    body.querySelectorAll('.wtrophy').forEach(button => {
      button.onclick = () => {
        const trophy = TROPHIES.find(t => t.id === button.dataset.trophy);
        if (trophy) $w('wTrophyDetail').textContent = `${trophy.name}: ${trophy.how}`;
      };
    });
    $w('wT').onclick = () => topupSheet(); $w('wW').onclick = withdrawSheet; $w('wOut').onclick = logout;
  }
  async function lbTab(body, selectedBoard) {
    const [users, st] = await Promise.all([db.get('users'), db.get('stats')]);
    const list = Object.entries(users || {}).filter(([, u]) => !u.test), s = st || {};
    const boards = {
      won: { title: 'Most won', value: u => u.won || 0, format: eur },
      biggest: { title: 'Biggest win', value: u => u.biggest || 0, format: eur },
      spins: { title: 'Most spins', value: u => u.spins || 0, format: n => n },
      net: { title: 'Best up/down', value: u => (u.won || 0) - (u.staked || 0), format: eur },
      trophies: { title: 'Most trophies', value: u => Object.keys(u.trophies || {}).length, format: n => n },
    };
    let boardKey = boards[selectedBoard] ? selectedBoard : 'won';
    body.innerHTML = `<div class="wboard-stats">Everyone: <b>${s.spins || 0} spins</b> · Biggest ever win: <b>${eur(s.biggest || 0)}${s.biggestBy ? ` by ${esc(s.biggestBy)}` : ''}</b></div>
      <div class="wboard-pick">${Object.entries(boards).map(([key, b]) => `<button class="wbtn${key === boardKey ? ' sel' : ''}" data-board="${key}" type="button">${b.title}</button>`).join('')}</div>
      <h4 id="wBoardTitle"></h4><ul class="wlist wboard" id="wBoardRows"></ul>`;
    const renderBoard = () => {
      const board = boards[boardKey];
      const ranked = list.slice().sort((a, b) => board.value(b[1]) - board.value(a[1]) || String(a[1].name).localeCompare(String(b[1].name)));
      $w('wBoardTitle').textContent = board.title;
      $w('wBoardRows').innerHTML = ranked.map(([key, u], i) => `<li><div>${i + 1}. ${esc(u.name)}${key === W.user ? '<span class="wyou">You</span>' : ''}</div><b>${board.format(board.value(u))}</b></li>`).join('') || '<li>Nothing here yet</li>';
      body.querySelectorAll('.wboard-pick button').forEach(button => button.classList.toggle('sel', button.dataset.board === boardKey));
    };
    body.querySelectorAll('.wboard-pick button').forEach(button => { button.onclick = () => { boardKey = button.dataset.board; pref.set('wol.lbBoard', boardKey); renderBoard(); }; });
    renderBoard();
  }
  // ---------- withdraw (request goes to the host screen; Cillian pays on Revolut) ----------
  // Owns withdrawal request UI.
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
  // version.json is ~200 bytes; once a minute while the app is open is nothing for the phone
  setInterval(() => { if (!document.hidden) checkUpdate(); }, 60000);
