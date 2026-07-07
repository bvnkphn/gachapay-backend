const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function main() {
  const prisma = new PrismaClient();
  
  // ดึง user จาก DB
  const user = await prisma.user.findUnique({
    where: { email: 'kittanat.pun@gmail.com' },
    select: { email: true, password_hash: true, role: true, provider: true },
  });
  
  console.log('User found:', user);
  
  // ทดสอบ compare
  if (user?.password_hash) {
    const match = await bcrypt.compare('Pun12345', user.password_hash);
    console.log('Password match:', match);
  }
  
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
