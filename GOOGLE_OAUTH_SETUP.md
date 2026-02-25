# คู่มือการตั้งค่า Google OAuth

## ขั้นตอนการตั้งค่า Google Cloud Console

### 1. สร้าง Google Cloud Project

1. ไปที่ [Google Cloud Console](https://console.cloud.google.com/)
2. คลิก "Select a project" > "New Project"
3. ตั้งชื่อโปรเจค เช่น "CyberPay Platform"
4. คลิก "Create"

### 2. เปิดใช้งาน Google+ API

1. ในเมนูด้านซ้าย ไปที่ "APIs & Services" > "Library"
2. ค้นหา "Google+ API" หรือ "Google OAuth2 API"
3. คลิก "Enable"

### 3. สร้าง OAuth 2.0 Credentials

1. ไปที่ "APIs & Services" > "Credentials"
2. คลิก "Create Credentials" > "OAuth client ID"
3. ถ้ายังไม่ได้ตั้งค่า OAuth consent screen ให้ตั้งค่าก่อน:
   - เลือก "External" (สำหรับ testing)
   - กรอกข้อมูล:
     - App name: CyberPay Platform
     - User support email: อีเมลของคุณ
     - Developer contact: อีเมลของคุณ
   - คลิก "Save and Continue"
   - ใน Scopes ให้เพิ่ม:
     - `.../auth/userinfo.email`
     - `.../auth/userinfo.profile`
   - คลิก "Save and Continue"
   - เพิ่ม Test users (อีเมลที่จะใช้ทดสอบ)
   - คลิก "Save and Continue"

4. กลับมาที่ "Create OAuth client ID":
   - Application type: "Web application"
   - Name: "CyberPay Web Client"
   - Authorized JavaScript origins:
     - `http://localhost:8080`
     - `http://localhost:3001`
   - Authorized redirect URIs:
     - `http://localhost:3001/auth/google/callback`
     - `http://localhost:8080/auth/google/callback`
   - คลิก "Create"

5. คัดลอก Client ID และ Client Secret

### 4. อัพเดทไฟล์ .env

เปิดไฟล์ `server/.env` และอัพเดทค่าต่อไปนี้:

```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3001/auth/google/callback
```

### 5. ทดสอบการทำงาน

1. รัน backend server:
   ```bash
   cd server
   npm run dev
   ```

2. รัน frontend:
   ```bash
   npm run dev
   ```

3. เปิดเบราว์เซอร์ไปที่ `http://localhost:8080/login`
4. คลิกปุ่ม "Google"
5. เลือกบัญชี Google ที่ต้องการใช้
6. อนุญาตการเข้าถึงข้อมูล
7. ระบบจะ redirect กลับมาและเข้าสู่ระบบอัตโนมัติ

## หมายเหตุสำคัญ

### สำหรับ Production

เมื่อต้องการใช้งานจริง (Production) ให้:

1. เปลี่ยน OAuth consent screen จาก "Testing" เป็น "In production"
2. อัพเดท Authorized origins และ redirect URIs ให้เป็น domain จริง:
   ```
   https://yourdomain.com
   https://api.yourdomain.com/auth/google/callback
   ```
3. อัพเดทไฟล์ `.env` ให้ตรงกับ production URLs

### การแก้ปัญหา

**ปัญหา: "Error 400: redirect_uri_mismatch"**
- ตรวจสอบว่า redirect URI ใน Google Console ตรงกับที่ตั้งไว้ใน `.env`
- ตรวจสอบว่าไม่มี trailing slash (/) ท้าย URL

**ปัญหา: "Access blocked: This app's request is invalid"**
- ตรวจสอบว่าได้เพิ่ม Test users ใน OAuth consent screen แล้ว
- ตรวจสอบว่าได้เปิดใช้งาน Google+ API แล้ว

**ปัญหา: "Invalid client"**
- ตรวจสอบว่า Client ID และ Client Secret ถูกต้อง
- ตรวจสอบว่าไม่มีช่องว่างหรืออักขระพิเศษในไฟล์ `.env`

## API Endpoints

### Frontend → Backend

1. **เริ่มต้น Google OAuth**
   - GET `/auth/google`
   - Response: `{ success: true, authUrl: "https://accounts.google.com/..." }`

2. **Callback จาก Google**
   - GET `/auth/google/callback?code=xxx`
   - Response: `{ success: true, token: "jwt-token", user: {...} }`

### Flow การทำงาน

```
User คลิกปุ่ม Google
    ↓
Frontend เรียก /auth/google
    ↓
Backend ส่ง authUrl กลับมา
    ↓
Frontend redirect ไป Google OAuth
    ↓
User login และอนุญาต
    ↓
Google redirect กลับมาที่ /auth/google/callback?code=xxx
    ↓
Backend แลก code เป็น access token
    ↓
Backend ดึงข้อมูล user จาก Google
    ↓
Backend สร้างหรืออัพเดท user ในฐานข้อมูล
    ↓
Backend ส่ง JWT token กลับไป
    ↓
Frontend เก็บ token และ redirect ไปหน้าหลัก
```

## ความปลอดภัย

1. **ห้าม commit** ไฟล์ `.env` ลง Git
2. ใช้ HTTPS ใน production
3. ตั้งค่า CORS ให้ถูกต้อง
4. ตรวจสอบ JWT token ทุกครั้งที่มี request
5. จำกัด scope ของ Google OAuth ให้เหมาะสม
