import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class ApiCreditService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Auto-seed default providers if none exist ────────────────────
  private async ensureDefaults() {
    const count = await this.prisma.apiCreditProvider.count();
    if (count === 0) {
      await this.prisma.apiCreditProvider.createMany({
        data: [
          {
            name: '24PaySeller',
            code: '24payseller',
            description: 'API เติมเกมหลัก — ระบบเติมเกมอัตโนมัติ',
            apiBaseUrl: 'https://x.24payseller.com',
            balance: 0,
            alertThreshold: 1000,
            enabled: true,
          },
        ],
      });
    }
  }

  // ── GET /api-credit/providers ───────────────────────────────────
  async getProviders() {
    await this.ensureDefaults();
    const providers = await this.prisma.apiCreditProvider.findMany({
      orderBy: { createdAt: 'asc' },
    });
    return providers.map(p => ({
      id: p.id,
      name: p.name,
      code: p.code,
      description: p.description,
      iconUrl: p.iconUrl,
      apiBaseUrl: p.apiBaseUrl,
      balance: Number(p.balance),
      alertThreshold: Number(p.alertThreshold),
      enabled: p.enabled,
      lastCheckedAt: p.lastCheckedAt,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));
  }

  // ── POST /api-credit/providers ──────────────────────────────────
  async createProvider(data: {
    name: string;
    code: string;
    description?: string;
    apiBaseUrl?: string;
    balance?: number;
    alertThreshold?: number;
  }) {
    const provider = await this.prisma.apiCreditProvider.create({
      data: {
        name: data.name,
        code: data.code,
        description: data.description ?? null,
        apiBaseUrl: data.apiBaseUrl ?? null,
        balance: data.balance ?? 0,
        alertThreshold: data.alertThreshold ?? 1000,
      },
    });
    return { success: true, provider: this.formatProvider(provider) };
  }

  // ── PATCH /api-credit/providers/:id ─────────────────────────────
  async updateProvider(
    id: number,
    data: {
      name?: string;
      description?: string;
      apiBaseUrl?: string;
      alertThreshold?: number;
      enabled?: boolean;
    },
  ) {
    const provider = await this.prisma.apiCreditProvider.update({
      where: { id },
      data,
    });
    return { success: true, provider: this.formatProvider(provider) };
  }

  // ── DELETE /api-credit/providers/:id ────────────────────────────
  async deleteProvider(id: number) {
    await this.prisma.apiCreditProvider.delete({ where: { id } });
    return { success: true };
  }

  // ── POST /api-credit/providers/:id/topup ────────────────────────
  async topupCredit(id: number, amount: number, note?: string) {
    return this.prisma.$transaction(async (tx) => {
      const provider = await tx.apiCreditProvider.findUnique({ where: { id } });
      if (!provider) throw new NotFoundException('Provider not found');

      const newBalance = Number(provider.balance) + amount;

      await tx.apiCreditProvider.update({
        where: { id },
        data: { balance: newBalance, lastCheckedAt: new Date() },
      });

      const txn = await tx.apiCreditTransaction.create({
        data: {
          providerId: id,
          type: 'topup',
          amount,
          balanceAfter: newBalance,
          note: note || 'เติมเครดิต API',
        },
      });

      return {
        success: true,
        transaction: this.formatTransaction(txn),
        newBalance,
      };
    });
  }

  // ── POST /api-credit/providers/:id/adjust ───────────────────────
  async adjustCredit(id: number, newBalance: number, note?: string) {
    return this.prisma.$transaction(async (tx) => {
      const provider = await tx.apiCreditProvider.findUnique({ where: { id } });
      if (!provider) throw new NotFoundException('Provider not found');

      const diff = newBalance - Number(provider.balance);

      await tx.apiCreditProvider.update({
        where: { id },
        data: { balance: newBalance, lastCheckedAt: new Date() },
      });

      const txn = await tx.apiCreditTransaction.create({
        data: {
          providerId: id,
          type: 'adjust',
          amount: diff,
          balanceAfter: newBalance,
          note: note || 'ปรับยอดเครดิต',
        },
      });

      return {
        success: true,
        transaction: this.formatTransaction(txn),
        newBalance,
      };
    });
  }

  // ── Deduct credit (called by OrdersService) ─────────────────────
  async deductCredit(
    providerCode: string,
    amount: number,
    note: string,
    orderId?: bigint,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const provider = await tx.apiCreditProvider.findUnique({
        where: { code: providerCode },
      });
      if (!provider) return null; // Silently skip if provider not configured

      const newBalance = Math.max(0, Number(provider.balance) - amount);

      await tx.apiCreditProvider.update({
        where: { id: provider.id },
        data: { balance: newBalance, lastCheckedAt: new Date() },
      });

      await tx.apiCreditTransaction.create({
        data: {
          providerId: provider.id,
          type: 'deduct',
          amount: -amount,
          balanceAfter: newBalance,
          note,
          orderId: orderId ?? null,
        },
      });

      return { newBalance };
    });
  }

  // ── GET /api-credit/providers/:id/transactions ──────────────────
  async getTransactions(providerId: number, limit = 50) {
    const txns = await this.prisma.apiCreditTransaction.findMany({
      where: { providerId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { provider: { select: { name: true, code: true } } },
    });
    return txns.map(t => this.formatTransaction(t));
  }

  // ── GET /api-credit/summary ─────────────────────────────────────
  async getSummary() {
    await this.ensureDefaults();
    const providers = await this.prisma.apiCreditProvider.findMany();
    const totalBalance = providers.reduce((s, p) => s + Number(p.balance), 0);
    const activeCount = providers.filter(p => p.enabled).length;
    const alertCount = providers.filter(
      p => p.enabled && Number(p.balance) < Number(p.alertThreshold),
    ).length;

    const recentTxns = await this.prisma.apiCreditTransaction.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { provider: { select: { name: true, code: true } } },
    });

    return {
      totalBalance,
      activeProviders: activeCount,
      totalProviders: providers.length,
      alertCount,
      recentTransactions: recentTxns.map(t => this.formatTransaction(t)),
    };
  }

  // ── Helpers ─────────────────────────────────────────────────────
  private formatProvider(p: any) {
    return {
      id: p.id,
      name: p.name,
      code: p.code,
      description: p.description,
      iconUrl: p.iconUrl,
      apiBaseUrl: p.apiBaseUrl,
      balance: Number(p.balance),
      alertThreshold: Number(p.alertThreshold),
      enabled: p.enabled,
      lastCheckedAt: p.lastCheckedAt,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  }

  private formatTransaction(t: any) {
    return {
      id: t.id,
      providerId: t.providerId,
      providerName: t.provider?.name ?? null,
      providerCode: t.provider?.code ?? null,
      type: t.type,
      amount: Number(t.amount),
      balanceAfter: Number(t.balanceAfter),
      note: t.note,
      orderId: t.orderId ? t.orderId.toString() : null,
      createdAt: t.createdAt,
    };
  }
}
