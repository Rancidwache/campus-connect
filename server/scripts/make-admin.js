// Promote / demote a moderator:  node scripts/make-admin.js <phone> [--off]
import { PrismaClient } from '@prisma/client';
import { normalizeKePhone } from '../src/lib/phone.js';

const prisma = new PrismaClient();
const [, , rawPhone, flag] = process.argv;

if (!rawPhone) {
  console.error('Usage: node scripts/make-admin.js <phone> [--off]');
  process.exit(1);
}

const phone = normalizeKePhone(rawPhone);
const isAdmin = flag !== '--off';

const user = await prisma.user
  .update({ where: { phoneNumber: phone }, data: { isAdmin } })
  .catch(() => null);

if (!user) console.error(`No user with phone ${phone}`);
else console.log(`${user.userName} (${phone}) isAdmin = ${user.isAdmin}`);

await prisma.$disconnect();
process.exit(user ? 0 : 1);
