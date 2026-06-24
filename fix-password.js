//นำเข้า dotenv เพื่อให้อ่านไฟล์ .env ได้ทันที
require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function main() {
  const prisma = new PrismaClient();
  const targetPassword = process.env.ADMIN_DEFAULT_PASSWORD;
  
  if (!targetPassword) {
    throw new Error("Missing ADMIN_DEFAULT_PASSWORD in .env");
  }
  
  const hash = await bcrypt.hash(targetPassword, 10);
  await prisma.user.update({
    where: { email: process.env.EMAIL_USER },
    data: { password_hash: hash },
  });
  console.log('✅ Password updated successfully');
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
