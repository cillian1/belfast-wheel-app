// ---------- canvas helpers ----------
// Owns reusable canvas paths, wheel decoration, and dart sprites.
const cv = $('#wheel'); let ctx = cv.getContext('2d');
let N = 0, c = 0, R = 0, D = 1;
let faces = {};

function mk(w = N, h = N) { const k = document.createElement('canvas'); k.width = w; k.height = h; return k; }
function grad(g, x0, y0, x1, y1, stops) { const gr = g.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, col]) => gr.addColorStop(o, col)); return gr; }
function rrect(g, x, y, w, h, r) { r = Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2)); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

const specialMarks = {};
function specialMark(kind) {
  if (specialMarks[kind]) return specialMarks[kind];
  const k = mk(64, 64), g = k.getContext('2d');
  g.fillStyle = kind === 'W' ? '#3d2706' : '#fff2ff';
  g.font = '900 52px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(kind, 32, 35);
  return specialMarks[kind] = k;
}

const CHROME_LIGHT = [[0, '#59616a'], [.28, '#eef2f5'], [.45, '#a7b0b9'], [.62, '#fafcfd'], [1, '#666f79']];
const CHROME_DARK = [[0, '#0d1013'], [.34, '#47505a'], [.5, '#181c21'], [.76, '#323941'], [1, '#0b0d10']];
const TITANIUM = [[0, '#263b78'], [.28, '#5a88e2'], [.5, '#a47ee0'], [.72, '#ecc46c'], [1, '#7d4f27']];
const PORTAL = [[0, '#04060a'], [.3, '#2b3756'], [.5, '#0a0e16'], [.74, '#40507a'], [1, '#04060a']];
const PALS = [
  { light: CHROME_LIGHT, dark: CHROME_DARK },
  { light: [[0, '#7a838c'], [.3, '#dfe5ea'], [.55, '#b6bfc7'], [.75, '#eef2f5'], [1, '#7e8791']], dark: [[0, '#1b1f24'], [.35, '#525b65'], [.55, '#2a3037'], [.8, '#3e464f'], [1, '#191c21']] },
  { light: [[0, '#59626d'], [.3, '#b8c2cc'], [.55, '#7f8a95'], [.75, '#cfd7de'], [1, '#56606a']], dark: [[0, '#10151b'], [.35, '#3d4a58'], [.55, '#1a2129'], [.8, '#2f3a46'], [1, '#0e1217']] },
  { light: [[0, '#6e6a62'], [.3, '#d9d4c8'], [.55, '#a39d90'], [.75, '#ebe6da'], [1, '#6a655c']], dark: [[0, '#16140f'], [.35, '#4d4840'], [.55, '#221f1a'], [.8, '#3a362f'], [1, '#14120e']] },
  { light: [[0, '#7a6a52'], [.3, '#f1e4cc'], [.5, '#b9a586'], [.72, '#fbf3e3'], [1, '#7d6c53']], dark: [[0, '#2a2219'], [.35, '#6b5a43'], [.55, '#33291e'], [.8, '#57493a'], [1, '#241d15']] },
  { light: [[0, '#4a5470'], [.3, '#c4cde8'], [.55, '#8792b4'], [.75, '#e2e8f8'], [1, '#48526e']], dark: [[0, '#0b0e1c'], [.35, '#2c3458'], [.55, '#121630'], [.8, '#262d4e'], [1, '#090b17']] },
];
const GOLD_A = [[0, '#5a3a08'], [.28, '#f7d77a'], [.48, '#a8771e'], [.7, '#fff1b8'], [1, '#6b4510']];
const GOLD_B = [[0, '#6b4a12'], [.3, '#e2b856'], [.5, '#8a6118'], [.75, '#f3d488'], [1, '#5a3c0c']];
const GOD_A = [[0, '#8a6a20'], [.25, '#fffbe8'], [.45, '#f3d488'], [.62, '#ffffff'], [.8, '#ffe9a8'], [1, '#8a6a20']];
const PURPLE_A = [[0, '#2a0e4a'], [.28, '#9b5de5'], [.48, '#4b1f7a'], [.7, '#c9a2ff'], [1, '#2e1052']];
const BOOST_W = [[0, '#3e1c0a'], [.28, '#f0a070'], [.48, '#8a4422'], [.7, '#ffd6b4'], [1, '#4a2210']];
const BOOST_B = [[0, '#33082e'], [.28, '#e47ad6'], [.48, '#6e1a66'], [.7, '#ffc4f2'], [1, '#3a0a36']];
const UP_A = [[0, '#06201c'], [.3, '#1f6d62'], [.52, '#0b2e29'], [.75, '#2e8a7c'], [1, '#06201c']];
const GREYED = [[0, '#2c2e31'], [.3, '#6d7276'], [.5, '#3f4246'], [.75, '#7a7f84'], [1, '#2c2e31']];
const tintStops = ([d, l]) => [[0, d], [.3, l], [.52, d], [.75, l], [1, d]];

