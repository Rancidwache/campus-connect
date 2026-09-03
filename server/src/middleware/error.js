import { Prisma } from '@prisma/client';
import { AppError } from '../lib/errors.js';
import { env } from '../config/env.js';

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  let statusCode = 500;
  let body = { error: 'Internal server error', code: 'INTERNAL' };

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    body = { error: err.message, code: err.code };
    if (err.details) body.details = err.details;
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      statusCode = 409;
      body = {
        error: `A record with that ${(err.meta?.target || ['value']).join(', ')} already exists`,
        code: 'CONFLICT',
      };
    } else if (err.code === 'P2025') {
      statusCode = 404;
      body = { error: 'Not found', code: 'NOT_FOUND' };
    }
  } else if (err.type === 'entity.parse.failed') {
    statusCode = 400;
    body = { error: 'Malformed JSON body', code: 'BAD_REQUEST' };
  }

  if (statusCode >= 500) {
    console.error(`[error] ${req.method} ${req.originalUrl}`, err);
    if (!env.isProd) body.stack = err.stack;
  }

  res.status(statusCode).json(body);
}

export function notFoundHandler(req, res) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}`, code: 'NOT_FOUND' });
}
