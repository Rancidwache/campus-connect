import { asyncHandler } from '../../middleware/asyncHandler.js';
import * as svc from './payments.service.js';

export const list = asyncHandler(async (req, res) => {
  res.json(await svc.listTransactions(req.query));
});

export const exportCsv = asyncHandler(async (req, res) => {
  const csv = await svc.exportTransactionsCsv(req.query);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="transactions-${Date.now()}.csv"`);
  res.send(csv);
});
