// Rewrites every prize the game shows or says so it goes through $m(), the wallet's payout formatter.
// The game file stays untouched; this runs at build time on a copy, so new versions can be dropped in.
//   '€' + v            ->  '€' + $m(v)
//   `€${v}` / `${v} euro` ->  `€${$m(v)}` / `${$m(v)} euro`
//   '€500' (prize text) ->  ('€' + $m(500))
// Question text that only mentions money (Mark's wheel lbl/t/b) is left alone.
import * as acorn from '/opt/node-tools/node_modules/acorn/dist/acorn.mjs';
import * as walk from '/opt/node-tools/node_modules/acorn-walk/dist/walk.mjs';

const SKIP_KEYS = new Set(['lbl', 't', 'b', 'text']);

export function moneyify(js) {
  const ast = acorn.parse(js, { ecmaVersion: 'latest', sourceType: 'script' });
  const edits = []; // [start, end, replacement]
  const wrap = n => { edits.push([n.start, n.start, '$m(']); edits.push([n.end, n.end, ')']); };
  const lit = s => /€\s?\d|\d+\s?euro|thousand euro/.test(s);
  const skipped = new Set();
  walk.full(ast, n => {
    // question data: { lbl: [...], t: '...', b: '...' }
    if (n.type === 'Property' && n.key && SKIP_KEYS.has(n.key.name || n.key.value)) {
      walk.full(n.value, m => skipped.add(m));
    }
  });
  walk.ancestor(ast, {
    TemplateLiteral(n) {
      // an amount worked out in code (`€${v}`) is always a prize, even inside a question's label
      n.expressions.forEach((e, i) => {
        const before = n.quasis[i].value.cooked || '', after = n.quasis[i + 1].value.cooked || '';
        if (/€$/.test(before) || /^ euro/.test(after) || (/^plus $/.test(before) && /^ from the roulette/.test(after))) wrap(e);
      });
      if (skipped.has(n)) return;
      n.quasis.forEach(q => {
        const raw = q.value.raw;
        if (/€\d/.test(raw)) {
          const out = raw.replace(/€(\d+)/g, (_, d) => '€${$m(' + d + ')}');
          edits.push([q.start, q.end, out]);
        }
      });
    },
    BinaryExpression(n) {
      if (n.operator !== '+' || skipped.has(n)) return;
      const l = n.left;
      const endsEuro = l.type === 'Literal' && typeof l.value === 'string' && /€$/.test(l.value)
        || l.type === 'TemplateLiteral' && /€$/.test(l.quasis[l.quasis.length - 1].value.cooked || '');
      if (endsEuro) wrap(n.right);
    },
    Literal(n, _, anc) {
      if (typeof n.value !== 'string' || skipped.has(n) || !lit(n.value)) return;
      const p = anc[anc.length - 2];
      if (p && (p.type === 'ImportDeclaration' || (p.type === 'Property' && p.key === n))) return;
      const parts = [];
      let rest = n.value, m;
      const re = /€(\d+)|a thousand euro/g; let last = 0;
      while ((m = re.exec(n.value))) {
        parts.push(JSON.stringify(n.value.slice(last, m.index)));
        parts.push(m[1] ? `'€' + $m(${m[1]})` : `$m(1000) + ' euro'`);
        last = re.lastIndex;
      }
      if (!parts.length) return;
      parts.push(JSON.stringify(n.value.slice(last)));
      edits.push([n.start, n.end, '(' + parts.join(' + ') + ')']);
    },
  });
  edits.sort((a, b) => b[0] - a[0] || b[1] - a[1]);
  let out = js;
  for (const [s, e, r] of edits) out = out.slice(0, s) + r + out.slice(e);
  return { js: out, count: edits.length };
}
