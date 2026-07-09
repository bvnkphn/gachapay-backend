# 🔐 Environment Configuration Guide

นี่คือเอกสารแนวทางการตั้งค่า Environment Variables สำหรับโปรเจกต์ GachaPay Backend

---

## 📁 ไฟล์ .env

ไฟล์ `.env` เก็บข้อมูลที่เป็นความลับและตั้งค่าต่างๆ ควรเก็บไว้ **ที่ root** ของโปรเจกต์

```bash
# ตำแหน่ง: /root/.env
```

⚠️ **อย่าใส่ .env ใน Git!** (มี .gitignore แล้ว)

---

## 📋 ตัวแปร Environment ทั้งหมด

### 1️⃣ Database Configuration
```env
DATABASE_URL="postgresql://username:password@host:port/database?schema=public"
```
- ใช้ใน: Prisma ORM
- Format: PostgreSQL connection string
- ตัวอย่าง: `postgresql://postgres:mypassword123@127.0.0.1:5432/game_topup_db?schema=public`

---

### 2️⃣ JWT Authentication
```env
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="7d"
```
- JWT_SECRET: Secret key สำหรับเซ็นต์ token (ยิ่งยาวและซับซ้อนยิ่งดี)
- JWT_EXPIRES_IN: ระยะเวลาหมดอายุ token

---

