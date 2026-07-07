# โปรแกรม API ตรวจสอบคูปอง - การตั้งค่าและเอกสาร

## ภาพรวม
API ตรวจสอบคูปองที่อิงตาม NestJS อย่างครอบคลุม รองรับ:
- ✅ การตรวจสอบวันหมดอายุ
- ✅ การติดตามการใช้ที่เหลือ
- ✅ เงื่อนไขการซื้อขั้นต่ำ
- ✅ ความพร้อมใช้งานของเกมบางเกมหรือแพ็กเกจ
- ✅ ขีดจำกัดการใช้ต่อผู้ใช้
- ✅ ส่วนลดแบบคงที่และตามเปอร์เซ็นต์
- ✅ การจัดการข้อผิดพลาดพร้อมข้อความภาษาไทย

## การเปลี่ยนแปลงฐานข้อมูล

### โมเดลใหม่ที่เพิ่มลงในโครงร่าง Prisma

1. **โมเดลคูปอง**
   - เก็บข้อมูลคูปอง
   - ติดตามจำนวนการใช้งาน
   - จัดการวันหมดอายุและวันเริ่มต้น
   - รองรับข้อจำกัดเกม/แพ็กเกจ

2. **โมเดลการใช้คูปอง**
   - บันทึกทุกครั้งที่มีการใช้คูปอง
   - ติดตามจำนวนส่วนลดและจำนวนเงินสุดท้าย
   - เชื่อมโยงกับผู้ใช้และคำสั่งเพื่อการตรวจสอบ

3. **Enum**
   - `CouponDiscountType`: FIXED, PERCENTAGE
   - `CouponStatus`: ACTIVE, EXPIRED, INACTIVE

## โครงสร้างโปรเจค

```
src/coupons/
├── coupons.controller.ts      # จุดปลายทาง API
├── coupons.service.ts         # ตรรมชาติและการตรวจสอบความถูกต้อง
├── coupons.module.ts          # ลงทะเบียนโมดูล
└── dto/
    ├── validate-coupon.dto.ts          # ร้องขอการตรวจสอบคูปอง
    ├── create-coupon.dto.ts            # ร้องขอสร้างคูปอง
    └── coupon-validation-response.dto.ts # ตอบสนองการตรวจสอบ
```

## คำแนะนำการตั้งค่า

### ขั้นตอนที่ 1: สร้างและเรียกใช้ Migration

```bash
# สร้างไฟล์ migration
npx prisma migrate dev --name add_coupon_models

# สร้างตารางใหม่:
# - coupons
# - coupon_usages

# ใช้ migration
npx prisma db push
```

### ขั้นตอนที่ 2: ติดตั้งโมดูลอีกครั้ง (หากจำเป็น)

```bash
npm install
# หรือ
yarn install
```

### ขั้นตอนที่ 3: เริ่มต้นแอปพลิเคชัน

```bash
npm run start:dev
# หรือ
yarn start:dev
```

## จุดปลายทาง API

### 1. ตรวจสอบคูปอง (จุดปลายทางหลัก)
**จุดปลายทาง:** `POST /coupons/validate`

**วัตถุประสงค์:** ตรวจสอบว่าคูปองนั้นถูกต้องและสามารถใช้ได้ภายใต้เงื่อนไขเฉพาะ

**เนื้อหาร้องขอ:**
```json
{
    "code": "SUMMER2024",
    "gameId": 1,
    "packageId": 5,
    "amount": 100
}
```

**พารามิเตอร์การสืบค้น:**
- `userId` (จำเป็น): รหัสผู้ใช้ที่ตรวจสอบคูปอง

**ตอบสนองสำเร็จ (200):**
```json
{
    "success": true,
    "message": "คูปองนี้สามารถใช้งานได้",
    "data": {
        "code": "SUMMER2024",
        "discountType": "PERCENTAGE",
        "discountValue": 20,
        "discountAmount": 20,
        "finalAmount": 80,
        "usageRemaining": 50
    }
}
```

**ตอบสนองข้อผิดพลาด (400):**
```json
{
    "success": false,
    "message": "คูปองนี้ไม่สามารถใช้งานได้ในกรณีนี้",
    "errors": [
        "คูปองนี้ไม่สามารถใช้สำหรับเกมที่เลือกได้",
        "จำนวนการซื้อขั้นต่ำสำหรับคูปองนี้คือ 500"
    ]
}
```

