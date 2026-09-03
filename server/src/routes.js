import { Router } from 'express';
import authRoutes from './modules/auth/auth.routes.js';
import usersRoutes from './modules/users/users.routes.js';
import listingsRoutes from './modules/listings/listings.routes.js';

const api = Router();

api.get('/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

api.use('/auth', authRoutes);
api.use('/users', usersRoutes);
api.use('/listings', listingsRoutes);

// Module 2 (escrow) and Module 3 (messaging) mount here in later phases.

export default api;
