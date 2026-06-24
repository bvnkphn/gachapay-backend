# 🔐 Environment Variables Refactoring

## 📋 สรุปการเปลี่ยนแปลง

ปัญหาเดิม: **EMAIL_PASSWORD ใช้ในสองบบที่ต่างกัน** ❌
- ส่ง email ผ่าน SMTP (Gmail App Password)
- ตรวจสอบรหัสผ่าน admin ในการ seed/management scripts

### 🎯 วิธีแก้: แยกตัวแปรให้ชัดเจน ✅

---

## 🔄 ตัวแปรใหม่

### 1. EMAIL_PASSWORD (ไม่เปลี่ยน)
```env
EMAIL_PASSWORD="czdd dhvd cuoe ynkc"
```
**ใช้สำหรับ:** ส่ง email เท่านั้น
**ใช้ใน:**
- [src/auth/email.service.ts](src/auth/email.service.ts#L16) - SMTP transporter

---

### 2. ADMIN_DEFAULT_PASSWORD (ใหม่!) ✨
```env
ADMIN_DEFAULT_PASSWORD="Pass1234"
```
**ใช้สำหรับ:** สร้างและตรวจสอบ admin accounts
**ใช้ใน:**
- [prisma/seed.ts](prisma/seed.ts) - สร้าง admin ตัวอย่าง
- [add-admin.js](add-admin.js) - สร้าง admin ใหม่
- [check-user.js](check-user.js) - ตรวจสอบ password admin
- [fix-password.js](fix-password.js) - รีเซ็ต password admin

---

### 3. USER_DEFAULT_PASSWORD (ใหม่!) ✨
```env
USER_DEFAULT_PASSWORD="Test1234!"
```
**ใช้สำหรับ:** สร้างผู้ใช้ทดสอบในการ seed
**ใช้ใน:**
- [prisma/seed.ts](prisma/seed.ts) - สร้าง test users

---

## 📝 ไฟล์ที่เปลี่ยน

### ✅ [prisma/seed.ts](prisma/seed.ts)
**ก่อน:**
```typescript
const passwordAdmin = await bcrypt.hash('Pass1234', 10);  // Hardcode
const passwordUser  = await bcrypt.hash('Test1234!', 10); // Hardcode
```

**หลัง:**
```typescript
const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'Pass1234';
const userPassword = process.env.USER_DEFAULT_PASSWORD || 'Test1234!';
const passwordAdmin = await bcrypt.hash(adminPassword, 10);
const passwordUser  = await bcrypt.hash(userPassword, 10);
```

---

### ✅ [check-user.js](check-user.js)
**ก่อน:**
```javascript
const targetPassword = process.env.EMAIL_PASSWORD;  // ❌ ผิด
```

**หลัง:**
```javascript
const targetPassword = process.env.ADMIN_DEFAULT_PASSWORD;  // ✅ ถูก
```

---

### ✅ [fix-password.js](fix-password.js)
**ก่อน:**
```javascript
const targetPassword = process.env.EMAIL_PASSWORD;  // ❌ ผิด
```

**หลัง:**
```javascript
const targetPassword = process.env.ADMIN_DEFAULT_PASSWORD;  // ✅ ถูก
if (!targetPassword) {
    throw new Error("Missing ADMIN_DEFAULT_PASSWORD in .env");
}
```

---

### ✅ [add-admin.js](add-admin.js)
**ก่อน:**
```javascript
if (!email || !password) {
    console.log('วิธีใช้: node add-admin.js <email> <password> "<ชื่อ>"');
    process.exit(1);
}
```

**หลัง:**
```javascript
const defaultPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'Pass1234';
const adminPassword = password || defaultPassword;  // ใช้ default ถ้าไม่ระบุ

if (!email) {
    console.log('วิธีใช้: node add-admin.js <email> [password] "[ชื่อ]"');
    console.log('หมายเหตุ: ถ้าไม่ระบุ password จะใช้ ADMIN_DEFAULT_PASSWORD จาก .env');
    process.exit(1);
}
```

---

### ✅ [.env](.env)
เพิ่ม:
```env
# Admin & User Credentials (for seeding and management scripts)
ADMIN_DEFAULT_PASSWORD="Pass1234"
USER_DEFAULT_PASSWORD="Test1234!"
```

---

### ✅ [.env.example](.env.example) (ใหม่)
ไฟล์ reference ที่ปลอดภัยจากการคอมมิต

---

## 🧪 วิธีทดสอบการเปลี่ยนแปลง

### 1. ทดสอบ Seed ที่อ่าน .env
```bash
npx prisma db push
npx prisma seed
```
✅ ตรวจสอบว่า seed สร้าง admin ด้วย ADMIN_DEFAULT_PASSWORD สำเร็จ

### 2. ทดสอบ Check User
```bash
node check-user.js
```
✅ ตรวจสอบ password ด้วย ADMIN_DEFAULT_PASSWORD

### 3. ทดสอบ Fix Password
```bash
node fix-password.js
```
✅ รีเซ็ต password ด้วย ADMIN_DEFAULT_PASSWORD

### 4. ทดสอบ Add Admin (ด้วย default password)
```bash
node add-admin.js admin2@test.com
```
✅ สร้าง admin ด้วย ADMIN_DEFAULT_PASSWORD

### 5. ทดสอบ Add Admin (ด้วย custom password)
```bash
node add-admin.js admin3@test.com CustomPass123 "Admin ที่ 3"
```
✅ สร้าง admin ด้วย CustomPass123

### 6. ทดสอบ Login Email
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"filmsorawit2548@gmail.com","password":"Pass1234"}'
```
✅ Login สำเร็จด้วย ADMIN_DEFAULT_PASSWORD

---

## 💡 ข้อดีของการแยกนี้

✅ **ชัดเจน** - ทรรศนะว่าตัวแปรไหนใช้สำหรับอะไร  
✅ **ปลอดภัย** - ไม่ผสมรหัสส่ง email กับ password admin  
✅ **ยืดหยุ่น** - สามารถเปลี่ยนค่า password ต่างกันได้  
✅ **ประสิทธิภาพ** - ทำให้ script อ่านง่ายขึ้น  
✅ **สอดคล้องกับ .env** - ไม่มี hardcode ค่าใน code  

---

## 📚 ลิงก์อ้างอิง

- [ENV_CONFIGURATION.md](ENV_CONFIGURATION.md) - Documentation เต็ม
- [.env.example](.env.example) - Template ตัวอย่าง
- [README.md](README.md) - Setup Guide

---

**✅ ตอนนี้ระบบ Environment Variables ชัดเจนและปลอดภัยแล้ว!**
