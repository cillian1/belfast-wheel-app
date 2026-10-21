  // ---------- messages from watchers: Ghost Phelan carries them across, see-through so they don't get in the way ----------
  // Owns watcher messages and the Ghost Phelan overlay.
  let lastMsg = '', ghostSprite = null;
  function ghostImg() {
    if (ghostSprite) return ghostSprite;
    const k = document.createElement('canvas'); k.width = 180; k.height = 200;
    const keep = [ctx, ghost, R];
    try { ctx = k.getContext('2d'); ghost = { x: 90, y: 110, a: 1, side: 1 }; R = 300; drawGhost(); } catch (e) {}
    finally { ctx = keep[0]; ghost = keep[1]; R = keep[2]; }
    return (ghostSprite = k);
  }
  async function checkMsgs() {
    if (!W.user) return;
    try {
      const m = await db.get('live/' + W.user + '/msg');
      if (m && m.id && m.id !== lastMsg) { const first = !lastMsg; lastMsg = m.id; if (!first || now() - (m.at || 0) < 30000) showGhostMsg(m.from || 'Someone', m.text || ''); }
      else if (!lastMsg) lastMsg = '-';
    } catch (e) {}
  }
  function showGhostMsg(from, text) {
    const st = document.querySelector('.stage'); if (!st || !text) return;
    const box = el('div', 'wghost'), img = ghostImg();
    const k = document.createElement('canvas'); k.width = img.width; k.height = img.height; k.getContext('2d').drawImage(img, 0, 0);
    box.innerHTML = `<p><b>${esc(from)}</b> ${esc(text)}</p>`; box.prepend(k);
    st.appendChild(box);
    requestAnimationFrame(() => box.classList.add('in'));
    setTimeout(() => { box.classList.remove('in'); box.classList.add('out'); }, 5200);
    setTimeout(() => box.remove(), 6400);
  }
