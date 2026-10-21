// ---------- Phelan's revenge: not one ball in the green ----------
// Owns Phelan's revenge wheel and ending.
// Ghost Phelan laughs, takes you to his sister Zena's house and spins his own wheel of Phelan orders
const PHELAN_OPTS = [
  { lbl: ['RING', 'ZENA'], t: 'Ring Zena', b: "Ring Zena and tell her the lads say hello from Belfast. On speaker, so everyone hears." },
  { lbl: ['COUNTRY', 'SONG'], t: 'Write a country song about Phelan', b: 'Make up a verse about Phelan, sing it to a stranger and get them to rate it out of ten.' },
  { lbl: ['SMELLIEST', 'THING'], t: 'Find the smelliest thing nearby', b: 'Everyone has to have a sniff. Phelan would want it that way.' },
  { lbl: ['RACE', 'COMMENTARY'], t: 'Commentate the walk like a racing game', b: 'Walk to the next spot while one of you commentates it like Phelan on his racing sim. Full volume, every corner.' },
  { lbl: ['E-WASTE', 'HUNT'], t: 'Find a bit of e-waste', b: 'A dead battery, an old cable, a broken phone. Whoever finds it carries it for the rest of the night.' },
  { lbl: ['CLEAN', 'UP'], t: 'Clean something up', b: "Mark and James had to clean Phelan's room. Now it's your turn: tidy one table or one mess before you move on." },
  { lbl: ['STAY IN', 'ONE ROOM'], t: 'Stay in one room for 20 minutes', b: 'Phelan never left his room. Pick a spot and nobody leaves it for twenty minutes.' },
  { lbl: ['TOAST', 'PHELAN'], t: 'Toast Phelan', b: 'Raise a glass to Phelan wherever he is tonight. Everyone says one nice thing about him.' },
];
let zena = null;
function buildPhelanWheel(items) {
  const k = mk(), g = k.getContext('2d'), n = items.length, seg = TAU / n, r0 = R * .17, r1 = R * .93;
  g.beginPath(); g.arc(c, c, R, 0, TAU); g.fillStyle = '#16120a'; g.fill();
  chromeRim(g, r1, R); weather(g, r1, R, .6);
  const cols = ['#3e4c1a', '#6b4a22', '#2f3a14', '#5a3a18'];
  items.forEach((it, i) => { const a0 = BASE + i * seg; wedgePath(g, a0, a0 + seg, r0, r1); g.fillStyle = cols[i % 4]; g.fill(); g.save(); g.clip(); for (let j = 0; j < 24; j++) { g.beginPath(); g.arc(c, c, lerp(r0, r1, Math.random()), a0, a0 + seg); g.strokeStyle = `rgba(40,30,0,${.05 + Math.random() * .08})`; g.lineWidth = D; g.stroke(); } g.restore(); });
  ridges(g, n, r0, r1);
  items.forEach((it, i) => wedgeText(g, BASE + (i + .5) * seg, R * .58, it.lbl, R * .056, R * .58, 'light'));
  const dome = g.createRadialGradient(c - R * .04, c - R * .05, 0, c, c, R * .17); dome.addColorStop(0, '#e8f0d0'); dome.addColorStop(1, '#5a6a2a');
  g.beginPath(); g.arc(c, c, R * .17, 0, TAU); g.fillStyle = dome; g.fill();
  g.font = `700 ${R * .06}px ${DISPLAY_FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#2a3010'; g.fillText('P', c, c);
  return k;
}
function drawZena(now) {
  const g = ctx, Z = zena;
  g.save(); rrect(g, D, D, N - 2 * D, N - 2 * D, N * .05); g.clip();
  g.fillStyle = grad(g, 0, 0, 0, N, [[0, '#0b1020'], [.6, '#1d2238'], [1, '#14100c']]); g.fillRect(0, 0, N, N);
  // a little terraced house, warm light in the window
  g.fillStyle = '#6a3424'; g.fillRect(N * .15, N * .25, N * .7, N * .6);
  g.strokeStyle = 'rgba(30,10,5,.35)'; g.lineWidth = D; for (let y = N * .27; y < N * .85; y += N * .03) { g.beginPath(); g.moveTo(N * .15, y); g.lineTo(N * .85, y); g.stroke(); }
  g.fillStyle = '#2a2a30'; g.beginPath(); g.moveTo(N * .1, N * .26); g.lineTo(c, N * .1); g.lineTo(N * .9, N * .26); g.fill();
  const wl = .8 + .2 * Math.sin(now / 400);
  g.fillStyle = `rgba(255,200,110,${wl})`; g.fillRect(N * .22, N * .36, N * .2, N * .16); g.fillRect(N * .58, N * .36, N * .2, N * .16);
  g.strokeStyle = '#ddd'; g.lineWidth = 2 * D; [N * .22, N * .58].forEach(x => { g.strokeRect(x, N * .36, N * .2, N * .16); g.beginPath(); g.moveTo(x + N * .1, N * .36); g.lineTo(x + N * .1, N * .52); g.stroke(); });
  g.fillStyle = '#1d3a2a'; g.fillRect(N * .43, N * .6, N * .14, N * .25); g.fillStyle = '#d9b44a'; g.beginPath(); g.arc(N * .545, N * .73, N * .008, 0, TAU); g.fill();
  g.font = `700 ${N * .03}px ${LABEL_FONT}`; g.textAlign = 'center'; g.fillStyle = '#e8e2d0'; g.fillText("ZENA'S", c, N * .58);
  g.fillStyle = '#5a4a2a'; g.fillRect(N * .41, N * .86, N * .18, N * .035); g.font = `700 ${N * .018}px ${LABEL_FONT}`; g.fillStyle = '#d8cfa8'; g.fillText('NO PHELANS', c, N * .88);
  if (Z.wheel > 0) { g.fillStyle = `rgba(5,8,4,${.65 * Z.wheel})`; g.fillRect(0, 0, N, N); g.globalAlpha = Z.wheel; drawScaled(faces.phelanWheel, Z.rot, .7 + .3 * Z.wheel); drawPointer(faces.pointer, .7 + .3 * Z.wheel); g.globalAlpha = 1; }
  if (ghost) drawGhost();
  if (ghost && Z.say) bubble(g, Z.say, ghost.x, ghost.y - R * .22);
  g.restore();
}
async function phelanRevenge() {
  // he turns up in the pinball pit, laughing at the empty green chute
  Music.setMode('revenge'); playSfx('revenge');
  ghost = { x: N * 1.2, y: N * .4, a: .95, side: 1 }; Music.sting(2); buzz([30, 60, 30, 60, 30]);
  await animate(900, t => { ghost.x = lerp(N * 1.2, N * .62, easeOut(t)); draw(); });
  ghostSay = 'Not one in the green. My turn.';
  await animate(2400, t => { ghost.y = N * .4 - Math.abs(Math.sin(t * 20)) * N * .02; draw(); });
  ghostSay = '';
  setVerdict({ eyebrow: "Phelan's revenge", title: "Zena's house", body: '' });
  $('#caption').textContent = "Phelan's revenge";
  zena = { wheel: 0, rot: 0, say: '' };
  await crossTo(() => { scene = 'zena'; ghost.x = N * .28; ghost.y = N * .74; }, 1000);
  zena.say = "My sister's gaff. Wipe your feet."; draw(); await wait(2200); zena.say = '';
  // his wheel rises out of the dark, he grabs the rim and throws it
  const items = [...PHELAN_OPTS].sort(() => Math.random() - .5);
  if (!faces.phelanWheel || faces.phelanWheel.width !== N || zena.items !== items) faces.phelanWheel = buildPhelanWheel(items);
  zena.items = items;
  await animate(1000, t => { zena.wheel = easeOut(t); const a = .5; ghost.x = lerp(N * .28, c + Math.cos(a) * R, t); ghost.y = lerp(N * .74, c + Math.sin(a) * R, t); draw(); });
  $('#caption').textContent = "Phelan's wheel";
  const n = items.length, tg = target(n);
  await animate(800, t => { zena.rot = -Math.sin(t * Math.PI / 2) * .3; const a = zena.rot + .5; ghost.x = c + Math.cos(a) * R; ghost.y = c + Math.sin(a) * R; draw(); });
  whoosh(true); buzz([60]);
  const s0 = zena.rot, e0 = s0 + 6 * TAU + mod(-tg.a - s0, TAU);
  let lastS = sliceAt(s0, n), g0 = { x: ghost.x, y: ghost.y };
  await animate(7500, t => {
    zena.rot = s0 + (e0 - s0) * easeOut(t);
    if (t < .12) { const a = zena.rot + .5; ghost.x = c + Math.cos(a) * R; ghost.y = c + Math.sin(a) * R; g0 = { x: ghost.x, y: ghost.y }; }
    else { const u = Math.min(1, (t - .12) / .3); ghost.x = lerp(g0.x, N * .84, easeOut(u)); ghost.y = lerp(g0.y, N * .18, easeOut(u)); }
    const sl = sliceAt(zena.rot, n); if (sl !== lastS) { lastS = sl; tick(1, 1400); pegBuzz(); }
    draw();
  });
  zena.rot = mod(zena.rot, TAU); ting(); buzz([40, 50, 80]);
  const r = { ...items[tg.i], phelan: true };
  zena.say = pick(['Enjoy that, lads.', 'Revenge is sweet.', "That's for the room.", 'Zena says hi.']); draw();
  await wait(1500);
  return r;
}
