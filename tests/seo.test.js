const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');

const canonicalOrigin = 'https://whitelotusspanj.com';
const indexable = ['/', '/our-story', '/treatments', '/visit'];
const unfinished = ['/booking', '/gift-cards', '/membership'];
let server;
let origin;

before(async () => {
  server = spawn(process.execPath, ['server.js'], {
    cwd: path.join(__dirname, '..'), env: { ...process.env, PORT: '0' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  origin = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Server startup timed out')), 10000);
    server.once('error', reject);
    server.once('exit', code => { clearTimeout(timer); reject(new Error(`Server exited: ${code}`)); });
    server.stdout.on('data', chunk => {
      const port = chunk.toString().match(/port (\d+)/)?.[1];
      if (port) { clearTimeout(timer); resolve(`http://127.0.0.1:${port}`); }
    });
  });
});
after(() => server?.kill());

// Use node:http so Host-header cases exercise real alias routing, not fetch's
// restricted-header handling. Redirects are deliberately not followed.
const request = (route, options = {}) => new Promise((resolve, reject) => {
  const req = require('node:http').request(new URL(route, origin), options, response => {
    const chunks = [];
    response.on('data', chunk => chunks.push(chunk));
    response.on('end', () => resolve({
      status: response.statusCode,
      headers: new Headers(response.headers),
      text: async () => Buffer.concat(chunks).toString('utf8'),
    }));
  });
  req.on('error', reject);
  req.end();
});
const attribute = (tag, name) => tag.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];
const meta = (html, key) => {
  const tag = [...html.matchAll(/<meta\b[^>]*>/g)].map(match => match[0])
    .find(tag => attribute(tag, 'name') === key || attribute(tag, 'property') === key);
  return tag && attribute(tag, 'content');
};

test('sitemap contains only complete, canonical pages and robots allows crawling', async () => {
  const response = await request('/sitemap.xml');
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /application\/xml/);
  const xml = await response.text();
  assert.match(xml, /^<\?xml version="1.0" encoding="UTF-8"\?>/);
  assert.match(xml, /xmlns="http:\/\/www.sitemaps.org\/schemas\/sitemap\/0.9"/);
  const locations = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
  assert.deepEqual(locations.sort(), indexable.map(route => canonicalOrigin + route).sort());
  const robots = await request('/robots.txt');
  assert.equal(robots.status, 200);
  assert.match(robots.headers.get('content-type'), /text\/plain/);
  const text = await robots.text();
  assert.match(text, /User-agent: \*\nAllow: \/\n/);
  assert.match(text, /Sitemap: https:\/\/whitelotusspanj.com\/sitemap.xml/);
  assert.doesNotMatch(text, /Disallow:/);
});

test('pages render content, unique SEO metadata and intentional indexability without JS', async () => {
  const titles = new Set(), descriptions = new Set();
  for (const route of [...indexable, ...unfinished]) {
    const response = await request(route);
    assert.equal(response.status, 200, route);
    const html = await response.text();
    const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
    const description = meta(html, 'description');
    assert.ok(title && description, route);
    assert.ok(!titles.has(title) && !descriptions.has(description), route);
    titles.add(title); descriptions.add(description);
    assert.equal((html.match(/rel="canonical"/g) || []).length, 1);
    assert.ok(html.includes(`rel="canonical" href="${canonicalOrigin + route}"`));
    assert.equal(meta(html, 'og:url'), canonicalOrigin + route);
    assert.equal(meta(html, 'og:title'), title);
    assert.equal(meta(html, 'og:description'), description);
    assert.equal(meta(html, 'twitter:card'), 'summary_large_image');
    const image = new URL(meta(html, 'og:image'));
    assert.equal((await request(image.pathname)).status, 200);
    assert.equal((html.match(/<h1(?:\s|>)/g) || []).length, 1, route);
    assert.ok(html.match(/<main[\s\S]*?<\/main>/)?.[0].length > 500, route);
    assert.doesNotMatch(html, /Template|Design preview|Sample content/);
    if (indexable.includes(route)) {
      assert.doesNotMatch(meta(html, 'robots'), /noindex/);
      assert.equal(response.headers.get('x-robots-tag'), null);
    } else {
      assert.equal(meta(html, 'robots'), 'noindex, follow');
      assert.equal(response.headers.get('x-robots-tag'), 'noindex, follow');
    }
  }
});

