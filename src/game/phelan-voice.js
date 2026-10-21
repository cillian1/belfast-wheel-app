// ---------- Phelan heckles out loud ----------
// Owns Phelan's spoken lines (browser speech only). Lines live in PHELAN_LINES so recordings could replace them later.
const PHELAN_LINES = {
  cameo: ['Hahah, not so easy!', 'Whoops.', 'Welcome to the shop, lads.', 'Not one in the green. My turn.', 'Enjoy that, lads.', 'Revenge is sweet.', "That's for the room.", 'Zena says hi.', "Don't tell Mark.", 'Better than a toaster.', 'Boo. Did I scare you?', 'Mine now, thanks.', 'Ah here, who left that lying about?', 'I was only passing.'],
  near: ['So close. Not that close.', 'Ah, the edge of it. Cruel.', 'One slice. One. Sure look at you.', 'You could nearly smell it.', 'The wheel says no.', 'Mark would have got that.', 'Another inch and I would have cried.', 'Do you want a tissue or a hug?', 'Almost. Almost is not money.', 'Next time, maybe. Maybe not.', "That's a lovely wee near miss.", 'Phelan saw that.', 'The pointer got cold feet.', 'Even the wheel feels sorry for you.'],
};
// a tiny seeded generator of its own, so picking a heckle never touches Math.random() and the game's random order stays put
let phelanSeed = (Date.now() ^ 0x9e3779b9) >>> 0, phelanLastAt = -1e9, phelanOn = null, phelanDone = [];
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
function phelanVoiceOn() {
  if (phelanOn === null) { try { if (!window.wolPref) return true; phelanOn = window.wolPref.get('wol-phelan-voice') !== 'off'; } catch (e) { return true; } }
  return phelanOn;
}
// say a line out loud: at most one every 8 seconds, never over the verdict or anything already being read, and never when muted
function phelanSay(text) {
  try {
    const sy = window.speechSynthesis, now = performance.now();
    if (!sy || !text || !phelanVoiceOn() || Music.muted || now - phelanLastAt < 8000) return false;
    if (sy.speaking || sy.pending || $('.stage').classList.contains('done') || /^Final answer/.test($('#vEyebrow').textContent)) return false;
    if (!sayVoice) pickVoice();
    const u = new SpeechSynthesisUtterance(text);
    u.pitch = 2; u.rate = 1.35; u.volume = 1; u.lang = sayVoice ? sayVoice.lang : 'en-GB';
    if (sayVoice) u.voice = sayVoice;
    u.onstart = () => Music.duck(.25);
    u.onend = u.onerror = () => Music.duck(1);
    phelanLastAt = now; sy.speak(u);
    return true;
  } catch (e) { return false; }
}
const phelanBtn = $('#phelanBtn');
function paintPhelanButton() { const on = phelanVoiceOn(); phelanBtn.textContent = on ? 'Phelan voice on' : 'Phelan voice off'; phelanBtn.setAttribute('aria-pressed', on ? 'true' : 'false'); }
paintPhelanButton();
window.addEventListener('wol-audio-preference-ready', () => { phelanOn = null; paintPhelanButton(); });
phelanBtn.addEventListener('click', () => {
  phelanOn = !phelanVoiceOn();
  try { window.wolPref && window.wolPref.set('wol-phelan-voice', phelanOn ? 'on' : 'off'); } catch (e) {}
  if (!phelanOn) { try { speechSynthesis.cancel(); } catch (e) {} }
  paintPhelanButton();
});
