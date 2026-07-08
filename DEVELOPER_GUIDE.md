# 🛠️ GachaPay Backend - คู่มือสำหรับนักพัฒนา (Developer Guide)

ยินดีต้อนรับสู่ระบบหลังบ้านของ **GachaPay** (NestJS API) เอกสารฉบับนี้จัดทำขึ้นเพื่อให้ฝั่งพัฒนาซอฟต์แวร์สามารถเริ่มตั้งค่าเครื่อง Local และเข้าถึงระบบฐานข้อมูลได้อย่างง่ายดายและรวดเร็ว

---

## ⚡ Quick Start (เริ่มด่วนใน 3 ขั้นตอน)

หากต้องการเริ่มพัฒนาอย่างรวดเร็วโดยใช้ฐานข้อมูลจำลองบน Docker ให้ทำตามคำสั่งนี้:

### 1. ติดตั้ง Packages
```bash
npm install
```

### 2. ตั้งค่าไฟล์ Environment
คัดลอกไฟล์เทมเพลตเริ่มต้น:
```bash
cp .env.example .env
```
*(ระบบทำงานได้ทันทีโดยไม่ต้องแก้ไขค่าใดๆ สำหรับ Docker Compose เริ่มต้น)*

### 3. สตาร์ทฐานข้อมูลและ Migration
```bash
# 1. รัน PostgreSQL Database ผ่าน Docker
docker compose up -d

# 2. ทำการ Migration โครงสร้างตาราง (พิมพ์ชื่อ 'init' เมื่อถูกถามชื่อ)
npx prisma migrate dev

# 3. ใส่ข้อมูลตัวอย่าง (Mock Data) เข้าระบบ
npm run prisma:seed

# 4. เริ่มต้น NestJS ในโหมดพัฒนา
npm run start:dev
```

---

## 🔐 รายละเอียดไฟล์ Environment (`.env`)

ระบบหลังบ้านใช้ตัวแปรสภาพแวดล้อมสำคัญดังต่อไปนี้ (สามารถเปิดไฟล์ `.env` เพื่อตรวจสอบ):

### 1. Database Connection
* **`DATABASE_URL`**: URL สำหรับใช้เชื่อมต่อกับฐานข้อมูล PostgreSQL
  * *ตัวอย่าง:* `postgresql://gachapay:gachapay1234@localhost:5432/game_topup_db?schema=public`
* **`DIRECT_URL`**: URL สำหรับเชื่อมต่อโดยตรง (ไม่ผ่าน Connection Pooler เช่น Supabase)
  * > [!IMPORTANT]
    > **ในการพัฒนาบนเครื่อง Local:** กำหนดให้ค่า `DIRECT_URL` เป็นค่าเดียวกันกับ `DATABASE_URL` เสมอ เพื่อให้การรันคำสั่ง Prisma Migration และ Prisma Studio ทำงานได้โดยไม่เกิด Error P1012

### 2. JWT & Security
* **`JWT_SECRET`**: คีย์ความลับใช้ลงลายเซ็นความปลอดภัยให้กับ Token ของสมาชิก (กำหนดให้ยาวและเดายากในระดับ Production)
* **`WEBHOOK_SECRET`**: คีย์สำหรับป้องกัน Webhook Endpoint
  * **Local Dev**: ปล่อยว่างหรือข้ามได้ (ระบบจะข้ามการตรวจสอบลายเซ็นอัตโนมัติหากตรวจสอบพบว่าทำงานอยู่ในเครื่อง Local)
  * **Production (Host)**: ต้องกำหนดค่านี้ เพื่อตรวจสอบข้อมูลจากผู้ให้บริการรับชำระเงิน (Payment Gateway)

---

## 🐳 การใช้งานฐานข้อมูลจำลอง (Docker Compose)

ในโปรเจกต์มีไฟล์ `compose.yaml` สำหรับการรันฐานข้อมูลจำลองขึ้นมาโดยไม่ต้องติดตั้ง PostgreSQL ลงในเครื่องโดยตรง:

* **คำสั่งเปิดการทำงานฐานข้อมูล:**
  ```bash
  docker compose up -d
  ```
* **คำสั่งปิดฐานข้อมูล:**
  ```bash
  docker compose down
  ```
* **คำสั่งดูประวัติการทำงานฐานข้อมูล (Logs):**
  ```bash
  docker logs postgres-db
  ```

---

## 🗃️ การจัดการข้อมูลด้วย Prisma ORM

* **เข้าถึง UI จัดการข้อมูล (Prisma Studio):**
  ```bash
  npx prisma studio
  ```
  *(เปิดเบราว์เซอร์อัตโนมัติไปที่ [http://localhost:5555](http://localhost:5555))*

* **อัปเดตสคีมาตารางเมื่อมีการแก้ไข `schema.prisma`:**
  ```bash
  npx prisma migrate dev --name <ชื่อการแก้ไข>
  ```

* **ล้างข้อมูลเก่าและเติมข้อมูลตัวอย่าง (Seed):**
  ```bash
  npm run prisma:seed
  ```

---

## 📁 โครงสร้างโปรเจกต์ (Project Directory)

```
backend/
├── src/
│   ├── auth/            # ระบบสมัครสมาชิก, เข้าสู่ระบบ, OAuth และ Email
│   ├── users/           # ข้อมูลและการจัดการสมาชิก
│   ├── games/           # บริการคลังเกมและนำเข้าข้อมูลเกมภายนอก
│   ├── packages/        # การจัดการราคาแพ็กเกจเติมเงินและโปรโมชัน Flash Sale
│   ├── orders/          # การจัดการใบสั่งซื้อและการเช็คความถูกต้อง (Verification)
│   ├── payments/        # จัดการรายการชำระเงิน (PromptPay, TrueMoney, Stripe ฯลฯ)
│   ├── webhooks/        # ตัวรับเหตุการณ์สถานะบิลจาก Payment Gateway (Webhook)
│   ├── prisma/          # ตัวเชื่อมต่อฐานข้อมูล PrismaService
│   └── main.ts          # ไฟล์หลักในการ Boot เซิร์ฟเวอร์
├── prisma/
│   ├── schema.prisma    # ไฟล์จำลองความสัมพันธ์ตารางของฐานข้อมูล (Database Schema)
│   └── seed.ts          # สคริปต์สุ่มเติมข้อมูลจำลอง
└── Dockerfile           # คอนฟิกการ Deploy คอนเทนเนอร์บน Host
```
