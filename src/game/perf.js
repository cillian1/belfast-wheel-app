// ---------- perf ----------
// Owns the quality setting, low-end detection, frame meter and the ?perf=1 overlay.
const Perf = (() => {
  const KEY = 'wol-quality', MODES = ['auto', 'high', 'low'], BUDGET_MS = 8, WINDOW_MS = 2000;
  const store = () => window.wolPref || null;
  const read = () => {
    let value = null;
    try { const pref = store(); value = pref ? pref.get(KEY) : localStorage.getItem(KEY); } catch (e) {}
    return MODES.includes(value) ? value : 'auto';
  };
  let setting = read(), slow = false, low = false, last = 0, winStart = 0, rafCount = 0, rafSum = 0, rafWorst = 0;
  let workCount = 0, workSum = 0, workWorst = 0, hud = null, canvasQualityChanged = null;
  let longTasks = 0, longTaskMs = 0, gcCount = 0, gcMs = 0;
  const observed = { longtask: false, gc: false, paint: false };
  const paintTimes = Object.create(null);
  const scenes = Object.create(null);
  const weak = () => (navigator.hardwareConcurrency != null && navigator.hardwareConcurrency <= 4) ||
    (navigator.deviceMemory != null && navigator.deviceMemory <= 3);
  const compute = () => setting === 'low' || (setting === 'auto' && (slow || weak()));
  const apply = () => {
    const changed = low !== compute();
    low = compute();
    document.documentElement.classList.toggle('lowq', low);
    if (btn) {
      btn.textContent = 'Quality: ' + cap(setting);
      btn.setAttribute('aria-label', 'Graphics quality: ' + cap(setting));
    }
    if (changed && canvasQualityChanged) canvasQualityChanged();
  };
  let shadowSuppression = false;
  const proto = window.CanvasRenderingContext2D && CanvasRenderingContext2D.prototype;
  const shadow = proto && Object.getOwnPropertyDescriptor(proto, 'shadowColor');
  if (shadow && shadow.set && shadow.get && shadow.configurable) {
    Object.defineProperty(proto, 'shadowColor', {
      configurable: true,
      enumerable: shadow.enumerable,
      get() { return shadow.get.call(this); },
      set(value) { shadow.set.call(this, low ? 'rgba(0,0,0,0)' : value); },
    });
    shadowSuppression = true;
  }
  const btn = $('#qualityBtn');
  if (btn) btn.addEventListener('click', () => {
    setting = MODES[(MODES.indexOf(setting) + 1) % MODES.length];
    slow = false;
    try { const pref = store(); pref ? pref.set(KEY, setting) : localStorage.setItem(KEY, setting); } catch (e) {}
    apply();
  });
  window.addEventListener('wol-audio-preference-ready', () => { setting = read(); apply(); });
  if (/[?&]perf=1\b/.test(location.search)) {
    hud = document.createElement('div');
    hud.style.cssText = 'position:fixed;left:4px;top:4px;z-index:99999;font:11px/1.3 monospace;color:#9f9;background:rgba(0,0,0,.78);padding:4px 6px;border-radius:4px;pointer-events:none;white-space:pre;max-height:45vh;overflow:hidden';
    document.body.appendChild(hud);
  }
  const observer = window.PerformanceObserver;
  if (observer) {
    for (const type of ['longtask', 'gc', 'paint']) {
      try {
        const po = new observer(list => list.getEntries().forEach(entry => {
          if (type === 'longtask') { longTasks++; longTaskMs += entry.duration; }
          else if (type === 'gc') { gcCount++; gcMs += entry.duration; }
          else paintTimes[entry.name] = entry.startTime;
        }));
        po.observe({ type, buffered: true });
        observed[type] = true;
      } catch (e) { observed[type] = false; }
    }
  }
  function begin(name) {
    return performance.now();
  }
  function end(name, start) {
    const elapsed = performance.now() - start;
    let total = scenes[name];
    if (!total) total = scenes[name] = { count: 0, sum: 0, worst: 0 };
    total.count++; total.sum += elapsed;
    if (elapsed > total.worst) total.worst = elapsed;
    workCount++; workSum += elapsed;
    if (elapsed > workWorst) workWorst = elapsed;
  }
  function snapshot() {
    const result = {};
    Object.keys(scenes).forEach(name => {
      const data = scenes[name];
      result[name] = { count: data.count, averageMs: data.sum / data.count, worstMs: data.worst };
    });
    return { mode: setting, low, scenes: result, longTasks, longTaskMs, gcCount, gcMs, paint: { ...paintTimes }, observed: { ...observed }, shadowSuppression };
  }
  function tick(now) {
    requestAnimationFrame(tick);
    if (document.hidden) { last = 0; winStart = 0; return; }
    const dt = last ? now - last : 0;
    last = now;
    if (dt && dt <= 250) {
      rafCount++; rafSum += dt;
      if (dt > rafWorst) rafWorst = dt;
    }
    if (!winStart) winStart = now;
    if (now - winStart < WINDOW_MS) return;
    if (hud) {
      const rows = Object.keys(scenes).map(name => {
        const data = scenes[name];
        return `${name} ${ (data.sum / data.count).toFixed(1)}/${data.worst.toFixed(1)} ms`;
      });
      const fps = rafCount ? Math.round(1000 / (rafSum / rafCount)) : 0;
      const work = workCount ? (workSum / workCount).toFixed(1) : '0.0';
      const paints = Object.keys(paintTimes).map(name => `${name} ${paintTimes[name].toFixed(0)} ms`).join(' ') || 'paint unavailable';
      const tasks = observed.longtask ? `${longTasks} / ${longTaskMs.toFixed(0)} ms` : 'unavailable';
      const garbage = observed.gc ? `${gcCount} / ${gcMs.toFixed(0)} ms` : 'unavailable';
      hud.textContent = `${fps} fps · RAF ${rafWorst.toFixed(0)} ms max\nJS ${work} ms avg · ${workWorst.toFixed(1)} ms max\nquality ${setting}${low ? ' (low)' : ''} · long tasks ${tasks} · GC ${garbage}\n${paints}\n${rows.join('\n')}${shadowSuppression ? '' : '\nshadow suppression unavailable'}`;
    }
    if (setting === 'auto' && !slow && workCount && workSum / workCount > BUDGET_MS) {
      slow = true;
      apply();
    }
    winStart = now;
    rafCount = 0; rafSum = 0; rafWorst = 0;
    workCount = 0; workSum = 0; workWorst = 0;
  }
  requestAnimationFrame(tick);
  apply();
  return {
    get low() { return low; },
    dpr: cap => Math.min(cap, low ? 1.5 : cap, window.devicePixelRatio || 1),
    begin,
    end,
    snapshot,
    onCanvasQualityChange(fn) { canvasQualityChanged = fn; },
  };
})();
