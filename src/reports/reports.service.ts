import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const VAT_RATE = 0.07;

type Period = 'today' | 'week' | 'month' | 'year' | 'custom';

interface DateRange { from: Date; to: Date }

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── คำนวณ date range จาก period ────────────────────────────────
  private getDateRange(period: Period, dateFrom?: string, dateTo?: string): DateRange {
    const now = new Date();
    const to = dateTo ? new Date(dateTo) : new Date();
    to.setHours(23, 59, 59, 999);

    switch (period) {
      case 'today': {
        const from = new Date(); from.setHours(0, 0, 0, 0);
        return { from, to: now };
      }
      case 'week': {
        const from = new Date(); from.setDate(from.getDate() - 6); from.setHours(0, 0, 0, 0);
        return { from, to };
      }
      case 'year': {
        const from = new Date(now.getFullYear(), 0, 1);
        return { from, to };
      }
      case 'custom': {
        const from = dateFrom ? new Date(dateFrom) : new Date(now.getFullYear(), now.getMonth(), 1);
        from.setHours(0, 0, 0, 0);
        return { from, to };
      }
      case 'month':
      default: {
        const from = new Date(); from.setDate(1); from.setHours(0, 0, 0, 0);
        return { from, to };
      }
    }
  }

  // ── GET /reports/summary ────────────────────────────────────────
  async getSummary(period: Period, dateFrom?: string, dateTo?: string) {
    const { from, to } = this.getDateRange(period, dateFrom, dateTo);

    const orders = await this.prisma.order.findMany({
      where: { createdAt: { gte: from, lte: to }, status: 'completed' },
      include: { package: { select: { cost: true } } },
    });

    const allOrders = await this.prisma.order.findMany({
      where: { createdAt: { gte: from, lte: to } },
      select: { status: true },
    });

    // คำนวณ revenue จาก finalPrice
    const totalRevenue = orders.reduce((s, o) => s + Number(o.finalPrice ?? o.packagePrice), 0);
    const totalCost    = orders.reduce((s, o) => s + Number(o.package?.cost ?? 0), 0);
    const vatAmount    = totalRevenue * VAT_RATE;
    const revenueExVat = totalRevenue - vatAmount;
    const profit       = revenueExVat - totalCost;

    // สรุปตาม payment method
    const byMethod: Record<string, number> = {};
    orders.forEach(o => {
      const m = o.paymentMethod ?? 'unknown';
      byMethod[m] = (byMethod[m] ?? 0) + Number(o.finalPrice ?? o.packagePrice);
    });

    // Success rate
    const total   = allOrders.length;
    const success = allOrders.filter(o => o.status === 'completed').length;
    const failed  = allOrders.filter(o => o.status === 'failed').length;
    const pending = allOrders.filter(o => o.status === 'pending').length;

    // Daily breakdown
    const dailyMap: Record<string, { revenue: number; orders: number }> = {};
    orders.forEach(o => {
      const day = o.createdAt.toISOString().slice(0, 10);
      if (!dailyMap[day]) dailyMap[day] = { revenue: 0, orders: 0 };
      dailyMap[day].revenue += Number(o.finalPrice ?? o.packagePrice);
      dailyMap[day].orders  += 1;
    });

    return {
      period, from: from.toISOString(), to: to.toISOString(),
      revenue: {
        total:      totalRevenue,
        exVat:      revenueExVat,
        vat:        vatAmount,
        vatRate:    VAT_RATE * 100,
      },
      cost:   totalCost,
      profit,
      orders: { total, success, failed, pending, successRate: total > 0 ? ((success / total) * 100).toFixed(1) : '0.0' },
      byPaymentMethod: byMethod,
      daily: dailyMap,
    };
  }

  // ── GET /reports/financial ──────────────────────────────────────
  async getFinancial(period: Period, dateFrom?: string, dateTo?: string) {
    const { from, to } = this.getDateRange(period, dateFrom, dateTo);

    const orders = await this.prisma.order.findMany({
      where: { createdAt: { gte: from, lte: to }, status: 'completed' },
      include: {
        package: { select: { cost: true, name: true } },
        game:    { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Game breakdown
    const byGame: Record<string, { revenue: number; cost: number; profit: number; orders: number }> = {};
    orders.forEach(o => {
      const name = o.gameName;
      if (!byGame[name]) byGame[name] = { revenue: 0, cost: 0, profit: 0, orders: 0 };
      const rev  = Number(o.finalPrice ?? o.packagePrice);
      const cost = Number(o.package?.cost ?? 0);
      byGame[name].revenue += rev;
      byGame[name].cost    += cost;
      byGame[name].profit  += (rev * (1 - VAT_RATE)) - cost;
      byGame[name].orders  += 1;
    });

    const totalRevenue = orders.reduce((s, o) => s + Number(o.finalPrice ?? o.packagePrice), 0);
    const totalCost    = orders.reduce((s, o) => s + Number(o.package?.cost ?? 0), 0);
    const vatAmount    = totalRevenue * VAT_RATE;

    return {
      period, from: from.toISOString(), to: to.toISOString(),
      summary: {
        totalRevenue,
        totalCost,
        vatAmount,
        vatRate: VAT_RATE * 100,
        revenueExVat: totalRevenue - vatAmount,
        grossProfit: (totalRevenue - vatAmount) - totalCost,
      },
      byGame: Object.entries(byGame)
        .map(([game, v]) => ({ game, ...v }))
        .sort((a, b) => b.revenue - a.revenue),
    };
  }

  // ── GET /reports/transactions ───────────────────────────────────
  async getTransactions(params: {
    period: Period; dateFrom?: string; dateTo?: string;
    page: number; limit: number; status?: string;
  }) {
    const { from, to } = this.getDateRange(params.period, params.dateFrom, params.dateTo);
    const skip = (params.page - 1) * params.limit;
    const where: any = { createdAt: { gte: from, lte: to } };
    if (params.status && params.status !== 'all') where.status = params.status;

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where, skip, take: params.limit,
        orderBy: { createdAt: 'desc' },
        include: { package: { select: { cost: true } } },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data: orders.map(o => {
        const revenue = Number(o.finalPrice ?? o.packagePrice);
        const cost    = Number(o.package?.cost ?? 0);
        const vat     = revenue * VAT_RATE;
        return {
          id:            o.id.toString(),
          orderId:       `ORD-${o.id}`,
          gameName:      o.gameName,
          packageName:   o.packageName,
          uid:           o.uid,
          email:         o.email,
          revenue,
          cost,
          vat:           Number.parseFloat(vat.toFixed(2)),
          revenueExVat:  Number.parseFloat((revenue - vat).toFixed(2)),
          profit:        Number.parseFloat(((revenue - vat) - cost).toFixed(2)),
          status:        o.status,
          paymentMethod: o.paymentMethod ?? '-',
          discount:      Number(o.discountAmount),
          createdAt:     o.createdAt.toISOString(),
        };
      }),
      pagination: { page: params.page, limit: params.limit, total, totalPages: Math.ceil(total / params.limit) },
    };
  }

  // ── GET /reports/export ─────────────────────────────────────────
  async exportReport(period: Period, format: 'csv' | 'xlsx', dateFrom?: string, dateTo?: string) {
    const { from, to } = this.getDateRange(period, dateFrom, dateTo);

    const orders = await this.prisma.order.findMany({
      where: { createdAt: { gte: from, lte: to } },
      include: { package: { select: { cost: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const rows = orders.map(o => {
      const revenue = Number(o.finalPrice ?? o.packagePrice);
      const cost    = Number(o.package?.cost ?? 0);
      const vat     = Number.parseFloat((revenue * VAT_RATE).toFixed(2));
      const exVat   = Number.parseFloat((revenue - vat).toFixed(2));
      const profit  = Number.parseFloat((exVat - cost).toFixed(2));
      return {
        'Order ID':       `ORD-${o.id}`,
        'วันที่':         o.createdAt.toLocaleDateString('th-TH'),
        'เวลา':           o.createdAt.toLocaleTimeString('th-TH'),
        'เกม':            o.gameName,
        'แพ็กเกจ':        o.packageName,
        'UID':            o.uid,
        'อีเมล':          o.email,
        'ราคาขาย (฿)':    revenue,
        'ราคา (excl.VAT)': exVat,
        'VAT 7% (฿)':     vat,
        'ต้นทุน (฿)':     cost,
        'กำไร (฿)':       profit,
        'ส่วนลด (฿)':     Number(o.discountAmount),
        'วิธีชำระ':        o.paymentMethod ?? '-',
        'สถานะ':          o.status,
      };
    });

    if (format === 'csv') {
      return this.toCsv(rows);
    } else {
      return this.toXlsx(rows);
    }
  }

  // ── CSV helper ──────────────────────────────────────────────────
  private toCsv(rows: Record<string, any>[]): Buffer {
    if (rows.length === 0) return Buffer.from('');
    const headers = Object.keys(rows[0]);
    const lines = [
      '\ufeff' + headers.join(','),
      ...rows.map(r => headers.map(h => `"${String(r[h]).replace(/"/g, '""')}"`).join(',')),
    ];
    return Buffer.from(lines.join('\n'), 'utf8');
  }

  // ── XLSX helper (ใช้ ExcelJS) ───────────────────────────────────
  private async toXlsx(rows: Record<string, any>[]): Promise<Buffer> {
    const ExcelJS = require('exceljs');
    const wb = new ExcelJS.Workbook();
    wb.creator = 'CyberPay Admin';
    wb.created = new Date();

    const ws = wb.addWorksheet('รายงาน', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });

    if (rows.length === 0) return wb.xlsx.writeBuffer();

    const getHeaderWidth = (header: string): number => {
      if (header.includes('ID') || header.includes('UID')) return 18;
      if (header.includes('เกม') || header.includes('แพ็กเกจ')) return 22;
      if (header.includes('อีเมล')) return 28;
      return 15;
    };

    // Header style
    const headers = Object.keys(rows[0]);
    ws.columns = headers.map(h => ({
      header: h, key: h,
      width: getHeaderWidth(h),
    }));

    // Style header row
    ws.getRow(1).eachCell(cell => {
      cell.font      = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1a2540' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border    = { bottom: { style: 'thin', color: { argb: 'FF38bdf8' } } };
    });
    ws.getRow(1).height = 28;

    // Data rows
    rows.forEach((row, i) => {
      const r = ws.addRow(row);
      r.height = 22;

      // สลับสีแถว
      if (i % 2 === 0) {
        r.eachCell(cell => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0d1526' } };
        });
      }

      // สีกำไร
      const profitCell = r.getCell('กำไร (฿)');
      const profitVal  = Number(row['กำไร (฿)']);
      profitCell.font  = { bold: true, color: { argb: profitVal >= 0 ? 'FF34d399' : 'FFf87171' } };

      // Format number cells
      ['ราคาขาย (฿)', 'ราคา (excl.VAT)', 'VAT 7% (฿)', 'ต้นทุน (฿)', 'กำไร (฿)', 'ส่วนลด (฿)'].forEach(col => {
        r.getCell(col).numFmt = '#,##0.00';
      });

      // สีสถานะ
      const statusCell = r.getCell('สถานะ');
      const status     = String(row['สถานะ']);
      const getStatusColor = (s: string): string => {
        if (s === 'completed') return 'FF34d399';
        if (s === 'failed') return 'FFf87171';
        return 'FFfbbf24';
      };
      statusCell.font  = {
        bold: true,
        color: { argb: getStatusColor(status) },
      };
    });

    // Summary row
    ws.addRow({});
    const sumRow = ws.addRow({
      'Order ID': 'รวมทั้งหมด',
      'ราคาขาย (฿)':     rows.reduce((s, r) => s + Number(r['ราคาขาย (฿)']), 0),
      'ราคา (excl.VAT)': rows.reduce((s, r) => s + Number(r['ราคา (excl.VAT)']), 0),
      'VAT 7% (฿)':      rows.reduce((s, r) => s + Number(r['VAT 7% (฿)']), 0),
      'ต้นทุน (฿)':      rows.reduce((s, r) => s + Number(r['ต้นทุน (฿)']), 0),
      'กำไร (฿)':        rows.reduce((s, r) => s + Number(r['กำไร (฿)']), 0),
    });
    sumRow.eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FF38bdf8' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0a1628' } };
      cell.numFmt = '#,##0.00';
    });

    return wb.xlsx.writeBuffer();
  }
}
