function tank(w, b, roll, levels, specialSides = 20) {
  let total = 0, cans = 0;
  for (let i = 0; i < 10; i++) { const face = 1 + roll(12); cans += face; total += face; }
  const specialDice = w + Math.max(0, b - 3);
  for (let i = 0; i < specialDice; i++) { const face = 1 + roll(specialSides); cans += face; total += 2 * face; }
  let v = levels[0][1];
  for (const [at, value] of levels) if (total >= at) v = value;
  return { v, total, cans };
}

module.exports = { tank };
