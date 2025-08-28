import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Hash the password
  const hashedPassword = await bcrypt.hash('tilak@123', 10);

  // Create super admin user
  const superAdmin = await prisma.user.upsert({
    where: { email: 'tilak.a@codiste.com' },
    update: {},
    create: {
      email: 'tilak.a@codiste.com',
      password: hashedPassword,
      role: UserRole.SUPER_ADMIN,
      name: 'Tilak Admin',
    },
  });

  console.log({ superAdmin });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
