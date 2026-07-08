#!/bin/bash
# สคริปต์การตั้งค่าอย่างรวดเร็วสำหรับ Coupon Validation API

set -e

echo "🚀 Coupon Validation API - เริ่มต้นอย่างรวดเร็ว"
echo "================================================="

# ตรวจสอบว่าอยู่ในไดเรกทอรี่ที่ถูกต้อง
if [[ ! -f "package.json" ]]; then
    echo "❌ โปรดเรียกใช้สคริปต์นี้จากไดเรกทอรี่ gachapay-member-api"
    exit 1
fi

echo ""
echo "📦 ขั้นตอนที่ 1: ติดตั้งโมดูล..."
npm install --ignore-scripts

echo ""
echo "🗄️  ขั้นตอนที่ 2: เรียกใช้ migration ฐานข้อมูล..."
npx --no-install prisma migrate dev --name add_coupon_models

echo ""
echo "🌱 ขั้นตอนที่ 3: ปลูกข้อมูลคูปองตัวอย่าง..."
npx --no-install prisma db seed || echo "⚠️  ข้ามการปลูก (กำหนดค่า prisma seed ใน package.json หากจำเป็น)"

echo ""
echo "✅ เสร็จสิ้นการตั้งค่า!"
echo ""
echo "📝 ขั้นตอนถัดไป:"
echo "  1. เริ่มต้นเซิร์ฟเวอร์พัฒนา: npm run start:dev"
echo "  2. ทดสอบ API: curl http://localhost:3000/coupons"
echo "  3. อ่าน COUPON_API.md สำหรับเอกสารโดยละเอียด"
echo "  4. ผสานรวมส่วนประกอบฟรอนต์เอนด์จาก gachapay-member/src/components/CouponValidator.tsx"
echo ""
echo "🧪 การทดสอบอย่างรวดเร็ว:"
echo "  curl -X POST http://localhost:3000/coupons/validate?userId=1 \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"code\":\"WELCOME100\",\"amount\":1000}'"
echo ""