// Cleopatra in profile, engraved line art. Unit box ~1 x 1.1, facing right; drawn with her head toward the rim.
function cleopatra(g, x, y, ang, size) {
  g.save(); g.translate(x, y); g.rotate(ang + Math.PI / 2); g.scale(size, size); g.translate(-.45, -.55);
  const P = () => g.beginPath();
  const paths = () => {
    // headdress: crown over the top, straight bob down the back
    P(); g.moveTo(.6, .3); g.bezierCurveTo(.62, .12, .5, .04, .34, .05); g.bezierCurveTo(.16, .06, .08, .2, .1, .4);
    g.lineTo(.08, .86); g.lineTo(.5, .86); g.lineTo(.5, .74); g.stroke();
    // diadem band and the cobra on the brow
    P(); g.moveTo(.12, .24); g.quadraticCurveTo(.38, .17, .62, .2); g.stroke();
    P(); g.moveTo(.62, .2); g.bezierCurveTo(.7, .2, .72, .1, .66, .08); g.bezierCurveTo(.62, .07, .62, .12, .65, .13); g.stroke();
    // face: brow, nose, lips, chin, jaw, neck
    P(); g.moveTo(.6, .26); g.quadraticCurveTo(.67, .3, .67, .36); g.lineTo(.77, .48); g.lineTo(.69, .51);
    g.quadraticCurveTo(.73, .54, .7, .56); g.quadraticCurveTo(.73, .59, .68, .61); g.quadraticCurveTo(.71, .68, .64, .7);
    g.quadraticCurveTo(.56, .71, .52, .66); g.moveTo(.6, .7); g.lineTo(.6, .92); g.stroke();
    // eye with the kohl wing
    P(); g.moveTo(.58, .37); g.quadraticCurveTo(.62, .34, .655, .375); g.quadraticCurveTo(.62, .395, .58, .37); g.lineTo(.5, .36); g.stroke();
    P(); g.moveTo(.57, .32); g.quadraticCurveTo(.61, .3, .65, .33); g.stroke();
    // hair stripes
    for (let i = 0; i < 4; i++) { const hx = .16 + i * .085; P(); g.moveTo(hx, .3); g.lineTo(hx - .01, .84); g.stroke(); }
    // broad collar
    [0, .07, .14].forEach(o => { P(); g.moveTo(.22, .9 + o); g.quadraticCurveTo(.5, 1.0 + o, .8, .9 + o); g.stroke(); });
  };
  g.lineCap = 'round'; g.lineJoin = 'round';
  g.lineWidth = .045; g.strokeStyle = 'rgba(255,248,214,.75)'; g.save(); g.translate(.012, .018); paths(); g.restore();
  g.lineWidth = .04; g.strokeStyle = '#3d2706'; paths();
  g.restore();
}
// the ankh, engraved: a loop over a cross bar and a flared stem. Drawn with its loop toward the rim.
function ankh(g, x, y, ang, size, ghost) {
  g.save(); g.translate(x, y); g.rotate(ang + Math.PI / 2); g.scale(size, size);
  const shape = () => {
    g.beginPath(); g.ellipse(0, -.28, .17, .24, 0, 0, TAU);
    g.moveTo(-.38, .02); g.lineTo(.38, .02);
    g.moveTo(0, -.04); g.lineTo(0, .62);
  };
  g.lineCap = 'round'; g.lineJoin = 'round';
  g.lineWidth = .15; g.strokeStyle = ghost ? 'rgba(255,255,255,.6)' : 'rgba(40,10,70,.85)'; g.save(); g.translate(.02, .03); shape(); g.stroke(); g.restore();
  g.lineWidth = .11; g.strokeStyle = ghost ? '#d7d7d7' : grad(g, -.4, -.5, .4, .6, [[0, '#fff1b8'], [.45, '#e2b856'], [1, '#8a6118']]); shape(); g.stroke();
  g.restore();
}
// the God slice's mark: rays behind an eye of Horus
function eyeOfHorus(g, x, y, ang, size) {
  g.save(); g.translate(x, y); g.rotate(ang + Math.PI / 2); g.scale(size, size);
  for (let i = 0; i < 12; i++) { const a = i * TAU / 12; g.beginPath(); g.moveTo(Math.cos(a) * .32, Math.sin(a) * .32); g.lineTo(Math.cos(a) * .62, Math.sin(a) * .62); g.strokeStyle = 'rgba(200,150,40,.55)'; g.lineWidth = .05; g.stroke(); }
  g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#3d2706'; g.lineWidth = .07;
  g.beginPath(); g.moveTo(-.42, 0); g.quadraticCurveTo(0, -.32, .42, 0); g.quadraticCurveTo(0, .26, -.42, 0); g.stroke();
  g.beginPath(); g.arc(0, -.02, .13, 0, TAU); g.fillStyle = '#1a1206'; g.fill();
  g.beginPath(); g.moveTo(-.4, -.18); g.quadraticCurveTo(0, -.42, .46, -.16); g.stroke();
  g.beginPath(); g.moveTo(-.05, .14); g.lineTo(-.12, .46); g.moveTo(.08, .14); g.quadraticCurveTo(.22, .4, .4, .3); g.quadraticCurveTo(.46, .22, .38, .2); g.stroke();
  g.restore();
}
function wedgePath(g, a0, a1, r0, r1) { g.beginPath(); g.arc(c, c, r1, a0, a1); g.arc(c, c, r0, a1, a0, true); g.closePath(); }
function wedgeFill(g, a0, a1, r0, r1, stops) {
  const rm = (r0 + r1) / 2;
  return grad(g, c + Math.cos(a0) * rm, c + Math.sin(a0) * rm, c + Math.cos(a1) * rm, c + Math.sin(a1) * rm, stops);
}
// tone 'light' = dark engraved text on a light wedge; 'dark' = light text on a dark wedge
function wedgeText(g, ang, rm, lines, fs, maxLen, tone) {
  g.save(); g.translate(c, c); g.rotate(ang);
  try { g.letterSpacing = (fs * .06) + 'px'; } catch (e) {}
  let f = fs; g.font = `700 ${f}px ${LABEL_FONT}`;
  const w = Math.max(...lines.map(l => g.measureText(l).width));
  if (w > maxLen) { f = f * maxLen / w; g.font = `700 ${f}px ${LABEL_FONT}`; }
  g.textAlign = 'center'; g.textBaseline = 'middle';
  const lh = f * 1.12;
  lines.forEach((l, k) => {
    const y = (k - (lines.length - 1) / 2) * lh;
    if (tone === 'light') { g.fillStyle = 'rgba(255,255,255,.75)'; g.fillText(l, rm, y + D); g.fillStyle = '#14171b'; }
    else { g.fillStyle = 'rgba(0,0,0,.85)'; g.fillText(l, rm, y + D); g.fillStyle = '#f2f5f8'; }
    g.fillText(l, rm, y);
  });
  g.restore();
}
function ridges(g, n, r0, r1) {
  const seg = TAU / n;
  for (let i = 0; i < n; i++) {
    const a = BASE + i * seg, cs = Math.cos(a), sn = Math.sin(a), px = -sn * 1.6 * D, py = cs * 1.6 * D;
    g.beginPath(); g.moveTo(c + cs * r0 + px, c + sn * r0 + py); g.lineTo(c + cs * r1 + px, c + sn * r1 + py);
    g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 2.6 * D; g.stroke();
    g.beginPath(); g.moveTo(c + cs * r0, c + sn * r0); g.lineTo(c + cs * r1, c + sn * r1);
    g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 1.1 * D; g.stroke();
  }
}
function hairlines(g, fs) {
  fs.forEach(f => {
    g.beginPath(); g.arc(c, c, R * f, 0, TAU); g.strokeStyle = 'rgba(0,0,0,.32)'; g.lineWidth = D; g.stroke();
    g.beginPath(); g.arc(c, c, R * f + D, 0, TAU); g.strokeStyle = 'rgba(255,255,255,.13)'; g.stroke();
  });
}
function bevel(g, r, light) { g.beginPath(); g.arc(c, c, r, 0, TAU); g.strokeStyle = light ? 'rgba(255,255,255,.5)' : 'rgba(0,0,0,.7)'; g.lineWidth = 1.2 * D; g.stroke(); }
function stud(g, x, y, r) {
  const gr = g.createRadialGradient(x - r * .35, y - r * .4, 0, x, y, r);
  gr.addColorStop(0, '#ffffff'); gr.addColorStop(.35, '#cfd6dc'); gr.addColorStop(.8, '#4b535c'); gr.addColorStop(1, '#1b1f24');
  g.beginPath(); g.arc(x, y, r, 0, TAU); g.fillStyle = gr; g.fill();
}
function chromeRim(g, r0, r1) {
  let rim;
  if (g.createConicGradient) {
    rim = g.createConicGradient(-.3, c, c);
    const st = ['#f7f9fb', '#555d66', '#dbe1e6', '#262b31', '#c6ced5', '#69727b', '#fbfcfd', '#363c43'];
    for (let i = 0; i <= 16; i++) rim.addColorStop(i / 16, st[i % 8]);
  } else rim = grad(g, 0, 0, N, N, CHROME_LIGHT);
  g.beginPath(); g.arc(c, c, r1, 0, TAU); g.arc(c, c, r0, 0, TAU, true); g.fillStyle = rim; g.fill();
  bevel(g, r1 - D, true); bevel(g, r0, false);
}