test('all internal links, fragment targets and local assets resolve', async () => {
  for (const route of [...indexable, ...unfinished]) {
    const html = await (await request(route)).text();
    for (const match of html.matchAll(/\b(?:href|src|action)="([^"]+)"/g)) {
      const url = new URL(match[1].replaceAll('&amp;', '&'), origin + route);
      if (url.origin !== origin) continue;
      const response = await request(url.pathname + url.search);
      assert.equal(response.status, 200, `${route}: ${url.pathname}`);
      if (url.hash) assert.ok((await response.text()).includes(`id="${decodeURIComponent(url.hash.slice(1))}"`), url.href);
    }
    for (const [tag] of html.matchAll(/<img\b[^>]*>/g)) {
      assert.notEqual(attribute(tag, 'alt'), undefined);
      assert.equal(attribute(tag, 'decoding'), 'async');
      assert.ok(attribute(tag, 'width') && attribute(tag, 'height'), tag);
    }
  }
});

test('legacy, pricing and www redirects preserve query selections without loops', async () => {
  const query = '?treatment=lotus-serenity-massage%3A60&collection=in-store';
  for (const route of [...indexable, ...unfinished]) {
    const legacy = route === '/' ? '/index.html' : route + '.html';
    const response = await request(legacy + query);
    assert.equal(response.status, 301);
    assert.equal(response.headers.get('location'), route + query);
    const head = await request(legacy, { method: 'HEAD' });
    assert.equal(head.status, 301);
    assert.equal(await head.text(), '');
    if (route !== '/') assert.equal((await request(route + '/')).headers.get('location'), route);
    const www = await request(legacy + query, { headers: { host: 'www.whitelotusspanj.com' } });
    assert.equal(www.status, 301);
    assert.equal(www.headers.get('location'), canonicalOrigin + route + query);
  }
  for (const route of ['/pricing', '/pricing/', '/pricing.html']) {
    const response = await request(route + query);
    assert.equal(response.status, 301);
    assert.equal(response.headers.get('location'), '/treatments' + query + '#massage');
  }
  for (const host of ['whitelotusspanj.com', 'localhost', 'preview.example.com']) {
    assert.equal((await request('/', { headers: { host, 'x-forwarded-proto': 'http' } })).status, 200);
  }
});

test('private files and unknown routes stay unavailable; HEAD and method handling work', async () => {
  for (const route of ['/missing', '/missing.html', '/server.js', '/package.json', '/tests/seo.test.js', '/SEO-AUDIT.md']) {
    assert.equal((await request(route)).status, 404, route);
  }
  assert.equal((await request('/', { method: 'POST' })).status, 405);
  for (const route of ['/', '/treatments', '/sitemap.xml', '/robots.txt']) {
    const response = await request(route, { method: 'HEAD' });
    assert.equal(response.status, 200);
    assert.equal(await response.text(), '');
  }
});

test('business schema uses supplied details and only actual service categories', async () => {
  const html = await (await request('/')).text();
  const schemas = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  assert.equal(schemas.length, 1);
  const spa = JSON.parse(schemas[0][1]);
  assert.equal(spa['@type'], 'DaySpa');
  assert.equal(spa.name, 'White Lotus Day Spa');
  assert.equal(spa.telephone, '+12018853755');
  assert.equal(spa.url, canonicalOrigin + '/');
  assert.equal(spa.address.streetAddress, '70 Kinderkamack Road');
  assert.equal(spa.address.addressLocality, 'Emerson');
  assert.equal(spa.address.postalCode, '07630');
  for (const field of ['openingHours', 'openingHoursSpecification', 'aggregateRating', 'review', 'sameAs']) assert.equal(spa[field], undefined);
  const treatments = await (await request('/treatments')).text();
  for (const offer of spa.hasOfferCatalog.itemListElement) {
    const url = new URL(offer.itemOffered.url);
    assert.equal(url.origin, canonicalOrigin);
    assert.ok(treatments.includes(`id="${url.hash.slice(1)}"`));
  }
  const visit = await (await request('/visit')).text();
  assert.match(visit, /70 Kinderkamack Road/);
  assert.match(visit, /tel:\+12018853755/);
  assert.doesNotMatch(visit, /To be confirmed|coming soon|will appear here/);
  assert.match(await (await request('/booking')).text(), /does not reserve an appointment/);
  assert.match(await (await request('/gift-cards')).text(), /does not place an order/);
});
