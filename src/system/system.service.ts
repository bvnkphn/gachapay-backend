import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// ── key constants ──────────────────────────────────────────────────
const KEYS = {
  MAINTENANCE_ENABLED:       'maintenance_enabled',
  MAINTENANCE_MESSAGE:       'maintenance_message',
  MAINTENANCE_ETA:           'maintenance_eta_minutes',
  NOTIFY_NEW_ORDER:          'notify_new_order',
  NOTIFY_FAILED_TX:          'notify_failed_transaction',
  NOTIFY_LOW_BALANCE:        'notify_low_api_balance',
  NOTIFY_DAILY_REPORT:       'notify_daily_report',
} as const;

// External services ที่จะ ping เช็คสุขภาพ
const EXTERNAL_SERVICES = [
  { id: 'external_api',  label: 'External Game API', url: 'https://x.24payseller.com/products/list' },
  { id: 'payment_gw',   label: 'Payment Gateway',   url: 'https://httpbin.org/status/200' },
];

@Injectable()
export class SystemService {
  constructor(private prisma: PrismaService) {}

  // ── อ่านค่าทั้งหมดจาก DB ───────────────────────────────────────
  private async getAll(): Promise<Record<string, string>> {
    const rows = await this.prisma.systemSetting.findMany();
    return Object.fromEntries(rows.map(r => [r.key, r.value]));
  }

  private async get(key: string): Promise<string | null> {
    const row = await this.prisma.systemSetting.findUnique({ where: { key } });
    return row?.value ?? null;
  }

  private async set(key: string, value: string): Promise<void> {
    await this.prisma.systemSetting.upsert({
      where:  { key },
      update: { value },
      create: { key, value },
    });
  }

  // ── GET /system/status ─────────────────────────────────────────
  async getStatus(): Promise<any> {
    const settings = await this.getAll();
    return {
      maintenance: {
        enabled: settings[KEYS.MAINTENANCE_ENABLED] === 'true',
        message: settings[KEYS.MAINTENANCE_MESSAGE] ?? '',
        etaMinutes: parseInt(settings[KEYS.MAINTENANCE_ETA] ?? '30'),
      },
      notifications: {
        newOrder:         settings[KEYS.NOTIFY_NEW_ORDER]     === 'true',
        failedTransaction:settings[KEYS.NOTIFY_FAILED_TX]     === 'true',
        lowApiBalance:    settings[KEYS.NOTIFY_LOW_BALANCE]   === 'true',
        dailyReport:      settings[KEYS.NOTIFY_DAILY_REPORT]  === 'true',
      },
    };
  }

  // ── PATCH /system/maintenance ──────────────────────────────────
  async setMaintenance(data: {
    enabled: boolean;
    message?: string;
    etaMinutes?: number;
  }): Promise<any> {
    await this.set(KEYS.MAINTENANCE_ENABLED, String(data.enabled));
    if (data.message   !== undefined) await this.set(KEYS.MAINTENANCE_MESSAGE, data.message);
    if (data.etaMinutes !== undefined) await this.set(KEYS.MAINTENANCE_ETA, String(data.etaMinutes));
    return { success: true, maintenance: await this.getStatus().then(s => s.maintenance) };
  }

  // ── PATCH /system/notifications ────────────────────────────────
  async setNotifications(data: {
    newOrder?:          boolean;
    failedTransaction?: boolean;
    lowApiBalance?:     boolean;
    dailyReport?:       boolean;
  }): Promise<any> {
    if (data.newOrder          !== undefined) await this.set(KEYS.NOTIFY_NEW_ORDER,   String(data.newOrder));
    if (data.failedTransaction !== undefined) await this.set(KEYS.NOTIFY_FAILED_TX,   String(data.failedTransaction));
    if (data.lowApiBalance     !== undefined) await this.set(KEYS.NOTIFY_LOW_BALANCE, String(data.lowApiBalance));
    if (data.dailyReport       !== undefined) await this.set(KEYS.NOTIFY_DAILY_REPORT,String(data.dailyReport));
    return { success: true, notifications: await this.getStatus().then(s => s.notifications) };
  }

  // ── GET /system/api-health ─────────────────────────────────────
  // Ping external services แล้วคืน response time
  async getApiHealth(): Promise<any> {
    const results = await Promise.all(
      EXTERNAL_SERVICES.map(async svc => {
        const start = Date.now();
        try {
          const res = await fetch(svc.url, {
            signal: AbortSignal.timeout(5000),
            method: 'GET',
          });
          const ms = Date.now() - start;
          const status = res.ok
            ? ms < 500 ? 'normal' : ms < 2000 ? 'slow' : 'down'
            : 'down';
          return { id: svc.id, label: svc.label, status, responseMs: ms, checkedAt: new Date() };
        } catch {
          return { id: svc.id, label: svc.label, status: 'down', responseMs: null, checkedAt: new Date() };
        }
      }),
    );

    // Internal DB health
    const dbStart = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      const dbMs = Date.now() - dbStart;
      results.push({
        id: 'database', label: 'PostgreSQL DB',
        status: dbMs < 100 ? 'normal' : 'slow',
        responseMs: dbMs, checkedAt: new Date(),
      });
    } catch {
      results.push({ id: 'database', label: 'PostgreSQL DB', status: 'down', responseMs: null, checkedAt: new Date() });
    }

    return { services: results, checkedAt: new Date() };
  }

  // ── helper ที่ middleware ใช้เช็คว่า maintenance เปิดอยู่ไหม ──
  async isMaintenanceEnabled(): Promise<boolean> {
    const val = await this.get(KEYS.MAINTENANCE_ENABLED);
    return val === 'true';
  }

  async getMaintenanceMessage(): Promise<string> {
    return (await this.get(KEYS.MAINTENANCE_MESSAGE)) ?? 'ระบบกำลังปิดปรับปรุง';
  }
}
