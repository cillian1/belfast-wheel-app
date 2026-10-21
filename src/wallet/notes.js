  // ---------- notes from the host (gifts and messages): a card that stays on screen until it's tapped away ----------
  // Owns host notes and gift notifications.
  let noteShowing = false;
  async function checkNotes() {
    const away = document.hidden;
    if (!W.user || noteShowing || (away && !(app && app.notifyNote))) return;
    try {
      const all = await db.get('notes/' + W.user); if (!all) return;
      const list = Object.entries(all).sort((x, y) => x[0] < y[0] ? -1 : 1);
      if (away) { // app in the background: a phone notification instead (once per note), the card waits for their return
        list.forEach(([id, n]) => { try { app.notifyNote(id, n.amt > 0 ? 'A gift from the host' : 'From the host', n.amt > 0 ? eur(n.amt) + (n.text ? ' · ' + n.text : '') : n.text || ''); } catch (e) {} });
        return;
      }
      const [id, n] = list[0];
      noteShowing = true;
      const box = el('div', 'wnote');
      box.innerHTML = `<small>${n.amt > 0 ? 'A gift from the host' : 'From the host'}</small>${n.amt > 0 ? `<b>${eur(n.amt)}</b>` : ''}${n.text ? `<p>${esc(n.text)}</p>` : ''}<button class="wbtn gold" type="button">Nice one</button>`;
      document.body.appendChild(box);
      try { navigator.vibrate && navigator.vibrate([40, 60, 40]); } catch (e) {}
      if (n.amt > 0) try { W.me = await db.get('users/' + W.user) || W.me; paint(); } catch (e) {}
      box.querySelector('button').onclick = async () => { box.remove(); try { await db.put('notes/' + W.user + '/' + id, null); } catch (e) {} noteShowing = false; checkNotes(); };
    } catch (e) { noteShowing = false; }
  }
  setInterval(checkNotes, 8000); setTimeout(checkNotes, 3000);

})();
