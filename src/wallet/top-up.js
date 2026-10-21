  // ---------- top up (player pays Cillian on Revolut and confirms; the host page can reverse) ----------
  function topupSheet(msg) {
    if (!W.me) return showLogin();
    if (isTest()) {
      openSheet(`<h3>Play money</h3>${msg ? `<p class="err">${esc(msg)}</p>` : ''}<p>This is the test account. Its money is not real, so top it up for free.</p>
        <button class="wbtn gold" id="wPlay" type="button">Add €50 play money</button><button class="wlink" type="button" id="wClose">Close</button>`);
      $w('wPlay').onclick = async () => { try { W.me = await db.txn('users/' + W.user, u => { u.balance = (u.balance || 0) + 5000; return u; }); paint(); closeSheet(); toast('€50 play money added'); } catch (e) { toast('No connection'); } };
      $w('wClose').onclick = closeSheet;
      return;
    }
    openSheet(`<h3>Top up</h3>
      ${msg ? `<p class="err">${esc(msg)}</p>` : ''}
      <p>Send any amount from €1 to <b>@${esc(CFG.revolut)}</b> on Revolut. When you come back, confirm what you sent and it goes straight on your balance.</p>
      <button class="wbtn gold" id="wRev" type="button">Open Revolut</button>
      <button class="wlink" type="button" id="wPaid">I've already paid</button>
      <button class="wlink" type="button" id="wClose">Close</button>`);
    $w('wRev').onclick = () => {
      const url = 'https://revolut.me/' + CFG.revolut;
      confirmSheet(); // already waiting when they come back from Revolut
      if (app) app.openUrl(url); else window.open(url, '_blank');
    };
    $w('wPaid').onclick = confirmSheet;
    $w('wClose').onclick = closeSheet;
  }
  // back from Revolut: the player says what they sent and it is credited at once
  function confirmSheet() {
    if (!W.me) return showLogin();
    let amt = 0;
    const p = openSheet(`<h3>Confirm money sent</h3>
      <p>How much did you send to @${esc(CFG.revolut)}?</p>
      <div class="wrow" id="wAmts">${[100, 200, 500, 1000, 2000].map(a => `<button class="wbtn" type="button" data-a="${a}">${eur(a)}</button>`).join('')}</div>
      <input id="wAmt" inputmode="decimal" placeholder="Other amount, e.g. 7.50">
      <p class="err" id="wErr"></p>
      <button class="wbtn gold" id="wSent" type="button">Confirm money sent</button>
      <button class="wlink" type="button" id="wClose">I didn't send anything</button>`);
    const sel = a => { amt = a; p.querySelectorAll('#wAmts button').forEach(b => b.classList.toggle('sel', +b.dataset.a === a)); $w('wSent').textContent = a ? 'Confirm ' + eur(a) + ' sent' : 'Confirm money sent'; };
    p.querySelectorAll('#wAmts button').forEach(b => b.onclick = () => { $w('wAmt').value = ''; sel(+b.dataset.a); });
    $w('wAmt').oninput = () => { const v = Math.round(parseFloat($w('wAmt').value.replace(',', '.')) * 100); sel(v > 0 ? v : 0); };
    $w('wClose').onclick = closeSheet;
    $w('wSent').onclick = async () => {
      if (!amt) return ($w('wErr').textContent = 'Pick or type the amount you sent.');
      if (amt < MIN_TOPUP) return ($w('wErr').textContent = 'The minimum top-up is €1.');
      try {
        const u = await db.txn('users/' + W.user, u => { u.balance = (u.balance || 0) + amt; u.topped = (u.topped || 0) + amt; return u; });
        W.me = u; paint();
        await db.push('reqs', { user: W.user, name: u.name, kind: 'topup', a: amt, at: now(), status: 'credited' });
        log(W.user, 'topup', amt, { what: 'Revolut' });
        closeSheet(); toast(eur(amt) + ' added. Good luck!', true);
      } catch (e) { $w('wErr').textContent = 'No connection. Try again.'; }
    };
  }

