// Caches Unsplash search results to disk (free key = 50 requests/hour). usage: UNSPLASH_KEY=... node prisma/unsplash-search.mjs "query" ...
import { readFileSync, writeFileSync, existsSync } from 'fs';
const KEY = process.env.UNSPLASH_KEY;
const FILE = process.env.CACHE || 'unsplash-cache.json';
const cache = existsSync(FILE) ? JSON.parse(readFileSync(FILE, 'utf8')) : {};
for (const q of process.argv.slice(2)) {
  if (cache[q]) continue;
  const r = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&per_page=30&content_filter=high`, { headers: { Authorization: `Client-ID ${KEY}` } });
  if (!r.ok) { console.log('STOP', r.status, q, 'remaining', r.headers.get('x-ratelimit-remaining')); break; }
  const j = await r.json();
  cache[q] = j.results.map((p) => ({ id: p.id, w: p.width, h: p.height, alt: p.alt_description, desc: p.description, url: p.urls.raw, dl: p.links.download_location, by: p.user.name, byUrl: p.user.links.html, likes: p.likes }));
  writeFileSync(FILE, JSON.stringify(cache));
  console.log('ok', q.padEnd(34), cache[q].length, 'remaining', r.headers.get('x-ratelimit-remaining'));
}
