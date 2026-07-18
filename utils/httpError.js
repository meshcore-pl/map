const MESSAGES = {
	400: 'Bad request.',
	404: 'Not found.',
	429: 'Too many requests. Please try again later.',
	500: 'Internal server error.',
	503: 'Service temporarily unavailable.',
};

const ApiError = (res, status, err) => {
	if (err) console.error(err);

	res.status(status).json({ success: false, status, message: MESSAGES[status] || 'An error occurred.' });
};

module.exports = { ApiError, RenderError: ApiError };
