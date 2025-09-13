import { PrismaClient } from '@prisma/client';

import { adminUserSeed } from './seeds/admin-user.seed';

const prisma = new PrismaClient();

async function main() {
  await adminUserSeed();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
