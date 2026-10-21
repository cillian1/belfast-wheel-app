  // ---------- withdraw (request goes to the host screen; Cillian pays on Revolut) ----------
  function withdrawSheet() {
    const me = W.me;
    if (isTest()) return toast('Test account money is not real, so it cannot be withdrawn.');
    const p = openSheet(`<h3>Withdraw</h3>
      <p>Your balance is <b>${eur(me.balance || 0)}</b>. It stays pending until Cillian sends it to your Revolut.</p>
      <input id="wAmt" inputmode="decimal" placeholder="Amount, e.g. 10">
      <input id="wTag" placeholder="Your Revolut @username" value="${esc(me.revtag || '')}">
      <p class="err" id="wErr"></p>
      <div class="wrow"><button class="wbtn gold" id="wGo" type="button">Request withdrawal</button><button class="wbtn" id="wAll" type="button">All of it</button></div>
      <button class="wlink" type="button" id="wClose">Close</button>`);
    $w('wAll').onclick = () => { $w('wAmt').value = ((me.balance || 0) / 100).toFixed(2); };
    $w('wClose').onclick = closeSheet;
    $w('wGo').onclick = async () => {
      const a = Math.round(parseFloat($w('wAmt').value.replace(',', '.')) * 100), tag = $w('wTag').value.trim().replace(/^@/, '');
      if (!(a > 0)) return ($w('wErr').textContent = 'Type an amount.');
      if (!tag) return ($w('wErr').textContent = 'Add your Revolut @username so Cillian knows where to send it.');
      try {
        let short = false;
        const u = await db.txn('users/' + W.user, u => { if ((u.balance || 0) < a) { short = true; return undefined; } u.balance -= a; u.revtag = tag; return u; });
        if (short) { W.me = u; paint(); return ($w('wErr').textContent = 'That is more than your balance.'); }
        W.me = u; paint();
        await db.push('reqs', { user: W.user, name: u.name, kind: 'withdraw', a, tag, at: now(), status: 'pending' });
        log(W.user, 'withdraw', -a, { what: 'to @' + tag });
        closeSheet(); toast('Withdrawal of ' + eur(a) + ' pending. Cillian will send it to @' + tag + '.', true);
      } catch (e) { $w('wErr').textContent = 'No connection. Try again.'; }
    };
  }

