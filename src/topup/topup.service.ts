import {
    Injectable,
    NotFoundException,
    ConflictException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTopupDto } from './dto/create-topup.dto';

const TOPUP_EXPIRE_MINUTES = 15;

@Injectable()
export class TopupService {
    constructor(private prisma: PrismaService) { }

    async getMethods() {
        const methods = await this.prisma.paymentMethod.findMany({
            where: { isActive: true },
            select: { id: true, code: true, name: true, icon: true, color: true },
            orderBy: { id: 'asc' },
        });

        const settingsSetting = await this.prisma.systemSetting.findUnique({
            where: { key: 'payment_gateway_settings' },
        });

        let settings: any[] = [];
        if (settingsSetting) {
            try {
                settings = JSON.parse(settingsSetting.value);
            } catch (err) {}
        }

        return methods.map((m) => {
            const config = settings.find((s: any) => s.id === m.code);
            return {
                id: m.id.toString(),
                code: m.code,
                name: m.name,
                icon: m.icon,
                color: m.color,
                fee: config ? Number(config.fee) : 0,
            };
        });
    }

    async getTransactions(userId: bigint, status?: string, limit = 10, offset = 0) {
        await this.expireStaleTransactions();
        const where: any = { userId };
        if (status) where.status = status;

        const [total, items] = await Promise.all([
            this.prisma.topupTransaction.count({ where }),
            this.prisma.topupTransaction.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: offset,
                include: { method: { select: { code: true, name: true, icon: true, color: true } } },
            }),
        ]);

        return {
            total,
            limit,
            offset,
            items: items.map((tx) => ({
                id: tx.id.toString(),
                reference_id: tx.referenceId,
                amount: tx.amount,
                status: tx.status,
                created_at: tx.createdAt,
                expired_at: tx.expiresAt,
                completed_at: tx.completedAt,
                method: tx.method,
            })),
        };
    }

    async createIntent(userId: bigint, dto: CreateTopupDto) {
        const method = await this.prisma.paymentMethod.findUnique({
            where: { code: dto.methodCode },
        });
        if (!method || !method.isActive) {
            throw new NotFoundException(`Payment method '${dto.methodCode}' not found or inactive`);
        }

        // Double-submit guard: block if pending tx within last 2 min
        const recentPending = await this.prisma.topupTransaction.findFirst({
            where: {
                userId,
                status: 'pending',
                createdAt: { gte: new Date(Date.now() - 2 * 60 * 1000) },
            },
        });
        if (recentPending) {
            throw new ConflictException('You have a pending transaction. Please wait before creating a new one.');
        }

        const referenceId = this.generateReferenceId();
        const expiredAt = new Date(Date.now() + TOPUP_EXPIRE_MINUTES * 60 * 1000);
        const paymentUrl = `gachapay://topup?ref=${referenceId}&amount=${dto.amount}&method=${dto.methodCode}`;

        const tx = await this.prisma.topupTransaction.create({
            data: { referenceId, userId, methodId: method.id, amount: dto.amount, status: 'pending', paymentUrl, expiresAt: expiredAt },
            include: { method: { select: { code: true, name: true } } },
        });

        return {
            transaction_id: tx.id.toString(),
            reference_id: tx.referenceId,
            amount: tx.amount,
            status: tx.status,
            payment_url: tx.paymentUrl,
            expired_at: tx.expiresAt,
            method: tx.method,
        };
    }

    async expireStaleTransactions() {
        await this.prisma.topupTransaction.updateMany({
            where: { status: 'pending', expiresAt: { lt: new Date() } },
            data: { status: 'expired' },
        });
    }

    // DEV: simulate payment complete → update balance + points + tier
    async simulateComplete(referenceId: string, userId: bigint) {
        const tx = await this.prisma.topupTransaction.findUnique({
            where: { referenceId },
            include: { method: true },
        });
        if (!tx || tx.userId !== userId) throw new NotFoundException('Transaction not found');
        if (tx.status !== 'pending' && tx.status !== 'awaiting_review') {
            throw new ConflictException(`Transaction is already '${tx.status}'`);
        }

        const settingsSetting = await this.prisma.systemSetting.findUnique({
            where: { key: 'payment_gateway_settings' },
        });
        const vatSetting = await this.prisma.systemSetting.findUnique({
            where: { key: 'payment_vat_rate' },
        });

        let settings: any[] = [];
        if (settingsSetting) {
            try {
                settings = JSON.parse(settingsSetting.value);
            } catch (err) {}
        }

        const config = settings.find((s: any) => s.id === tx.method?.code);
        const feePercent = config ? Number(config.fee) : 0;
        const vatPercent = 0; // Top-up transactions are VAT-exempt (no VAT deduction when buying coins)

        const netAmount = Number(tx.amount) / ((1 + feePercent / 100) * (1 + vatPercent / 100));
        const pointsEarned = Math.floor(netAmount); // 1 บาท = 1 point

        // ดึง point ปัจจุบันก่อน
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { point_balance: true },
        });
        const newPoints = (user?.point_balance ?? 0) + pointsEarned;
        const newTier = this.calculateTier(newPoints);

        const updated = await this.prisma.$transaction(async (txPrisma) => {
            // Check if referenceId follows the pattern METHOD_ORDERID_TIMESTAMP to auto-complete the order
            const parts = referenceId.split('_');
            if (parts.length >= 3) {
                const orderIdStr = parts[1];
                try {
                    const orderId = BigInt(orderIdStr);
                    const order = await txPrisma.order.findUnique({ where: { id: orderId } });
                    if (order) {
                        const updatedOrder = await txPrisma.order.update({
                            where: { id: orderId },
                            data: { status: 'completed', paymentMethod: parts[0].toLowerCase(), updatedAt: new Date() },
                        });

                        if (updatedOrder.couponCode) {
                            try {
                                const coupon = await txPrisma.coupon.findUnique({ where: { code: updatedOrder.couponCode } });
                                if (coupon) {
                                    await txPrisma.couponUsage.create({
                                        data: {
                                            couponId: coupon.id,
                                            userId: updatedOrder.userId,
                                            orderId: updatedOrder.id,
                                            usedAmount: updatedOrder.packagePrice,
                                            discountAmount: updatedOrder.discountAmount,
                                        }
                                    });
                                    await txPrisma.coupon.update({
                                        where: { id: coupon.id },
                                        data: { currentUsageCount: { increment: 1 } },
                                    });
                                }
                            } catch (err) {
                                console.error("Failed to apply coupon on simulateComplete:", err);
                            }
                        }
                    }
                } catch (err) {}
            }

            const updatedTx = await txPrisma.topupTransaction.update({
                where: { referenceId },
                data: { status: 'completed', completedAt: new Date() },
            });

            // Always award points (EXP) for completed topup transactions,
            // even if they are associated with an order. Only increment the
            // wallet balance for standalone top-ups (not tied to an order).
            const userUpdateData: any = {
                point_balance: newPoints,
                tier: newTier,
            };

            if (!tx.orderId) {
                userUpdateData.wallet_balance = { increment: netAmount };
            }

            await txPrisma.user.update({
                where: { id: userId },
                data: userUpdateData,
            });

            return updatedTx;
        });

        // Trigger referral reward processing
        await this.prisma.processReferralReward(userId);

        return {
            reference_id: updated.referenceId,
            status: updated.status,
            completed_at: updated.completedAt,
            points_earned: pointsEarned,
            new_points: newPoints,
            new_tier: newTier,
        };
    }

    // DEV: simulate payment cancel
    async simulateCancel(referenceId: string, userId: bigint) {
        const tx = await this.prisma.topupTransaction.findUnique({ where: { referenceId } });
        if (!tx || tx.userId !== userId) throw new NotFoundException('Transaction not found');
        if (tx.status !== 'pending' && tx.status !== 'awaiting_review') {
            throw new ConflictException(`Transaction is already '${tx.status}'`);
        }

        const updated = await this.prisma.topupTransaction.update({
            where: { referenceId },
            data: { status: 'failed' },
        });

        return { reference_id: updated.referenceId, status: updated.status };
    }

    // User submits bank transfer slip for admin review
    async submitSlip(referenceId: string, userId: bigint, slipUrl: string, bankCode?: string) {
        const tx = await this.prisma.topupTransaction.findUnique({ where: { referenceId } });
        if (!tx || tx.userId !== userId) throw new NotFoundException('Transaction not found');
        if (tx.status !== 'pending' && tx.status !== 'awaiting_review') {
            throw new ConflictException(`Transaction is already '${tx.status}'`);
        }

        const updated = await this.prisma.topupTransaction.update({
            where: { referenceId },
            data: {
                slipUrl,
                bankCode: bankCode ?? null,
                status: 'awaiting_review',
            },
        });

        return {
            reference_id: updated.referenceId,
            status: updated.status,
            slip_url: updated.slipUrl,
            bank_code: updated.bankCode,
        };
    }

    private calculateTier(points: number): string {
        if (points >= 1000000) return 'EMERALD';
        if (points >= 500000) return 'PLATINUM';
        if (points >= 100000) return 'BRONZE';
        return 'MEMBER';
    }

    private generateReferenceId(): string {
        const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const rand = randomBytes(3).toString('hex').substring(0, 5).toUpperCase();
        return `TP-${date}-${rand}`;
    }
}
