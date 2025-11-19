import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.user.upsert({
    where: { email: 'demo@openactive.local' },
    update: {
      displayName: 'OpenActive Demo',
      username: 'demo.user',
      isActive: true,
    },
    create: {
      email: 'demo@openactive.local',
      displayName: 'OpenActive Demo',
      username: 'demo.user',
      role: 'SUPER_ADMIN',
    },
  });
}

main()
  .then(() => {
    console.log('✅ Seed data applied');
  })
  .catch((error) => {
    console.error('❌ Seeding failed', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

