const scraperService = require('../services/scraper.service');

async function scrapePage(req, res, next) {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({ message: 'Query parameter "url" is required' });
    }

    const result = await scraperService.scrape(url);
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

module.exports = { scrapePage };

