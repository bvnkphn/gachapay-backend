const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  await prisma.systemSetting.upsert({
    where: { key: 'maintenance_enabled' },
    update: { value: 'false' },
    create: { key: 'maintenance_enabled', value: 'false' },
  });
  console.log('✅ Maintenance mode disabled');
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
