const { catalog, enabled, headers } = require('../server/analytics-store');
module.exports = (req, res) => {
  headers(res);
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).end(); }
  res.status(200).json({ enabled: enabled(), pages: catalog.pages, targets: catalog.targets });
};
