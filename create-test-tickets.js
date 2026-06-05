const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();

  // หา admin user
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  // หา user ทั่วไป
  const users = await prisma.user.findMany({ where: { role: 'USER' }, take: 3 });
  // หา order
  const orders = await prisma.order.findMany({ take: 3, orderBy: { createdAt: 'desc' } });

  const tickets = [
    {
      ticketNo:  'TK-0001',
      userId:    users[0]?.id ?? null,
      email:     users[0]?.email ?? 'somchai@test.com',
      name:      users[0]?.name  ?? 'สมชาย ใจดี',
      subject:   'เติม Free Fire แล้วไม่ได้รับ Diamond',
      status:    'new',
      priority:  'high',
      category:  'topup',
      orderId:   orders[0]?.id ?? null,
    },
    {
      ticketNo:  'TK-0002',
      userId:    users[1]?.id ?? null,
      email:     users[1]?.email ?? 'pailin@test.com',
      name:      users[1]?.name  ?? 'ไพลิน สวยงาม',
      subject:   'ชำระเงินผ่าน PromptPay แต่ไม่มีการยืนยัน',
      status:    'inprogress',
      priority:  'urgent',
      category:  'payment',
      orderId:   orders[1]?.id ?? null,
    },
    {
      ticketNo:  'TK-0003',
      userId:    users[2]?.id ?? null,
      email:     users[2]?.email ?? 'nat@test.com',
      name:      users[2]?.name  ?? 'ณัฐ เก่งมาก',
      subject:   'ต้องการขอคืนเงิน กรอก UID ผิด',
      status:    'resolved',
      priority:  'normal',
      category:  'refund',
      orderId:   orders[2]?.id ?? null,
    },
    {
      ticketNo:  'TK-0004',
      email:     'guest@example.com',
      name:      'ผู้ใช้ทั่วไป',
      subject:   'สอบถามวิธีเติมเกม Mobile Legends',
      status:    'closed',
      priority:  'low',
      category:  'other',
      orderId:   null,
    },
  ];

  for (const t of tickets) {
    const ticket = await prisma.supportTicket.upsert({
      where:  { ticketNo: t.ticketNo },
      update: {},
      create: t,
    });

    // สร้าง messages
    await prisma.ticketMessage.createMany({
      data: [
        {
          ticketId:   ticket.id,
          userId:     t.userId ?? null,
          senderType: 'user',
          message:    `สวัสดีครับ ${t.subject} รบกวนช่วยดูให้หน่อยได้ไหมครับ`,
        },
        ...(t.status !== 'new' ? [{
          ticketId:   ticket.id,
          userId:     admin?.id ?? null,
          senderType: 'admin',
          message:    'สวัสดีครับ ทีมงานได้รับเรื่องแล้ว กำลังตรวจสอบให้ครับ',
        }] : []),
        ...(t.status === 'resolved' || t.status === 'closed' ? [{
          ticketId:   ticket.id,
          userId:     admin?.id ?? null,
          senderType: 'admin',
          message:    'ทีมงานได้ดำเนินการแก้ไขเรียบร้อยแล้วครับ หากมีปัญหาอื่นเพิ่มเติมสามารถแจ้งได้เลยครับ',
        }] : []),
      ],
    });

    // สร้าง history
    await prisma.ticketHistory.create({
      data: {
        ticketId:  ticket.id,
        adminId:   admin?.id ?? null,
        action:    'status_changed',
        fromValue: 'new',
        toValue:   t.status,
        note:      'สร้าง ticket ใหม่',
      },
    });

    console.log(`✅ Created ${t.ticketNo}: ${t.subject}`);
  }

  console.log('\n🎉 Test tickets created successfully!');
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
