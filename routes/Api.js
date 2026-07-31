const router = require('express').Router();
const { getCachedNodes, getLastRefreshedAt, getStats } = require('../services/nodes.js');

router.get('/nodes', async (req, res) => {
	try {
		const region = req.query.region === 'all' ? 'all' : 'pl';
		const nodes = await getCachedNodes(region);
		if (!nodes) return res.status(503).json({ success: false, status: 503, message: 'Dane węzłów nie są jeszcze dostępne, spróbuj ponownie.' });

		res.set('Content-Type', 'application/octet-stream');
		res.set('Cache-Control', 'no-store');

		const lastRefreshedAt = getLastRefreshedAt();
		if (lastRefreshedAt) res.set('X-Data-Updated', lastRefreshedAt.toISOString());

		res.send(nodes);
	} catch (err) {
		console.error(err);
		res.status(500).json({ success: false, status: 500, message: 'Wystąpi wewnętrzny błąd serwera, spróbuj ponownie.' });
	}
});

router.get('/repeater-stats', async (req, res) => {
	res.set('Access-Control-Allow-Origin', '*');

	try {
		const stats = await getStats();
		if (!stats) return res.status(503).json({ success: false, status: 503, message: 'Dane węzłów nie są jeszcze dostępne, spróbuj ponownie.' });

		res.set('Cache-Control', 'public, max-age=60');
		res.json({ success: true, status: 200, message: 'OK', data: stats });
	} catch (err) {
		console.error(err);
		res.status(500).json({ success: false, status: 500, message: 'Wystąpi wewnętrzny błąd serwera. Spróbuj ponownie.' });
	}
});

module.exports = router;
