// ---------- read the moves out loud ----------
function logMove() {}
function spokenMoves(steps) { return steps.filter(s => !s.dest && !/^(Wild|Bonus|More|The God|Go back up)/.test(s.text)).map((s, i) => (i === 0 ? 'First, ' : 'Then, ') + s.text.toLowerCase()); }
// phones only allow speech once a tap has started it, so the first tap anywhere unlocks it with a silent line
let sayLast = null, sayVoice = null, sayUnlocked = false;
const sayBtn = $('#sayBtn');
function pickVoice() {
  const sy = window.speechSynthesis; if (!sy) return;
  const vs = sy.getVoices();
  sayVoice = vs.find(v => /en-IE/i.test(v.lang)) || vs.find(v => /en-GB/i.test(v.lang)) || vs.find(v => /^en/i.test(v.lang)) || null;
}
if (window.speechSynthesis) { pickVoice(); try { speechSynthesis.addEventListener('voiceschanged', pickVoice); } catch (e) {} }
function unlockSpeech() {
  if (sayUnlocked || !window.speechSynthesis) return;
  sayUnlocked = true;
  try { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); } catch (e) {}
}
['pointerdown', 'touchend', 'click', 'keydown'].forEach(ev => window.addEventListener(ev, unlockSpeech, { capture: true, passive: true }));
function sayNow(lines) {
  const sy = window.speechSynthesis;
  if (!sy) return false;
  sy.cancel(); try { sy.resume(); } catch (e) {}
  if (!sayVoice) pickVoice();
  let started = false, left = lines.length;
  lines.forEach(line => {
    const u = new SpeechSynthesisUtterance(line + '.');
    u.rate = .95; u.pitch = 1; u.volume = 1; u.lang = sayVoice ? sayVoice.lang : 'en-GB';
    if (sayVoice) u.voice = sayVoice;
    u.onstart = () => { started = true; Music.duck(.25); };
    u.onend = u.onerror = () => { if (--left <= 0) Music.duck(1); };
    sy.speak(u);
  });
  return () => started || sy.speaking;
}
// at the very end the wheel fades out and every direction from the run appears on top of it, then is read out
function showFinal(lines) {
  const list = $('#finalList'); list.textContent = '';
  lines.filter(l => !/^final answer$/i.test(l)).forEach((l, i) => {
    const li = document.createElement('li');
    const t = l.replace(/^(first|then),\s*/i, '');
    li.textContent = t.charAt(0).toUpperCase() + t.slice(1);
    li.style.animationDelay = (1.2 + i * .35) + 's';
    list.appendChild(li);
  });
  const fq = $('#finalQuote'); fq.className = 'fquote'; fq.innerHTML = '';
  const th = headThought(), b = document.createElement('b'); b.textContent = `From ${th.who}'s head`; fq.append(b, '“' + th.text + '”');
  fq.style.animationDelay = (1.6 + lines.length * .35) + 's';
  $('.stage').classList.add('done');
}
function hideFinal() { $('.stage').classList.remove('done'); }
function speak(lines) {
  showFinal(lines);
  sayLast = lines;
  sayBtn.hidden = false; sayBtn.textContent = 'Read it out';
  try {
    if (!window.speechSynthesis) { sayBtn.textContent = 'No voice on this browser'; return; }
    setTimeout(() => {
      if (sayLast !== lines) return;
      const ok = sayNow(lines);
      // if nothing has started after a moment, the phone blocked it: the button replays it from a tap, which always works
      setTimeout(() => { if (!ok()) { sayBtn.textContent = 'Tap to hear it'; sayBtn.classList.add('pulse'); } }, 1800);
    }, 1300);
  } catch (e) {}
}
sayBtn.addEventListener('click', () => { if (!sayLast) return; sayBtn.classList.remove('pulse'); sayBtn.textContent = 'Read it out'; try { sayNow(sayLast); } catch (e) {} });

