const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const DIR = __dirname;
const CHAMPION_FILE = path.join(DIR, 'highest_fish.json');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
}

const server = http.createServer((req, res) => {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // API Endpoints for champion fish persistence in files
  if (pathname === '/api/highest-fish') {
    if (req.method === 'GET') {
      if (fs.existsSync(CHAMPION_FILE)) {
        try {
          const content = fs.readFileSync(CHAMPION_FILE, 'utf8');
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(content);
          return;
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
          return;
        }
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'No champion saved yet' }));
        return;
      }
    } else if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          fs.writeFileSync(CHAMPION_FILE, JSON.stringify(data, null, 2), 'utf8');
          console.log(`[FishSaver] Dynamically saved highest generation fish (Gen ${data.gen}) to highest_fish.json`);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, gen: data.gen }));
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON body' }));
        }
      });
      return;
    }
  }

  // Static file serving
  let targetFile = pathname === '/' ? 'index.html' : pathname.replace(/^\//, '');
  let filePath = path.normalize(path.join(DIR, targetFile));

  // Guard against directory traversal
  if (!filePath.startsWith(DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(`🐟 Magikarp Aquarium Server running!`);
  console.log(`URL: http://localhost:${PORT}/index.html`);
  console.log(`Highest fish file: ${CHAMPION_FILE}`);
  console.log(`=================================================`);
  if (!process.env.NO_AUTO_OPEN) {
    exec(`start http://localhost:${PORT}/index.html`);
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`Port ${PORT} is already in use. Opening browser...`);
    if (!process.env.NO_AUTO_OPEN) {
      exec(`start http://localhost:${PORT}/index.html`);
    }
  } else {
    console.error('Server error:', err);
  }
});
