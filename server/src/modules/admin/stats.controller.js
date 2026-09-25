import { asyncHandler } from '../../middleware/asyncHandler.js';
import * as stats from './stats.service.js';

export const get = asyncHandler(async (_req, res) => {
  res.json(await stats.getStats());
});
