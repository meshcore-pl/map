const router = require('express').Router();

router.get('/', (req, res) => res.render('index.ejs'));
router.get('/test', (req, res) => res.render('test.ejs'));

module.exports = router;
