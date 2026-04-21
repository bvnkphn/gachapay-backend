import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

const STATUS_LABEL: Record<string, string> = {
    completed: 'COMPLETED',
    pending: 'PENDING',
    processing: 'PENDING',
    failed: 'PARTIAL_PAYMENT',
    cancelled: 'CANCELLED',
};

@Injectable()
export class OrdersService {
    constructor(private prisma: PrismaService) { }

    async create(data: Prisma.OrderUncheckedCreateInput) {
        return this.prisma.order.create({ data });
    }

    // GET /orders — list with ownership
    async findAll(userId: bigint) {
        const orders = await this.prisma.order.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                gameName: true,
                packageName: true,
                packagePrice: true,
                paymentMethod: true,
                status: true,
                createdAt: true,
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
                game: { select: { name: true, slug: true } },
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
            // Product info
            product: {
                package_name: order.packageName,
                game_name: order.gameName,
                game_uid: order.uid,
                total_price: order.packagePrice,
            },
            // Payment info
            payment: {
                method: order.paymentMethod ?? 'unknown',
                status: order.status === 'completed' ? 'paid' : 'unpaid',
            },
            // Read-only flag
            is_completed: order.status === 'completed',
        };
    }

    async findById(id: bigint) {
        return this.prisma.order.findUnique({ where: { id } });
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
                packageName: true,
                gameName: true,
                packagePrice: true,
                status: true,
                createdAt: true,
            },
        });

        return orders.map((o) => ({
            product_name: o.packageName,
            game_category: o.gameName,
            amount: o.packagePrice,
            status: o.status,
            created_at: o.createdAt,
        }));
    }
}
