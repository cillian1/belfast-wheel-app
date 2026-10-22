// ---------- ball physics ----------
// Owns ball-drop simulation and final-slot counting.
let lastPeg = 0;
const DROP_HZ = 240, DROP_DT = 1 / DROP_HZ, DROP_SETTLE_STEPS = Math.ceil(DROP_HZ * 50 / 60);
function physicsStep(dt) {
  const g = N * 1.7, r = ballR, free = balls.filter(b => b.free);
  for (const b of free) {
    b.vy += g * dt; b.vx *= .999; b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.x < B.m + r) { b.x = B.m + r; b.vx = Math.abs(b.vx) * .4; }
    if (b.x > N - B.m - r) { b.x = N - B.m - r; b.vx = -Math.abs(b.vx) * .4; }
    if (b.y > B.floor - r) { b.y = B.floor - r; if (b.vy > 0) b.vy *= -.25; b.vx *= .9; }
    for (const p of B.pegs) {
      const dx = b.x - p.x, dy = b.y - p.y, rr = r + B.pr;
      if (dx > rr || dx < -rr || dy > rr || dy < -rr) continue;
      const d2 = dx * dx + dy * dy;
      if (d2 < rr * rr) {
        const d = Math.sqrt(d2) || 1e-3, nx = dx / d, ny = dy / d;
        b.x = p.x + nx * rr; b.y = p.y + ny * rr;
        const vn = b.vx * nx + b.vy * ny;
        if (vn < 0) {
          b.vx -= 1.5 * vn * nx; b.vy -= 1.5 * vn * ny; b.vx += (Math.random() - .5) * N * .05;
          const now = performance.now(); if (now - lastPeg > 35 && vn < -N * .1) { lastPeg = now; tick(.5, 3000); }
        }
      }
    }
    for (const xd of B.divs) {
      const rr = r + B.dw; if (Math.abs(b.x - xd) > rr) continue;
      const yc = Math.max(B.slotTop, Math.min(B.floor, b.y)), dx = b.x - xd, dy = b.y - yc, d2 = dx * dx + dy * dy;
      if (d2 < rr * rr) {
        let d = Math.sqrt(d2), nx, ny;
        if (d < 1e-3) { nx = Math.random() < .5 ? -1 : 1; ny = 0; d = 0; } else { nx = dx / d; ny = dy / d; }
        b.x = xd + nx * rr; b.y = yc + ny * rr;
        const vn = b.vx * nx + b.vy * ny;
        if (vn < 0) { b.vx -= 1.4 * vn * nx; b.vy -= 1.4 * vn * ny; }
        if (ny < -.9) b.vx += (Math.random() - .5) * N * .08; // never balance on top of a divider
      }
    }
  }
  const r2 = 4 * r * r;
  for (let i = 0; i < free.length; i++) {
    const a = free[i];
    for (let j = i + 1; j < free.length; j++) {
      const b = free[j], dx = b.x - a.x, dy = b.y - a.y;
      if (dx > 2 * r || dx < -2 * r || dy > 2 * r || dy < -2 * r) continue;
      const d2 = dx * dx + dy * dy;
      if (d2 < r2 && d2 > 1e-6) {
        const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, ov = (2 * r - d) / 2;
        a.x -= nx * ov; a.y -= ny * ov; b.x += nx * ov; b.y += ny * ov;
        const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (vn < 0) { const jn = -(1.3) * vn / 2; a.vx -= jn * nx; a.vy -= jn * ny; b.vx += jn * nx; b.vy += jn * ny; }
      }
    }
  }
}
function runDrop(maxMs) {
  return new Promise(res => {
    const t0 = performance.now(); let simStep = 0, calm = 0;
    function f(now) {
      const elapsed = now - t0, targetStep = Math.floor((elapsed + 1e-6) * DROP_HZ / 1000);
      while (simStep < targetStep) {
        const simTime = ++simStep * 1000 / DROP_HZ;
        rotF += .004;
        balls.forEach(b => { if (!b.free && simTime >= b.rel) { b.free = true; b.vx = (Math.random() - .5) * N * .3; b.vy = N * .05; } });
        physicsStep(DROP_DT);
        // once every ball is down between the dividers its slot can't change
        let settled = true;
        balls.forEach(b => {
          if (!b.free) { settled = false; return; }
          const v = Math.hypot(b.vx, b.vy);
          if (b.y > B.slotTop + ballR) { b.vx *= .985; return; }
          settled = false;
          if (v < N * .02) b.vx += (Math.random() - .5) * N * .1; // stuck on a peg: nudge
        });
        calm = settled ? calm + 1 : 0;
        if (calm >= DROP_SETTLE_STEPS) break;
      }
      draw();
      if (calm >= DROP_SETTLE_STEPS || elapsed > maxMs) res(); else requestAnimationFrame(f);
    }
    requestAnimationFrame(f);
  });
}
function countSlots() {
  const cs = FINAL.map(() => 0);
  balls.forEach(b => { const j = Math.max(0, Math.min(FINAL.length - 1, Math.floor((b.x - B.m) / B.w))); cs[j]++; });
  return cs;
}
