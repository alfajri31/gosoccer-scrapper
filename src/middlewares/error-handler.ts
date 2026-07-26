import type { ErrorRequestHandler } from 'express';

type AppError = Error & {
  status?: number;
};

export const errorHandler: ErrorRequestHandler = (
  error: AppError,
  _req,
  res,
  _next,
) => {
  const status = error.status || 500;

  console.error(error);
  res.status(status).json({
    message: status === 500 ? 'Internal server error' : error.message,
  });
};
