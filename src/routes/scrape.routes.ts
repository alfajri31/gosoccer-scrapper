import { Router } from 'express';

import { scrapePage } from '../controllers/scrape.controller';

const router = Router();

router.get('/', scrapePage);

export default router;
