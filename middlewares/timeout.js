const timeout = require('express-timeout-handler');
const { RenderError } = require('../utils/httpError.js');

module.exports = () => timeout.handler({
	timeout: 15000,
	onTimeout: (req, res) => RenderError(res, 503),
	disable: ['write', 'setHeaders', 'send', 'json', 'end'],
});