const http = require('node:http');
const { readFile } = require('node:fs/promises');
const path = require('node:path');

// Only these public files can be served. Source and configuration stay private.
const publicFiles = new Map([
  ['/our-story', { name: 'our-story.html', type: 'text/html; charset=utf-8' }],
  ['/our-story/', { name: 'our-story.html', type: 'text/html; charset=utf-8' }],
  ['/our-story.html', { name: 'our-story.html', type: 'text/html; charset=utf-8' }],
  ['/treatments', { name: 'treatments.html', type: 'text/html; charset=utf-8' }],
  ['/treatments/', { name: 'treatments.html', type: 'text/html; charset=utf-8' }],
  ['/treatments.html', { name: 'treatments.html', type: 'text/html; charset=utf-8' }],
  ['/pricing', { name: 'pricing.html', type: 'text/html; charset=utf-8' }],
  ['/pricing/', { name: 'pricing.html', type: 'text/html; charset=utf-8' }],
  ['/pricing.html', { name: 'pricing.html', type: 'text/html; charset=utf-8' }],
  ['/membership', { name: 'membership.html', type: 'text/html; charset=utf-8' }],
  ['/membership/', { name: 'membership.html', type: 'text/html; charset=utf-8' }],
  ['/membership.html', { name: 'membership.html', type: 'text/html; charset=utf-8' }],
  ['/gift-cards', { name: 'gift-cards.html', type: 'text/html; charset=utf-8' }],
  ['/gift-cards/', { name: 'gift-cards.html', type: 'text/html; charset=utf-8' }],
  ['/gift-cards.html', { name: 'gift-cards.html', type: 'text/html; charset=utf-8' }],
  ['/visit', { name: 'visit.html', type: 'text/html; charset=utf-8' }],
  ['/visit/', { name: 'visit.html', type: 'text/html; charset=utf-8' }],
  ['/visit.html', { name: 'visit.html', type: 'text/html; charset=utf-8' }],
  ['/booking', { name: 'booking.html', type: 'text/html; charset=utf-8' }],
  ['/booking/', { name: 'booking.html', type: 'text/html; charset=utf-8' }],
  ['/booking.html', { name: 'booking.html', type: 'text/html; charset=utf-8' }],

  ['/', { name: 'index.html', type: 'text/html; charset=utf-8' }],
  ['/index.html', { name: 'index.html', type: 'text/html; charset=utf-8' }],
  ['/thai-massage.jpg', { name: 'thai-massage.jpg', type: 'image/jpeg' }],
  ['/chair-massage.jpg', { name: 'chair-massage.jpg', type: 'image/jpeg' }],
  ['/white-lotus-massage.jpg', { name: 'white-lotus-massage.jpg', type: 'image/jpeg' }],
  ['/sitemap.xml', { name: 'sitemap.xml', type: 'application/xml; charset=utf-8' }],
  ['/robots.txt', { name: 'robots.txt', type: 'text/plain; charset=utf-8' }],
  ['/styles.css', { name: 'styles.css', type: 'text/css; charset=utf-8' }],
  ['/home-motion.js', { name: 'home-motion.js', type: 'text/javascript; charset=utf-8' }],
  ['/script.js', { name: 'script.js', type: 'text/javascript; charset=utf-8' }],
]);

const unfinishedPages = new Set(['booking.html', 'gift-cards.html', 'membership.html']);

const server = http.createServer(async (request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' });
    response.end();
    return;
  }

  let pathname;
  let search;
  try {
    const url = new URL(request.url, 'http://localhost');
    pathname = url.pathname;
    search = url.search;
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

  // Keep existing clean routes; pricing has moved into the treatment menu.
  const isHtml = file.type.startsWith('text/html');
  const canonicalPath = file.name === 'pricing.html' ? '/treatments'
    : file.name === 'index.html' ? '/'
    : isHtml ? '/' + file.name.replace(/\.html$/, '') : pathname;
  const target = canonicalPath + search + (file.name === 'pricing.html' ? '#massage' : '');

  // The hosting edge already enforces HTTPS. Only normalize the known www alias;
  // never trust forwarded headers or force HTTPS on local/preview environments.
  const hostname = (request.headers.host || '').toLowerCase().split(':')[0];
  const isWww = hostname === 'www.whitelotusspanj.com';
  if (isWww || pathname !== canonicalPath) {
    response.writeHead(301, {
      Location: isWww ? 'https://whitelotusspanj.com' + target : target,
    });
    response.end();
    return;
  }

  try {
    const content = await readFile(path.join(__dirname, file.name));
    response.writeHead(200, {
      'Content-Type': file.type,
      'Content-Length': content.length,
      'X-Content-Type-Options': 'nosniff',
      ...(unfinishedPages.has(file.name) ? { 'X-Robots-Tag': 'noindex, follow' } : {}),
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
  console.log(`Spa website listening on port ${server.address().port}`);
});


