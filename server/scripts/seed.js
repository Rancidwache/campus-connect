import bcrypt from 'bcryptjs';
import { prisma } from '../src/lib/prisma.js';

const USERS = [
  { fullName: 'Amina Wanjiku', phoneNumber: '+254712000001' },
  { fullName: 'Brian Otieno', phoneNumber: '+254712000002' },
  { fullName: 'Cynthia Mwikali', phoneNumber: '+254712000003' },
];

const LISTINGS = [
  {
    ownerPhone: '+254712000001',
    categoryType: 'DIGITAL',
    category: 'Graphic Design',
    title: 'Logo and brand kit for small businesses',
    description:
      'I design clean, modern logos plus a matching colour palette and social media kit. Two revisions included. Turnaround 3 days.',
    price: 3500,
    location: 'Nairobi',
  },
  {
    ownerPhone: '+254712000001',
    categoryType: 'DIGITAL',
    category: 'Tutoring',
    title: 'High school Mathematics tutoring (online)',
    description:
      'KCSE-focused maths tutoring over video call. Form 1 to Form 4. Past-paper practice every session.',
    price: 800,
    location: 'Online',
  },
  {
    ownerPhone: '+254712000002',
    categoryType: 'PHYSICAL',
    category: 'Camera Hire',
    title: 'Canon EOS 90D + 18-135mm lens for weekend hire',
    description:
      'Well-maintained DSLR kit for events and shoots. Includes two batteries, charger, 64GB card and a bag. ID and deposit required.',
    price: 2500,
    location: 'Westlands, Nairobi',
  },
  {
    ownerPhone: '+254712000002',
    categoryType: 'PHYSICAL',
    category: 'Event Equipment',
    title: 'PA speaker + mic set for small events',
    description:
      '400W powered speaker with one wired and one wireless mic. Good for gigs of up to ~80 people. Pickup or local delivery.',
    price: 1800,
    location: 'Kasarani, Nairobi',
  },
  {
    ownerPhone: '+254712000003',
    categoryType: 'DIGITAL',
    category: 'Photography',
    title: 'Event photography — half day',
    description:
      'Birthdays, ruracios, small corporate events. 4 hours of coverage, 60+ edited photos delivered within a week.',
    price: 6000,
    location: 'Nairobi & environs',
  },
  {
    ownerPhone: '+254712000003',
    categoryType: 'PHYSICAL',
    category: 'Music Equipment',
    title: 'Yamaha keyboard (61 keys) for hire',
    description:
      'Portable keyboard with stand and sustain pedal. Ideal for church services, rehearsals and lessons. Weekly rates available.',
    price: 1200,
    location: 'Ngong Road, Nairobi',
  },
];

async function main() {
  const passwordHash = await bcrypt.hash('Password123', 12);

  for (const u of USERS) {
    // First seed user doubles as the demo moderator.
    const isAdmin = u.phoneNumber === USERS[0].phoneNumber;
    await prisma.user.upsert({
      where: { phoneNumber: u.phoneNumber },
      update: { isAdmin },
      create: { ...u, passwordHash, phoneVerified: true, isAdmin },
    });
  }

  const byPhone = Object.fromEntries(
    (await prisma.user.findMany()).map((u) => [u.phoneNumber, u.id]),
  );

  // Reset demo listings so the seed is idempotent.
  await prisma.listing.deleteMany({ where: { userId: { in: Object.values(byPhone) } } });

  for (const l of LISTINGS) {
    const { ownerPhone, ...rest } = l;
    await prisma.listing.create({ data: { ...rest, userId: byPhone[ownerPhone] } });
  }

  console.log(
    `Seeded ${USERS.length} users (password: "Password123") and ${LISTINGS.length} listings.`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
