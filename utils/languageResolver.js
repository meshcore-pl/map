const LANGUAGES = [
	{ code: 'en', name: 'English', htmlLang: 'en', ogLocale: 'en_US' },
	{ code: 'pl', name: 'Polski', htmlLang: 'pl', ogLocale: 'pl_PL' },
];

const LANGUAGE_MAP = new Map(LANGUAGES.map(lang => [lang.code, lang]));
const AVAILABLE_LANGUAGES = new Set(LANGUAGE_MAP.keys());

const prefixFor = (language, defaultLanguage) =>
	language && language !== defaultLanguage && AVAILABLE_LANGUAGES.has(language) ? `/${language}` : '';

const langPath = (language, urlPath, defaultLanguage) => `${prefixFor(language, defaultLanguage)}${urlPath === '/' ? '' : urlPath}` || '/';

const detectLanguagePrefix = (url, defaultLanguage) => {
	for (const language of AVAILABLE_LANGUAGES) {
		if (language === defaultLanguage) continue;

		const prefix = `/${language}`;
		if (url === prefix || url.startsWith(`${prefix}/`) || url.startsWith(`${prefix}?`)) {
			let rest = url.slice(prefix.length);
			if (rest === '') rest = '/';
			else if (rest[0] === '?') rest = `/${rest}`;
			return { language, url: rest };
		}
	}

	return null;
};

const parseAcceptLanguage = header => {
	if (!header) return null;

	const ranges = header.split(',')
		.map(part => {
			const [tag, ...params] = part.trim().split(';');
			const q = params.find(p => p.trim().startsWith('q='));
			return { code: tag.slice(0, 2).toLowerCase(), q: q ? parseFloat(q.split('=')[1]) || 0 : 1 };
		})
		.filter(range => range.code)
		.sort((a, b) => b.q - a.q);

	for (const range of ranges) {
		if (AVAILABLE_LANGUAGES.has(range.code)) return range.code;
	}

	return null;
};

const negotiatePreferred = (cookieValue, acceptLanguage) =>
	(cookieValue && AVAILABLE_LANGUAGES.has(cookieValue)) ? cookieValue : parseAcceptLanguage(acceptLanguage);

const getLangCookie = req => {
	const header = req.headers.cookie;
	if (!header) return null;

	const match = header.match(/(?:^|;\s*)lang=([^;]+)/);
	return match ? match[1] : null;
};

const LANGUAGE_AGNOSTIC_PATHS = new Set(['/robots.txt', '/sitemap.xml', '/manifest.json']);
const isLanguageAgnosticPath = path => path.startsWith('/api/') || LANGUAGE_AGNOSTIC_PATHS.has(path);

module.exports = {
	LANGUAGES,
	LANGUAGE_MAP,
	AVAILABLE_LANGUAGES,
	prefixFor,
	langPath,
	detectLanguagePrefix,
	parseAcceptLanguage,
	negotiatePreferred,
	getLangCookie,
	isLanguageAgnosticPath,
};
