const MESSAGES = {
	400: 'Nieprawidłowe żądanie.',
	404: 'Nie znaleziono.',
	429: 'Zbyt wiele żądań. Spróbuj ponownie później.',
	500: 'Wewnętrzny błąd serwera.',
	503: 'Usługa tymczasowo niedostępna.',
};

const ApiError = (res, status, err) => {
	if (err) console.error(err);

	res.status(status).json({ success: false, status, message: MESSAGES[status] || 'Wystąpił błąd.' });
};

module.exports = ApiError;
