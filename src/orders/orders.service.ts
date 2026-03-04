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
}
