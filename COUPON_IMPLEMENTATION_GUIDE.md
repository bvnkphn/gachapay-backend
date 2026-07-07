# โปรแกรม API ตรวจสอบคูปอง - คำแนะนำการใช้งาน

## 📋 สิ่งที่สร้างขึ้น

API ตรวจสอบคูปองของคุณเสร็จสมบูรณ์พร้อม:

### ✅ Backend (NestJS)
- **โมเดลฐานข้อมูล**: Coupon และ CouponUsage พร้อม Prisma ORM
- **8 จุดปลายทาง RESTful**: สร้าง ตรวจสอบ ใช้ ดึง ลบคูปอง
- **การตรวจสอบความถูกต้องที่ครอบคลุม**: 8 การตรวจสอบครอบคลุมความต้องการทั้งหมด
- **การจัดการข้อผิดพลาด**: ข้อความแสดงข้อผิดพลาดเป็นภาษาไทยสำหรับสถานการณ์ทั้งหมด
- **ชั้นบริการ**: ตรรมชาติเพื่อการคำนวณส่วนลดและการติดตามการใช้งาน

### ✅ ฐานข้อมูล
- Enum: `CouponDiscountType` (FIXED, PERCENTAGE)
- โมเดล: `Coupon` - ข้อมูลคูปองหลักพร้อมการกำหนดค่า
- โมเดล: `CouponUsage` - บันทึกการใช้คูปองแต่ละครั้ง
- ดัชนี: แบบสอบถามที่เหมาะสมโดยอิงตามรหัส userId วันที่ สถานะกิจกรรม

### ✅ ตัวอย่างฟรอนต์เอนด์
- ไคลเอนต์ API: ฟังก์ชัน TypeScript สำหรับการเรียก API
- ส่วนประกอบ React: ส่วนประกอบที่นำกลับมาใช้ได้ CouponValidator
- ตัวอย่างการผสานรวม: การใช้งานหน้าชำระเงิน

---

## 🚀 เริ่มต้นอย่างรวดเร็ว (5 นาที)

### ขั้นตอนที่ 1: สร้าง Migration ฐานข้อมูล

```bash
cd gachapay-member-api
npx prisma migrate dev --name add_coupon_models
```

สิ่งนี้จะ:
- สร้างไฟล์ migration
- ใช้การเปลี่ยนแปลงกับ PostgreSQL
- อัปเดตไคลเอนต์ Prisma

### ขั้นตอนที่ 2: รีสตาร์ต Backend

```bash
npm run start:dev
```

### ขั้นตอนที่ 3: ทดสอบจุดปลายทางการตรวจสอบ

```bash
curl -X POST http://localhost:3000/coupons/validate?userId=1 \
  -H "Content-Type: application/json" \
  -d '{
    "code": "TEST2024",
    "gameId": 1,
    "packageId": 5,
    "amount": 1000
  }'
```

---

## 🔧 โครงสร้างไฟล์

```
gachapay-member-api/
├── src/coupons/
│   ├── coupons.controller.ts       # จุดปลายทาง API และการกำหนดเส้นทาง
│   ├── coupons.service.ts          # ตรรมชาติและการตรวจสอบความถูกต้อง
│   ├── coupons.module.ts           # ลงทะเบียนโมดูล
│   │
│   └── dto/
│       ├── validate-coupon.dto.ts           # DTO ร้องขอการตรวจสอบ
│       ├── create-coupon.dto.ts             # DTO ร้องขอสร้าง/อัปเดต
│       └── coupon-validation-response.dto.ts # DTO ปตอบสนอง
├── prisma/
│   ├── schema.prisma               # อัปเดตด้วยโมเดลคูปอง ✅
│   └── seed-coupons.ts             # ข้อมูลตัวอย่างสำหรับการทดสอบ
├── COUPON_API.md                   # เอกสาร API ที่สมบูรณ์

gachapay-member/
├── src/lib/
│   └── coupon-api.ts               # ไคลเอนต์ API ฟรอนต์เอนด์
├── src/components/
│   └── CouponValidator.tsx         # ส่วนประกอบการตรวจสอบ React
└── src/app/checkout/
    └── example.tsx                 # ตัวอย่างการผสานรวม
```

---

## 📡 ภาพรวมจุดปลายทาง API

### สำหรับผู้ใช้ฟรอนต์เอนด์:

| วิธี | จุดปลายทาง | วัตถุประสงค์ | ตัวอย่าง |
|--------|----------|---------|---------|
| **POST** | `/coupons/validate?userId={id}` | ตรวจสอบคูปอง | ตรวจสอบก่อนซื้อ |
| **POST** | `/coupons/apply` | ใช้กับคำสั่ง | บันทึกการใช้งาน |
| **GET** | `/coupons/:code` | รับรายละเอียดคูปอง | แสดงข้อมูลส่วนลด |
| **GET** | `/coupons/history/:userId` | ประวัติการใช้งานของผู้ใช้ | แสดงคูปองที่ผ่านมา |

