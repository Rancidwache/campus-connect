import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import * as ctrl from './notifications.controller.js';

const router = Router();

router.get('/', requireAuth, ctrl.list);
router.post('/read', requireAuth, validate(ctrl.markReadSchema), ctrl.markRead);

export default router;
