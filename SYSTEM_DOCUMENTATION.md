# 📑 Gachapay System Documentation

เอกสารฉบับนี้อธิบายรายละเอียดสถาปัตยกรรม โครงสร้างฐานข้อมูล ระบบหลังบ้าน (Backend) และระบบหน้าบ้าน (Frontend) ของโปรเจกต์ **Gachapay** (แพลตฟอร์มเติมเงินเกม) เพื่อความสะดวกในการดูแลและพัฒนาระบบต่อในอนาคต

---

## 📂 โครงสร้างโปรเจกต์ (Project Structure)
โปรเจกต์ถูกแบ่งออกเป็น 2 ส่วนหลักแบบ Monorepo ในโฟลเดอร์เดียวกัน:
```
gachapay/
├── backend/          # NestJS Web API (TypeScript)
└── frontend/         # Next.js App Router (TypeScript + Tailwind/CSS)
```

---

## 🗄️ 1. โครงสร้างฐานข้อมูล (Database Schema)
ระบบใช้ **PostgreSQL** เป็นฐานข้อมูลหลัก ร่วมกับ **Prisma ORM** ในการควบคุม Schema ทั้งหมดของระบบ

### แผนภาพความสัมพันธ์และตารางฐานข้อมูลหลัก
ตารางทั้งหมดเชื่อมโยงกันด้วย `id` และมีการป้องกันสิทธิ์ด้วย Foreign Key Constraints อย่างรัดกุม:

| ชื่อตาราง (Table Name) | หน้าที่หลัก | ฟิลด์ที่สำคัญ |
| :--- | :--- | :--- |
| **`users`** | เก็บข้อมูลสมาชิกและยอดเหรียญ | `id`, `uuid`, `email`, `passwordHash`, `role` (user/admin), `wallet_balance` |
| **`user_addresses`** | เก็บที่อยู่และเบอร์โทรติดต่อจริง | `id`, `userId`, `recipientName`, `phone`, `addressLine1`, `addressLine2`, `subDistrict`, `district`, `province`, `postalCode`, `isDefault` |
| **`game_categories`** | หมวดหมู่ประเภทเกม | `id`, `name`, `slug`, `icon` |
| **`games`** | ข้อมูลเกมที่เปิดให้บริการ | `id`, `name`, `slug`, `icon`, `banner`, `isActive`, `categoryId` |
| **`game_packages`** | แพ็กเกจของแต่ละเกม | `id`, `gameId`, `name`, `price`, `originalPrice`, `coins` |
| **`orders`** | รายการสั่งซื้อการเติมเกมของผู้ใช้ | `id`, `userId`, `gameId`, `packageId`, `packageName`, `packagePrice`, `uid` (ไอดีเกมปลายทาง), `status` (pending/completed/cancelled) |
| **`topup_transactions`**| รายการธุรกรรมเติมเงิน/เติมคอยน์เข้าระบบ | `id`, `referenceId`, `amount`, `status` (pending/completed/failed/expired), `expiresAt` |
| **`payment_methods`** | ช่องทางการชำระเงินที่รองรับ | `id`, `code` (promptpay/truemoney), `name`, `feePercent` |

---

## 🛡️ 2. ระบบหลังบ้าน (Backend - NestJS Web API)
สถาปัตยกรรมใช้รูปแบบ Modular Architecture ของ **NestJS** ในการแบ่งส่วนการทำงาน

### เทคโนโลยีหลักที่ใช้งาน (Core Stack)
- **Runtime:** Node.js v22+
- **Framework:** NestJS
- **ORM:** Prisma Client
- **Authentication:** Passport.js JWT (`JwtStrategy`)
- **Validation:** Class-validator & Class-transformer

### API Endpoints สำคัญ (RESTful API)

#### 🔐 ระบบยืนยันตัวตน (Authentication)
- `POST /api/auth/register` : สมัครสมาชิก
- `POST /api/auth/login` : เข้าสู่ระบบ และรับ JWT Token
- `GET /api/auth/me` : ดึงข้อมูลผู้ใช้ปัจจุบันจาก JWT token
- `POST /api/auth/send-otp` : ส่งรหัส OTP ไปยังอีเมล
- `POST /api/auth/verify-otp` : ยืนยัน OTP เพื่อรีเซ็ตรหัสผ่าน

