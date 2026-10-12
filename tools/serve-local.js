// Local route smoke testing without a framework. No mock statistics are injected.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.vtt': 'text/vtt', '.ico': 'image/x-icon', '.txt': 'text/plain', '.xml': 'application/xml' };
http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1:8002');
  const route = url.pathname === '/admin/analytics' ? '/api/admin-analytics' : url.pathname;
  if (/^\/api\/(analytics-config|analytics-collect|analytics-report|admin-analytics)$/.test(route)) {
    let body = '';
    for await (const chunk of req) { body += chunk; if (body.length > 1024) { res.writeHead(413).end(); return; } }
    req.body = body;
    req.query = Object.fromEntries(url.searchParams);
    res.status = code => { res.statusCode = code; return res; };
    res.send = value => res.end(value);
    res.json = value => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(value)); };
    try { await require(path.join(root, route + '.js'))(req, res); }
    catch { res.writeHead(500).end('Local function failed.'); }
    return;
  }
  let publicPath;
  try { publicPath = decodeURIComponent(url.pathname); } catch { res.writeHead(400).end(); return; }
  if (publicPath === '/') publicPath = '/index.html';
  if (!/^\/(?:[^/]+\.(?:html|css|js|txt|xml)|assets\/[^?]+)$/.test(publicPath)) { res.writeHead(404).end(); return; }
  const file = path.resolve(root, '.' + publicPath);
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  try {
    const stat = fs.statSync(file);
    if (!stat.isFile()) throw new Error();
    res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
    res.setHeader('Content-Length', stat.size);
    fs.createReadStream(file).pipe(res);
  } catch { res.writeHead(404).end(); }
}).listen(8002, '127.0.0.1', () => console.log('Local route preview: http://127.0.0.1:8002 (analytics defaults off)'));
