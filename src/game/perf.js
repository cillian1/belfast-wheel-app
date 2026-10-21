// ---------- perf ----------
// Owns the quality setting (Auto / High / Low), low-end detection, the frame meter and the ?perf=1 overlay.
const Perf = (() => {
  const KEY = 'wol-quality', MODES = ['auto', 'high', 'low'], BUDGET_MS = 28, WINDOW_MS = 2000;
  const store = (() => { try { return window.wolPref || null; } catch (e) { return null; } });
  const read = () => { let v = null; try { const s = store(); v = s ? s.get(KEY) : localStorage.getItem(KEY); } catch (e) {} return MODES.includes(v) ? v : 'auto'; };
  let setting = read(), slow = false, low = false, frames = 0, sum = 0, worst = 0, last = 0, winStart = 0, hud = null, hudT = 0;
  const weak = () => { const n = navigator; return (n.hardwareConcurrency || 8) <= 4 || (n.deviceMemory || 8) <= 3; };
  const compute = () => setting === 'low' || (setting === 'auto' && (slow || weak()));
  const apply = () => {
    const was = low; low = compute();
    document.documentElement.classList.toggle('lowq', low);
    if (btn) btn.textContent = 'Quality: ' + cap(setting);
    if (was !== low) { try { resize(); roomResize(); } catch (e) {} }
  };
  // low-end mode drops canvas shadow/glow passes by turning every shadow colour transparent
  try {
    const proto = CanvasRenderingContext2D.prototype, d = Object.getOwnPropertyDescriptor(proto, 'shadowColor');
    if (d && d.set) Object.defineProperty(proto, 'shadowColor', { configurable: true, enumerable: d.enumerable, get: d.get, set(v) { d.set.call(this, low ? 'rgba(0,0,0,0)' : v); } });
  } catch (e) {}
  const btn = $('#qualityBtn');
  if (btn) btn.addEventListener('click', () => { setting = MODES[(MODES.indexOf(setting) + 1) % MODES.length]; slow = false; try { const s = store(); s ? s.set(KEY, setting) : localStorage.setItem(KEY, setting); } catch (e) {} apply(); });
  window.addEventListener('wol-audio-preference-ready', () => { setting = read(); apply(); });
  if (/[?&]perf=1\b/.test(location.search)) {
    hud = document.createElement('div');
    hud.style.cssText = 'position:fixed;left:4px;top:4px;z-index:99999;font:11px/1.3 monospace;color:#9f9;background:rgba(0,0,0,.7);padding:3px 5px;border-radius:4px;pointer-events:none;white-space:pre';
    document.body.appendChild(hud);
  }
  function tick(now) {
    requestAnimationFrame(tick);
    if (document.hidden) { last = 0; return; }
    const dt = last ? now - last : 0; last = now;
    if (!dt || dt > 250) { winStart = now; frames = 0; sum = 0; return; } // a stall (tab switch, photo picker) isn't a slow device
    if (!winStart) winStart = now;
    frames++; sum += dt; if (dt > worst) worst = dt;
    if (now - winStart >= WINDOW_MS) {
      const avg = sum / frames;
      if (hud) hud.textContent = `${Math.round(1000 / avg)} fps  avg ${avg.toFixed(1)} ms  worst ${worst.toFixed(0)} ms\nquality ${setting}${low ? ' (low)' : ''}`;
      if (setting === 'auto' && !slow && avg > BUDGET_MS) { slow = true; apply(); }
      winStart = now; frames = 0; sum = 0; worst = 0;
    }
  }
  requestAnimationFrame(tick);
  apply();
  return { get low() { return low; }, dpr: cap => Math.min(cap, low ? 1.5 : cap, window.devicePixelRatio || 1) };
})();
