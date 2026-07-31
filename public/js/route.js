import { initModal } from './modal.js';
import { createPathLayer, formatDistance, resolveNodeByQuery } from './pathtools.js';

const STORAGE_KEY = 'routeToolInput';

const splitTokens = raw => raw.split(/[\n,>]+/).map(t => t.trim()).filter(Boolean);

export const initRouteTool = ({ map, getNodes, escapeHtml }) => {
	const modal = initModal('route-toggle', 'route-overlay');
	const closeBtn = document.getElementById('route-close-btn');
	const inputEl = document.getElementById('route-input');
	const drawBtn = document.getElementById('route-draw-btn');
	const clearBtn = document.getElementById('route-clear-btn');
	const totalEl = document.getElementById('route-total');
	const listEl = document.getElementById('route-result-list');

	const path = createPathLayer({ map, color: '#2dd881' });

	const renderResults = tokens => {
		if (!tokens.length) {
			listEl.innerHTML = '';
			totalEl.hidden = true;
			return;
		}

		const segments = path.getSegments();
		let segmentIndex = 0;

		listEl.innerHTML = tokens.map(t => {
			if (!t.node) return `<li class="tool-panel-error"><span>${escapeHtml(t.raw)}</span><b>nie znaleziono</b></li>`;

			const segment = segmentIndex < segments.length ? segments[segmentIndex++] : null;
			return `<li><span>${escapeHtml(t.node.adv_name)}</span><b>${segment ? formatDistance(segment.distance) : ''}</b></li>`;
		}).join('');

		totalEl.hidden = false;
		totalEl.textContent = `Łącznie: ${formatDistance(path.getTotalDistance(segments))}`;
	};

	const drawRoute = () => {
		const nodes = getNodes();
		const tokens = splitTokens(inputEl.value).map(raw => ({ raw, node: resolveNodeByQuery(raw, nodes) }));

		path.setPoints(tokens.filter(t => t.node).map(t => ({ lat: t.node.lat, lng: t.node.lon, label: t.node.adv_name })));
		renderResults(tokens);
		return tokens;
	};

	drawBtn.addEventListener('click', () => {
		drawRoute();
		path.fitBounds();
	});

	clearBtn.addEventListener('click', () => {
		inputEl.value = '';
		path.clear();
		renderResults([]);
		localStorage.removeItem(STORAGE_KEY);
	});

	const closeAndSave = () => {
		if (inputEl.value.trim()) localStorage.setItem(STORAGE_KEY, inputEl.value);
		else localStorage.removeItem(STORAGE_KEY);
		modal.close();
	};

	closeBtn.addEventListener('click', closeAndSave);

	const savedInput = localStorage.getItem(STORAGE_KEY);
	if (savedInput) {
		inputEl.value = savedInput;
		drawRoute();
	}

	return { ...modal, close: closeAndSave };
};
