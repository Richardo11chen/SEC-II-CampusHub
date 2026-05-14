import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create a test user
  const user = await prisma.user.upsert({
    where: { studentId: '2024000001' },
    update: {},
    create: {
      studentId: '2024000001',
      passwordHash: '$2b$12$placeholder', // Replace with actual bcrypt hash
      nickname: '测试用户',
      creditScore: 70,
      role: 'student',
    },
  });

  console.log('Seed data created:', user.id);
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
