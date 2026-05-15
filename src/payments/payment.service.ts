import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PaymentService {
    constructor(private prisma: PrismaService) {}

    async processWalletPayment(orderId: number, userId: bigint, amount: number) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { wallet_balance: true },
        });

        if (!user) throw new BadRequestException('User not found');

        if (user.wallet_balance.toNumber() < amount) {
            return { success: false, message: 'Insufficient wallet balance', data: null };
        }

        await this.prisma.user.update({
            where: { id: userId },
            data: { wallet_balance: { decrement: amount } },
        });

        await this.prisma.order.update({
            where: { id: BigInt(orderId) },
            data: { status: 'completed', paymentMethod: 'gacha_wallet', updatedAt: new Date() },
        });

        await this.prisma.topupTransaction.create({
            data: {
                userId,
                methodId: BigInt(1),
                amount,
                status: 'completed',
                referenceId: `GACHA_${orderId}_${Date.now()}`,
                completedAt: new Date(),
            },
        });

        return { success: true, message: 'Payment processed successfully', data: { orderId, status: 'completed' } };
    }

    async generateQRCode(orderId: number, amount: number, method: 'promptpay' | 'truemoney') {
        const referenceNumber = `${method.toUpperCase()}_${orderId}_${Date.now()}`;
        const mockQRCode = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${referenceNumber}`;

        await this.prisma.topupTransaction.create({
            data: {
                userId: BigInt(1),
                methodId: method === 'promptpay' ? BigInt(2) : BigInt(3),
                amount,
                status: 'pending',
                referenceId: referenceNumber,
                expiresAt: new Date(Date.now() + 3 * 60 * 1000),
            },
        });

        return {
            success: true,
            message: 'QR code generated successfully',
            data: { qrCode: mockQRCode, referenceNumber, expiresAt: new Date(Date.now() + 3 * 60 * 1000), method },
        };
    }

    async checkPaymentStatus(orderId: number) {
        const order = await this.prisma.order.findUnique({
            where: { id: BigInt(orderId) },
            select: { status: true },
        });

        if (!order) return { success: false, message: 'Order not found', status: null };
        return { success: true, message: 'Payment status retrieved', status: order.status };
    }

    async updatePaymentStatus(referenceId: string, status: 'completed' | 'failed' | 'cancelled', amount: number, userId: bigint) {
        await this.prisma.topupTransaction.updateMany({
            where: { referenceId },
            data: { status, completedAt: status === 'completed' ? new Date() : null },
        });

        if (status === 'completed') {
            await this.prisma.user.update({
                where: { id: userId },
                data: { wallet_balance: { increment: amount } },
            });
        }

        return { success: true, message: `Payment ${status}`, data: { referenceId, status } };
    }

    async getWalletBalance(userId: bigint) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { wallet_balance: true },
        });

        if (!user) throw new BadRequestException('User not found');

        return {
            success: true,
            message: 'Wallet balance retrieved',
            data: { balance: user.wallet_balance, currency: 'THB' },
        };
    }
}
