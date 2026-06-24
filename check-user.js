
//นำเข้า dotenv เพื่อให้อ่านไฟล์ .env ได้ทันที
require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function main() {
  const prisma = new PrismaClient();

  // 2. ดึงค่าจากไฟล์ .env มาใช้งานผ่าน process.env
  const targetEmail = process.env.EMAIL_USER; 
  const targetPassword = process.env.ADMIN_DEFAULT_PASSWORD;

  // ตรวจสอบว่าใน .env มีค่าหรือไม่
  if (!targetEmail || !targetPassword) {
      throw new Error("Missing EMAIL_USER or ADMIN_DEFAULT_PASSWORD in .env");
  }

  // ดึง user จาก DB
  const user = await prisma.user.findUnique({
    where: { email: targetEmail },
    select: { email: true, password_hash: true, role: true, provider: true },
  });

  console.log('User found:', user);

  // ทดสอบ compare
  if (user?.password_hash) {
    const match = await bcrypt.compare(targetPassword, user.password_hash);
    console.log('Password match:', match);
  }

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });