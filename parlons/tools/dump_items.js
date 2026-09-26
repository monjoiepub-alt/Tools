// Usage: node dump_items.js path/to/index.html out.json
// Lists every French text that needs audio and pronunciation help: {bundle, text}.
const fs = require('fs');
const [, , page = 'index.html', out = 'items.json'] = process.argv;
const s = fs.readFileSync(page, 'utf8');
let js = s.slice(s.indexOf('<script>') + 8, s.indexOf('</script>', s.indexOf('<script>')));
js = js.split('/* ============================================================\n   STATE')[0];
js += `
const seen = new Set(), list = [];
for (const id in ITEMS) {
  const it = ITEMS[id], text = spoken(it.fr), bundle = it.deck.id;
  if (seen.has(bundle + '\\n' + text)) continue;
  seen.add(bundle + '\\n' + text);
  list.push({bundle, text});
}
module.exports = {list, ITEMS, DECKS, DECK_ITEMS, LESSONS, SOUNDS, spansOf};`;
const m = {exports: {}};
new Function('module', 'require', js)(m, require);
if (require.main === module) { fs.writeFileSync(out, JSON.stringify(m.exports.list)); console.log(m.exports.list.length, 'texts'); }
else module.exports = m.exports;
