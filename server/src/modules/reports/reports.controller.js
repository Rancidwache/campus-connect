import { asyncHandler } from '../../middleware/asyncHandler.js';
import * as reports from './reports.service.js';

// ── user ──
export const create = asyncHandler(async (req, res) => {
  res.status(201).json({ report: await reports.createReport(req.user.id, req.body) });
});

export const mine = asyncHandler(async (req, res) => {
  res.json({ reports: await reports.myReports(req.user.id) });
});

// ── moderation ──
export const queue = asyncHandler(async (req, res) => {
  res.json(await reports.listReports(req.query));
});

export const stats = asyncHandler(async (_req, res) => {
  res.json(await reports.reportStats());
});

export const update = asyncHandler(async (req, res) => {
  res.json({ report: await reports.updateReport(req.user.id, req.params.id, req.body) });
});

export const remove = asyncHandler(async (req, res) => {
  res.json(await reports.removeReportedContent(req.user.id, req.params.id, req.body));
});
