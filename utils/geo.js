// Odległość punktu p od odcinka [a, b] (bez projekcji na sferę - wystarczające dla uproszczeń w skali kraju)
const perpendicularDistance = ([px, py], [ax, ay], [bx, by]) => {
	const dx = bx - ax;
	const dy = by - ay;
	const lengthSq = dx * dx + dy * dy;
	if (lengthSq === 0) return Math.hypot(px - ax, py - ay);

	const t = ((px - ax) * dx + (py - ay) * dy) / lengthSq;
	return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
};

const douglasPeucker = (points, epsilon) => {
	if (points.length < 3) return points;

	const start = points[0];
	const end = points[points.length - 1];
	let maxDistance = 0;
	let splitIndex = 0;

	for (let i = 1; i < points.length - 1; i++) {
		const distance = perpendicularDistance(points[i], start, end);
		if (distance > maxDistance) {
			maxDistance = distance;
			splitIndex = i;
		}
	}

	if (maxDistance <= epsilon) return [start, end];

	const left = douglasPeucker(points.slice(0, splitIndex + 1), epsilon);
	const right = douglasPeucker(points.slice(splitIndex), epsilon);
	return left.slice(0, -1).concat(right);
};

/**
 * Upraszcza zamknięty pierścień (GeoJSON LinearRing, pierwszy punkt == ostatni) algorytmem Douglas-Peucker.
 * Pierścień jest dzielony na dwie połówki względem punktu najdalszego od pierwszego wierzchołka,
 * ponieważ zwykły Douglas-Peucker działa na otwartej ścieżce, a nie na pętli.
 */
const simplifyRing = (ring, epsilon) => {
	const points = ring.slice(0, -1);

	let maxDistanceSq = -1;
	let farIndex = 1;
	for (let i = 1; i < points.length; i++) {
		const dx = points[i][0] - points[0][0];
		const dy = points[i][1] - points[0][1];
		const distanceSq = dx * dx + dy * dy;
		if (distanceSq > maxDistanceSq) {
			maxDistanceSq = distanceSq;
			farIndex = i;
		}
	}

	const firstHalf = douglasPeucker(points.slice(0, farIndex + 1), epsilon);
	const secondHalf = douglasPeucker(points.slice(farIndex).concat([points[0]]), epsilon);

	const merged = firstHalf.slice(0, -1).concat(secondHalf.slice(0, -1));
	merged.push(merged[0]);
	return merged;
};

const getBoundingBox = polygon => polygon.reduce((bbox, [lon, lat]) => ({
	latMin: Math.min(bbox.latMin, lat),
	latMax: Math.max(bbox.latMax, lat),
	lonMin: Math.min(bbox.lonMin, lon),
	lonMax: Math.max(bbox.lonMax, lon),
}), { latMin: Infinity, latMax: -Infinity, lonMin: Infinity, lonMax: -Infinity });

// Test punktu w wielokącie metodą ray-casting
const isPointInPolygon = (lat, lon, polygon) => {
	let inside = false;
	for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
		const [xi, yi] = polygon[i];
		const [xj, yj] = polygon[j];
		const intersects = yi > lat !== yj > lat && lon < (xj - xi) * (lat - yi) / (yj - yi) + xi;
		if (intersects) inside = !inside;
	}
	return inside;
};

module.exports = { simplifyRing, getBoundingBox, isPointInPolygon };
