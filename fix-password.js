const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function main() {
  const prisma = new PrismaClient();
  const hash = await bcrypt.hash('Pun12345', 10);
  await prisma.user.update({
    where: { email: 'kittanat.pun@gmail.com' },
    data: { password_hash: hash },
  });
  console.log('✅ Password updated successfully');
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
