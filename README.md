# Backend - NestJS 11.0.7

Backend API ของระบบเติมเกมที่สร้างด้วย NestJS

## Tech Stack

- NestJS 11.0.7
- TypeScript 5.8
- Prisma (ORM)
- PostgreSQL 18
- JWT Authentication
- Passport.js

## การติดตั้ง

```bash
npm install
```

## Setup Database

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Open Prisma Studio
npx prisma studio
```

## การรัน

```bash
# Development
npm run start:dev

# Build
npm run build

# Production
npm run start:prod
```

## โครงสร้าง

```
src/
├── auth/            # Authentication module
├── users/           # Users module
├── games/           # Games module
├── orders/          # Orders module
├── prisma/          # Prisma service
├── app.module.ts    # Root module
└── main.ts          # Entry point
```

## Environment Variables

สร้างไฟล์ `.env`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/game_topup_db"
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="7d"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
FACEBOOK_APP_ID="your-facebook-app-id"
FACEBOOK_APP_SECRET="your-facebook-app-secret"
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT=587
EMAIL_USER="your-email@gmail.com"
EMAIL_PASSWORD="your-app-password"
FRONTEND_URL="http://localhost:3000"
PORT=3001
```
