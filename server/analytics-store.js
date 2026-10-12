'use strict';
const catalog = require('./analytics-catalog.json');
const { createHash, timingSafeEqual } = require('node:crypto');
const retentionDays = 365;
function namespace() {
  // Vercel preview data never enters production counters.
  return `nc:stats:v1:${process.env.VERCEL_ENV === 'production' ? 'production' : 'preview'}`;
}
function enabled() { return process.env.ANALYTICS_ENABLED === 'true' && Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN); }
async function redis(command, endpoint = '') {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !/^https:\/\/[^/]+\.upstash\.io\/?$/.test(url) || !token) throw new Error('Storage unavailable');
  const response = await fetch(url.replace(/\/$/, '') + endpoint, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command), signal: AbortSignal.timeout(5000)
  });
  if (!response.ok) throw new Error('Storage unavailable');
  const body = await response.json();
  if (body.error || (Array.isArray(body) && body.some(item => item.error))) throw new Error('Storage unavailable');
  return endpoint ? body.map(item => item.result) : body.result;
}
function headers(res) {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Content-Type-Options', 'nosniff');
}
function equal(a, b) {
  return timingSafeEqual(createHash('sha256').update(a).digest(), createHash('sha256').update(b).digest());
}
async function administrator(req, res) {
  headers(res);
  const secret = process.env.ANALYTICS_ADMIN_PASSWORD;
  if (!secret || secret.length < 32 || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    res.status(503).send('Administrator analytics is not configured.'); return false;
  }
  // Shared, short-lived rate counter contains no IP address or user identifier.
  const bucket = Math.floor(Date.now() / 60000);
  let attempts;
  try {
    attempts = await redis(['EVAL', "local n=redis.call('INCR',KEYS[1]); redis.call('EXPIRE',KEYS[1],120); return n", 1, `${namespace()}:admin-rate:${bucket}`]);
  } catch { res.status(503).send('Analytics storage is unavailable.'); return false; }
  if (attempts > 120) { res.setHeader('Retry-After', '60'); res.status(429).send('Please try again shortly.'); return false; }
  const authorization = req.headers.authorization || '';
  let credentials = '';
  if (authorization.startsWith('Basic ') && authorization.length < 1024) credentials = Buffer.from(authorization.slice(6), 'base64').toString('utf8');
  if (!equal(credentials, `${process.env.ANALYTICS_ADMIN_USER || 'admin'}:${secret}`)) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Northumbria Construct analytics", charset="UTF-8"');
    res.status(401).send('Administrator sign-in required.'); return false;
  }
  return true;
}
function dateRange(query, now = new Date()) {
  const today = now.toISOString().slice(0, 10);
  const end = query.end || today;
  const start = query.start || new Date(now.getTime() - 6 * 86400000).toISOString().slice(0, 10);
  const valid = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  const earliest = new Date(Date.parse(today) - (retentionDays - 1) * 86400000).toISOString().slice(0, 10);
  if (!valid(start) || !valid(end) || start > end || end > today || start < earliest) throw new Error('Select valid dates within the last 365 days.');
  const days = [];
  for (let time = Date.parse(start); time <= Date.parse(end); time += 86400000) days.push(new Date(time).toISOString().slice(0, 10));
  return { start, end, days };
}
module.exports = { catalog, namespace, retentionDays, enabled, redis, headers, administrator, dateRange };
