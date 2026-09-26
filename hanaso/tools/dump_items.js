// Usage: node dump_items.js path/to/index.html out.json
const fs = require('fs');
const [, , page = 'index.html', out = 'items.json'] = process.argv;
const s = fs.readFileSync(page, 'utf8');
let js = s.slice(s.indexOf('<script>') + 8, s.indexOf('</script>', s.indexOf('<script>')));
js = js.split('/* ============================================================\n   STATE')[0];
js += `
const kat = x => x.replace(/[ぁ-ゖ]/g, c => String.fromCharCode(c.charCodeAt(0) + 0x60));
const part = g => g.t === 'は' ? 'わ' : g.t === 'へ' ? 'え' : g.t;
const list = [];
for (const id in ITEMS) {
  const it = ITEMS[id];
  const text = it.kanji.replace(/[…「」]/g, '');
  const spoken = it.parsed ? it.parsed.flat().map(g => g.p ? part(g) : g.r ? kat(g.r) : g.t).join('').replace(/[…「」]/g, '') : it.kana;
  const ours = it.parsed ? it.parsed.flat().map(g => g.p ? part(g) : (g.r || g.t)).join('').replace(/[…「」]/g, '') : it.kana;
  list.push({bundle: it.loose ? 'say' : it.deck.id, text, spoken, ours});
}
module.exports = list;`;
const m = {exports: {}};
new Function('module', 'require', js)(m, require);
fs.writeFileSync(out, JSON.stringify(m.exports));
console.log(m.exports.length, 'phrases');
