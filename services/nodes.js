const fs = require('node:fs');
const path = require('node:path');
const { RESP_TYPES } = require('redis');
const { pack, unpack } = require('msgpackr');
const axios = require('./axios.js');
const RedisClient = require('./redis.js');

const isProd = process.env.NODE_ENV === 'production';

const UPSTREAM_URL = 'https://map.meshcore.dev/api/v1/nodes?binary=1&short=1';
const REDIS_KEYS = { all: 'mmc:nodes:all', pl: 'mmc:nodes:pl' };
const REFRESH_INTERVAL_MS = 10 * 60 * 1000;

// Pełna granica administracyjna Polski [lon, lat] (źródło: https://nominatim.openstreetmap.org/search?country=poland&polygon_geojson=1&format=geojson&polygon_threshold=0)
const polandBorder = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/poland-border.geojson'), 'utf8'));
const POLAND_POLYGON = polandBorder.features[0].geometry.coordinates[0];

// Test punktu w wielokącie metodą ray-casting
const isInPoland = node => {
	const { lat, lon } = node;
	let inside = false;
	for (let i = 0, j = POLAND_POLYGON.length - 1; i < POLAND_POLYGON.length; j = i++) {
		const [xi, yi] = POLAND_POLYGON[i];
		const [xj, yj] = POLAND_POLYGON[j];
		const intersects = yi > lat !== yj > lat && lon < (xj - xi) * (lat - yi) / (yj - yi) + xi;
		if (intersects) inside = !inside;
	}
	return inside;
};

let lastRefreshedAt = null;

const refreshNodes = async () => {
	const startedAt = Date.now();

	try {
		const { data } = await axios.get(UPSTREAM_URL, { responseType: 'arraybuffer' });
		const allBuffer = Buffer.from(data);
		const plBuffer = pack(unpack(allBuffer).filter(isInPoland));

		await Promise.all([
			RedisClient.set(REDIS_KEYS.all, allBuffer),
			RedisClient.set(REDIS_KEYS.pl, plBuffer),
		]);

		lastRefreshedAt = new Date();

		if (!isProd) console.log(`[nodes] Cache refreshed (all: ${allBuffer.byteLength} bytes, pl: ${plBuffer.byteLength} bytes) in ${Date.now() - startedAt}ms`);
	} catch (err) {
		console.error('[nodes] Failed to refresh cache:', err.message || err.stack);
	}
};

const getCachedNodes = (region = 'pl') => RedisClient.withTypeMapping({ [RESP_TYPES.BLOB_STRING]: Buffer }).get(REDIS_KEYS[region] || REDIS_KEYS.pl);

const getLastRefreshedAt = () => lastRefreshedAt;

const startNodesRefreshJob = () => {
	void refreshNodes();
	setInterval(refreshNodes, REFRESH_INTERVAL_MS);
};

module.exports = { refreshNodes, getCachedNodes, getLastRefreshedAt, startNodesRefreshJob };