#### 📦 ระบบจัดการที่อยู่ผู้ใช้ (User Addresses)
- `GET /api/users/me/addresses` : ดึงข้อมูลรายการที่อยู่ทั้งหมดของผู้ใช้
- `POST /api/users/me/addresses` : เพิ่มที่อยู่ใหม่ (ที่อยู่แรกจะถูกตั้งเป็นค่าเริ่มต้นอัตโนมัติ)
- `PUT /api/users/me/addresses/:id` : แก้ไขรายละเอียดที่อยู่เดิม
- `DELETE /api/users/me/addresses/:id` : ลบรายการที่อยู่
- `PATCH /api/users/me/addresses/:id/default` : กำหนดให้เป็นที่อยู่เริ่มต้น (Default Address)

#### 🎮 ระบบเกมและแพ็กเกจ (Games & Orders)
- `GET /api/games` : ดึงรายการเกมทั้งหมดพร้อมหมวดหมู่
- `GET /api/games/:slug` : ดึงรายละเอียดเกมและแพ็กเกจภายในเกมนั้น
- `POST /api/orders` : สร้างรายการคำสั่งซื้อเติมเกมใหม่
- `GET /api/orders/me/recent` : รายการสั่งซื้อเติมเกมล่าสุดของผู้ใช้ปัจจุบัน

#### 💳 ระบบธุรกรรมทางการเงิน (Wallet & Topup)
- `GET /api/topup/methods` : ดึงช่องทางการเติมเงินและคำนวณค่าธรรมเนียม
- `POST /api/topup/create-intent` : สร้างเจตนาการเติมเงิน (คอยน์) เข้าระบบ (จำกัดสิทธิ์ผู้ใช้ต้องไม่มีรายการรอดำเนินการซ้ำซ้อนภายใน 2 นาที)
- `GET /api/topup/transactions` : ประวัติธุรกรรมการเติมเงินทั้งหมดของผู้ใช้ (จะเช็คการหมดอายุของธุรกรรมโดยอัตโนมัติทุกครั้งเมื่อเรียกใช้งานผ่านคำสั่ง `expireStaleTransactions`)
- `PATCH /api/topup/:referenceId/complete` : ยืนยันรายการชำระเงินสำเร็จ (สำหรับผู้ดูแลระบบหรือระบบจำลอง)
- `PATCH /api/topup/:referenceId/cancel` : ยกเลิกรายการธุรกรรมชำระเงิน

---

## 🎨 3. ระบบหน้าบ้าน (Frontend - Next.js App Router)
หน้าบ้านใช้ **Next.js 14+** (App Router) มีความยืดหยุ่นในการโหลดข้อมูลด้วย Server Components และ Client Components

### เทคโนโลยีหลักที่ใช้งาน (Core Stack)
- **Framework:** Next.js
- **Styling:** Vanilla CSS + TailwindCSS (สำหรับบางส่วนพิเศษ)
- **State Management:** React Hooks + Zustand (สำหรับเก็บ Auth state / session)
- **Icons:** Lucide React
- **Toast Notifications:** Sonner (ปรับแต่งสีพื้นหลังทึบพิเศษ ป้องกันความโปร่งแสงทับซ้อน)

### การทำงานสำคัญในหน้า UI พิเศษ

#### 👤 หน้าบัญชีผู้ใช้ (Account Page & Address Form)
- ฟอร์มการจัดการข้อมูลที่อยู่รวมถึงเบอร์โทรติดต่อ ถูกเชื่อมโยงเข้ากับ API `/users/me/addresses` แบบเรียลไทม์ 
- เมื่อเปิดเข้าหน้าเว็บจะดึงข้อมูลที่อยู่ในระบบมาแสดงผลอัตโนมัติ และเมื่อคลิกบันทึกจะซิงค์แก้ไขไปยังฐานข้อมูลปลายทางทันทีโดยไม่พึ่งพา LocalStorage เพียงอย่างเดียวอีกต่อไป

#### ⌛ หน้าสรุปยอดเงินและโมดอลชำระเงิน (Balance Page & Payment Timer)
- **ไม่มีการซ้อนปุ่มยกเลิก:** นำปุ่ม "ยกเลิกการชำระเงิน" สีแดงด้านล่างสุดของโมดอลออก เพื่อป้องกันความสับสน เนื่องจากมีปุ่มยกเลิก (ปุ่มกากบาท X และปุ่มยกเลิกสีแดงที่แบนเนอร์แจ้งเตือนด้านนอก) อยู่แล้ว
- **ระบบนับเวลาถอยหลังจริง (Real-time countdown):** นับเวลาอิงตามค่าเวลาหมดอายุ (`expired_at`) ของธุรกรรมที่ได้จากฝั่งหลังบ้านจริง (มีอายุ 15 นาทีตามนโยบายระบบ) แม้ปิดหน้าเว็บ/เปิดใหม่ หรือ Refresh เว็บ เวลาจะเดินต่ออย่างถูกต้อง
- เมื่อเวลานับถอยหลังหมดลง ระบบจะส่งคำขอไปยังระบบหลังบ้านเพื่ออัปเดตสถานะเป็น `failed/expired` และเปลี่ยนสถานะหน้าต่างโมดอลเป็นรายการชำระเงินไม่สำเร็จทันที

