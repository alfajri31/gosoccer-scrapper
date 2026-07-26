const express = require('express');

const { scrapePage } = require('../controllers/scrape.controller');

const router = express.Router();

router.get('/', scrapePage);

module.exports = router;

