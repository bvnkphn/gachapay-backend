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

        const order = await this.prisma.order.update({
            where: { id: BigInt(orderId) },
            data: { status: 'completed', paymentMethod: 'gacha_wallet', updatedAt: new Date() },
        });

        if (order.couponCode) {
            try {
                const coupon = await this.prisma.coupon.findUnique({ where: { code: order.couponCode } });
                if (coupon) {
                    await this.prisma.couponUsage.create({
                        data: {
                            couponId: coupon.id,
                            userId: userId,
                            orderId: order.id,
                            usedAmount: order.packagePrice,
                            discountAmount: order.discountAmount,
                        }
                    });
                    await this.prisma.coupon.update({
                        where: { id: coupon.id },
                        data: { currentUsageCount: { increment: 1 } },
                    });
                }
            } catch (err) {
                console.error("Failed to apply coupon on processWalletPayment:", err);
            }
        }

        await this.prisma.processReferralReward(userId);

        // NOTE: do not create a topup transaction for internal wallet payments.
        // Wallet payments decrement the user's balance and mark the order completed,
        // but they should not be treated as a top-up that increases cumulative topup totals.

        return { success: true, message: 'Payment processed successfully', data: { orderId, status: 'completed' } };
    }

    async generateQRCode(orderId: number, amount: number, method: 'promptpay' | 'truemoney', requesterUserId?: bigint) {
        const referenceNumber = `${method.toUpperCase()}_${orderId}_${Date.now()}`;
        const mockQRCode = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${referenceNumber}`;

        // Fetch order to get the actual userId if available
        const order = await this.prisma.order.findUnique({
            where: { id: BigInt(orderId) },
            select: { userId: true },
        });

        // Prefer the authenticated requester id (if provided). If not, fall back
        // to the order's userId or null.
        const userId = requesterUserId ?? order?.userId ?? null;

        await this.prisma.topupTransaction.create({
            data: {
                userId: userId ?? BigInt(1),
                orderId: BigInt(orderId),
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
        // Find the related topup transaction (if any)
        const tx = await this.prisma.topupTransaction.findUnique({
            where: { referenceId },
            include: { method: true },
        });

        if (tx) {
            await this.prisma.topupTransaction.update({
                where: { referenceId },
                data: { status, completedAt: status === 'completed' ? new Date() : null },
            });

            // Only increment wallet balance for standalone top-up transactions
            // (i.e., transactions that are NOT tied to an order). This prevents
            // order payments from being treated as top-ups and inflating cumulative
            // top-up totals.
            if (status === 'completed' && !tx.orderId) {
                const isTrueMoney = tx.method?.code === 'truemoney';
                const netAmount = isTrueMoney ? Math.round((Number(tx.amount) / 1.015) * 100) / 100 : Number(tx.amount);
                await this.prisma.user.update({
                    where: { id: userId },
                    data: { wallet_balance: { increment: netAmount } },
                });
            }
        }

        if (status === 'completed') {
            // Check if referenceId follows the pattern METHOD_ORDERID_TIMESTAMP to auto-complete the order
            const parts = referenceId.split('_');
            if (parts.length >= 3) {
                const orderIdStr = parts[1];
                try {
                    const orderId = BigInt(orderIdStr);
                    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
                    if (order) {
                        const updatedOrder = await this.prisma.order.update({
                            where: { id: orderId },
                            data: { status: 'completed', paymentMethod: parts[0].toLowerCase(), updatedAt: new Date() },
                        });

                        if (updatedOrder.couponCode) {
                            try {
                                const coupon = await this.prisma.coupon.findUnique({ where: { code: updatedOrder.couponCode } });
                                if (coupon) {
                                    await this.prisma.couponUsage.create({
                                        data: {
                                            couponId: coupon.id,
                                            userId: updatedOrder.userId,
                                            orderId: updatedOrder.id,
                                            usedAmount: updatedOrder.packagePrice,
                                            discountAmount: updatedOrder.discountAmount,
                                        }
                                    });
                                    await this.prisma.coupon.update({
                                        where: { id: coupon.id },
                                        data: { currentUsageCount: { increment: 1 } },
                                    });
                                }
                            } catch (err) {
                                console.error("Failed to apply coupon on updatePaymentStatus:", err);
                            }
                        }

                        if (updatedOrder.userId) {
                            await this.prisma.processReferralReward(updatedOrder.userId);
                        }
                    }
                } catch (err) {}
            }
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
