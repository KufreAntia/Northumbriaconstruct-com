'use strict';
async function traffic(range) {
  if (!process.env.VERCEL_ANALYTICS_READ_TOKEN || !process.env.ANALYTICS_VERCEL_PROJECT_ID) return { available: false, reason: 'Vercel reporting credentials are not configured.' };
  const url = new URL('https://api.vercel.com/v1/query/web-analytics/visits/aggregate');
  url.searchParams.set('projectId', process.env.ANALYTICS_VERCEL_PROJECT_ID);
  if (process.env.ANALYTICS_VERCEL_TEAM_ID) url.searchParams.set('teamId', process.env.ANALYTICS_VERCEL_TEAM_ID);
  url.searchParams.set('since', range.start + 'T00:00:00.000Z');
  url.searchParams.set('until', range.end + 'T23:59:59.999Z');
  url.searchParams.set('filter', `environment eq '${process.env.VERCEL_ENV === 'production' ? 'production' : 'preview'}'`);
  const query = async by => {
    const endpoint = new URL(url);
    endpoint.searchParams.set('by', by);
    const response = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${process.env.VERCEL_ANALYTICS_READ_TOKEN}` },
      signal: AbortSignal.timeout(7000)
    });
    if (!response.ok) throw new Error('Vercel reporting unavailable for these dates or credentials. Check activation, plan reporting window and API access.');
    const result = await response.json();
    const rows = Array.isArray(result.data) ? result.data : [result.data];
    if (rows.some(row => !row || !Number.isFinite(row.pageviews) || !Number.isFinite(row.visitors))) throw new Error('Vercel reporting returned an unexpected format.');
    return rows;
  };
  try {
    // Ungrouped range visitors are not obtained by summing daily unique counts.
    const [totals, trend] = await Promise.all([query('[]'), query('day')]);
    if (totals.length !== 1) throw new Error('Vercel reporting returned an unexpected total.');
    return { available: true, pageviews: totals[0].pageviews, approximateVisitors: totals[0].visitors,
      trend: trend.map(row => ({ day: row.timestamp, pageviews: row.pageviews, approximateVisitors: row.visitors })) };
  } catch (error) { return { available: false, reason: error.message.startsWith('Vercel reporting') ? error.message : 'Vercel reporting is temporarily unavailable.' }; }
}
module.exports = { traffic };
