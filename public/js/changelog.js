import { initModal } from './modal.js';

const CHANGELOG = [
	{
		version: '0.4.0',
		date: '31.07.2026',
		changes: [
			'Dodano nowe narzędzia: pomiar odległości, wyznaczanie trasy po nazwach lub kluczach węzłów oraz analizę terenu i zasięgu między dwoma punktami (profil wysokościowy i orientacyjna widoczność optyczna).',
			'W statystykach "Nowe węzły" dodano własny zakres dat oraz przycisk "Pokaż na mapie", który podświetla wybrane węzły i przybliża do nich widok.',
			'Dodano przyciski zamykania do okien ustawień, statystyk, legendy i listy zmian.',
			'Ikona lupy w wyszukiwarce chowa się animacją po kliknięciu w pole, a Escape czyści wyniki i usuwa z niego fokus.',
			'Inne drobne poprawki w wyglądzie oraz animacjach.',
		],
	},
	{
		version: '0.3.0',
		date: '26.07.2026',
		changes: [
			'Ukończono pracę nad responsywnością. Od teraz strona działa poprawnie na urządzeniach mobilnych.',
			'Dodano wibrację przy naciśnięciu przycisku (Android).',
			'Udostępniono nowe API ze statystykami repeaterów na potrzeby meshcorepolska.org.',
			'Inne drobne poprawki oraz ulepszenia, także w kontekście SEO.',
		],
	},
	{
		version: '0.2.0',
		date: '20.07.2026',
		changes: [
			'Dodano ustawienie "Zamykaj okno filtrów po zastosowaniu".',
			'Dodano ustawienie "Pokaż OpenFreeMap w przełączniku map".',
			'Dodano nowe mapy: CartoDB Dark, CartoDB Positron, CyclOSM oraz Humanitarian OSM.',
			'CartoDB Dark od teraz jest domyślną mapą.',
			'Dodano listę zmian.',
			'Poprawiono i ulepszono funkcjonalność filtrów.',
			'Poprawiono niektóre animacje.',
			'Przebudowano przycisk "i" w prawym dolnym rogu strony.',
			'Inne drobne poprawki w wyglądzie.',
		],
	},
	{
		version: '0.1.0',
		date: '19.07.2026',
		changes: [
			'Polskojęzyczny interfejs.',
			'Możliwość przełączania między węzłami z Polski i całego świata.',
			'Udostępnianie wybranego węzła lub kontaktu za pomocą bezpośredniego linku.',
			'Kopiowanie danych węzłów i kontaktów do schowka.',
			'Polska jako domyślnie wybrany region przy pierwszym uruchomieniu.',
			'Dane przesyłane w kompaktowym formacie MessagePack; przy domyślnym widoku pobierane są tylko węzły z Polski.',
			'Wyszukiwanie węzłów po nazwie i kluczu publicznym, z obsługą klawiatury.',
			'Frontend zbudowany w HTML, CSS i JavaScript bez frameworka aplikacyjnego, nowoczesny kod.',
		],
	},
];

export const initChangelogModal = ({ escapeHtml, onDismiss }) => {
	const modal = initModal('changelog-toggle', 'changelog-overlay', { onDismiss });
	const listEl = document.getElementById('changelog-list');

	listEl.innerHTML = CHANGELOG.map(entry => `
		<li class="changelog-version">
			<div class="changelog-version-title">
				<span>v${escapeHtml(entry.version)}</span>
				<time class="changelog-version-date">${escapeHtml(entry.date)}</time>
			</div>
			<ul class="changelog-changes">
				${entry.changes.map(change => `<li>${escapeHtml(change)}</li>`).join('')}
			</ul>
		</li>
	`).join('');

	return modal;
};
