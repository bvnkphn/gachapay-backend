const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function main() {
  const prisma = new PrismaClient();

  // รับค่าจาก command line: node add-admin.js email password "ชื่อ"
  // หรือถ้าไม่ระบุ password จะใช้ ADMIN_DEFAULT_PASSWORD จาก .env
  const [, , email, password, name] = process.argv;
  
  const defaultPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'Pass1234';
  const adminPassword = password || defaultPassword;

  if (!email) {
    console.log('วิธีใช้: node add-admin.js <email> [password] "[ชื่อ]"');
    console.log('ตัวอย่าง: node add-admin.js admin2@test.com Pass1234 "Admin คนที่ 2"');
    console.log('หมายเหตุ: ถ้าไม่ระบุ password จะใช้ ADMIN_DEFAULT_PASSWORD จาก .env');
    process.exit(1);
  }

  const hash = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where:  { email },
    update: { role: 'ADMIN', password_hash: hash, name: name ?? email },
    create: {
      email,
      password_hash: hash,
      name: name ?? email,
      role: 'ADMIN',
      provider: 'local',
      isEmailVerified: true,
    },
  });

  console.log(' สร้าง/อัปเดต Admin สำเร็จ:');
  console.log({ email: admin.email, name: admin.name, role: admin.role });

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });