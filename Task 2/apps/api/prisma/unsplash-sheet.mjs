import { readFileSync, writeFileSync } from 'fs';
const c = JSON.parse(readFileSync('unsplash-cache.json', 'utf8'));
const qs = process.argv.slice(3);
const out = process.argv[2];
let html = '<body style="font:11px sans-serif;width:1500px">';
for (const q of qs) {
  html += `<h3 style="margin:8px 0 2px">${q}</h3><div style="display:flex;flex-wrap:wrap;gap:4px">`;
  (c[q] || []).slice(0, 24).forEach((p, i) => { html += `<div style="width:118px"><img src="${p.url}&w=240&h=300&fit=crop&q=60" style="width:118px;height:148px;object-fit:cover"><br>${i} ${(p.alt || '').slice(0, 22)}</div>`; });
  html += '</div>';
}
writeFileSync(out, html + '</body>');
