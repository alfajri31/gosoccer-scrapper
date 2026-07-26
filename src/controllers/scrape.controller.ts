import type { RequestHandler } from 'express';

import { scrape } from '../services/scraper.service';

export const scrapePage: RequestHandler = async (req, res, next) => {
  try {
    const { url } = req.query;

    if (typeof url !== 'string' || !url) {
      res.status(400).json({
        message: 'Query parameter "url" is required',
      });
      return;
    }

    const result = await scrape(url);
    res.json(result);
  } catch (error) {
    next(error);
  }
};
