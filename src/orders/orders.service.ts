import {
    Injectable, NotFoundException, ForbiddenException, BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

// สถานะที่อนุญาตให้เปลี่ยนได้ (State Machine)
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
    pending:    ['completed', 'failed', 'cancelled'],
    processing: ['completed', 'failed'],
    failed:     ['completed', 'refunded'],
    completed:  ['refunded'],
    refunded:   [],
    cancelled:  [],
};

const STATUS_LABEL: Record<string, string> = {
    completed:  'COMPLETED',
    pending:    'PENDING',
    processing: 'PROCESSING',
    failed:     'FAILED',
    refunded:   'REFUNDED',
    cancelled:  'CANCELLED',
};

@Injectable()
export class OrdersService {
    constructor(private prisma: PrismaService) {}

    async create(data: Prisma.OrderUncheckedCreateInput) {
        return this.prisma.order.create({ data });
    }

    // GET /orders — list with ownership
    async findAll(userId: bigint) {
        const orders = await this.prisma.order.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true, gameName: true, packageName: true,
                packagePrice: true, paymentMethod: true, status: true, createdAt: true,
            },
        });
        return orders.map((o) => ({
            order_id: o.id.toString(),
            created_at: o.createdAt,
            status: o.status,
            status_label: STATUS_LABEL[o.status] ?? o.status.toUpperCase(),
            package_name: o.packageName,
            game_name: o.gameName,
            total_price: o.packagePrice,
            payment_method: o.paymentMethod,
        }));
    }

    // GET /orders/:id — detail with ownership check
    async findByIdForUser(id: bigint, userId: bigint) {
        const order = await this.prisma.order.findUnique({
            where: { id },
            include: {
                game:    { select: { name: true, slug: true } },
                package: { select: { name: true, price: true } },
            },
        });
        if (!order) throw new NotFoundException('Order not found');
        if (order.userId !== userId) throw new ForbiddenException('Access denied');
        return {
            order_id: order.id.toString(),
            created_at: order.createdAt,
            status: order.status,
            status_label: STATUS_LABEL[order.status] ?? order.status.toUpperCase(),
            product: {
                package_name: order.packageName,
                game_name: order.gameName,
                game_uid: order.uid,
                total_price: order.packagePrice,
            },
            payment: {
                method: order.paymentMethod ?? 'unknown',
                status: order.status === 'completed' ? 'paid' : 'unpaid',
            },
            is_completed: order.status === 'completed',
        };
    }

    async findById(id: bigint) {
        return this.prisma.order.findUnique({ where: { id } });
    }

    // ─── Admin: GET /orders/admin/all — pagination + filter ───────────────────
    async findAllForAdmin(opts: {
        page?: number;
        limit?: number;
        status?: string;
        search?: string;    // UID / Order ID / email
        gameId?: string;
    } = {}) {
        const page  = Math.max(1, opts.page  ?? 1);
        const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
        const skip  = (page - 1) * limit;

        const where: Prisma.OrderWhereInput = {};

        // Filter status
        if (opts.status && opts.status !== 'all') {
            where.status = opts.status;
        }

        // Search: UID / email / Order ID
        if (opts.search) {
            const s = opts.search.trim();
            const numId = !isNaN(Number(s)) ? BigInt(s) : undefined;
            where.OR = [
                { uid:   { contains: s, mode: 'insensitive' } },
                { email: { contains: s, mode: 'insensitive' } },
                ...(numId ? [{ id: numId }] : []),
            ];
        }

        if (opts.gameId) {
            where.gameId = BigInt(opts.gameId);
        }

        const [total, orders] = await Promise.all([
            this.prisma.order.count({ where }),
            this.prisma.order.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip,
                select: {
                    id: true, uid: true, email: true,
                    gameName: true, packageName: true,
                    packagePrice: true, finalPrice: true,
                    paymentMethod: true, status: true, createdAt: true,
                    couponCode: true, discountAmount: true,
                },
            }),
        ]);

        return {
            data: orders.map((o) => ({
                order_id:   o.id.toString(),
                uid:        o.uid,
                email:      o.email,
                game:       o.gameName,
                pkg:        o.packageName,
                amount:     Number(o.finalPrice ?? o.packagePrice),
                discount:   Number(o.discountAmount ?? 0),
                method:     o.paymentMethod ?? 'unknown',
                status:     o.status,
                coupon:     o.couponCode ?? null,
                created_at: o.createdAt,
            })),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    // ─── Admin: PATCH /orders/admin/:id/status — เปลี่ยนสถานะด้วยมือ ─────────
    async adminUpdateStatus(orderId: bigint, newStatus: string, adminId: bigint) {
        const order = await this.prisma.order.findUnique({ where: { id: orderId } });
        if (!order) throw new NotFoundException('ไม่พบออเดอร์นี้');

        const allowed = ALLOWED_TRANSITIONS[order.status] ?? [];
        if (!allowed.includes(newStatus)) {
            throw new BadRequestException(
                `ไม่สามารถเปลี่ยนจาก "${order.status}" → "${newStatus}" ได้`,
            );
        }

        const updated = await this.prisma.order.update({
            where: { id: orderId },
            data:  { status: newStatus, updatedAt: new Date() },
        });

        if (newStatus === 'completed' && order.userId) {
            await this.prisma.processReferralReward(order.userId);
        }

        // Audit log
        await this.prisma.adminLog.create({
            data: {
                userId:   adminId,
                action:   `ORDER_STATUS_CHANGE:${orderId}:${order.status}→${newStatus}`,
            },
        });

        return {
            success: true,
            order_id: updated.id.toString(),
            prev_status: order.status,
            new_status:  updated.status,
        };
    }

    // ─── Admin: POST /orders/admin/:id/retry — ส่งเข้า queue ใหม่ ───────────
    async adminRetryOrder(orderId: bigint, adminId: bigint) {
        const order = await this.prisma.order.findUnique({ where: { id: orderId } });
        if (!order) throw new NotFoundException('ไม่พบออเดอร์นี้');

        // ป้องกัน Double Delivery — retry ได้เฉพาะ failed/cancelled
        if (!['failed', 'cancelled'].includes(order.status)) {
            throw new BadRequestException(
                `Retry ได้เฉพาะออเดอร์ที่ failed หรือ cancelled เท่านั้น (สถานะปัจจุบัน: ${order.status})`,
            );
        }

        // เปลี่ยนสถานะเป็น pending (รอ worker ดึงไปทำ)
        const updated = await this.prisma.order.update({
            where: { id: orderId },
            data:  { status: 'pending', updatedAt: new Date() },
        });

        // Audit log
        await this.prisma.adminLog.create({
            data: {
                userId: adminId,
                action: `ORDER_RETRY:${orderId}:${order.status}→pending`,
            },
        });

        return {
            success:  true,
            order_id: updated.id.toString(),
            message:  'ส่งออเดอร์เข้าคิวใหม่สำเร็จ',
        };
    }

    // ─── Admin: GET /orders/admin/export — ดึงข้อมูลสำหรับ export CSV ────────
    async adminExportOrders(opts: { status?: string; dateFrom?: string; dateTo?: string }) {
        const where: Prisma.OrderWhereInput = {};
        if (opts.status && opts.status !== 'all') where.status = opts.status;
        if (opts.dateFrom || opts.dateTo) {
            where.createdAt = {};
            if (opts.dateFrom) (where.createdAt as any).gte = new Date(opts.dateFrom);
            if (opts.dateTo)   (where.createdAt as any).lte = new Date(opts.dateTo + 'T23:59:59');
        }

        const orders = await this.prisma.order.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true, uid: true, email: true,
                gameName: true, packageName: true,
                packagePrice: true, finalPrice: true, discountAmount: true,
                paymentMethod: true, status: true, createdAt: true, couponCode: true,
            },
        });

        return orders.map((o) => ({
            order_id:    o.id.toString(),
            uid:         o.uid,
            email:       o.email,
            game:        o.gameName,
            package:     o.packageName,
            price:       Number(o.packagePrice),
            discount:    Number(o.discountAmount ?? 0),
            final:       Number(o.finalPrice ?? o.packagePrice),
            method:      o.paymentMethod ?? '',
            coupon:      o.couponCode ?? '',
            status:      o.status,
            created_at:  o.createdAt.toISOString(),
        }));
    }

    // GET รายได้แยกตาม ID เกม
    async getRevenueByGame(gameId?: string) {
        const where: any = { status: 'completed' };
        if (gameId) where.gameName = gameId;

        const orders = await this.prisma.order.findMany({
            where,
            select: { gameName: true, finalPrice: true, packagePrice: true },
        });

        const map: Record<string, { revenue: number; orders: number }> = {};
        for (const o of orders) {
            const name = o.gameName;
            if (!map[name]) map[name] = { revenue: 0, orders: 0 };
            map[name].revenue += Number(o.finalPrice ?? o.packagePrice);
            map[name].orders  += 1;
        }

        return Object.entries(map)
            .sort((a, b) => b[1].revenue - a[1].revenue)
            .map(([game, stats]) => ({ game, ...stats }));
    }

    async update(id: bigint, data: Prisma.OrderUpdateInput) {
        return this.prisma.order.update({ where: { id }, data });
    }

    async findRecentByUser(userId: bigint) {
        const orders = await this.prisma.order.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: {
                packageName: true, gameName: true,
                packagePrice: true, status: true, createdAt: true,
            },
        });
        return orders.map((o) => ({
            product_name:  o.packageName,
            game_category: o.gameName,
            amount:        o.packagePrice,
            status:        o.status,
            created_at:    o.createdAt,
        }));
    }

    async prepareOrderForPayment(orderId: bigint, userId: bigint) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: {
                game:    { select: { name: true, slug: true } },
                package: { select: { name: true, price: true, description: true } },
            },
        });
        if (!order) throw new NotFoundException('Order not found');
        if (order.userId !== userId) throw new ForbiddenException('Access denied');

        return {
            success: true,
            data: {
                orderId: order.id.toString(),
                orderDetails: {
                    gameName: order.gameName,
                    packageName: order.packageName,
                    packageDescription: order.package?.description,
                },
                packageId: order.packageId.toString(),
                playerInformation: {
                    userId: order.userId.toString(),
                    email:  order.email,
                    gameUid: order.uid,
                },
                email:      order.email,
                couponCode: order.couponCode,
                amounts: {
                    originalPrice:  order.packagePrice,
                    discountAmount: order.discountAmount || 0,
                    finalPrice:     order.finalPrice || order.packagePrice,
                },
                createdAt: order.createdAt,
                status:    order.status,
            },
        };
    }

    async getPublicStats() {
        const completedOrdersCount = await this.prisma.order.count({
            where: { status: 'completed' },
        });
        const completedTopupsCount = await this.prisma.topupTransaction.count({
            where: { status: 'completed' },
        });
        return {
            total_success: completedOrdersCount + completedTopupsCount,
        };
    }
}
