// ---------- the room: dim, a fire going ----------
const room = $('#room'), rctx = room.getContext('2d');
let RW = 0, RH = 0, RDp = 1, roomBg = null, fireBox = null, lastRoom = 0;
const EMBERS = Array.from({ length: 26 }, () => ({ x: Math.random(), y: Math.random(), v: .15 + Math.random() * .35, s: 1 + Math.random() * 1.5 }));
function buildRoom() {
  const k = document.createElement('canvas'); k.width = room.width; k.height = room.height;
  const g = k.getContext('2d'); g.scale(RDp, RDp);
  const W = RW, H = RH, wy = H * .6;
  g.fillStyle = grad(g, 0, 0, 0, H, [[0, '#140d08'], [.55, '#2e1f14'], [1, '#120b07']]); g.fillRect(0, 0, W, H);
  for (let x = 0; x < W; x += 28) { g.fillStyle = 'rgba(255,214,160,.045)'; g.fillRect(x, 0, 12, wy); }
  g.fillStyle = grad(g, 0, wy, 0, H, [[0, '#2a1a10'], [1, '#160d07']]); g.fillRect(0, wy, W, H - wy);
  g.fillStyle = '#3e2615'; g.fillRect(0, wy - 7, W, 9);
  g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 1.5;
  for (let x = 10; x < W; x += 120) g.strokeRect(x + 10, wy + 22, 96, H - wy - 44);
  const fw = Math.min(W * .7, 420), fh = Math.min(H * .16, 170), fx = (W - fw) / 2, fy = H - fh;
  g.fillStyle = '#39322b'; g.fillRect(fx, fy, fw, fh);
  for (let i = 0; i < 70; i++) {
    const sw = 30 + Math.random() * 50, sh = 16 + Math.random() * 18, sx = fx + Math.random() * (fw - sw), sy = fy + Math.random() * (fh - sh);
    g.fillStyle = `rgba(${Math.random() < .5 ? '0,0,0' : '180,160,140'},${.06 + Math.random() * .1})`; rrect(g, sx, sy, sw, sh, 4); g.fill();
  }
  g.save(); g.shadowColor = 'rgba(0,0,0,.8)'; g.shadowBlur = 20; g.shadowOffsetY = 10;
  g.fillStyle = grad(g, 0, fy - 26, 0, fy, [[0, '#5a3a22'], [1, '#2a1a0e']]); g.fillRect(fx - 22, fy - 26, fw + 44, 26); g.restore();
  const bw = fw * .62, bx = (W - bw) / 2, by = fy + fh * .26;
  g.beginPath(); g.moveTo(bx, H); g.lineTo(bx, by + bw * .22); g.quadraticCurveTo(W / 2, by - bw * .12, bx + bw, by + bw * .22); g.lineTo(bx + bw, H); g.closePath();
  g.fillStyle = '#040201'; g.fill();
  fireBox = { x: bx, y: by, w: bw, base: H - 6 };
  const logs = () => {
  g.fillStyle = '#2b1a0e';
  g.save(); g.translate(W / 2, H - 18); g.rotate(-.12); rrect(g, -bw * .38, -10, bw * .76, 20, 9); g.fill(); g.restore();
  g.save(); g.translate(W / 2, H - 14); g.rotate(.1); rrect(g, -bw * .36, -9, bw * .72, 18, 8); g.fill(); g.restore();
  };
  logs();
  // the fire's glow on the room and the dark corners, baked in once
  g.globalCompositeOperation = 'lighter';
  const lg = g.createRadialGradient(W / 2, H - 6 - bw * .15, 0, W / 2, H - 6 - bw * .15, Math.max(W, H) * .95);
  lg.addColorStop(0, 'rgba(255,140,50,.31)'); lg.addColorStop(.4, 'rgba(255,110,40,.11)'); lg.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = lg; g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = 'source-over';
  const vg = g.createRadialGradient(W / 2, H * .55, Math.min(W, H) * .3, W / 2, H * .55, Math.max(W, H) * .85);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.45)');
  g.fillStyle = vg; g.fillRect(0, 0, W, H);
  return k;
}
function roomResize() {
  RDp = Math.min(1.5, window.devicePixelRatio || 1); RW = window.innerWidth; RH = window.innerHeight;
  room.width = Math.round(RW * RDp); room.height = Math.round(RH * RDp); roomBg = buildRoom();
  rctx.setTransform(1, 0, 0, 1, 0, 0); rctx.drawImage(roomBg, 0, 0);
}
function drawRoom(now) {
  requestAnimationFrame(drawRoom);
  if (now - lastRoom < 66 || !roomBg) return; lastRoom = now;
  const t = now / 1000, F = fireBox;
  // repaint just the fireplace opening from the baked room, then the flames and embers over it
  const rx = F.x, ry = F.y - F.w * .2, rw = F.w, rh = F.base - F.y + F.w * .2 + 6;
  rctx.setTransform(1, 0, 0, 1, 0, 0);
  rctx.drawImage(roomBg, rx * RDp, ry * RDp, rw * RDp, rh * RDp, rx * RDp, ry * RDp, rw * RDp, rh * RDp);
  rctx.setTransform(RDp, 0, 0, RDp, 0, 0);
  rctx.save(); rctx.beginPath(); rctx.rect(rx, ry, rw, rh); rctx.clip();
  rctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 9; i++) {
    const x = RW / 2 + (i - 4) * F.w * .085, w = F.w * .075, h = F.w * (.2 + .14 * Math.sin(t * (3.5 + i * .7) + i * 2) + .05 * Math.random()), b = F.base - 12;
    const fg = rctx.createLinearGradient(0, b, 0, b - h);
    fg.addColorStop(0, 'rgba(255,236,170,.9)'); fg.addColorStop(.35, 'rgba(255,150,50,.7)'); fg.addColorStop(1, 'rgba(200,50,10,0)');
    rctx.fillStyle = fg; rctx.beginPath(); rctx.moveTo(x - w, b);
    rctx.quadraticCurveTo(x - w * .9, b - h * .55, x + Math.sin(t * 6 + i) * w * .5, b - h);
    rctx.quadraticCurveTo(x + w * .9, b - h * .55, x + w, b); rctx.fill();
  }
  EMBERS.forEach(e => {
    const y = F.base - mod(e.y * F.w + t * e.v * 60, F.w * .9), x = RW / 2 + (e.x - .5) * F.w * .7 + Math.sin(t * 2 + e.x * 9) * 6;
    rctx.beginPath(); rctx.arc(x, y, e.s, 0, TAU); rctx.fillStyle = 'rgba(255,170,80,.7)'; rctx.fill();
  });
  rctx.restore();
}
roomResize(); window.addEventListener('resize', roomResize); requestAnimationFrame(drawRoom);

