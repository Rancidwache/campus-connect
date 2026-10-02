import { asyncHandler } from '../../middleware/asyncHandler.js';
import * as bugs from './bugs.service.js';

export const create = asyncHandler(async (req, res) => {
  const report = await bugs.createBugReport(req.user?.id, req.body, req.headers['user-agent']);
  res.status(201).json({ report });
});

export const list = asyncHandler(async (req, res) => {
  res.json(await bugs.listBugReports(req.query));
});

export const update = asyncHandler(async (req, res) => {
  res.json({ report: await bugs.updateBugReport(req.params.id, req.body) });
});
