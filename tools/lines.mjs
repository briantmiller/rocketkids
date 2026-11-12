// Collects every line the game can speak and writes voice/lines.json.
// Run from the project folder:  node tools/lines.mjs
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { CATALOG, COLORS, TABS, MISSIONS, GAMES } from '../js/data.js';

const files = ['js', 'js/screens', 'js/games'].flatMap(d => readdirSync(d).filter(f => f.endsWith('.js')).map(f => `${d}/${f}`))
  .filter(f => !/icons\.js|draw\.js|bg\.js|sim\.js|audio\.js/.test(f));
const lines = new Set();
const sentence = t => /^[A-Z]/.test(t) && !/[<>#{}=;]/.test(t) && t.length >= 3 && t.length < 220 && (/[.!?]$/.test(t)) ;
for (const f of files) {
  const src = readFileSync(f, 'utf8');
  const re = /'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"/g;
  let m;
  while ((m = re.exec(src))) {
    const t = (m[1] ?? m[2]).replace(/\\(['"\\])/g, '$1').trim();
    if (sentence(t)) lines.add(t);
  }
}
for (const cat of Object.keys(CATALOG)) for (const it of CATALOG[cat]) lines.add(it.name + '!');
for (const c of COLORS) lines.add(c.name + '!');
for (const t of TABS) lines.add(t.name);
for (const n of [2, 3, 4]) lines.add(`Room for ${n} stages!`);
for (const m of MISSIONS) { lines.add(m.intro); lines.add(m.win); }
for (const g of GAMES) lines.add(g.intro);
const out = [...lines].sort();
writeFileSync('voice/lines.json', JSON.stringify(out, null, 1));
console.log(out.length, 'lines');
