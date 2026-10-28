const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

// Run this audit with Node.js 24+, which can load the owner-editable TypeScript data.
assert(Number(process.versions.node.split('.')[0]) >= 24, 'The export audit requires Node.js 24 or later.');
const { yogaProgrammes: programmes, yogaSettings, yogaPath: yogaBase } = require('../lib/yoga-programmes.ts');
const root = path.resolve(__dirname, '../out');
assert(programmes.length > 0, 'The yoga programme catalogue is empty.');
assert.equal(new Set(programmes.map(programme => programme.slug)).size, programmes.length, 'Duplicate programme slugs in the catalogue.');
const routes = [
  '/', '/about/', '/contact/', '/partnerships/', '/privacy/',
  ...['yoga-wellness', 'skill-development', 'agriculture-livelihoods', 'csr-project-implementation', 'consultancy', 'food-products'].map(slug => '/businesses/' + slug + '/'),
  ...programmes.map(programme => yogaBase + programme.slug + '/'),
];

function decode(value) {
  return value.replace(/&(?:amp|quot|apos|lt|gt|#39|#x27|#\d+|#x[\da-f]+);/gi, entity => {
    const known = { '&amp;': '&', '&quot;': '"', '&apos;': "'", '&lt;': '<', '&gt;': '>', '&#39;': "'", '&#x27;': "'" };
    if (known[entity.toLowerCase()]) return known[entity.toLowerCase()];
    const numeric = entity.slice(2, -1);
    return String.fromCodePoint(numeric[0].toLowerCase() === 'x' ? parseInt(numeric.slice(1), 16) : parseInt(numeric, 10));
  });
}

function attrs(tag) {
  const values = {};
  for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) values[match[1].toLowerCase()] = decode(match[2] ?? match[3]);
  return values;
}