### การตรวจสอบความถูกต้องที่ดำเนินการ:
1. ✅ คูปองมีอยู่
2. ✅ คูปองใช้งานอยู่
3. ✅ อยู่ในช่วงวันที่ถูกต้อง (startDate ≤ ตอนนี้ ≤ expiryDate)
4. ✅ ไม่เกินจำนวนการใช้ (ทั้งหมด)
5. ✅ ไม่เกินขีดจำกัดการใช้ของผู้ใช้
6. ✅ สามารถใช้ได้กับเกมที่ระบุ (หากถูก จำกัด)
7. ✅ สามารถใช้ได้กับแพ็กเกจที่ระบุ (หากถูก จำกัด)
8. ✅ ตรงกับจำนวนการซื้อขั้นต่ำ

---

### 2. สร้างคูปอง (ผู้ดูแลระบบ)
**จุดปลายทาง:** `POST /coupons`

**เนื้อหาร้องขอ:**
```json
{
    "code": "NEWYEAR2024",
    "description": "เสนอพิเศษปีใหม่",
    "discountType": "PERCENTAGE",
    "discountValue": 25,
    "minimumAmount": 500,
    "maximumUses": 100,
    "usagePerUser": 3,
    "startDate": "2024-01-01T00:00:00Z",
    "expiryDate": "2024-12-31T23:59:59Z",
    "applicableGameIds": [1, 2, 3],
    "applicablePackageIds": [5, 6, 7],
    "isActive": true
}
```

**ตอบสนอง (201):**
```json
{
    "success": true,
    "message": "สร้างคูปองสำเร็จ",
    "data": {
        "id": 1,
        "uuid": "550e8400-e29b-41d4-a716-446655440000",
        "code": "NEWYEAR2024",
        "discountType": "PERCENTAGE",
        "discountValue": "25",
        "minimumAmount": "500",
        "maximumUses": 100,
        "currentUsageCount": 0,
        "usagePerUser": 3,
        "startDate": "2024-01-01T00:00:00.000Z",
        "expiryDate": "2024-12-31T23:59:59.000Z",
        "isActive": true,
        "createdAt": "2024-04-10T10:30:00.000Z",
        "updatedAt": "2024-04-10T10:30:00.000Z"
    }
}
```

---

### 3. ใช้คูปองต่อคำสั่ง
**จุดปลายทาง:** `POST /coupons/apply`

**เนื้อหาร้องขอ:**
```json
{
    "code": "SUMMER2024",
    "userId": "1",
    "orderId": "123",
    "usedAmount": 1000,
    "ipAddress": "192.168.1.1"
}
```

**ตอบสนอง (201):**
```json
{
    "success": true,
    "message": "ใช้คูปองสำเร็จ",
    "data": {
        "id": 1,
        "uuid": "660e8400-e29b-41d4-a716-446655440001",
        "couponId": 5,
        "userId": 1,
        "orderId": 123,
        "usedAmount": "1000",
        "discountAmount": "200",
        "usedAt": "2024-04-10T10:35:00.000Z",
        "ipAddress": "192.168.1.1"
    }
}
```

---

### 4. รับคูปองตามรหัส
**จุดปลายทาง:** `GET /coupons/:code`

**ตัวอย่าง:** `GET /coupons/SUMMER2024`

**ตอบสนอง (200):**
```json
{
    "success": true,
    "data": {
        "id": 1,
        "code": "SUMMER2024",
        "discountType": "PERCENTAGE",
        "discountValue": "20",
        "minimumAmount": "100",
        "maximumUses": 200,
        "currentUsageCount": 45,
        "usagePerUser": 1,
        "startDate": "2024-06-01T00:00:00.000Z",
        "expiryDate": "2024-12-31T23:59:59.000Z",
        "isActive": true
    }
}
```

---

### 5. รับคูปองทั้งหมด (ผู้ดูแลระบบ)
**จุดปลายทาง:** `GET /coupons`

**ตอบสนอง (200):**
```json
{
    "success": true,
    "data": [
        {
            "id": 1,
            "code": "SUMMER2024",
            ...
        },
        {
            "id": 2,
            "code": "NEWYEAR2024",
            ...
        }
    ]
}
```

---

### 6. รับประวัติคูปองของผู้ใช้
**จุดปลายทาง:** `GET /coupons/history/:userId`

**ตัวอย่าง:** `GET /coupons/history/1`

**ตอบสนอง (200):**
```json
{
    "success": true,
    "data": [
        {
            "id": 1,
            "couponId": 5,
            "userId": 1,
            "orderId": 100,
            "usedAmount": "1000",
            "discountAmount": "200",
            "usedAt": "2024-04-05T15:30:00.000Z",
            "coupon": {
                "code": "SUMMER2024",
                "discountType": "PERCENTAGE"
            }
        }
    ]
}
```

---

### 7. อัปเดตคูปอง (ผู้ดูแลระบบ)
**จุดปลายทาง:** `PUT /coupons/:id`

**เนื้อหาร้องขอ:**
```json
{
    "discountValue": 30,
    "maximumUses": 150,
    "isActive": false
}
```

**ตอบสนอง (200):**
```json
{
    "success": true,
    "message": "อัปเดตคูปองสำเร็จ",
    "data": { ... }
}
```

---

### 8. ลบคูปอง (ผู้ดูแลระบบ)
**จุดปลายทาง:** `DELETE /coupons/:id`

**ตอบสนอง (200):**
```json
{
    "success": true,
    "message": "ลบคูปองสำเร็จ"
}
```

---

## ข้อความแสดงข้อผิดพลาด (ภาษาไทย)

| การตรวจสอบความถูกต้อง | ข้อความแสดงข้อผิดพลาด |
|---|---|
| ไม่พบคูปอง | "คูปองนี้ไม่มีอยู่ในระบบ" |
| คูปองไม่ใช้งาน | "คูปองนี้ไม่ได้ถูกเปิดใช้งาน" |
| ยังไม่เริ่มใช้งาน | "คูปองนี้ยังไม่สามารถใช้งานได้ เริ่มใช้ได้วันที่ {date}" |
| หมดอายุ | "คูปองนี้หมดอายุแล้ว" |
| เกินขีดจำกัดการใช้ | "คูปองนี้ถูกใช้งานครบจำนวนที่กำหนดแล้ว" |
| ผู้ใช้เกินขีดจำกัด | "คุณได้ใช้คูปองนี้แล้ว {count} ครั้ง ไม่สามารถใช้มากกว่านี้ได้" |
| เกมไม่ถูกต้อง | "คูปองนี้ไม่สามารถใช้สำหรับเกมที่เลือกได้" |
| แพ็กเกจไม่ถูกต้อง | "คูปองนี้ไม่สามารถใช้สำหรับแพ็กเกจที่เลือกได้" |
| ไม่ตรงตามจำนวนขั้นต่ำ | "จำนวนการซื้อขั้นต่ำสำหรับคูปองนี้คือ {amount}" |

---

## ตัวอย่างการผสานรวม Frontend

### ตัวอย่าง React/TypeScript

```typescript
// coupons.api.ts
const validateCoupon = async (
    code: string,
    userId: number,
    gameId?: number,
    packageId?: number,
    amount?: number
) => {
    const response = await fetch(
        `/api/coupons/validate?userId=${userId}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                code,
                gameId,
                packageId,
                amount,
            }),
        }
    );
    
    return response.json();
};

// การใช้งานในส่วนประกอบ
const [couponCode, setCouponCode] = useState('');
const [validation, setValidation] = useState(null);

const handleValidate = async () => {
    const result = await validateCoupon(
        couponCode,
        userId,
        selectedGameId,
        selectedPackageId,
        totalAmount
    );
    
    setValidation(result);
    
    if (result.success) {
        console.log('ใช้ส่วนลด:', result.data.discountAmount);
        // อัปเดตยอดรวมคำสั่งพร้อมส่วนลด
        setFinalAmount(result.data.finalAmount);
    } else {
        // แสดงข้อความแสดงข้อผิดพลาด
        showAlert(result.message);
        result.errors?.forEach(err => console.error(err));
    }
};
```

---

## แผนผังโครงร่างฐานข้อมูล

```
┌─────────────┐
│   ผู้ใช้      │
├─────────────┤
│ id (PK)     │◄─────────────┐
│ email       │              │
└─────────────┘              │
                             │
┌──────────────┐          ┌──────────────────┐
│   คูปอง      │◄─────────│  การใช้คูปอง     │
├──────────────┤ 1    *   ├──────────────────┤
│ id (PK)      │          │ id (PK)          │
│ code (UNIQUE)│          │ couponId (FK)    │
│ discountType │          │ userId (FK)      │
│ discountValue│          │ orderId (FK)     │
│ expiryDate   │          │ usedAt           │
│ ...          │          │ discountAmount   │
└──────────────┘          └──────────────────┘
```

---

## หมายเหตุการดำเนินการ

### การจัดการทศนิยม
API ใช้ประเภท `Decimal` ของ Prisma สำหรับการคำนวณทางการเงินที่แม่นยำ:
```typescript
import { Decimal } from '@prisma/client/runtime/library';

// การคำนวณทศนิยมที่แม่นยำ
const discountAmount = new Decimal(usedAmount)
    .times(discountPercent)
    .dividedBy(100);
```

### การตรวจสอบวันที่
คูปองได้รับการตรวจสอบเทียบกับ `new Date()` เพื่อให้แน่ใจว่า:
- `startDate ≤ ตอนนี้ ≤ expiryDate`
- การเปรียบเทียบเวลาตามโซนเวลา

### การจัดการ BigInt
รหัสผู้ใช้และคูปองใช้ BigInt เพื่อความสามารถในการปรับขนาด:
```typescript
const userId = BigInt(userIdString);
```

---

## พิจารณาความปลอดภัย

1. **การตรวจสอบอินพุต**: DTO ทั้งหมดใช้ `class-validator`
2. **การจำกัดอัตรา**: ใช้กับจุดปลายทาง `/coupons/validate` เพื่อป้องกันการโจมตีแบบบรูตฟอร์ส
3. **ข้อมูลการตรวจสอบ**: การใช้คูปองทั้งหมดจะบันทึกไว้ผ่านโมเดล `CouponUsage` พร้อมที่อยู่ IP
4. **ลงนามสิทธิ์**: เพิ่มการป้องกันไปยังจุดปลายทางของผู้ดูแลระบบ (สร้าง อัปเดต ลบ)
5. **ป้องกันการฉีด SQL**: ได้รับการป้องกันโดย Prisma ORM

### เพิ่มการป้องกันการพิสูจน์อนุญาต (ขอแนะนำ)

```typescript
// ใน coupons.controller.ts
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Post()
@UseGuards(JwtAuthGuard) // ป้องกันจุดปลายทางซ่อมแซม
async createCoupon(@Body() createCouponDto: CreateCouponDto) {
    // ...
}
```

---

## การทดสอบ

### ตัวอย่างกรณีทดสอบที่ใช้ curl:

```bash
# 1. ตรวจสอบคูปอง
curl -X POST http://localhost:3000/coupons/validate?userId=1 \
  -H "Content-Type: application/json" \
  -d '{
    "code": "TEST2024",
    "gameId": 1,
    "packageId": 5,
    "amount": 1000
  }'

# 2. สร้างคูปอง (ต้องการการพิสูจน์อนุญาตของผู้ดูแลระบบ)
curl -X POST http://localhost:3000/coupons \
  -H "Content-Type: application/json" \
  -d '{
    "code": "ADMIN2024",
    "discountType": "FIXED",
    "discountValue": 100,
    "minimumAmount": 500,
    "maximumUses": 50,
    "usagePerUser": 2,
    "startDate": "2024-01-01T00:00:00Z",
    "expiryDate": "2024-12-31T23:59:59Z"
  }'

# 3. รับรายละเอียดคูปอง
curl http://localhost:3000/coupons/TEST2024

# 4. รับประวัติของผู้ใช้
curl http://localhost:3000/coupons/history/1
```

---

## การแก้ไขปัญหา

### Migration ล้มเหลว?
```bash
# รีเซ็ตฐานข้อมูล (พัฒนาเท่านั้น!)
npx prisma migrate reset

# หรือตรวจสอบสถานะการโยกย้าย
npx prisma migrate status
```

### ข้อผิดพลาด TypeScript กับ BigInt/Decimal?
```bash
# สร้างไคลเอนต์ Prisma ใหม่
npx prisma generate
```

### การตรวจสอบคูปองล้มเหลวเสมอ?
- ตรวจสอบวันที่คูปอง: `startDate ≤ ตอนนี้ ≤ expiryDate`
- ตรวจสอบว่า `isActive: true`
- ตรวจสอบว่า `maximumUses` ไม่ได้เกินขีดจำกัด
- ตรวจสอบว่า `gameId`/`packageId` ตรงกัน (หากมีข้อจำกัด)

---

## ขั้นตอนถัดไป

1. ✅ เรียกใช้ migration: `npx prisma migrate dev --name add_coupon_models`
2. ✅ ทดสอบจุดปลายทางด้วยตัวอย่าง curl ที่ให้มา
3. ⏳ เพิ่มการป้องกันการพิสูจน์อนุญาตไปยังจุดปลายทางของผู้ดูแลระบบ
4. ⏳ ผสานรวมกับแบบฟอร์มอินพุตคูปองของฟรอนต์เอนด์
5. ⏳ เพิ่มการจำกัดอัตราไปยัง `/coupons/validate`
6. ⏳ สร้างแดชบอร์ดผู้ดูแลระบบสำหรับการจัดการคูปอง

---

## การสนับสนุน

สำหรับคำถามหรือปัญหาเกี่ยวกับการตรวจสอบคูปอง โปรดตรวจสอบข้อความแสดงข้อผิดพลาดเป็นภาษาไทยซึ่งให้คำแนะนำที่ชัดเจนเกี่ยวกับสิ่งที่ผิดพลาด
