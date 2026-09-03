import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { authLimiter } from '../../middleware/rateLimit.js';
import * as ctrl from './auth.controller.js';
import {
  registerSchema,
  verifyPhoneSchema,
  resendSchema,
  loginSchema,
} from './auth.validation.js';

const router = Router();

router.use(authLimiter);

router.post('/register', validate(registerSchema), ctrl.register);
router.post('/verify-phone', validate(verifyPhoneSchema), ctrl.verifyPhone);
router.post('/resend-code', validate(resendSchema), ctrl.resendVerification);
router.post('/login', validate(loginSchema), ctrl.login);

export default router;
