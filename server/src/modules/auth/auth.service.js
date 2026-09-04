import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma.js';
import { badRequest, conflict, unauthorized } from '../../lib/errors.js';
import { normalizeKePhone } from '../../lib/phone.js';
import { signAccessToken } from '../../lib/jwt.js';
import { issueOtp, verifyOtp } from './otp.service.js';

const PUBLIC_USER = {
  id: true,
  fullName: true,
  phoneNumber: true,
  phoneVerified: true,
  isAdmin: true,
  publicKey: true,
  createdAt: true,
};

export async function register({ fullName, phoneNumber, password }) {
  const phone = normalizeKePhone(phoneNumber);

  const existing = await prisma.user.findUnique({ where: { phoneNumber: phone } });
  if (existing) throw conflict('An account with that phone number already exists');

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { fullName: fullName.trim(), phoneNumber: phone, passwordHash },
    select: PUBLIC_USER,
  });

  const otp = await issueOtp(user.id, phone, 'PHONE_VERIFY');
  return { user, otp };
}

export async function resendVerification({ phoneNumber }) {
  const phone = normalizeKePhone(phoneNumber);
  const user = await prisma.user.findUnique({ where: { phoneNumber: phone } });
  // Do not leak whether the number is registered.
  if (!user || user.phoneVerified) return {};
  return issueOtp(user.id, phone, 'PHONE_VERIFY');
}

export async function verifyPhone({ phoneNumber, code }) {
  const phone = normalizeKePhone(phoneNumber);
  const user = await prisma.user.findUnique({ where: { phoneNumber: phone } });
  if (!user) throw badRequest('Request a new verification code');
  if (user.phoneVerified) {
    return { token: signAccessToken(user), user: pick(user) };
  }

  await verifyOtp(user.id, 'PHONE_VERIFY', code);
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { phoneVerified: true },
  });

  return { token: signAccessToken(updated), user: pick(updated) };
}

export async function login({ phoneNumber, password }) {
  const phone = normalizeKePhone(phoneNumber);
  const user = await prisma.user.findUnique({ where: { phoneNumber: phone } });
  if (!user) throw unauthorized('Wrong phone number or password');

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw unauthorized('Wrong phone number or password');

  if (!user.phoneVerified) {
    const otp = await issueOtp(user.id, phone, 'PHONE_VERIFY');
    return { needsVerification: true, phoneNumber: phone, otp };
  }

  return { token: signAccessToken(user), user: pick(user) };
}

function pick(user) {
  return {
    id: user.id,
    fullName: user.fullName,
    phoneNumber: user.phoneNumber,
    phoneVerified: user.phoneVerified,
    isAdmin: user.isAdmin,
    publicKey: user.publicKey,
    createdAt: user.createdAt,
  };
}
