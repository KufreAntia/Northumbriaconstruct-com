(() => {
  'use strict';
  const form = document.querySelector('#analytics-filter');
  const status = document.querySelector('#analytics-status');
  const today = new Date().toISOString().slice(0, 10);
  const earliest = new Date(Date.parse(today) - 364 * 86400000).toISOString().slice(0, 10);
  form.elements.end.value = today;
  form.elements.start.value = new Date(Date.parse(today) - 6 * 86400000).toISOString().slice(0, 10);
  for (const input of form.querySelectorAll('input')) { input.min = earliest; input.max = today; }
  function rows(id, records) {
    const body = document.querySelector(id);
    body.replaceChildren();
    records.forEach(record => {
      const row = document.createElement('tr');
      record.forEach(value => { const cell = document.createElement('td'); cell.textContent = String(value); row.append(cell); });
      body.append(row);
    });
  }
  async function load() {
    status.textContent = 'Loading statistics…';
    const button = form.querySelector('button');
    button.disabled = true;
    for (const id of ['analytics-pageviews', 'analytics-visitors', 'analytics-clicks']) document.getElementById(id).textContent = '—';
    for (const id of ['#analytics-daily', '#analytics-pages', '#analytics-targets']) rows(id, []);
    document.querySelector('#analytics-source').textContent = '';
    document.querySelector('#analytics-visitors-note').textContent = '';
    try {
      const query = new URLSearchParams({ start: form.elements.start.value, end: form.elements.end.value });
      const response = await fetch('/api/analytics-report?' + query, { credentials: 'same-origin', cache: 'no-store' });
      if (!response.ok) throw new Error(response.status === 400 ? 'Select valid dates within the last 365 days.' : 'Statistics are unavailable. Check administrator access and storage configuration.');
      const data = await response.json();
      document.querySelector('#analytics-pageviews').textContent = data.pageviews.toLocaleString();
      document.querySelector('#analytics-clicks').textContent = data.clickCount.toLocaleString();
      document.querySelector('#analytics-visitors').textContent = data.vercel.available ? data.vercel.approximateVisitors.toLocaleString() : 'Unavailable';
      document.querySelector('#analytics-source').textContent = `Environment: ${data.environment}. Page views, top pages and clicks are from our durable aggregate counters. Collection began: ${data.collectionStarted || 'no events collected yet'}. Counters are retained for 365 days.`;
      document.querySelector('#analytics-visitors-note').textContent = data.vercel.available ? `Approximate visitors are from Vercel Web Analytics for the selected range (${data.vercel.pageviews.toLocaleString()} Vercel page views). Provider totals can differ from our counters.` : data.vercel.reason;
      rows('#analytics-daily', data.daily.map(row => [row.day, row.pageviews, row.clicks]));
      rows('#analytics-pages', data.pages.filter(row => row.count).map(row => [row.page, row.count]));
      rows('#analytics-targets', data.clicks.map(row => [row.category, row.destination, row.count]));
      status.textContent = data.collectionStarted ? `Showing ${data.start} to ${data.end}. Zero counts before collection began are not historical data.` : 'No events have been collected. Statistics begin only after activation and visitor permission.';
    } catch (error) { status.textContent = error.message; }
    finally { button.disabled = false; }
  }
  form.addEventListener('submit', event => { event.preventDefault(); load(); });
  load();
})();
