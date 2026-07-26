import cors from 'cors';
import express, { type Request, type Response } from 'express';

import { errorHandler } from './middlewares/error-handler';
// import { getOrStartWikipediaMasterSync } from './services/wikipedia-master.service';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// app.get('/', (_req: Request, res: Response) => {
//   const result = getOrStartWikipediaMasterSync();
//   const status = result.status === 'running' ? 202 : 200;
//
//   res.status(status).json({
//     message:
//       result.status === 'running'
//         ? 'Wikipedia master data synchronization is running'
//         : `Wikipedia master data synchronization ${result.status}`,
//     data: result,
//   });
// });
app.use(errorHandler);

export default app;