### สำหรับผู้ดูแลระบบ:

| วิธี | จุดปลายทาง | วัตถุประสงค์ |
|--------|----------|---------|
| **POST** | `/coupons` | สร้างคูปองใหม่ |
| **GET** | `/coupons` | แสดงรายชื่อคูปองทั้งหมด |
| **PUT** | `/coupons/:id` | อัปเดตคูปอง |
| **DELETE** | `/coupons/:id` | ลบคูปอง |

---

## 🧪 การตรวจสอบความถูกต้องที่ดำเนินการ

เมื่อคุณเรียก `/coupons/validate` API จะตรวจสอบ:

1. ✅ **คูปองมีอยู่** - รหัสต้องอยู่ในฐานข้อมูล
2. ✅ **สถานะใช้งาน** - `isActive: true`
3. ✅ **วันที่เริ่มต้น** - วันปัจจุบัน >= startDate
4. ✅ **วันหมดอายุ** - วันปัจจุบัน <= expiryDate
5. ✅ **การใช้งานทั้งหมด** - ไม่เกิน `maximumUses`
6. ✅ **ขีดจำกัดต่อผู้ใช้** - ไม่เกิน `usagePerUser`
7. ✅ **การจำกัดเกม** - สามารถใช้ได้กับเกมที่เลือก (หากมีข้อจำกัด)
8. ✅ **การจำกัดแพ็กเกจ** - สามารถใช้ได้กับแพ็กเกจที่เลือก (หากมีข้อจำกัด)
9. ✅ **จำนวนขั้นต่ำ** - การซื้อ >= `minimumAmount`

หาก **ใดๆ** การตรวจสอบล้มเหลว → ตอบสนองข้อผิดพลาดพร้อมข้อความที่ชัดเจน

---

## 💾 ตัวอย่างฐานข้อมูล

### การสร้างคูปองในฐานข้อมูล

```sql
-- คูปองส่วนลดแบบคงที่
INSERT INTO coupons (
  code, 
  discount_type, 
  discount_value, 
  minimum_amount,
  maximum_uses,
  usage_per_user,
  start_date,
  expiry_date,
  is_active
) VALUES (
  'SUMMER100',
  'FIXED',
  100,
  500,
  50,
  1,
  NOW(),
  NOW() + INTERVAL '30 days',
  true
);

-- ส่วนลดเปอร์เซ็นต์ (สำหรับเกมเฉพาะ)
INSERT INTO coupons (
  code,
  discount_type,
  discount_value,
  minimum_amount,
  applicable_game_ids,
  start_date,
  expiry_date,
  is_active
) VALUES (
  'GAME20OFF',
  'PERCENTAGE',
  20,
  1000,
  '{1,2,3}'::bigint[],
  NOW(),
  NOW() + INTERVAL '30 days',
  true
);
```

### การติดตามการใช้คูปอง

ทุกครั้งที่มีการใช้คูปอง ระบบจะบันทึก:

```sql
SELECT 
  cu.id,
  cu.coupon_id,
  cu.user_id,
  c.code,
  cu.used_amount,
  cu.discount_amount,
  cu.used_at
FROM coupon_usages cu
JOIN coupons c ON cu.coupon_id = c.id
WHERE cu.user_id = 1
ORDER BY cu.used_at DESC;
```

---

## 🎯 กรณีการใช้งานทั่วไป

### กรณีที่ 1: คูปองส่วนลด 10% พื้นฐาน
```typescript
// Backend: สร้างคูปอง
const coupon = await couponsService.createCoupon({
  code: 'SAVE10',
  discountType: 'PERCENTAGE',
  discountValue: 10,
  minimumAmount: 0,
  maximumUses: 1000,
  usagePerUser: 1,
  startDate: '2024-04-10',
  expiryDate: '2024-12-31'
});

// Frontend: ตรวจสอบ
const validation = await validateCoupon(userId, {
  code: 'SAVE10',
  amount: 1000 // ผลลัพธ์ 900 หลังส่วนลด
});
```

### กรณีที่ 2: คูปองเฉพาะเกม
```typescript
// เฉพาะสำหรับ Mobile Legends (gameId: 1) และเกมอื่นๆ
const coupon = await couponsService.createCoupon({
  code: 'MOBILEGAME50',
  discountType: 'FIXED',
  discountValue: 50,
  applicableGameIds: [1, 2], // จำกัดให้เฉพาะเกมเหล่านี้
  maximumUses: 200,
  usagePerUser: 3
});

// การตรวจสอบจะล้มเหลวถ้าพยายามใช้กับเกมอื่น
```

