import { asyncHandler } from '../../middleware/asyncHandler.js';
import * as authService from './auth.service.js';

export const register = asyncHandler(async (req, res) => {
  const { user, otp } = await authService.register(req.body);
  res.status(201).json({
    message: 'Account created. Enter the code we sent by SMS to verify your phone.',
    user,
    ...otp, // { devCode } only when OTP_DEV_ECHO=true
  });
});

export const verifyPhone = asyncHandler(async (req, res) => {
  const result = await authService.verifyPhone(req.body);
  res.json({ message: 'Phone verified.', ...result });
});

export const resendVerification = asyncHandler(async (req, res) => {
  const otp = await authService.resendVerification(req.body);
  res.json({ message: 'If that number needs verifying, a new code has been sent.', ...otp });
});

export const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);
  if (result.needsVerification) {
    res.status(403).json({
      message: 'Verify your phone number to finish signing in. A new code has been sent.',
      needsVerification: true,
      phoneNumber: result.phoneNumber,
      ...result.otp,
    });
    return;
  }
  res.json({ message: 'Signed in.', ...result });
});
