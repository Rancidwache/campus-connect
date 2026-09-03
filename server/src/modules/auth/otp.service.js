import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma.js';
import { env } from '../../config/env.js';
import { badRequest, tooManyRequests } from '../../lib/errors.js';
import { smsProvider } from './sms.provider.js';

function generateCode() {
  // 6-digit, zero-padded, uniformly distributed.
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

// Issue a fresh OTP for a user + purpose. Any earlier unconsumed codes for the
// same purpose are invalidated so only the newest code works.
export async function issueOtp(userId, phoneNumber, purpose) {
  const code = generateCode();
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + env.otp.ttlMinutes * 60 * 1000);

  await prisma.$transaction([
    prisma.otpCode.updateMany({
      where: { userId, purpose, consumedAt: null },
      data: { consumedAt: new Date() },
    }),
    prisma.otpCode.create({ data: { userId, purpose, codeHash, expiresAt } }),
  ]);

  const message = `Campus Connect verification code: ${code}. Valid for ${env.otp.ttlMinutes} minutes. Do not share it.`;
  await smsProvider.send(phoneNumber, message);

  return env.otp.devEcho ? { devCode: code } : {};
}

// Verify a submitted code. Throws on failure; returns the consumed record on success.
export async function verifyOtp(userId, purpose, submittedCode) {
  const record = await prisma.otpCode.findFirst({
    where: { userId, purpose, consumedAt: null },
    orderBy: { createdAt: 'desc' },
  });

  if (!record) throw badRequest('Request a new verification code');
  if (record.expiresAt < new Date()) throw badRequest('That code has expired — request a new one');
  if (record.attempts >= env.otp.maxAttempts) {
    throw tooManyRequests('Too many wrong attempts — request a new code');
  }

  const ok = await bcrypt.compare(String(submittedCode), record.codeHash);
  if (!ok) {
    await prisma.otpCode.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });
    throw badRequest('Incorrect verification code');
  }

  return prisma.otpCode.update({
    where: { id: record.id },
    data: { consumedAt: new Date() },
  });
}