### กรณีที่ 3: คูปองระดับ VIP
```typescript
// คูปองมูลค่าสูงสำหรับผู้ใช้ VIP
const coupon = await couponsService.createCoupon({
  code: 'VIP500',
  discountType: 'FIXED',
  discountValue: 500,
  minimumAmount: 5000, // เฉพาะสำหรับการซื้อ >= 5000
  maximumUses: 100,
  usagePerUser: 5, // สามารถใช้ได้ 5 ครั้งต่อผู้ใช้
  startDate: '2024-04-10',
  expiryDate: '2024-12-31'
});
```

---

## 🔒 แนวปฏิบัติด้านความปลอดภัย

### 1. เพิ่มการป้องกันการพิสูจน์อนุญาต

```typescript
// src/coupons/coupons.controller.ts
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Post()
@UseGuards(JwtAuthGuard) // ป้องกันจุดปลายทางสร้าง
async createCoupon(@Body() dto: CreateCouponDto) {
  // เฉพาะผู้ใช้ที่ยืนยันตัวตนเท่านั้นที่สามารถสร้างคูปอง
}
```

### 2. เพิ่มการจำกัดอัตรา

```bash
npm install @nestjs/throttler
```

```typescript
import { ThrottlerGuard } from '@nestjs/throttler';

@Post('validate')
@UseGuards(ThrottlerGuard)
async validateCoupon(
  @Body() validateDto: ValidateCouponDto,
  @Query('userId') userId: string
) {
  // ป้องกันการโจมตีแบบบรูตฟอร์ส
}
```

### 3. บันทึกการตรวจสอบ

ทุกการใช้คูปองรวมถึง:
- รหัสผู้ใช้
- รหัสคำสั่ง
- ที่อยู่ IP
- การประทับเวลา
- จำนวนส่วนลดที่ใช้

```typescript
// ติดตามโดยอัตโนมัติเสมอ
const usage = await couponsService.applyCoupon(
  code,
  userId,
  orderId,
  usedAmount,
  ipAddress // ไม่บังคับ แต่ขอแนะนำ
);
```

---

## 🛠 การแก้ไขปัญหา

### ปัญหา: Migration ล้มเหลว

```bash
# ตรวจสอบสถานะการโยกย้าย
npx prisma migrate status

# หากเสียหาย รีเซ็ต (พัฒนาเท่านั้น!)
npx prisma migrate reset

# จากนั้นใช้งานอีกครั้ง
npx prisma migrate dev
```

### ปัญหา: ข้อผิดพลาด TypeScript กับ BigInt/Decimal

```bash
# สร้างไคลเอนต์ Prisma ใหม่
npx prisma generate

# ล้างโมดูลโหนด และติดตั้งอีกครั้ง
rm -rf node_modules
npm install
```

### ปัญหา: การตรวจสอบคูปองล้มเหลวเสมอ

**ตรวจสอบสิ่งเหล่านี้:**

1. วันที่อยู่ในช่วงที่ถูกต้อง
   ```typescript
   const now = new Date();
   console.log('เริ่ม:', coupon.startDate, '≤', now);
   console.log('สิ้นสุด:', now, '≤', coupon.expiryDate);
   ```

2. isActive คือ true
   ```typescript
   console.log('ใช้งาน:', coupon.isActive);
   ```

3. ขีดจำกัดการใช้งาน
   ```typescript
   console.log('ใช้สูงสุด:', coupon.maximumUses);
   console.log('จำนวนปัจจุบัน:', coupon.currentUsageCount);
   ```

4. ข้อจำกัดเกม/แพ็กเกจตรงกัน
   ```typescript
   console.log('เกมที่ใช้ได้:', coupon.applicableGameIds);
   console.log('เกมที่ให้:', gameId);
   ```

---

## 📚 ขั้นตอนการผสานรวม

### ขั้นตอนที่ 1: ติดตั้งโมดูลของ Frontend
```bash
cd gachapay-member
npm install # หรือ yarn install
```

### ขั้นตอนที่ 2: เพิ่มไคลเอนต์ API
คัดลอก `src/lib/coupon-api.ts` ไปยังโปรเจคของคุณ

### ขั้นตอนที่ 3: เพิ่มส่วนประกอบ
คัดลอก `src/components/CouponValidator.tsx` ไปยังโปรเจคของคุณ

