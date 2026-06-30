import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const defaultFaqs = [
  // การเติมเงิน (topup)
  {
    category: "topup",
    question: "เติมเกมแล้วจะได้รับไอเทมภายในกี่นาที?",
    answer: "โดยปกติระบบจะดำเนินการส่งไอเทมให้ภายใน 1-5 นาที หลังจากชำระเงินสำเร็จ\n\nในกรณีที่มีปัญหา ทีมงานจะดำเนินการให้ภายใน 24 ชั่วโมง",
    order: 1,
  },
  {
    category: "topup",
    question: "สามารถเติมเงินให้เพื่อนได้หรือไม่?",
    answer: "ได้ครับ คุณสามารถเติมเงินให้เพื่อนได้โดยใส่ Player ID ของเพื่อนในขั้นตอนการเติมเงิน\n\nกรุณาตรวจสอบ Player ID ให้ถูกต้องก่อนทำรายการ เพราะเราไม่สามารถคืนเงินหรือโอนย้ายไอเทมได้",
    order: 2,
  },
  {
    category: "topup",
    question: "มีขั้นต่ำในการเติมเงินหรือไม่?",
    answer: "ขึ้นอยู่กับแต่ละเกม โดยทั่วไปจะเริ่มต้นที่ 20 บาท\n\nคุณสามารถดูรายละเอียดแพ็คเกจของแต่ละเกมได้ในหน้าเกมนั้นๆ",
    order: 3,
  },

  // การชำระเงิน (payment)
  {
    category: "payment",
    question: "รองรับช่องทางการชำระเงินอะไรบ้าง?",
    answer: "เรารองรับหลายช่องทาง ได้แก่:\n\n• PromptPay (QR Code)\n• TrueMoney Wallet\n• Mobile Banking (ทุกธนาคาร)\n• บัตรเครดิต/เดบิต (Visa, Mastercard)\n• PayPal\n• Cryptocurrency (USDT, Bitcoin)",
    order: 4,
  },
  {
    category: "payment",
    question: "ชำระเงินแล้วแต่สถานะยังไม่เปลี่ยน ต้องทำอย่างไร?",
    answer: "กรุณารอสักครู่ ระบบอาจใช้เวลาประมวลผล 1-5 นาที\n\nหากเกิน 10 นาทีแล้วยังไม่ได้รับ กรุณาติดต่อทีมซัพพอร์ตพร้อมแนบหลักฐานการชำระเงิน (สลิป) และ Order ID",
    order: 5,
  },
  {
    category: "payment",
    question: "สามารถขอใบเสร็จได้หรือไม่?",
    answer: "ระบบจะออกใบเสร็จรับเงินแบบอิเล็กทรอนิกส์ให้โดยอัตโนมัติหลังจากชำระเงินสำเร็จ คุณสามารถเข้าไปดูและดาวน์โหลดได้ที่หน้า 'ประวัติการใช้งาน'",
    order: 6,
  },

  // ทั่วไป (general) / security / vip
  {
    category: "general",
    question: "CYBERPAY ปลอดภัยหรือไม่?",
    answer: "ปลอดภัย 100% ครับ ระบบของเราได้รับการเข้ารหัส SSL ความปลอดภัยสูง และเราเป็นตัวแทนเติมเกมอย่างเป็นทางการ ไม่มีการใช้โปรแกรมโกงหรือวิธีที่ผิดกฎหมายอย่างแน่นอน",
    order: 7,
  },
  {
    category: "general",
    question: "ข้อมูลส่วนตัวของฉันจะถูกเผยแพร่หรือไม่?",
    answer: "เรามีนโยบายความเป็นส่วนตัวที่เข้มงวด ข้อมูลส่วนตัวของคุณจะถูกเก็บเป็นความลับและใช้เพื่อการประมวลผลคำสั่งซื้อและพัฒนาบริการเท่านั้น ไม่มีการนำไปขายหรือเผยแพร่ให้บุคคลภายนอก",
    order: 8,
  },
  {
    category: "general",
    question: "VIP Tier คืออะไร?",
    answer: "ระบบ VIP Tier คือระดับสมาชิกที่จะได้รับสิทธิพิเศษเพิ่มเติม เช่น ส่วนลดค่าธรรมเนียม, การสะสมแต้มคูณสอง, หรือของรางวัลพิเศษในแต่ละเดือน ยิ่งเติมเยอะระดับ VIP ยิ่งสูงขึ้น",
    order: 9,
  },

  // การคืนเงิน (refund) / problem
  {
    category: "refund",
    question: "หากกรอกข้อมูลผิดพลาด (เช่น UID ผิด) จะทำอย่างไร?",
    answer: "กรุณาติดต่อทีมงานทันทีทางระบบแจ้งปัญหา (Support Ticket)\n\nอย่างไรก็ตาม หากระบบดำเนินการส่งไอเทมไปยัง UID นั้นสำเร็จแล้ว เราจะไม่สามารถดึงไอเทมคืนหรือคืนเงินได้ ดังนั้นโปรดตรวจสอบข้อมูลให้รอบคอบก่อนชำระเงิน",
    order: 10,
  },
  {
    category: "refund",
    question: "ต้องการขอคืนเงิน (Refund) ต้องทำอย่างไร?",
    answer: "เรามีนโยบายคืนเงินในกรณีที่ระบบเกิดความผิดพลาดและไม่สามารถส่งไอเทมให้คุณได้เท่านั้น\n\nหากพบปัญหาดังกล่าว กรุณาติดต่อทีมงานพร้อมแจ้ง Order ID เพื่อดำเนินการตรวจสอบและคืนเงินเข้ากระเป๋าเงินของคุณ",
    order: 11,
  },
  {
    category: "general",
    question: "เวลาทำการของทีมซัพพอร์ต?",
    answer: "ทีมงานฝ่ายบริการลูกค้าพร้อมช่วยเหลือคุณตลอด 24 ชั่วโมง ไม่มีวันหยุด ผ่านระบบตั๋วช่วยเหลือ (Support Ticket)",
    order: 12,
  },
];

async function main() {
  console.log('🗑️ Clearing existing FAQs...');
  await prisma.faqItem.deleteMany();

  console.log('🌱 Seeding default FAQs...');
  for (const faq of defaultFaqs) {
    await prisma.faqItem.create({
      data: {
        category: faq.category,
        question: faq.question,
        answer: faq.answer,
        order: faq.order,
        isActive: true,
      }
    });
  }
  console.log('✅ Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
