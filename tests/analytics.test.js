const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const collect = require('../api/analytics-collect');
const report = require('../api/analytics-report');
const dashboard = require('../api/admin-analytics');
const { catalog, dateRange } = require('../server/analytics-store');
const originalFetch = global.fetch;
let commands;
beforeEach(() => {
  process.env.ANALYTICS_ENABLED = 'true';
  process.env.VERCEL_ENV = 'preview';
  process.env.VERCEL_URL = 'nc-preview.vercel.app';
  process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'test-storage-only';
  process.env.ANALYTICS_ADMIN_PASSWORD = 'test-only-password-with-32-random-characters';
  delete process.env.VERCEL_ANALYTICS_READ_TOKEN;
  delete process.env.ANALYTICS_ADMIN_USER;
  commands = [];
  global.fetch = async (url, options) => {
    const command = JSON.parse(options.body);
    commands.push(command);
    return { ok: true, json: async () => ({ result: 1 }) };
  };
});
test.after(() => { global.fetch = originalFetch; });
function response() {
  return { statusCode: 200, headers: {}, setHeader(key, value) { this.headers[key] = value; }, status(code) { this.statusCode = code; return this; }, end() {}, json(value) { this.body = value; }, send(value) { this.body = value; } };
}
function request(body = { kind: 'pageview', page: '/' }) {
  return { method: 'POST', headers: { origin: 'https://nc-preview.vercel.app', 'content-type': 'application/json', 'sec-fetch-site': 'same-origin' }, body };
}
function adminRequest(query = {}) {
  return { method: 'GET', headers: { authorization: 'Basic ' + Buffer.from('admin:' + process.env.ANALYTICS_ADMIN_PASSWORD).toString('base64') }, query };
}
test('only approved aggregate fields reach Redis; no visitor or request information', async () => {
  const req = request();
  req.headers['x-forwarded-for'] = '198.51.100.99';
  req.headers['user-agent'] = 'A private browser';
  req.headers.referer = 'https://example.com/?email=private@example.com';
  const res = response();
  await collect(req, res);
  assert.equal(res.statusCode, 204);
  const serialized = JSON.stringify(commands);
  assert(!serialized.includes('198.51') && !serialized.includes('private@example.com') && !serialized.includes('private browser'));
  assert(serialized.includes('nc:stats:v1:preview:day:'));
  assert.equal(commands[0][0], 'EVAL');
  assert(commands[0][1].includes('HINCRBY') && commands[0][1].includes('EXPIREAT'));
  const expiry = commands[0][6];
  assert(Number(expiry) > Date.now() / 1000 + 364 * 86400);
});
test('production counters use a separate namespace and only the official origin', async () => {
  process.env.VERCEL_ENV = 'production';
  const req = request();
  let res = response();
  await collect(req, res);
  assert.equal(res.statusCode, 403);
  req.headers.origin = 'https://www.northumbriaconstruct.com';
  res = response(); await collect(req, res);
  assert.equal(res.statusCode, 204);
  assert(JSON.stringify(commands).includes('nc:stats:v1:production:day:'));
});
test('malformed, personal, arbitrary and oversized events are rejected without storage', async () => {
  const invalid = [
    { kind: 'pageview', page: '/?email=someone@example.com' },
    { kind: 'pageview', page: '/', email: 'someone@example.com' },
    { kind: 'pageview', page: '/', target: 'extra' },
    { kind: 'click', page: '/', target: 'https://unknown.com' },
    { kind: 'unknown', page: '/' },
    '{invalid', 'x'.repeat(513)
  ];
  for (const body of invalid) {
    const res = response(); await collect(request(body), res);
    assert([400, 413].includes(res.statusCode));
  }
  assert.equal(commands.length, 0);
});
test('method, content type, origin and activation are enforced', async () => {
  for (const [change, expected] of [
    [req => { req.method = 'GET'; }, 405],
    [req => { req.headers['content-type'] = 'text/plain'; }, 415],
    [req => { req.headers.origin = 'https://evil.example'; }, 403],
    [req => { req.headers['sec-fetch-site'] = 'cross-site'; }, 403]
  ]) { const req = request(); change(req); const res = response(); await collect(req, res); assert.equal(res.statusCode, expected); }
  process.env.ANALYTICS_ENABLED = 'false';
  const res = response(); await collect(request(), res); assert.equal(res.statusCode, 503);
  assert.equal(commands.length, 0);
});
test('approved click IDs work, storage outages are not reported as successful collection', async () => {
  let res = response(); await collect(request({ kind: 'click', page: '/activities.html', target: catalog.targets[0].id }), res);
  assert.equal(res.statusCode, 204);
  global.fetch = async () => { throw new Error('provider down'); };
  res = response(); await collect(request(), res); assert.equal(res.statusCode, 503);
});
test('collector daily cap is honoured', async () => {
  global.fetch = async () => ({ ok: true, json: async () => ({ result: 0 }) });
  const res = response(); await collect(request(), res); assert.equal(res.statusCode, 429);
});
test('dashboard and JSON report both require server-side administrator authentication', async () => {
  for (const handler of [dashboard, report]) {
    const res = response(); await handler({ method: 'GET', headers: {} }, res);
    assert.equal(res.statusCode, 401);
    assert.equal(res.headers['Cache-Control'], 'private, no-store');
    assert.equal(res.headers['X-Robots-Tag'], 'noindex, nofollow');
    assert(!String(res.body).includes('<table'));
  }
  delete process.env.ANALYTICS_ADMIN_PASSWORD;
  const res = response(); await dashboard({ method: 'GET', headers: {} }, res); assert.equal(res.statusCode, 503);
});
test('administrator rate limit and storage outage fail closed', async () => {
  global.fetch = async () => ({ ok: true, json: async () => ({ result: 121 }) });
  let res = response(); await dashboard(adminRequest(), res); assert.equal(res.statusCode, 429);
  global.fetch = async () => { throw new Error('down'); };
  res = response(); await dashboard(adminRequest(), res); assert.equal(res.statusCode, 503);
});
test('dashboard is protected, uncached and has a restrictive CSP', async () => {
  const res = response(); await dashboard(adminRequest(), res);
  assert.equal(res.statusCode, 200);
  assert(res.headers['Content-Security-Policy'].includes("frame-ancestors 'none'"));
  assert(res.body.includes('Approximate visitors') && res.body.includes('analytics-filter'));
  assert(!res.body.includes(process.env.ANALYTICS_ADMIN_PASSWORD));
});
test('date filters reject impossible, future, inverted and excessive ranges', () => {
  const now = new Date('2026-10-12T12:00:00Z');
  assert.equal(dateRange({ start: '2026-10-01', end: '2026-10-12' }, now).days.length, 12);
  for (const query of [
    { start: '2026-02-30' }, { start: '2026-10-13' }, { start: '2026-10-12', end: '2026-10-11' },
    { start: '2025-01-01' }, { start: ['2026-10-01'] }, { end: '2026-10-13' }
  ]) assert.throws(() => dateRange(query, now));
});
test('report combines stored counters accurately and never fabricates visitors', async () => {
  const today = new Date().toISOString().slice(0, 10);
  global.fetch = async (url, options) => {
    const command = JSON.parse(options.body); commands.push(command);
    const value = String(url).endsWith('/pipeline') ? [{ result: today }, { result: ['page:/', '3', `click:${catalog.targets[0].id}`, '2', 'total', '5'] }] : { result: 1 };
    return { ok: true, json: async () => value };
  };
  const res = response(); await report(adminRequest({ start: today, end: today }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.pageviews, 3); assert.equal(res.body.clickCount, 2);
  assert.equal(res.body.collectionStarted, today); assert.equal(res.body.vercel.available, false);
  assert.equal(res.body.vercel.approximateVisitors, undefined);
});
test('browser sends no collection requests or Vercel script without permission, or with DNT/GPC', async () => {
  for (const [preference, dnt, gpc, expected] of [[null, undefined, false, false], ['off', undefined, false, false], ['on', '1', false, false], ['on', undefined, true, false], ['on', undefined, false, true]]) {
    const requests = [], scripts = [];
    const context = {
      URL, localStorage: { getItem: () => preference }, navigator: { doNotTrack: dnt, globalPrivacyControl: gpc },
      location: { pathname: '/', origin: 'https://www.northumbriaconstruct.com' },
      document: { referrer: '', querySelector: () => null, querySelectorAll: () => [], addEventListener: () => {}, createElement: () => ({ dataset: {}, setAttribute() {} }), head: { append: value => scripts.push(value) }, body: { append() {} } },
      fetch: async (url, options) => { requests.push({ url, options }); return { ok: true, json: async () => ({ enabled: true, pages: catalog.pages, targets: catalog.targets }) }; }
    };
    context.window = { addEventListener() {} };
    vm.runInNewContext(fs.readFileSync('analytics.js', 'utf8'), context);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(requests.some(item => item.url === '/api/analytics-collect'), expected);
    assert.equal(scripts.length > 0, expected);
    if (expected) {
      const hook = context.window.vaq[0][1];
      assert.equal(hook({ type: 'pageview', url: 'https://www.northumbriaconstruct.com/?email=private#name' }).url, 'https://www.northumbriaconstruct.com/');
      context.document.referrer = 'https://example.com/?email=private';
      assert.equal(hook({ type: 'pageview', url: '/' }), null);
    }
  }
});
