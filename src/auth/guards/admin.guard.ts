import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        // บล็อกการใช้งานฟังก์ชัน Admin บนเซิร์ฟเวอร์สาธารณะ (Member API)
        if (process.env.IS_ADMIN_SERVER !== 'true') {
            throw new ForbiddenException('ไม่อนุญาตให้เข้าใช้งานส่วนของ Admin บนเซิร์ฟเวอร์นี้');
        }

        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user || user.role !== 'ADMIN') {
            throw new ForbiddenException('เฉพาะ Super Admin เท่านั้น');
        }

        return true;
    }
}