function visibleText(html) {
  return decode(html.replace(/<!--[^]*?-->/g, '').replace(/<(script|style|head)\b[^>]*>[^]*?<\/\1>/gi, '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function localTarget(url) {
  const file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
  assert(file === root || file.startsWith(root + path.sep), 'Asset escapes export directory: ' + url.pathname);
  return url.pathname.endsWith('/') ? path.join(file, 'index.html') : file;
}

let links = 0, images = 0, cssAssets = 0;
const titles = new Set(), descriptions = new Set(), pages = new Map();
const forbiddenReadiness = /\b(?:initial active vertical|planned vertical|emerging vertical|emerging business|planned capability|coming soon|yet to launch|under development|future product|future business|inactive vertical)\b/i;

for (const route of routes) {
  const html = fs.readFileSync(path.join(root, route, 'index.html'), 'utf8');
  const text = visibleText(html);
  pages.set(route, { html, text });
  const title = decode(html.match(/<title>([^]*?)<\/title>/i)?.[1] || '');
  assert(title, 'Missing title: ' + route);
  assert(!titles.has(title), 'Duplicate title: ' + route);
  titles.add(title);
  const meta = [...html.matchAll(/<meta\b[^>]*>/gi)].map(match => attrs(match[0]));
  const description = meta.find(tag => tag.name === 'description')?.content;
  assert(description, 'Missing description: ' + route);
  assert(!descriptions.has(description), 'Duplicate description: ' + route);
  descriptions.add(description);
  assert.equal((html.match(/<h1\b/gi) || []).length, 1, 'Exactly one H1 required: ' + route);
  for (const landmark of ['header', 'main', 'footer']) assert(new RegExp('<' + landmark + '\\b', 'i').test(html), 'Missing ' + landmark + ': ' + route);
  const canonicalTag = [...html.matchAll(/<link\b[^>]*>/gi)].map(match => attrs(match[0])).find(tag => tag.rel === 'canonical');
  assert(canonicalTag?.href, 'Missing canonical: ' + route);
  const canonical = new URL(canonicalTag.href);
  assert.equal(canonical.protocol, 'https:', 'Canonical must use HTTPS: ' + route);
  assert.equal(canonical.pathname, route, 'Canonical targets a different page: ' + route);
  assert(meta.some(tag => tag.property === 'og:title' && tag.content), 'Missing Open Graph title: ' + route);
  assert(meta.some(tag => tag.property === 'og:description' && tag.content), 'Missing Open Graph description: ' + route);
  assert(meta.some(tag => tag.name === 'twitter:card' && tag.content), 'Missing social card metadata: ' + route);
  assert(!forbiddenReadiness.test(text), 'Public business readiness language remains on ' + route + ': ' + text.match(forbiddenReadiness)?.[0]);
  assert(!/LOGO PLACEHOLDER/.test(text), 'Logo placeholder remains: ' + route);

  for (const match of html.matchAll(/<(?:a|link)\b[^>]*>/gi)) {
    const tag = attrs(match[0]);
    if (!tag.href) continue;
    assert(tag.href !== '#', 'Dead placeholder link on ' + route);
    const url = new URL(tag.href, 'https://export.invalid' + route);
    if (url.origin !== 'https://export.invalid') continue;
    const target = localTarget(url);
    assert(fs.existsSync(target), 'Broken internal link: ' + route + ' -> ' + tag.href);
    if (url.hash && target.endsWith('.html')) {
      const targetHtml = fs.readFileSync(target, 'utf8');
      const ids = new Set([...targetHtml.matchAll(/\bid="([^"]+)"/g)].map(value => decode(value[1])));
      assert(ids.has(decodeURIComponent(url.hash.slice(1))), 'Missing anchor: ' + route + ' -> ' + tag.href);
    }
    links++;
  }

  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = attrs(match[0]);
    assert('alt' in tag, 'Image missing alt attribute: ' + route);
    assert(tag.src, 'Image missing source: ' + route);
    const url = new URL(tag.src, 'https://export.invalid' + route);
    if (url.origin === 'https://export.invalid') assert(fs.existsSync(localTarget(url)), 'Broken image: ' + route + ' -> ' + tag.src);
    images++;
  }
  assert(/<img\b[^>]*src="[^"]*bhramari-logo\.(?:jpg|png|webp|svg)"/i.test(html), 'Supplied logo missing: ' + route);

  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(match => decode(match[1])));
  for (const match of html.matchAll(/<svg\b[^>]*>/gi)) {
    const tag = attrs(match[0]);
    if (tag['aria-hidden'] === 'true') continue;
    if (tag.role === 'img') {
      assert(tag['aria-label'] || tag['aria-labelledby'], 'Illustration has no accessible name: ' + route);
      for (const id of (tag['aria-labelledby'] || '').split(/\s+/).filter(Boolean)) assert(ids.has(id), 'Missing illustration label: ' + route + ' -> ' + id);
    }
  }
}

const yoga = pages.get(yogaBase);
for (const programme of programmes) {
  const route = yogaBase + programme.slug + '/';
  const page = pages.get(route);
  if (programme.image?.src) {
    const hasImage = html => [...html.matchAll(/<img\b[^>]*>/gi)].some(match => attrs(match[0]).src === programme.image.src);
    assert(hasImage(page.html), 'Configured programme image missing: ' + route);
    assert(hasImage(yoga.html), 'Configured programme poster image missing: ' + route);
  } else {
    const hasPose = html => [...html.matchAll(/<svg\b[^>]*>/gi)].some(match => attrs(match[0])['data-yoga-pose'] === programme.illustration);
    assert(hasPose(page.html), 'Configured programme illustration missing: ' + route);
    assert(hasPose(yoga.html), 'Configured programme poster illustration missing: ' + route);
  }
  const normalise = value => String(value).replace(/\s+/g, ' ').trim();
  const expectedPrice = programme.price || yogaSettings.priceNote;
  assert(page.text.includes(normalise(expectedPrice)), 'Configured price or confirmation note missing: ' + route);
  assert(page.text.includes(normalise(programme.timing)), 'Programme timing differs from the central catalogue: ' + route);
  assert(page.text.includes(normalise(yogaSettings.timezone)), 'Configured programme time zone missing: ' + route);
  assert(yoga.html.includes('href="' + route + '"'), 'Yoga poster does not link to its programme: ' + route);
  assert(/aria-label="Breadcrumb"/.test(page.html), 'Programme breadcrumb missing: ' + route);
}

const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
const sitemapPaths = [...sitemap.matchAll(/<loc>([^]*?)<\/loc>/g)].map(match => new URL(decode(match[1])).pathname);
assert.equal(new Set(sitemapPaths).size, routes.length, 'Sitemap has missing or duplicate page entries');
for (const route of routes) assert(sitemapPaths.includes(route), 'Missing sitemap route: ' + route);
assert(fs.existsSync(path.join(root, 'robots.txt')), 'Missing robots.txt');
assert(fs.existsSync(path.join(root, '404.html')), 'Missing custom 404');

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(path.join(directory, entry.name)) : [path.join(directory, entry.name)]);
}
for (const file of walk(root).filter(file => file.endsWith('.css'))) {
  const css = fs.readFileSync(file, 'utf8');
  for (const match of css.matchAll(/url\(\s*['"]?([^)'"\s]+)['"]?\s*\)/g)) {
    const ref = match[1];
    if (/^(?:data:|https?:|#)/.test(ref)) continue;
    const target = ref.startsWith('/') ? localTarget(new URL(ref, 'https://export.invalid')) : path.resolve(path.dirname(file), ref);
    assert(fs.existsSync(target), 'Broken CSS asset: ' + path.relative(root, file) + ' -> ' + ref);
    cssAssets++;
  }
}

console.log('PASS: ' + routes.length + ' routes; unique titles/descriptions; one H1 and semantic landmarks each; canonical/Open Graph/social metadata; ' + links + ' internal links/assets/anchors; ' + images + ' image references; ' + cssAssets + ' CSS assets; supplied logo; ' + programmes.length + ' programme visuals, prices and schedules match the central catalogue; no public business readiness labels; sitemap, robots and 404.');
