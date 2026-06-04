import { PrismaClient } from '@prisma/client';
import { encryptPhone } from '../src/utils/crypto.js';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Password: test1234 (bcrypt hash generated with 12 rounds)
  const PASSWORD_HASH = '$2b$12$AKi461ut5zqXswoer5DdC.pmea3Srd94LXO9PtfNli1NcJHFWCPF.';

  // 用户 A — 发布者
  const userA = await prisma.user.upsert({
    where: { studentId: '2024000001' },
    update: {},
    create: {
      studentId: '2024000001',
      passwordHash: PASSWORD_HASH,
      nickname: '张三',
      name: '张三',
      college: '计算机科学与技术系',
      phoneEncrypted: encryptPhone('13812340001'),
      email: 'zhangsan@example.com',
      creditScore: 70,
      role: 'student',
      showRealName: false,
      status: '正常',
    },
  });

  // 用户 B — 服务方/接单者
  const userB = await prisma.user.upsert({
    where: { studentId: '2024000002' },
    update: {},
    create: {
      studentId: '2024000002',
      passwordHash: PASSWORD_HASH,
      nickname: '李四',
      name: '李四',
      college: '软件学院',
      phoneEncrypted: encryptPhone('13812340002'),
      email: 'lisi@example.com',
      creditScore: 70,
      role: 'student',
      showRealName: true,
      status: '正常',
    },
  });

  console.log('Seed data created:', userA.id, userB.id);
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
