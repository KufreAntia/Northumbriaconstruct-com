const { catalog, namespace, redis, administrator, dateRange } = require('../server/analytics-store');
const { traffic } = require('../server/vercel-traffic');
module.exports = async (req, res) => {
  if (!await administrator(req, res)) return;
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).end(); }
  let range;
  try { range = dateRange(req.query || {}); } catch (error) { return res.status(400).json({ error: error.message }); }
  try {
    const [stored, vercel] = await Promise.all([
      redis([['GET', `${namespace()}:started`], ...range.days.map(day => ['HGETALL', `${namespace()}:day:${day}`])], '/pipeline'), traffic(range)
    ]);
    const pages = Object.fromEntries(catalog.pages.map(page => [page, 0]));
    const clicks = Object.fromEntries(catalog.targets.map(target => [target.id, 0]));
    const daily = stored.slice(1).map((values, index) => {
      const counts = Array.isArray(values) ? Object.fromEntries(Array.from({ length: values.length / 2 }, (_, i) => [values[i * 2], Number(values[i * 2 + 1])])) : values || {};
      let pageviews = 0, clickCount = 0;
      for (const page of catalog.pages) { const n = Number(counts[`page:${page}`] || 0); pages[page] += n; pageviews += n; }
      for (const target of catalog.targets) { const n = Number(counts[`click:${target.id}`] || 0); clicks[target.id] += n; clickCount += n; }
      return { day: range.days[index], pageviews, clicks: clickCount };
    });
    return res.status(200).json({ start: range.start, end: range.end, timezone: 'UTC', collectionStarted: stored[0] || null,
      environment: process.env.VERCEL_ENV === 'production' ? 'production' : 'preview',
      pageviews: Object.values(pages).reduce((a, b) => a + b, 0), clickCount: Object.values(clicks).reduce((a, b) => a + b, 0),
      pages: Object.entries(pages).map(([page, count]) => ({ page, count })).sort((a, b) => b.count - a.count),
      clicks: catalog.targets.map(target => ({ ...target, count: clicks[target.id] })).sort((a, b) => b.count - a.count), daily, vercel });
  } catch { return res.status(503).json({ error: 'Durable analytics storage is unavailable. No replacement data has been fabricated.' }); }
};
