const { RESP_TYPES } = require('redis');
const { pack, unpack } = require('msgpackr');
const axios = require('./axios.js');
const RedisClient = require('./redis.js');

const UPSTREAM_URL = 'https://map.meshcore.dev/api/v1/nodes?binary=1&short=1';
const REDIS_KEYS = { all: 'mmc:nodes:all', pl: 'mmc:nodes:pl' };
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

const POLAND_BBOX = { latMin: 48.9, latMax: 54.95, lonMin: 14.0, lonMax: 24.2 };

const isInPoland = node => node.lat >= POLAND_BBOX.latMin && node.lat <= POLAND_BBOX.latMax &&
	node.lon >= POLAND_BBOX.lonMin && node.lon <= POLAND_BBOX.lonMax;

const refreshNodes = async () => {
	try {
		const { data } = await axios.get(UPSTREAM_URL, { responseType: 'arraybuffer' });
		const allBuffer = Buffer.from(data);
		const plBuffer = pack(unpack(allBuffer).filter(isInPoland));

		await Promise.all([
			RedisClient.set(REDIS_KEYS.all, allBuffer),
			RedisClient.set(REDIS_KEYS.pl, plBuffer),
		]);

		console.log(`[nodes] Cache refreshed (all: ${allBuffer.byteLength} bytes, pl: ${plBuffer.byteLength} bytes)`);
	} catch (err) {
		console.error('[nodes] Failed to refresh cache:', err.message || err.stack);
	}
};

const getCachedNodes = (region = 'pl') => RedisClient.withTypeMapping({ [RESP_TYPES.BLOB_STRING]: Buffer }).get(REDIS_KEYS[region] || REDIS_KEYS.pl);

const startNodesRefreshJob = () => {
	void refreshNodes();
	setInterval(refreshNodes, REFRESH_INTERVAL_MS);
};

module.exports = { refreshNodes, getCachedNodes, startNodesRefreshJob };
