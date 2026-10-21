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
.whistory-entry{min-width:0;overflow-wrap:anywhere}
.whistory-entry>div:first-child{flex:1}
.wboard-pick{display:flex;gap:6px;flex-wrap:wrap}
.wboard-pick .wbtn{flex:1 1 40%;min-width:0;padding:8px 6px;font-size:12px;white-space:normal}
.wboard-stats{font-size:13px;line-height:1.5;color:#c3cbd3}
.wboard-stats b{color:#f5d27a}
.wboard li>div{min-width:0;overflow-wrap:anywhere}
.wboard li>b{flex:none}
.wyou{margin-left:5px;color:#f5d27a;font-size:11px;white-space:nowrap}
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
.wlive{display:inline-flex;vertical-align:middle;margin-left:12px;align-items:center;gap:6px;padding:6px 12px;border-radius:999px;border:1.5px solid #ff4d4d;background:rgba(60,8,8,.85);color:#fff;font:700 13px/1 var(--body);letter-spacing:.12em;box-shadow:0 0 14px rgba(255,60,60,.35)}
.wlive i{width:9px;height:9px;border-radius:50%;background:#9b5de5;box-shadow:0 0 6px #9b5de5}
.wlive.on i{background:#ff3b3b;box-shadow:0 0 8px #ff3b3b;animation:wblink 1.2s ease-in-out infinite}
.wlive em{font-style:normal;background:#ff3b3b;border-radius:999px;padding:2px 7px;letter-spacing:0;font-size:12px}
.wlive em:empty{display:none}
@keyframes wblink{50%{opacity:.25}}
.wpl{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 4px;border-bottom:1px solid var(--line)}
.wpl b{font-size:17px}.wpl small{display:block;color:var(--mute);font-size:12px;letter-spacing:.06em}
.wpl small.on{color:#7dff9a}
.wwatch{position:fixed;inset:0;z-index:60;background:#07090c;display:flex;flex-direction:column;align-items:center;gap:10px;padding:calc(12px + env(safe-area-inset-top,0px)) 12px calc(12px + env(safe-area-inset-bottom,0px));overflow-y:auto;color:var(--chrome)}
.wwatch[hidden]{display:none}
.wghost{position:absolute;right:4%;top:18%;z-index:6;display:flex;flex-direction:column;align-items:center;max-width:62%;opacity:0;transform:translateX(60%);transition:opacity .9s ease,transform 1.1s ease;pointer-events:none}
.wghost.in{opacity:.55;transform:none}.wghost.out{opacity:0;transform:translate(-40%,-30%)}
.wghost canvas{width:70px;height:auto}
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
`;
  document.head.appendChild(el('style', null, css));
