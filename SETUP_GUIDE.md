# คู่มือการติดตั้งและใช้งาน

## ขั้นตอนการติดตั้ง

### 1. ติดตั้ง Node.js 22+

ตรวจสอบเวอร์ชัน:
```bash
node --version
```

ถ้ายังไม่มี Node.js 22+ ให้ดาวน์โหลดจาก https://nodejs.org/

### 2. ติดตั้ง PostgreSQL 18

#### Windows
ดาวน์โหลดจาก https://www.postgresql.org/download/windows/

#### macOS
```bash
brew install postgresql@18
brew services start postgresql@18
```

#### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install postgresql-18
sudo systemctl start postgresql
```

### 3. สร้าง Database

```bash
# เข้าสู่ PostgreSQL
psql -U postgres

# สร้าง database
CREATE DATABASE game_topup_db;

# สร้าง user (optional)
CREATE USER gameuser WITH PASSWORD 'yourpassword';
GRANT ALL PRIVILEGES ON DATABASE game_topup_db TO gameuser;

# ออกจาก psql
\q
```

### 4. ติดตั้ง Dependencies

```bash
# ติดตั้งทั้งหมดพร้อมกัน
npm run install:all

# หรือติดตั้งทีละส่วน
cd backend && npm install
cd ../frontend && npm install
```

### 5. Setup Environment Variables

#### Backend
```bash
cd backend
cp .env.example .env
```

แก้ไขไฟล์ `.env`:
```env
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/game_topup_db"
JWT_SECRET="your-super-secret-jwt-key-change-this-to-random-string"
JWT_EXPIRES_IN="7d"

# Google OAuth (ถ้าต้องการใช้)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_CALLBACK_URL="http://localhost:3001/api/auth/google/callback"

# Facebook OAuth (ถ้าต้องการใช้)
FACEBOOK_APP_ID="your-facebook-app-id"
FACEBOOK_APP_SECRET="your-facebook-app-secret"
FACEBOOK_CALLBACK_URL="http://localhost:3001/api/auth/facebook/callback"

# Email (Gmail example)
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER="your-email@gmail.com"
EMAIL_PASSWORD="your-app-password"
EMAIL_FROM="Game Top-up <noreply@gametopup.com>"

FRONTEND_URL="http://localhost:3000"
PORT=3001
NODE_ENV="development"
```

#### Frontend
```bash
cd frontend
cp .env.example .env.local
```

แก้ไขไฟล์ `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
NEXT_PUBLIC_FACEBOOK_APP_ID=your-facebook-app-id
```

### 6. Run Database Migrations

```bash
cd backend
npx prisma generate
npx prisma migrate dev --name init
```

### 7. (Optional) Seed Database

สร้างไฟล์ `backend/prisma/seed.ts`:
```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // สร้างเกมตัวอย่าง
  const freefire = await prisma.game.create({
    data: {
      name: 'Free Fire',
      slug: 'free-fire',
      description: 'เกมแนว Battle Royale ยอดนิยม',
      image: '/games/freefire.jpg',
      category: 'Battle Royale',
      isActive: true,
      packages: {
        create: [
          { name: '100 เพชร', price: 35, discount: 0 },
          { name: '310 เพชร', price: 105, discount: 5 },
          { name: '520 เพชร', price: 175, discount: 10 },
          { name: '1060 เพชร', price: 350, discount: 15 },
        ],
      },
    },
  });

  console.log('Seed completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

รัน seed:
```bash
npx prisma db seed
```

### 8. รันโปรเจกต์

#### รันทั้งหมดพร้อมกัน (แนะนำ)
```bash
npm run dev
```

#### หรือรันแยกกัน

Terminal 1 - Backend:
```bash
cd backend
npm run start:dev
```

Terminal 2 - Frontend:
```bash
cd frontend
npm run dev
```

### 9. เปิดเว็บไซต์

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001/api
- Prisma Studio: `npm run prisma:studio`

---

## การตั้งค่า Google OAuth

1. ไปที่ https://console.cloud.google.com/
2. สร้าง Project ใหม่
3. เปิดใช้งาน Google+ API
4. สร้าง OAuth 2.0 Client ID
5. เพิ่ม Authorized redirect URIs:
   - `http://localhost:3001/api/auth/google/callback`
6. Copy Client ID และ Client Secret ไปใส่ใน `.env`

---

## การตั้งค่า Facebook OAuth

1. ไปที่ https://developers.facebook.com/
2. สร้าง App ใหม่
3. เพิ่ม Facebook Login product
4. ตั้งค่า Valid OAuth Redirect URIs:
   - `http://localhost:3001/api/auth/facebook/callback`
5. Copy App ID และ App Secret ไปใส่ใน `.env`

---

## การตั้งค่า Email (Gmail)

1. เปิด 2-Step Verification ใน Google Account
2. สร้าง App Password:
   - ไปที่ https://myaccount.google.com/apppasswords
   - สร้าง password ใหม่สำหรับ "Mail"
3. ใช้ App Password นี้ใน `EMAIL_PASSWORD`

---

## Troubleshooting

### Database Connection Error
```bash
# ตรวจสอบว่า PostgreSQL รันอยู่
# Windows
pg_ctl status

# macOS/Linux
sudo systemctl status postgresql
```

### Port Already in Use
```bash
# เปลี่ยน port ใน .env
PORT=3002  # Backend
# หรือ
# Frontend: แก้ไขใน package.json dev script
```

### Prisma Generate Error
```bash
cd backend
rm -rf node_modules
npm install
npx prisma generate
```

---

## คำสั่งที่มีประโยชน์

```bash
# ดู database schema
npm run prisma:studio

# สร้าง migration ใหม่
cd backend
npx prisma migrate dev --name your_migration_name

# Reset database
npx prisma migrate reset

# Format code
npm run format

# Build production
npm run build

# Run production
cd backend && npm run start:prod
cd frontend && npm start
```

---

## การ Deploy

### Backend (Railway/Render)
1. Push code ไป GitHub
2. เชื่อมต่อ repository กับ hosting
3. ตั้งค่า environment variables
4. Deploy

### Frontend (Vercel)
1. Push code ไป GitHub
2. Import project ใน Vercel
3. ตั้งค่า environment variables
4. Deploy

### Database (Supabase/Railway)
1. สร้าง PostgreSQL instance
2. Copy connection string
3. อัพเดท `DATABASE_URL` ใน production environment
4. Run migrations: `npx prisma migrate deploy`

---

## ติดต่อ

หากมีปัญหาหรือคำถาม กรุณาติดต่อทีมพัฒนา
