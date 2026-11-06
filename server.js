const http = require('node:http');
const { readFile } = require('node:fs/promises');
const path = require('node:path');

// Only these public files can be served. Source and configuration stay private.
const publicFiles = new Map([
  ['/', { name: 'index.html', type: 'text/html; charset=utf-8' }],
  ['/index.html', { name: 'index.html', type: 'text/html; charset=utf-8' }],
  ['/styles.css', { name: 'styles.css', type: 'text/css; charset=utf-8' }],
  ['/script.js', { name: 'script.js', type: 'text/javascript; charset=utf-8' }],
]);

const server = http.createServer(async (request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' });
    response.end();
    return;
  }

  let pathname;
  try {
    pathname = new URL(request.url, 'http://localhost').pathname;
  } catch {
    response.writeHead(400);
    response.end();
    return;
  }

  const file = publicFiles.get(pathname);
  if (!file) {
    response.writeHead(404);
    response.end(request.method === 'HEAD' ? undefined : 'Not found');
    return;
  }

  try {
    const content = await readFile(path.join(__dirname, file.name));
    response.writeHead(200, {
      'Content-Type': file.type,
      'Content-Length': content.length,
      'X-Content-Type-Options': 'nosniff',
    });
    response.end(request.method === 'HEAD' ? undefined : content);
  } catch (error) {
    console.error('Could not serve public file:', error.message);
    response.writeHead(500);
    response.end();
  }
});

// Hosting providers supply PORT; use 3000 when running locally.
const port = Number(process.env.PORT || 3000);
server.listen(port, '0.0.0.0', () => {
  console.log(`Spa website listening on port ${port}`);
});
