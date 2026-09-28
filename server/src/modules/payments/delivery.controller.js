import { asyncHandler } from '../../middleware/asyncHandler.js';
import * as svc from './delivery.service.js';
import { getTransaction } from './escrow.service.js';

export const submitProof = asyncHandler(async (req, res) => {
  await svc.submitDeliveryProof(req.user.id, Number(req.params.id), req.files, req.body.note);
  const { transaction } = await getTransaction(req.user.id, Number(req.params.id));
  res.status(201).json({ transaction });
});

export const dispute = asyncHandler(async (req, res) => {
  await svc.disputeDelivery(req.user.id, Number(req.params.id), req.body);
  const { transaction } = await getTransaction(req.user.id, Number(req.params.id));
  res.status(201).json({ transaction });
});
