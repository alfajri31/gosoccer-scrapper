// Controller layer is intentionally disabled.
// The root endpoint currently calls the Wikipedia service directly from app.ts.
//
// import type { RequestHandler } from 'express';
// import { getOrStartWikipediaMasterSync } from '../services/wikipedia-master.service';
//
// export const syncWikipediaMaster: RequestHandler = (_req, res, next) => {
//   try {
//     const result = getOrStartWikipediaMasterSync();
//     const status = result.status === 'running' ? 202 : 200;
//
//     res.status(status).json({
//       message:
//         result.status === 'running'
//           ? 'Wikipedia master data synchronization is running'
//           : `Wikipedia master data synchronization ${result.status}`,
//       data: result,
//     });
//   } catch (error) {
//     next(error);
//   }
// };