// aged metal: lathe swirl, scratches, pitting, grime at the edges
function weather(g, r0, r1, amount = 1) {
  g.save(); g.beginPath(); g.arc(c, c, r1, 0, TAU); g.arc(c, c, r0, 0, TAU, true); g.clip('evenodd');
  g.globalCompositeOperation = 'soft-light'; g.fillStyle = 'rgba(150,105,50,.45)'; g.fillRect(0, 0, N, N); g.globalCompositeOperation = 'source-over';
  for (let i = 0; i < 80 * amount; i++) {
    const rr = lerp(r0, r1, Math.random()), a = Math.random() * TAU;
    g.beginPath(); g.arc(c, c, rr, a, a + .2 + Math.random() * .9); g.strokeStyle = `rgba(255,255,255,${.03 + Math.random() * .05})`; g.lineWidth = D * .6; g.stroke();
  }
  for (let i = 0; i < 320 * amount; i++) {
    const a = Math.random() * TAU, rr = lerp(r0, r1, Math.random()), x = c + Math.cos(a) * rr, y = c + Math.sin(a) * rr;
    const d = Math.random() * TAU, L = R * (.008 + Math.random() * .06);
    g.beginPath(); g.moveTo(x, y);
    g.quadraticCurveTo(x + Math.cos(d) * L * .5 + (Math.random() - .5) * L * .3, y + Math.sin(d) * L * .5 + (Math.random() - .5) * L * .3, x + Math.cos(d) * L, y + Math.sin(d) * L);
    g.strokeStyle = Math.random() < .6 ? `rgba(255,255,255,${.07 + Math.random() * .16})` : `rgba(0,0,0,${.12 + Math.random() * .18})`;
    g.lineWidth = D * (.4 + Math.random() * .7); g.stroke();
  }
  for (let i = 0; i < 110 * amount; i++) {
    const a = Math.random() * TAU, rr = lerp(r0, r1, Math.pow(Math.random(), .6)), x = c + Math.cos(a) * rr, y = c + Math.sin(a) * rr;
    g.beginPath(); g.arc(x, y, D * (.4 + Math.random() * 2.2), 0, TAU);
    g.fillStyle = Math.random() < .7 ? `rgba(100,58,24,${.25 + Math.random() * .35})` : `rgba(20,14,8,${.3 + Math.random() * .3})`; g.fill();
  }
  const gr = g.createRadialGradient(c, c, r0, c, c, r1);
  gr.addColorStop(0, 'rgba(45,30,14,.45)'); gr.addColorStop(.14, 'rgba(45,30,14,0)'); gr.addColorStop(.86, 'rgba(45,30,14,0)'); gr.addColorStop(1, 'rgba(45,30,14,.5)');
  g.fillStyle = gr; g.fillRect(0, 0, N, N);
  g.restore();
}
// the old dartboard the wheel is mounted in
const DART_NUMS = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
function buildDart() {
  const k = mk(), g = k.getContext('2d'), Rb = N / 2 * .985;
  g.save(); g.shadowColor = 'rgba(0,0,0,.85)'; g.shadowBlur = N * .045; g.shadowOffsetY = N * .025;
  g.beginPath(); g.arc(c, c, Rb, 0, TAU); g.fillStyle = '#1b1712'; g.fill(); g.restore();
  g.save(); g.beginPath(); g.arc(c, c, Rb, 0, TAU); g.clip();
  const seg = TAU / 20;
  for (let i = 0; i < 20; i++) { const a0 = BASE - seg / 2 + i * seg; wedgePath(g, a0, a0 + seg, R * 1.0, R * 1.07); g.fillStyle = i % 2 ? '#22573a' : '#8e2a20'; g.fill(); }
  // sisal fibre
  for (let i = 0; i < 9000; i++) {
    const a = Math.random() * TAU, rr = R * .99 + Math.random() * (Rb - R * .99), x = c + Math.cos(a) * rr, y = c + Math.sin(a) * rr;
    g.fillStyle = Math.random() < .55 ? `rgba(120,104,80,${.12 + Math.random() * .25})` : `rgba(0,0,0,${.18 + Math.random() * .2})`;
    g.save(); g.translate(x, y); g.rotate(a + (Math.random() - .5)); g.fillRect(0, 0, D * (1 + Math.random() * 2.5), D * .8); g.restore();
  }
  // dart holes and wear
  for (let i = 0; i < 160; i++) {
    const a = Math.random() * TAU, rr = R * 1.0 + Math.random() * (Rb - R), x = c + Math.cos(a) * rr, y = c + Math.sin(a) * rr;
    g.beginPath(); g.arc(x, y, D * (.6 + Math.random() * .9), 0, TAU); g.fillStyle = 'rgba(0,0,0,.6)'; g.fill();
  }
  // spider wire
  const wire = (fn) => { g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 2.2 * D; fn(); g.strokeStyle = 'rgba(205,210,214,.75)'; g.lineWidth = D; fn(); };
  [R * 1.0, R * 1.07, R * 1.105].forEach(rr => wire(() => { g.beginPath(); g.arc(c, c, rr, 0, TAU); g.stroke(); }));
  for (let i = 0; i < 20; i++) { const a = BASE - seg / 2 + i * seg; wire(() => { g.beginPath(); g.moveTo(c + Math.cos(a) * R, c + Math.sin(a) * R); g.lineTo(c + Math.cos(a) * R * 1.07, c + Math.sin(a) * R * 1.07); g.stroke(); }); }
  // number ring
  g.font = `700 ${R * .085}px ${LABEL_FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  DART_NUMS.forEach((n, i) => {
    const a = BASE + i * seg, rr = (R * 1.105 + Rb) / 2;
    g.save(); g.translate(c + Math.cos(a) * rr, c + Math.sin(a) * rr); g.rotate(a + Math.PI / 2);
    g.fillStyle = 'rgba(0,0,0,.6)'; g.fillText(n, 0, D); g.fillStyle = 'rgba(222,214,192,.82)'; g.fillText(n, 0, 0); g.restore();
  });
  g.restore();
  g.beginPath(); g.arc(c, c, Rb - D, 0, TAU); g.strokeStyle = '#070605'; g.lineWidth = 3 * D; g.stroke();
  return k;
}
