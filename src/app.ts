import cors from 'cors';
import express, { type Request, type Response } from 'express';

import { errorHandler } from './middlewares/error-handler';
import scrapeRoutes from './routes/scrape.routes';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.use('/api/scrape', scrapeRoutes);
app.use(errorHandler);

export default app;
