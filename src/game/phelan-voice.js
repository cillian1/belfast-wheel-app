// ---------- Phelan heckles out loud ----------
// Owns Phelan's spoken lines (browser speech only). Lines live in PHELAN_LINES so recordings could replace them later.
const PHELAN_LINES = {
  cameo: ['Hahah not so easy!', 'Whoops.', 'Welcome to the shop, lads.', 'Not one in the green. My turn.', 'Enjoy that, lads.', 'Revenge is sweet.', "That's for the room.", 'Zena says hi.', "Don't tell Mark.", 'Better than a toaster.', 'Boo. Did I scare you?', 'Mine now, thanks.', 'Ah here, who left that lying about?', 'I was only passing.'],
  near: ['So close. Not that close.', 'Ah, the edge of it. Cruel.', 'One slice. One. Sure look at you.', 'You could nearly smell it.', 'The wheel says no.', 'Mark would have got that.', 'Another inch and I would have cried.', 'Do you want a tissue or a hug?', 'Almost. Almost is not money.', 'Next time, maybe. Maybe not.', "That's a lovely wee near miss.", 'Phelan saw that.', 'The pointer got cold feet.', 'Even the wheel feels sorry for you.'],
  wince: ['Ugh.', 'Ah, no.', 'That stinks.'],
  cheer: ['WAHEY!', 'Get in!', 'Now that is a result!'],
};
// a tiny seeded generator of its own, so picking a heckle never touches Math.random() and the game's random order stays put
let phelanSeed = (Date.now() ^ 0x9e3779b9) >>> 0, phelanLastAt = -1e9, phelanDone = [], phelanSpeaking = false;
let phelanSongWait = null, phelanSongTimer = null, phelanNearMissRun = null;
function phelanRand() {
  phelanSeed = (phelanSeed + 0x6d2b79f5) >>> 0; let t = phelanSeed;
  t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61);
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
}
function phelanLine(kind) {
  const all = PHELAN_LINES[kind], fresh = all.filter(l => !phelanDone.includes(l)), from = fresh.length ? fresh : all;
  const l = from[Math.floor(phelanRand() * from.length)];
  phelanDone = phelanDone.concat(l).slice(-Math.floor(all.length / 2));
  return l;
}
function phelanStop() {
  clearInterval(phelanSongWait); phelanSongWait = null;
  clearTimeout(phelanSongTimer); phelanSongTimer = null;
  try { Music.stopCountrySong(); } catch (e) {}
  if (!phelanSpeaking) return;
  phelanSpeaking = false;
  try { window.speechSynthesis.cancel(); } catch (e) {}
  Music.duck(1);
}
// say a line out loud: at most one every 8 seconds, never over the verdict or anything already being read, and never when muted
function phelanSay(text) {
  try {
    const sy = window.speechSynthesis, now = performance.now();
    if (!sy || !text || Music.muted || now - phelanLastAt < 8000) return false;
    if (sy.speaking || sy.pending || $('.stage').classList.contains('done') || /^Final answer/.test($('#vEyebrow').textContent)) return false;
    if (!sayVoice) pickVoice();
    const u = new SpeechSynthesisUtterance(text);
    u.pitch = 2; u.rate = 1.35; u.volume = 1; u.lang = sayVoice ? sayVoice.lang : 'en-GB';
    if (sayVoice) u.voice = sayVoice;
    u.onstart = () => Music.duck(.25);
    u.onend = u.onerror = () => { phelanSpeaking = false; Music.duck(1); };
    phelanLastAt = now; phelanSpeaking = true; sy.speak(u);
    return true;
  } catch (e) { phelanSpeaking = false; return false; }
}
function phelanEuro(cents) { return '€' + (Math.max(0, Math.round(cents)) / 100).toFixed(2).replace(/\.00$/, ''); }
function phelanCountryDetails(o, run) {
  const eyebrow = String(o.eyebrow || ''), title = String(o.title || '');
  const amount = /^Final answer · €([\d.]+)/.exec(eyebrow) || (eyebrow === 'Final answer' && /^€([\d.]+)$/.exec(title));
  const parsedWon = amount ? Number(amount[1]) * 100 : 0, won = Number.isFinite(parsedWon) ? Math.round(parsedWon) : 0, stake = Number(run.stake);
  const room = ({ nested: 'main wheel', final: 'main wheel', god: 'God room', zena: "Phelan's wheel", pyramid: 'Pyramid', monster: 'Monster tank', farm: "Mark's farm", coaster: 'Chicken Race', intro: 'Stank Chamber', building: 'Stank Chamber', hall: 'Stank Chamber', roul: 'Stank Chamber', vault: 'Stank Chamber' })[scene] || 'the wheel';
  const near = phelanNearMissRun === run ? 'One slice off a hot prize, then the pointer said no.' : "No near miss came to soften the wheel's no.";
  return { run, stake, won, room, near };
}
function phelanCountryLines(d) {
  return [
    `Down the ${d.room} road, your wheel ran cold.`,
    `You staked ${phelanEuro(d.stake)} and brought home ${phelanEuro(d.won)}.`,
    `${phelanEuro(d.stake - d.won)} went west before the night was through.`,
    d.near,
    "Phelan's got a banjo for this hard-luck show.",
  ];
}
function phelanSingWhenQuiet(d, deadline = performance.now() + 20000) {
  if (!window.W || W.run !== d.run || d.run.live || Music.muted || !window.speechSynthesis) return;
  const sy = window.speechSynthesis;
  if (sy.speaking || sy.pending) {
    if (performance.now() >= deadline) { phelanSongTimer = null; return; }
    phelanSongTimer = setTimeout(() => phelanSingWhenQuiet(d, deadline), 250); return;
  }
  try {
    if (!Music.countrySong()) return;
    if (!sayVoice) pickVoice();
    const lines = phelanCountryLines(d); let left = lines.length;
    phelanSpeaking = true;
    phelanSongTimer = setTimeout(phelanStop, 15000);
    lines.forEach(line => {
      const u = new SpeechSynthesisUtterance(line);
      u.pitch = 2; u.rate = 1.35; u.volume = 1; u.lang = sayVoice ? sayVoice.lang : 'en-GB';
      if (sayVoice) u.voice = sayVoice;
      u.onstart = () => Music.duck(.25);
      u.onend = u.onerror = () => {
        if (--left <= 0) { phelanSpeaking = false; clearTimeout(phelanSongTimer); phelanSongTimer = null; Music.duck(1); Music.stopCountrySong(); }
      };
      sy.speak(u);
    });
  } catch (e) { phelanStop(); }
}
function phelanQueueCountry(o) {
  if (!/^Final answer/.test(String(o.eyebrow || '')) || !window.W || !W.run || !W.run.live) return;
  const details = phelanCountryDetails(o, W.run);
  clearInterval(phelanSongWait);
  phelanSongWait = setInterval(() => {
    if (!window.W || W.run !== details.run) { clearInterval(phelanSongWait); phelanSongWait = null; return; }
    if (details.run.live) return;
    clearInterval(phelanSongWait); phelanSongWait = null;
    if (details.stake > details.won && phelanRand() < 1 / 15 && !Music.muted) {
      phelanSongTimer = setTimeout(() => phelanSingWhenQuiet(details), 1500);
    }
  }, 100);
}
const phelanSetVerdict = setVerdict;
setVerdict = function (o) { const result = phelanSetVerdict(o); phelanQueueCountry(o); return result; };
const phelanSayNow = sayNow;
sayNow = function (lines) { if (phelanSpeaking) phelanStop(); return phelanSayNow(lines); };
const phelanGhostReact = ghostReact;
ghostReact = function (kind) {
  if (kind === 'wince' && window.W && W.run) phelanNearMissRun = W.run;
  return phelanGhostReact.apply(this, arguments);
};
window.addEventListener('wol-audio-preference-ready', () => {
  try { window.wolPref && window.wolPref.set('wol-phelan-voice', null); } catch (e) {}
});