### 3️⃣ Google OAuth
```env
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_CALLBACK_URL="http://localhost:3001/api/auth/google/callback"
```
- ได้จาก: [Google Cloud Console](https://console.cloud.google.com)
- ใช้ใน: [src/auth/strategies/google.strategy.ts](src/auth/strategies/google.strategy.ts)

---

### 4️⃣ Facebook OAuth
```env
FACEBOOK_APP_ID="your-facebook-app-id"
FACEBOOK_APP_SECRET="your-facebook-app-secret"
FACEBOOK_CALLBACK_URL="http://localhost:3001/api/auth/facebook/callback"
```
- ได้จาก: [Facebook Developer](https://developers.facebook.com)
- ใช้ใน: [src/auth/strategies/facebook.strategy.ts](src/auth/strategies/facebook.strategy.ts)

---

### 5️⃣ Email Configuration ✉️

```env
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER="your-email@gmail.com"
EMAIL_PASSWORD="your-app-password"        ← Gmail SMTP Password (ส่ง email เท่านั้น)
EMAIL_FROM="GachaPay noreply@gachapay.com"
```

#### 📧 วิธีตั้งค่า Gmail App Password:

1. เข้า [Google Account Security](https://myaccount.google.com/security)
2. เปิด **2-Step Verification**
3. ไปที่ **App passwords** → เลือก Mail + Windows Computer
4. **Copy** รหัสผ่านแอป (16 ตัวอักษร)
5. วาง `EMAIL_PASSWORD` ในไฟล์ .env

**ใช้ใน:**
- [src/auth/email.service.ts](src/auth/email.service.ts) - ส่งอีเมลรีเซ็ตรหัสผ่าน

---

### 6️⃣ Admin & User Default Credentials 🔐

```env
ADMIN_DEFAULT_PASSWORD="Pass1234"        ← Default password for admin accounts
USER_DEFAULT_PASSWORD="Test1234!"        ← Default password for test users
```

**ใช้ใน:**
- [prisma/seed.ts](prisma/seed.ts) - สร้าง admin และ test users เมื่อ seed
- [add-admin.js](add-admin.js) - สร้าง admin ใหม่ (ใช้ default ถ้าไม่ระบุ password)
- [check-user.js](check-user.js) - ตรวจสอบ password ของ admin
- [fix-password.js](fix-password.js) - รีเซ็ต password ของ admin

**💡 หมายเหตุ:** สิ่งนี้แยกจาก EMAIL_PASSWORD เพื่อความชัดเจน
- EMAIL_PASSWORD = ส่งอีเมล SMTP
- ADMIN_DEFAULT_PASSWORD = ตรวจสอบบัญชี admin

---

### 7️⃣ Frontend & Server
```env
FRONTEND_URL="http://localhost:3000"
PORT=3001
NODE_ENV="development"
```
- FRONTEND_URL: URL ของ Frontend (ใช้สำหรับ CORS)
- PORT: Port ที่ Backend รัน
- NODE_ENV: `development`, `production`, `test`

**ใช้ใน:**
- [src/main.ts](src/main.ts#L18) - CORS configuration
- [src/auth/auth.service.ts](src/auth/auth.service.ts#L143) - Reset password link

---

### 7️⃣ External API
```env
EXTERNAL_API_KEY=98c2afcf9bcfff47b824ee8ebd8a1a40
EXTERNAL_API_URL=https://x.24payseller.com/
```
- ใช้สำหรับ: Game Import, Payment Gateway
- ใช้ใน: [src/games/external-game.service.ts](src/games/external-game.service.ts)

---

## 🛠️ วิธีการใช้ใน Code

### ✅ NestJS Services (ถูกต้อง)
```typescript
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MyService {
    constructor(private configService: ConfigService) {}

    someMethod() {
        // ส่ง Email
        const emailUser = this.configService.get('EMAIL_USER');
        const emailPassword = this.configService.get('EMAIL_PASSWORD');
        
        // Admin default password
        const adminPassword = this.configService.get('ADMIN_DEFAULT_PASSWORD');
    }
}
```

**ตำแหน่งใช้:**
- [src/auth/email.service.ts](src/auth/email.service.ts) - ใช้ EMAIL_PASSWORD สำหรับส่ง email
- [src/main.ts](src/main.ts) - ใช้ FRONTEND_URL, PORT

---

### ✅ Node.js Scripts (.js files)
```javascript
require('dotenv').config();  // ← ต้องมีบรรทัดนี้ก่อน!

// ส่ง Email
const emailUser = process.env.EMAIL_USER;
const emailPassword = process.env.EMAIL_PASSWORD;

// Admin default password
const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD;
```

**ตำแหน่งใช้:**
- [check-user.js](check-user.js) - เปรียบ password ด้วย ADMIN_DEFAULT_PASSWORD
- [fix-password.js](fix-password.js) - รีเซ็ต password ด้วย ADMIN_DEFAULT_PASSWORD
- [add-admin.js](add-admin.js) - สร้าง admin ใหม่ (ใช้ ADMIN_DEFAULT_PASSWORD หากไม่ระบุ password)

---

## 📝 ตัวอย่าง .env ที่สมบูรณ์

```bash
# Database
DATABASE_URL="postgresql://postgres:mypassword123@127.0.0.1:5432/game_topup_db?schema=public"

# JWT
JWT_SECRET="your-very-long-and-complex-secret-key-here-at-least-32-chars"
JWT_EXPIRES_IN="7d"

# Google OAuth
GOOGLE_CLIENT_ID="123456789.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-xxxxxxxxxxxxxxxx"
GOOGLE_CALLBACK_URL="http://localhost:3001/api/auth/google/callback"

# Facebook OAuth
FACEBOOK_APP_ID="1234567890"
FACEBOOK_APP_SECRET="abcdefghijklmnopqrstuvwxyz123456"
FACEBOOK_CALLBACK_URL="http://localhost:3001/api/auth/facebook/callback"

# Email (SMTP - for sending emails)
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER="filmsorawit2548@gmail.com"
EMAIL_PASSWORD="czdd dhvd cuoe ynkc"           # ← Gmail App Password
EMAIL_FROM="GachaPay <noreply@gachapay.com>"

# Admin & User Credentials (for seeding and management)
ADMIN_DEFAULT_PASSWORD="Pass1234"              # ← Default admin password
USER_DEFAULT_PASSWORD="Test1234!"              # ← Default user password

# Frontend & Server
FRONTEND_URL="http://localhost:3000"
PORT=3001
NODE_ENV="development"

# External API
EXTERNAL_API_KEY="98c2afcf9bcfff47b824ee8ebd8a1a40"
EXTERNAL_API_URL="https://x.24payseller.com/"
```

---

## 🔄 Flow การใช้ Environment Variables

```
┌─────────────────────────────────────┐
│ 1. สร้าง/แก้ไข .env ไฟล์          │
│    (ตั้งค่า EMAIL_USER, PASSWORD)   │
└────────────┬────────────────────────┘
             │
┌────────────▼────────────────────────┐
│ 2. NestJS App starts                │
│    (ConfigModule.forRoot())         │
└────────────┬────────────────────────┘
             │
┌────────────▼────────────────────────┐
│ 3. ConfigService อ่าน .env values   │
└────────────┬────────────────────────┘
             │
┌────────────▼────────────────────────┐
│ 4. Services ใช้ ConfigService       │
│    .get('EMAIL_USER')               │
│    .get('EMAIL_PASSWORD')           │
└─────────────────────────────────────┘
```

---

## ⚙️ Production vs Development

### 🔨 Development
```env
NODE_ENV="development"
FRONTEND_URL="http://localhost:3000"
PORT=3001
EMAIL_USER="test@gmail.com"
EMAIL_PASSWORD="your-test-app-password"
ADMIN_DEFAULT_PASSWORD="Pass1234"       # ← ใช้สำหรับ test
USER_DEFAULT_PASSWORD="Test1234!"       # ← ใช้สำหรับ test
```

### 🚀 Production
```env
NODE_ENV="production"
FRONTEND_URL="https://gachapay.com"
PORT=3001
EMAIL_USER="noreply@gachapay.com"
EMAIL_PASSWORD="very-long-app-password-from-gmail"
ADMIN_DEFAULT_PASSWORD="very-strong-password-change-this"
USER_DEFAULT_PASSWORD="strong-test-user-password"
JWT_SECRET="very-long-random-secret-key-at-least-32-chars-minimum"
```

⚠️ **ข้อสำคัญ:**
- Production: **เปลี่ยน ADMIN_DEFAULT_PASSWORD และ USER_DEFAULT_PASSWORD เป็นค่าที่ซับซ้อน**
- ไม่ควรใช้ค่า default เดียวกันกับ development

---

## 🚨 ข้อควรระวัง

1. **❌ อย่าคอมมิต .env ไปบน Git!**
   - ไฟล์ .gitignore ต้องมี `*.env`

2. **❌ EMAIL_PASSWORD สำหรับส่ง email เท่านั้น**
   - ใช้ ADMIN_DEFAULT_PASSWORD สำหรับ admin password
   - ใช้ USER_DEFAULT_PASSWORD สำหรับ user password

3. **✅ ใช้ ConfigService แทน process.env**
   - ปลอดภัยกว่า ในไฟล์ .ts
   - process.env ใช้ได้เฉพาะใน .js scripts

4. **✅ สร้าง .env.example (ไฟล์ reference)**
   - สำหรับให้ผู้อื่นรู้ว่าต้องมีตัวแปรไหนบ้าง
   - ปลอดภัยเพราะไม่ใส่ค่าจริง

---

## 📊 สรุปตัวแปรสำคัญ

```
┌─────────────────────────────────────────────────────────┐
│           ENVIRONMENT VARIABLES SUMMARY                 │
├─────────────────────────────────────────────────────────┤
│ 1. EMAIL_PASSWORD                                       │
│    ├─ ค่า: Gmail App Password (16 chars)              │
│    ├─ ใช้สำหรับ: ส่ง Email SMTP                       │
│    └─ ใช้ใน: src/auth/email.service.ts ✅            │
│                                                         │
│ 2. ADMIN_DEFAULT_PASSWORD                               │
│    ├─ ค่า: Pass1234 (หรือค่าที่กำหนด)               │
│    ├─ ใช้สำหรับ: สร้าง/ตรวจสอบ admin                 │
│    └─ ใช้ใน:                                           │
│       • prisma/seed.ts                                  │
│       • check-user.js ✅                               │
│       • fix-password.js ✅                             │
│       • add-admin.js ✅                                │
│                                                         │
│ 3. USER_DEFAULT_PASSWORD                                │
│    ├─ ค่า: Test1234! (หรือค่าที่กำหนด)              │
│    ├─ ใช้สำหรับ: สร้าง test users ในการ seed       │
│    └─ ใช้ใน: prisma/seed.ts                          │
└─────────────────────────────────────────────────────────┘
```

---

## ✅ Checklist เมื่อตั้งค่าครั้งแรก

- [ ] คัดลอก `.env.example` → `.env`
- [ ] ตั้งค่า DATABASE_URL (PostgreSQL connection)
- [ ] ตั้งค่า EMAIL_USER และ EMAIL_PASSWORD (Gmail App Password)
- [ ] ตั้งค่า JWT_SECRET (ยาวอย่างน้อย 32 ตัวอักษร)
- [ ] ตั้งค่า ADMIN_DEFAULT_PASSWORD และ USER_DEFAULT_PASSWORD
- [ ] (Optional) ตั้งค่า Google/Facebook OAuth
- [ ] (Optional) ตั้งค่า EXTERNAL_API_KEY
- [ ] รัน `npx prisma db push` และ `npx prisma seed`
- [ ] ทดสอบ `node check-user.js`
- [ ] รัน `npm run start:dev`

---

## 🧪 การทดสอบ

### ทดสอบ Email Configuration
```bash
node check-user.js
```

### ทดสอบ Seed
```bash
npx prisma seed
```

### ทดสอบ Login
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"filmsorawit2548@gmail.com","password":"Pass1234"}'
```

---

## 🧪 การทดสอบ

### ตรวจสอบ Email Configuration
```bash
node check-user.js
```

### ลืมรหัสผ่าน? อัปเดตได้
```bash
node fix-password.js
```

---

## 📚 ลิงก์ที่เกี่ยวข้อง

- [Google OAuth Setup](GOOGLE_OAUTH_SETUP.md)
- [Facebook OAuth Setup](FACEBOOK_OAUTH_SETUP.md)
- [Setup Guide](SETUP_GUIDE.md)

---

**✅ ตอนนี้ระบบพร้อมใช้งาน!**
