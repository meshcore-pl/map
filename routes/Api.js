const router = require('express').Router();
const ApiError = require('../utils/httpError.js');
const { getCachedNodes, getLastRefreshedAt } = require('../services/nodes.js');

router.get('/nodes', async (req, res) => {
	try {
		const region = req.query.region === 'all' ? 'all' : 'pl';
		const nodes = await getCachedNodes(region);
		if (!nodes) return ApiError(res, 503);

		res.set('Content-Type', 'application/octet-stream');
		res.set('Cache-Control', 'no-store');

		const lastRefreshedAt = getLastRefreshedAt();
		if (lastRefreshedAt) res.set('X-Data-Updated', lastRefreshedAt.toISOString());

		res.send(nodes);
	} catch (err) {
		ApiError(res, 500, err);
	}
});

module.exports = router;
