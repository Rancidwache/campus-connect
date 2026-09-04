import { Router } from 'express';
import { env } from './config/env.js';
import authRoutes from './modules/auth/auth.routes.js';
import usersRoutes from './modules/users/users.routes.js';
import listingsRoutes from './modules/listings/listings.routes.js';
import escrowRoutes from './modules/payments/escrow.routes.js';
import mpesaRoutes from './modules/payments/mpesa.routes.js';
import notificationsRoutes from './modules/notifications/notifications.routes.js';
import messagesRoutes from './modules/messages/messages.routes.js';

const api = Router();

api.get('/health', (_req, res) =>
  res.json({ status: 'ok', mpesaMode: env.mpesa.mode, time: new Date().toISOString() }),
);

api.use('/auth', authRoutes);
api.use('/users', usersRoutes);
api.use('/listings', listingsRoutes);
api.use('/transactions', escrowRoutes); // Module 2 — HustleGuard escrow
api.use('/mpesa', mpesaRoutes); // Safaricom Daraja callbacks
api.use('/notifications', notificationsRoutes);
api.use('/messages', messagesRoutes); // Module 3 — E2EE messaging (blind relay)

export default api;
