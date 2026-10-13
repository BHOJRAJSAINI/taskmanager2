'use strict';
// Plain Node server (VPS / local): static frontend + POST /api/rpc
try { require('fs').readFileSync('.env', 'utf8').split('\n').forEach((l) => { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, ''); }); } catch (e) {}
process.env.TZ = process.env.APP_TIMEZONE || 'Asia/Kolkata';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { handleRpc } = require('./lib/rpc-handler');

const PUB = path.join(__dirname, 'public');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.json': 'application/json' };

http.createServer((req, res) => {
  const url = (req.url || '/').split('?')[0];
  if (url === '/api/rpc') {
    if (req.method !== 'POST') { res.writeHead(405); return res.end(); }
    const chunks = []; let size = 0;
    req.on('data', (c) => { size += c.length; if (size > 6e6) { req.destroy(); } else chunks.push(c); });
    req.on('end', async () => {
      let body = null; try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch (e) {}
      const { status, json } = await handleRpc(body);
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify(json));
    });
    return;
  }
  const rel = url === '/' ? 'index.html' : decodeURIComponent(url).replace(/^\/+/, '');
  const file = path.join(PUB, rel);
  if (!file.startsWith(PUB + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end('Not found'); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}).listen(process.env.PORT || 3000, () => console.log('Task Manager on :' + (process.env.PORT || 3000)));
