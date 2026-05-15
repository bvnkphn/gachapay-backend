import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class PaymentService {
    constructor(private prisma: PrismaService) { }

    /**
     * Process wallet payment (Gacha Wallet)
     * ประมวลผลการชำระเงินจากกระเป๋าเงิน
     */
    async processWalletPayment(
        orderId: number,
        userId: bigint,
        amount: number,
    ) {
        // Get user wallet balance
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { wallet_balance: true },
        });

        if (!user) {
            throw new BadRequestException('User not found');
        }

        if (user.wallet_balance.toNumber() < amount) {
            return {
                success: false,
                message: 'Insufficient wallet balance',
                data: null,
            };
        }

        // Deduct from wallet
        await this.prisma.user.update({
            where: { id: userId },
            data: { wallet_balance: { decrement: amount } },
        });

        // Update order status
        await this.prisma.order.update({
            where: { id: BigInt(orderId) },
            data: {
                status: 'completed',
                paymentMethod: 'gacha_wallet',
                updatedAt: new Date(),
            },
        });

        // Create transaction record
        await this.prisma.topupTransaction.create({
            data: {
                userId,
                methodId: BigInt(1), // Gacha Wallet method ID
                amount,
                status: 'completed',
                referenceId: `GACHA_${orderId}_${Date.now()}`,
                completedAt: new Date(),
            },
        });

        return {
            success: true,
            message: 'Payment processed successfully',
            data: { orderId, status: 'completed' },
        };
    }

    /**
     * Generate QR Code for PromptPay/TrueMoney
     * สร้าง QR Code สำหรับ PromptPay/TrueMoney
     */
    async generateQRCode(
        orderId: number,
        amount: number,
        method: 'promptpay' | 'truemoney',
    ) {
        // Generate reference number
        const referenceNumber = `${method.toUpperCase()}_${orderId}_${Date.now()}`;

        // In real implementation, integrate with payment gateway to generate actual QR
        // For now, return mock QR code
        const mockQRCode = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${referenceNumber}`;

        // Store transaction intent
        await this.prisma.topupTransaction.create({
            data: {
                userId: BigInt(1), // This should come from auth context
                methodId: method === 'promptpay' ? BigInt(2) : BigInt(3),
                amount,
                status: 'pending',
                referenceId: referenceNumber,
                expiresAt: new Date(Date.now() + 3 * 60 * 1000), // 3 minutes
            },
        });

        return {
            success: true,
            message: 'QR code generated successfully',
            data: {
                qrCode: mockQRCode,
                referenceNumber,
                expiresAt: new Date(Date.now() + 3 * 60 * 1000),
                method,
            },
        };
    }

    /**
     * Check payment status
     * ตรวจสอบสถานะการชำระเงิน
     */
    async checkPaymentStatus(orderId: number) {
        const order = await this.prisma.order.findUnique({
            where: { id: BigInt(orderId) },
            select: { status: true },
        });

        if (!order) {
            return {
                success: false,
                message: 'Order not found',
                status: null,
            };
        }

        return {
            success: true,
            message: 'Payment status retrieved',
            status: order.status,
        };
    }

    /**
     * Update payment status (for webhook)
     * อัปเดตสถานะการชำระเงิน
     */
    async updatePaymentStatus(
        referenceId: string,
        status: 'completed' | 'failed' | 'cancelled',
        amount: number,
        userId: bigint,
    ) {
        // Update transaction
        await this.prisma.topupTransaction.updateMany({
            where: { referenceId },
            data: {
                status,
                completedAt: status === 'completed' ? new Date() : null,
            },
        });

        // If completed, add to wallet
        if (status === 'completed') {
            await this.prisma.user.update({
                where: { id: userId },
                data: { wallet_balance: { increment: amount } },
            });
        }

        return {
            success: true,
            message: `Payment ${status}`,
            data: { referenceId, status },
        };
    }

    /**
     * Get wallet balance
     * ดึงยอดเงินในกระเป๋า
     */
    async getWalletBalance(userId: bigint) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { wallet_balance: true },
        });

        if (!user) {
            throw new BadRequestException('User not found');
        }

        return {
            success: true,
            message: 'Wallet balance retrieved',
            data: {
                balance: user.wallet_balance,
                currency: 'THB',
            },
        };
    }
}
