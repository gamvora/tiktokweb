const http = require('http');
const fs = require('fs');
const path = require('path');
const checkHandler = require('../api/check');
const liveHandler = require('../api/live');

const port = 8123;
const root = process.cwd();

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${port}`);
  if (url.pathname === '/api/check') return checkHandler(req, res);
  if (url.pathname === '/api/live') return liveHandler(req, res);

  let filePath = path.join(root, url.pathname === '/' ? 'index.html' : url.pathname);
  // rewrites
  if (url.pathname === '/overlay') filePath = path.join(root, 'index.html');
  if (url.pathname === '/admin') filePath = path.join(root, 'admin.html');

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.statusCode = 404;
      res.end('not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.setHeader('Content-Type', mime[ext] || 'application/octet-stream');
    res.end(data);
  });
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Smoke server: http://127.0.0.1:${port}/overlay?backend=&user=therealadhamyy`);
});
