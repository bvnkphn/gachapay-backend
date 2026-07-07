import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';
import { SystemService } from './system.service';
import { PrismaService } from '../prisma/prisma.service';

// Path ที่ยกเว้นจาก maintenance block เสมอ
const WHITELIST = [
  '/api/auth/login',
  '/api/auth/login-admin',
  '/api/auth/verify-admin-otp',
  '/api/auth/verify-otp',
  '/api/auth/register',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/google',
  '/api/auth/facebook',
  '/api/system/status',
  '/api/system/maintenance',
  '/api/docs',
  '/api/uploads',
];

@Injectable()
export class MaintenanceMiddleware implements NestMiddleware {
  constructor(
    private systemService: SystemService,
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const path = req.path;

    // ถ้า path อยู่ใน whitelist → ผ่านเลย
    if (WHITELIST.some(w => path.startsWith(w))) {
      return next();
    }

    const isOn = await this.systemService.isMaintenanceEnabled();
    if (!isOn) return next();

    // ตรวจสอบว่าเป็น admin หรือไม่ โดย query DB จาก JWT sub
    const auth = req.headers.authorization;
    if (auth?.startsWith('Bearer ')) {
      try {
        const token = auth.split(' ')[1];

        // decode JWT (ไม่ verify เพราะ JwtAuthGuard จะทำให้ทีหลัง)
        const payload = JSON.parse(
          Buffer.from(token.split('.')[1], 'base64').toString('utf8'),
        );

        // sub คือ uuid ของ user
        const uuid = payload?.sub;
        if (uuid) {
          // ✅ Query DB ตรงๆ เพื่อเช็ค role จริง
          const user = await this.prisma.user.findUnique({
            where: { uuid },
            select: { role: true },
          });

          if (user?.role === 'ADMIN') return next();
        }
      } catch {
        // token invalid หรือ user ไม่มีใน DB → block
      }
    }

    // User ทั่วไปหรือไม่มี token → 503
    const message = await this.systemService.getMaintenanceMessage();
    return res.status(503).json({
      statusCode: 503,
      error: 'Service Unavailable',
      message,
      maintenance: true,
    });
  }
}
