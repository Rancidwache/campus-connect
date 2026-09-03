import { Router } from 'express';
import { env } from '../../config/env.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import * as escrow from './escrow.service.js';

// Safaricom calls these — no auth token. Defence in depth:
//  1. an unguessable secret path segment (below)
//  2. a Safaricom IP allow-list at the Kong gateway (deployment concern)
const router = Router();

router.param('secret', (req, res, next, secret) => {
  if (secret !== env.mpesa.callbackSecret) {
    // Do not reveal that the path is otherwise valid.
    return res.status(404).json({ error: 'Not found' });
  }
  next();
});

// Daraja expects a prompt acknowledgement; processing happens regardless.
const ack = (res) => res.json({ ResultCode: 0, ResultDesc: 'Accepted' });

router.post(
  '/stk-callback/:secret',
  asyncHandler(async (req, res) => {
    await escrow.handleStkCallback(req.body);
    ack(res);
  }),
);

router.post(
  '/b2c/result/:secret',
  asyncHandler(async (req, res) => {
    await escrow.handleB2cResult(req.body);
    ack(res);
  }),
);

router.post(
  '/b2c/timeout/:secret',
  asyncHandler(async (req, res) => {
    await escrow.handleB2cTimeout(req.body);
    ack(res);
  }),
);

export default router;