### ขั้นตอนที่ 4: ผสานรวมในหน้า
```tsx
import CouponValidator from '@/components/CouponValidator';

export default function CheckoutPage() {
  return (
    <CouponValidator
      userId={userId}
      gameId={selectedGameId}
      packageId={selectedPackageId}
      amount={totalPrice}
      onCouponValid={(response) => {
        // อัปเดตราคาพร้อมส่วนลด
        setFinalPrice(response.data.finalAmount);
      }}
    />
  );
}
```

---

## 📊 คูปองตัวอย่างที่จะสร้าง

ดูที่ `prisma/seed-coupons.ts` สำหรับคูปองตัวอย่าง:

1. **WELCOME100** - ส่วนลด 100 บาท
2. **SUMMER2024** - ลด 20% สำหรับเกมเฉพาะ
3. **GAME123BONUS** - คูปองเฉพาะเกม
4. **VIP500** - เฉพาะสมาชิก VIP

เรียกใช้การปลูก:
```bash
npx prisma db seed
```

---

## 🎓 เส้นทางการเรียนรู้

1. **อ่าน** [COUPON_API.md](./COUPON_API.md) สำหรับเอกสาร จุดปลายทาง ที่สมบูรณ์
2. **ตรวจสอบ** `src/coupons/coupons.service.ts` เพื่อทำความเข้าใจตรรมชาติ
3. **ทดสอบ** จุดปลายทางโดยใช้ตัวอย่าง curl ที่ให้มา
4. **ดำเนินการ** ส่วนประกอบฟรอนต์เอนด์จากไฟล์ตัวอย่าง
5. **เพิ่ม** การป้องกันความปลอดภัยและการจำกัดอัตรา
6. **ติดตาม** แนวโน้มการใช้คูปอง
7. **ปรับปรุง** แบบสอบถามฐานข้อมูลหากจำเป็น

---

## 📞 การอ้างอิงอย่างรวดเร็ว

### ตรวจสอบคูปอง (ที่พบบ่อยที่สุด)
```bash
curl -X POST \
  http://localhost:3000/coupons/validate?userId=1 \
  -H "Content-Type: application/json" \
  -d '{"code":"SUMMER2024","amount":1000}'
```

### สร้างคูปองทดสอบ
```bash
curl -X POST \
  http://localhost:3000/coupons \
  -H "Content-Type: application/json" \
  -d '{
    "code":"TEST2024",
    "discountType":"FIXED",
    "discountValue":100,
    "maximumUses":50,
    "usagePerUser":1,
    "startDate":"2024-04-10T00:00:00Z",
    "expiryDate":"2024-12-31T23:59:59Z"
  }'
```

### รับประวัติของผู้ใช้
```bash
curl http://localhost:3000/coupons/history/1
```

---

## ✅ รายการตรวจสอบก่อนเปิดใช้งาน

- [ ] ใช้งาน migration ฐานข้อมูลสำเร็จ
- [ ] ทดสอบ backend ผ่าน
- [ ] ผสานรวมส่วนประกอบฟรอนต์เอนด์
- [ ] เพิ่มการป้องกันการพิสูจน์อนุญาต
- [ ] กำหนดค่าการจำกัดอัตรา
- [ ] ทดสอบข้อความแสดงข้อผิดพลาด
- [ ] สร้างคูปองตัวอย่าง
- [ ] ติดตามประวัติการใช้งานของผู้ใช้
- [ ] เตรียมแดชบอร์ดผู้ดูแลระบบ
- [ ] ตั้งเวลางานการล้างคูปองที่หมดอายุ (ไม่บังคับ)

---

## 🚀 ขั้นตอนถัดไป

1. **ทันที**: เรียกใช้การโยกย้ายและทดสอบจุดปลายทาง
2. **วันนี้**: ผสานรวมส่วนประกอบฟรอนต์เอนด์
3. **สัปดาห์นี้**: เพิ่มการป้องกันการพิสูจน์อนุญาต
4. **สัปดาห์หน้า**: สร้างแผงผู้ดูแลระบบการจัดการคูปอง
5. **อนาคต**: เพิ่มแดชบอร์ดการวิเคราะห์สำหรับประสิทธิภาพคูปอง

---

## 📝 หมายเหตุ

- การคำนวณทางการเงินทั้งหมดใช้ประเภท Decimal เพื่อความถูกต้อง
- รหัสคูปองไม่คำนึงถึงขนาดตัวอักษร (เก็บเป็นตัวพิมพ์ใหญ่)
- เขตเวลาคือ UTC ในฐานข้อมูล
- ที่อยู่ IP บันทึกไว้เพื่อป้องกันการฉ้อโกง
- รองรับการใช้งานแบบไม่จำกัด (maximumUses: 0)

ขอแสดงความยินดี! API ตรวจสอบคูปองของคุณพร้อมใช้งาน! 🎉
