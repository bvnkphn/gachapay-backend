# Facebook OAuth Setup Guide

คู่มือการตั้งค่า Facebook Login สำหรับแอปพลิเคชัน

## ขั้นตอนการตั้งค่า

### 1. สร้าง Facebook App

1. ไปที่ [Facebook Developers](https://developers.facebook.com/)
2. คลิก "My Apps" แล้วเลือก "Create App"
3. เลือก "Consumer" เป็น app type
4. กรอกข้อมูล:
   - App Name: ชื่อแอปของคุณ (เช่น "CYBERPAY")
   - App Contact Email: อีเมลติดต่อ
5. คลิก "Create App"

### 2. เพิ่ม Facebook Login Product

1. ในหน้า Dashboard ของ App
2. คลิก "Add Product" ในเมนูด้านซ้าย
3. หา "Facebook Login" แล้วคลิก "Set Up"
4. เลือก "Web" เป็น platform

### 3. ตั้งค่า OAuth Redirect URIs

1. ไปที่ "Facebook Login" > "Settings" ในเมนูด้านซ้าย
2. ในส่วน "Valid OAuth Redirect URIs" เพิ่ม:
   ```
   http://localhost:3001/auth/facebook/callback
   ```
3. สำหรับ Production เพิ่ม:
   ```
   https://yourdomain.com/auth/facebook/callback
   ```
4. คลิก "Save Changes"

### 4. ดึง App ID และ App Secret

1. ไปที่ "Settings" > "Basic" ในเมนูด้านซ้าย
2. คัดลอก "App ID"
3. คลิก "Show" ที่ "App Secret" แล้วคัดลอก (อาจต้องใส่รหัสผ่าน Facebook)

### 5. อัพเดท Environment Variables

แก้ไขไฟล์ `server/.env`:

```env
# Facebook OAuth Configuration
FACEBOOK_APP_ID=your_app_id_here
FACEBOOK_APP_SECRET=your_app_secret_here
FACEBOOK_REDIRECT_URI=http://localhost:3001/auth/facebook/callback
```

สำหรับ Production:
```env
FACEBOOK_REDIRECT_URI=https://yourdomain.com/auth/facebook/callback
```

### 6. ตั้งค่า App Domains (สำหรับ Production)

1. ไปที่ "Settings" > "Basic"
2. ในส่วน "App Domains" เพิ่ม:
   ```
   yourdomain.com
   ```
3. ในส่วน "Privacy Policy URL" และ "Terms of Service URL" ใส่ URL ที่เกี่ยวข้อง

### 7. เปลี่ยนโหมดเป็น Live (สำหรับ Production)

1. ไปที่ "Settings" > "Basic"
2. ที่ด้านบนสุด เปลี่ยนจาก "Development" เป็น "Live"
3. อาจต้องกรอกข้อมูลเพิ่มเติมตามที่ Facebook ร้องขอ

## การทดสอบ

### Development Mode
- ในโหมด Development สามารถใช้ได้เฉพาะบัญชีที่เป็น Admin, Developer, หรือ Tester ของ App เท่านั้น
- เพิ่ม Tester ได้ที่ "Roles" > "Test Users"

### Production Mode
- เมื่อเปลี่ยนเป็น Live แล้ว ผู้ใช้ทุกคนสามารถใช้ Facebook Login ได้

## Permissions ที่ใช้

แอปนี้ขอ permissions ดังนี้:
- `email` - เพื่อดึงอีเมลของผู้ใช้
- `public_profile` - เพื่อดึงชื่อและรูปโปรไฟล์

## Troubleshooting

### ปัญหา: "URL Blocked: This redirect failed because the redirect URI is not whitelisted"
- ตรวจสอบว่า Redirect URI ใน Facebook App Settings ตรงกับที่ตั้งค่าใน `.env`
- ตรวจสอบว่าไม่มี trailing slash (/) ท้าย URL

### ปัญหา: "Can't Load URL: The domain of this URL isn't included in the app's domains"
- เพิ่ม domain ใน "App Domains" ที่ Settings > Basic

### ปัญหา: "This app is in Development Mode"
- เพิ่มบัญชีทดสอบที่ Roles > Test Users
- หรือเปลี่ยนโหมดเป็น Live

## API Version

แอปนี้ใช้ Facebook Graph API v18.0

## เอกสารเพิ่มเติม

- [Facebook Login Documentation](https://developers.facebook.com/docs/facebook-login)
- [Graph API Reference](https://developers.facebook.com/docs/graph-api)
