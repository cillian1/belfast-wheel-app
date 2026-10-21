  // ---------- payouts: every prize the game shows is scaled to the stake (house keeps ~1%) ----------
  // Owns payout-value conversion and payment display helpers.
  // ev = the game's average base prize per paid spin (in game euros), measured by simulation.
  window.$m = function (v) {
    const s = W.run ? W.run.stake : W.stake;
    const c = Math.max(0, Math.round(+v * W.cfg.edge / W.cfg.ev * s));
    return (c / 100).toFixed(2).replace(/\.00$/, '');
  };
  W.payCents = v => Math.round(+v * 100);
