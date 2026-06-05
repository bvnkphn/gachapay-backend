import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SystemService } from './system.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@ApiTags('System')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('system')
export class SystemController {
  constructor(private systemService: SystemService) {}

  // GET /system/status — ดูสถานะ maintenance + notification settings
  @Get('status')
  async getStatus(): Promise<any> {
    return this.systemService.getStatus();
  }

  // PATCH /system/maintenance — เปิด/ปิด maintenance mode
  @Patch('maintenance')
  async setMaintenance(
    @Body() body: { enabled: boolean; message?: string; etaMinutes?: number },
  ): Promise<any> {
    return this.systemService.setMaintenance(body);
  }

  // PATCH /system/notifications — ตั้งค่าการแจ้งเตือน
  @Patch('notifications')
  async setNotifications(
    @Body() body: {
      newOrder?: boolean;
      failedTransaction?: boolean;
      lowApiBalance?: boolean;
      dailyReport?: boolean;
    },
  ): Promise<any> {
    return this.systemService.setNotifications(body);
  }

  // GET /system/api-health — เช็ค response time แต่ละ service
  @Get('api-health')
  async getApiHealth(): Promise<any> {
    return this.systemService.getApiHealth();
  }
}