#### 📜 หน้าประวัติการสั่งซื้อ (Order History Page)
- ประวัติการสั่งซื้อจะแสดงผล**เฉพาะรายการสั่งซื้อสินค้าเติมเกม**เท่านั้น แยกแยะอย่างชัดเจนไม่เกี่ยวข้องกับประวัติการฝากเงินหรือคอยน์
- การแสดงผลส่วนหัวแถวจะใช้ **"ชื่อเกมส์หลัก"** เป็นรายการหลัก และระบุ **"แพ็กเกจที่ชำระเงิน"** เป็นตัวอักษรขนาดรองเพื่อให้อ่านง่าย

---

## 🚀 4. การติดตั้งและรันระบบ (Setup & Deployment)

### 💻 การรันบนเครื่องพัฒนาโลคอล (Local Development Setup)

1. **ดาวน์โหลดและติดตั้ง Dependencies:**
   ```bash
   # ในโฟลเดอร์หลัก
   npm run install:all
   ```

2. **เปิดใช้งาน Database จำลองผ่าน Docker:**
   ```bash
   cd backend
   docker compose up -d
   ```

3. **เตรียมไฟล์ค่าการกำหนดค่าระบบ (.env) บนเครื่อง:**
   คัดลอกไฟล์ต้นแบบ `.env.example` ไปเป็น `.env` ในโฟลเดอร์ `backend`
   ```env
   DATABASE_URL="postgresql://gachapay:gachapay1234@localhost:5432/game_topup_db?schema=public"
   JWT_SECRET="gachapay-secret-key-12345"
   JWT_EXPIRES_IN="7d"
   ```

4. **ซิงค์ Database Schema เข้า Local DB:**
   ```bash
   npx prisma db push
   ```

5. **เริ่มทำงานระบบ:**
   ```bash
   # รัน Backend (เข้าหน้า http://localhost:3001)
   cd backend && npm run start:dev
   
   # รัน Frontend (เข้าหน้า http://localhost:3000)
   cd frontend && npm run dev
   ```

### 🌍 การติดตั้งเพื่อใช้งานจริง (Production Deployment)

#### 1. ฐานข้อมูล (Database - Supabase)
1. สมัครใช้งานบริการ PostgreSQL ผ่าน **Supabase**
2. ไปที่เมนู **Settings > Database** เพื่อนำค่า **Connection String** มากำหนดเป็นค่าตัวแปร:
   - `DATABASE_URL` : พอร์ต 6543 (Transaction Pooler - มี `?pgbouncer=true` ต่อท้าย)
   - `DIRECT_URL` : พอร์ต 5432 (Session Mode - สำหรับซิงค์โครงสร้างตารางโดยตรง)
3. รันซิงค์โครงสร้างข้อมูลขึ้น Supabase:
   ```bash
   DATABASE_URL="[SUPABASE_DATABASE_URL]" DIRECT_URL="[SUPABASE_DIRECT_URL]" npx prisma db push
   ```

#### 2. ระบบหลังบ้าน (Backend - Render)
1. เชื่อมต่อ Git Repository เข้ากับบริการบน **Render**
2. เพิ่ม **Environment Variables** ตามตัวแปรด้านบน รวมถึง `DATABASE_URL` และ `DIRECT_URL` ที่ได้จาก Supabase
3. ตั้งค่า Build Command: `npm install && npm run build`
4. ตั้งค่า Start Command: `npm run start:prod` หรือ `node dist/main`

#### 3. ระบบหน้าบ้าน (Frontend - Vercel)
1. นำเข้าโปรเจกต์ผ่านเว็บบอร์ดของ **Vercel**
2. เพิ่มตัวแปรสิ่งแวดล้อม:
   - `NEXT_PUBLIC_API_URL` : ลิงก์ API URL ของ Render Backend (เช่น `https://your-backend-api.onrender.com/api`)
3. ดำเนินการกด Deploy หน้าเว็บ
