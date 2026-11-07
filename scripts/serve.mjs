// Tiny static server for local verification (mimics Cloudflare Pages: /dir -> /dir/index.html, extensionless AASA as JSON).
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
const dir = join(process.cwd(), process.argv[2] ?? 'dist'); const port = Number(process.argv[3] ?? 8788);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
// Apply dist/_headers like Cloudflare Pages does (path patterns with *, rules merge).
const rules = []; { let cur = null; for (const line of readFileSync(join(dir, '_headers'), 'utf8').split('\n')) {
  if (!line.trim() || line.trim().startsWith('#')) continue;
  if (!/^\s/.test(line)) { cur = { re: new RegExp('^' + line.trim().replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$'), h: {} }; rules.push(cur); }
  else { const i = line.indexOf(':'); cur.h[line.slice(0, i).trim()] = line.slice(i + 1).trim(); } } }
createServer(async (req, res) => {
  let p = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
  let f = join(dir, p);
  try { if ((await stat(f)).isDirectory()) f = join(f, 'index.html'); } catch { /* fallthrough */ }
  try { const b = await readFile(f); const h = { 'Content-Type': types[extname(f)] ?? 'application/json' }; for (const r of rules) if (r.re.test(new URL(req.url, 'http://x').pathname)) Object.assign(h, r.h); res.writeHead(200, h); res.end(b); }
  catch { res.writeHead(404); res.end('not found'); }
}).listen(port, () => console.log('serving', dir, 'on', port));
