import { ZodError } from 'zod';
import { badRequest } from '../lib/errors.js';

// Validate and REPLACE req.body / req.query / req.params with the parsed result.
// `schemas` is an object like { body: zodSchema, query: zodSchema }.
export const validate = (schemas) => (req, _res, next) => {
  try {
    for (const key of ['body', 'query', 'params']) {
      if (schemas[key]) req[key] = schemas[key].parse(req[key]);
    }
    next();
  } catch (err) {
    if (err instanceof ZodError) {
      const details = err.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      }));
      next(badRequest('Validation failed', details));
      return;
    }
    next(err);
  }
};
