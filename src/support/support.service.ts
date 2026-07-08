import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  new:        ['inprogress', 'closed'],
  inprogress: ['resolved', 'closed'],
  resolved:   ['closed', 'inprogress'],
  closed:     [],
};

function serialize(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return obj.toString();
  if (obj instanceof Date) return obj.toISOString();
  if (Array.isArray(obj)) return obj.map(serialize);
  if (typeof obj === 'object') {
    return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, serialize(v)]));
  }
  return obj;
}

@Injectable()
export class SupportService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Generate ticketNo ─────────────────────────────────────────
  private async generateTicketNo(): Promise<string> {
    const last = await this.prisma.supportTicket.findFirst({
      orderBy: { id: 'desc' }, select: { ticketNo: true },
    });
    if (!last) return 'TK-0001';
    const num = Number.parseInt(last.ticketNo.replace('TK-', ''), 10) + 1;
    return `TK-${String(num).padStart(4, '0')}`;
  }

  // ── GET /support/admin/tickets ────────────────────────────────
  async findAll(params: {
    page: number; limit: number;
    status?: string; search?: string;
    priority?: string; dateFrom?: string; dateTo?: string;
    orderId?: string;
  }) {
    const { page, limit, status, search, priority, dateFrom, dateTo, orderId } = params;
    const skip = (page - 1) * limit;
    const where: any = {};

    if (status && status !== 'all') where.status = status;
    if (priority) where.priority = priority;
    if (orderId) where.orderId = BigInt(orderId);

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    if (search) {
      where.OR = [
        { ticketNo: { contains: search, mode: 'insensitive' } },
        { subject:  { contains: search, mode: 'insensitive' } },
        { email:    { contains: search, mode: 'insensitive' } },
        { name:     { contains: search, mode: 'insensitive' } },
        // ค้นหาจาก order id
        ...(Number.isNaN(Number(search)) ? [] : [{ orderId: BigInt(search) }]),
      ];
    }

    const [tickets, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user:     { select: { id:true, name:true, email:true, tier:true } },
          assignee: { select: { id:true, name:true, email:true } },
          messages: { orderBy:{ createdAt:'desc' }, take:1 },
          _count:   { select:{ messages:true } },
        },
      }),
      this.prisma.supportTicket.count({ where }),
    ]);

    return {
      data: serialize(tickets.map(t => ({
        ...t,
        messageCount: t._count.messages,
        lastMessage:  t.messages[0] ?? null,
        messages: undefined,
        _count:   undefined,
      }))),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // ── GET /support/admin/tickets/:id ────────────────────────────
  async findOne(id: bigint) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
      include: {
        user:     { select:{ id:true, name:true, email:true, tier:true, created_at:true } },
        assignee: { select:{ id:true, name:true, email:true } },
        messages: {
          orderBy: { createdAt:'asc' },
          include: { user: { select:{ id:true, name:true, role:true } } },
        },
        histories: {
          orderBy: { createdAt:'asc' },
          include: { admin: { select:{ id:true, name:true } } },
        },
      },
    });
    if (!ticket) throw new NotFoundException('ไม่พบ ticket');

    // ดึงข้อมูล Order ที่เกี่ยวข้อง
    let orderRef: any = null;
    if (ticket.orderId) {
      const order = await this.prisma.order.findUnique({
        where: { id: ticket.orderId },
        select: {
          id:true, gameName:true, packageName:true, packagePrice:true,
          finalPrice:true, status:true, paymentMethod:true, uid:true, createdAt:true,
        },
      });
      orderRef = order;
    }

    // นับออเดอร์ทั้งหมดของ user
    let orderCount = 0;
    if (ticket.userId) {
      orderCount = await this.prisma.order.count({ where: { userId: ticket.userId } });
    }

    return serialize({ ...ticket, orderRef, orderCount });
  }

  // ── PATCH /support/admin/tickets/:id/status ───────────────────
  async updateStatus(id: bigint, status: string, adminId: bigint, note?: string) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('ไม่พบ ticket');

    const allowed = ALLOWED_TRANSITIONS[ticket.status] ?? [];
    if (!allowed.includes(status)) {
      throw new BadRequestException(`ไม่สามารถเปลี่ยนจาก ${ticket.status} → ${status}`);
    }

    const [updated] = await Promise.all([
      this.prisma.supportTicket.update({
        where: { id },
        data: { status: status as any, closedAt: status === 'closed' ? new Date() : null },
      }),
      // บันทึก history
      this.prisma.ticketHistory.create({
        data: {
          ticketId:  id,
          adminId,
          action:    'status_changed',
          fromValue: ticket.status,
          toValue:   status,
          note,
        },
      }),
    ]);
    return serialize(updated);
  }

  // ── PATCH /support/admin/tickets/:id/assign ───────────────────
  async assign(id: bigint, assigneeId: bigint, adminId: bigint) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('ไม่พบ ticket');

    const [updated] = await Promise.all([
      this.prisma.supportTicket.update({
        where: { id },
        data: { assigneeId },
      }),
      this.prisma.ticketHistory.create({
        data: {
          ticketId:  id,
          adminId,
          action:    'assigned',
          fromValue: ticket.assigneeId?.toString() ?? null,
          toValue:   assigneeId.toString(),
        },
      }),
    ]);
    return serialize(updated);
  }

  // ── POST /support/admin/tickets/:id/reply ─────────────────────
  async reply(ticketId: bigint, adminId: bigint, message: string, imageUrl?: string) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('ไม่พบ ticket');
    if (ticket.status === 'closed') throw new BadRequestException('Ticket ถูกปิดแล้ว');

    const ops: any[] = [
      this.prisma.ticketMessage.create({
        data: { ticketId, userId: adminId, senderType: 'admin', message, imageUrl },
      }),
      this.prisma.ticketHistory.create({
        data: { ticketId, adminId, action: 'replied', note: message.slice(0, 100) },
      }),
    ];

    // auto-move new → inprogress เมื่อ admin ตอบ
    if (ticket.status === 'new') {
      ops.push(this.prisma.supportTicket.update({
        where: { id: ticketId },
        data: { status: 'inprogress' },
      }));
      ops.push(this.prisma.ticketHistory.create({
        data: { ticketId, adminId, action: 'status_changed', fromValue: 'new', toValue: 'inprogress', note: 'Auto: admin replied' },
      }));
    }

    const [msg] = await Promise.all(ops);
    return serialize(msg);
  }

  // ── GET /support/admin/stats ──────────────────────────────────
  async getStats() {
    const [total, newCount, inprogress, resolved, closed, urgent] = await Promise.all([
      this.prisma.supportTicket.count(),
      this.prisma.supportTicket.count({ where: { status: 'new' } }),
      this.prisma.supportTicket.count({ where: { status: 'inprogress' } }),
      this.prisma.supportTicket.count({ where: { status: 'resolved' } }),
      this.prisma.supportTicket.count({ where: { status: 'closed' } }),
      this.prisma.supportTicket.count({ where: { priority: 'urgent' } }),
    ]);
    return { total, new: newCount, inprogress, resolved, closed, urgent };
  }

  // ── GET /support/admin/tickets/:id/history ────────────────────
  async getHistory(ticketId: bigint) {
    const histories = await this.prisma.ticketHistory.findMany({
      where: { ticketId },
      orderBy: { createdAt: 'asc' },
      include: { admin: { select: { id:true, name:true } } },
    });
    return serialize(histories);
  }

  // ── POST /support/tickets — public / user ───────────────────────
  async createTicket(data: {
    name: string;
    email: string;
    subject: string;
    category?: string;
    orderId?: string;
    message: string;
    imageUrl?: string;
    userId?: string;
  }) {
    const ticketNo = await this.generateTicketNo();
    
    let uId: bigint | null = null;
    if (data.userId) {
      try {
        uId = BigInt(data.userId);
      } catch (e) {
        console.error("Failed to parse user ID:", e);
      }
    }

    let oId: bigint | null = null;
    if (data.orderId) {
      const cleanOrderId = data.orderId.replace(/\D/g, '');
      if (cleanOrderId) {
        try {
          oId = BigInt(cleanOrderId);
        } catch (e) {
          console.error("Failed to parse order ID:", e);
        }
      }
    }

    const ticket = await this.prisma.supportTicket.create({
      data: {
        ticketNo,
        userId: uId,
        email: data.email,
        name: data.name || 'Anonymous',
        subject: data.subject,
        category: data.category || 'general',
        orderId: oId,
        priority: 'normal',
        status: 'new',
      },
    });

    // Create the first message
    await this.prisma.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        userId: uId,
        senderType: 'user',
        message: data.message,
        imageUrl: data.imageUrl || null,
      },
    });

    // Create ticket history log
    await this.prisma.ticketHistory.create({
      data: {
        ticketId: ticket.id,
        action: 'created',
        note: `Ticket created by user (${data.email})`,
      },
    });

    return serialize(ticket);
  }
}

