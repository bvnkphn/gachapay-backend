import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class OrdersService {
    constructor(private prisma: PrismaService) { }

    async create(data: Prisma.OrderUncheckedCreateInput) {
        return this.prisma.order.create({ data });
    }

    async findAll(userId: bigint) {
        return this.prisma.order.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findById(id: bigint) {
        return this.prisma.order.findUnique({ where: { id } });
    }

    async update(id: bigint, data: Prisma.OrderUpdateInput) {
        return this.prisma.order.update({
            where: { id },
            data,
        });
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
