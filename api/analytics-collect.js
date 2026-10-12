const { catalog, namespace, retentionDays, enabled, redis, headers } = require('../server/analytics-store');
module.exports = async (req, res) => {
  headers(res);
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).end(); }
  if (!enabled()) return res.status(503).end();
  const expected = process.env.VERCEL_ENV === 'production' ? 'https://www.northumbriaconstruct.com' : process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://127.0.0.1:8002';
  if (req.headers.origin !== expected || req.headers['sec-fetch-site'] === 'cross-site') return res.status(403).end();
  if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')) return res.status(415).end();
  let body = req.body;
  try {
    if (typeof body === 'string') { if (body.length > 512) return res.status(413).end(); body = JSON.parse(body); }
    if (Buffer.byteLength(JSON.stringify(body || {})) > 512) return res.status(413).end();
  } catch { return res.status(400).end(); }
  if (!body || Object.keys(body).some(key => !['kind', 'page', 'target'].includes(key)) || !catalog.pages.includes(body.page)) return res.status(400).end();
  if (body.kind !== 'pageview' && body.kind !== 'click') return res.status(400).end();
  if (body.kind === 'click' && !catalog.targets.some(item => item.id === body.target)) return res.status(400).end();
  if (body.kind === 'pageview' && body.target !== undefined) return res.status(400).end();
  const day = new Date().toISOString().slice(0, 10);
  const field = body.kind === 'pageview' ? `page:${body.page}` : `click:${body.target}`;
  const expiry = Math.floor(Date.parse(day) / 1000) + retentionDays * 86400;
  try {
    // Atomic aggregate-only update; fixed cardinality and daily collection cap.
    const result = await redis(['EVAL', "local n=tonumber(redis.call('HGET',KEYS[1],'total') or '0'); if n>=tonumber(ARGV[3]) then return 0 end; redis.call('HINCRBY',KEYS[1],ARGV[1],1); redis.call('HINCRBY',KEYS[1],'total',1); redis.call('EXPIREAT',KEYS[1],ARGV[2]); redis.call('SET',KEYS[2],ARGV[4],'NX'); return 1", 2, `${namespace()}:day:${day}`, `${namespace()}:started`, field, expiry, 10000, day]);
    return res.status(result ? 204 : 429).end();
  } catch { return res.status(503).end(); }
};
