import { asyncHandler } from '../../middleware/asyncHandler.js';
import * as escrow from './escrow.service.js';

export const getQuote = asyncHandler(async (req, res) => {
  res.json(await escrow.getQuote(req.query.listingId));
});

export const hire = asyncHandler(async (req, res) => {
  const result = await escrow.hire(req.user, req.body);
  res.status(201).json(result);
});

export const list = asyncHandler(async (req, res) => {
  res.json(await escrow.listTransactions(req.user.id, req.query));
});

export const getOne = asyncHandler(async (req, res) => {
  res.json(await escrow.getTransaction(req.user.id, req.params.id));
});

export const approve = asyncHandler(async (req, res) => {
  res.json(await escrow.approveDelivery(req.user.id, req.params.id));
});

export const decline = asyncHandler(async (req, res) => {
  res.json(await escrow.declineJob(req.user.id, req.params.id));
});

export const cancel = asyncHandler(async (req, res) => {
  res.json(await escrow.cancel(req.user.id, req.params.id));
});
