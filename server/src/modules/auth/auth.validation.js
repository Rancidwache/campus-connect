import { z } from 'zod';

const phone = z.string().min(9, 'Phone number is required').max(20);
const password = z.string().min(8, 'Password must be at least 8 characters').max(128);
const code = z.string().regex(/^\d{6}$/, 'Enter the 6-digit code');

export const registerSchema = {
  body: z.object({
    fullName: z.string().min(2, 'Enter your name').max(120),
    phoneNumber: phone,
    password,
  }),
};

export const verifyPhoneSchema = {
  body: z.object({ phoneNumber: phone, code }),
};

export const resendSchema = {
  body: z.object({ phoneNumber: phone }),
};

export const loginSchema = {
  body: z.object({ phoneNumber: phone, password: z.string().min(1, 'Password is required') }),
};
