import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Seed roles
  const adminRole = await prisma.role.upsert({
    where: { name: 'admin' },
    update: {},
    create: { name: 'admin' },
  });

  await prisma.role.upsert({
    where: { name: 'manager' },
    update: {},
    create: { name: 'manager' },
  });

  await prisma.role.upsert({
    where: { name: 'staff' },
    update: {},
    create: { name: 'staff' },
  });

  await prisma.role.upsert({
    where: { name: 'cashier' },
    update: {},
    create: { name: 'cashier' },
  });

  // Seed default branches
  const shopBranch = await prisma.branch.upsert({
    where: { id: BigInt(1) },
    update: {},
    create: {
      name: 'Main Shop',
      phone: '0000000000',
      address: 'Main Street',
      type: 'SHOP',
    },
  });

  await prisma.branch.upsert({
    where: { id: BigInt(2) },
    update: {},
    create: {
      name: 'Central Warehouse',
      phone: '0000000001',
      address: 'Warehouse Zone',
      type: 'WAREHOUSE',
    },
  });

  // Seed admin user
  const hashedPassword = await bcrypt.hash('Admin@1234', 10);
  await prisma.user.upsert({
    where: { email: 'admin@kingfox.com' },
    update: {},
    create: {
      email: 'admin@kingfox.com',
      name: 'Admin',
      password: hashedPassword,
      roleId: adminRole.id,
      branchId: shopBranch.id,
    },
  });

  console.log('✅ Database seeded successfully!');
  console.log('   Admin: admin@kingfox.com / Admin@1234');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
