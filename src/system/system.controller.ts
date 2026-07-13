import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SystemService } from './system.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@ApiTags('System')
@Controller('system')
export class SystemController {
  constructor(private readonly systemService: SystemService) {}

  // GET /system/gacha-settings — ดูการตั้งค่าวงล้อ (Public)
  @Get('gacha-settings')
  async getGachaSettingsPublic(): Promise<any> {
    const status = await this.systemService.getStatus();
    return { segments: status.gacha };
  }

  // GET /system/status — ดูสถานะ maintenance + notification settings
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('status')
  async getStatus(): Promise<any> {
    return this.systemService.getStatus();
  }

  // PATCH /system/maintenance — เปิด/ปิด maintenance mode
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch('maintenance')
  async setMaintenance(
    @Body() body: { enabled: boolean; message?: string; etaMinutes?: number },
  ): Promise<any> {
    return this.systemService.setMaintenance(body);
  }

  // PATCH /system/notifications — ตั้งค่าการแจ้งเตือน
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AdminGuard)
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

  // PATCH /system/referral — ตั้งค่าระบบแนะนำเพื่อน
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch('referral')
  async setReferralSettings(
    @Body() body: { rewardAmount?: number; minSpend?: number },
  ): Promise<any> {
    return this.systemService.setReferralSettings(body);
  }

  // PATCH /system/gacha — ตั้งค่าวงล้อ
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch('gacha')
  async setGachaSettings(
    @Body() body: { segments: any[] },
  ): Promise<any> {
    return this.systemService.setGachaSettings(body);
  }

  // GET /system/api-health — เช็ค response time แต่ละ service
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('api-health')
  async getApiHealth(): Promise<any> {
    return this.systemService.getApiHealth();
  }
}
