import {
    Injectable,
    NotFoundException,
    ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Slip2goService } from './slip2go.service';
import { CreateTopupDto } from './dto/create-topup.dto';

const TOPUP_EXPIRE_MINUTES = 15;

@Injectable()
export class TopupService {
    constructor(private prisma: PrismaService, private slip2go: Slip2goService) { }

    async getMethods() {
        return this.prisma.paymentMethod.findMany({
            where: { isActive: true },
            select: { id: true, code: true, name: true, icon: true, color: true },
            orderBy: { id: 'asc' },
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
                slip_url: this.toAbsoluteUrl(tx.slipUrl),
                bank_code: tx.bankCode,
                admin_note: tx.adminNote,
                method: tx.method,
            })),
        };
    }

    async getTransactionsForAdmin(status?: string, methodCode?: string, bankCode?: string, limit = 50, offset = 0) {
        const where: any = {};
        if (status) where.status = status;
        if (methodCode) where.method = { code: methodCode };
        if (bankCode) where.bankCode = bankCode;

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
                slip_url: this.toAbsoluteUrl(tx.slipUrl),
                bank_code: tx.bankCode,
                admin_note: tx.adminNote,
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
        if (tx.status === 'completed') throw new ConflictException(`Transaction is already '${tx.status}'`);
        if (tx.status === 'failed' || tx.status === 'expired') throw new ConflictException(`Transaction cannot be completed from status '${tx.status}'`);

        const isTrueMoney = tx.method?.code === 'truemoney';
        const netAmount = isTrueMoney ? Math.round((Number(tx.amount) / 1.015) * 100) / 100 : Number(tx.amount);
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
                        await txPrisma.order.update({
                            where: { id: orderId },
                            data: { status: 'completed', paymentMethod: parts[0].toLowerCase(), updatedAt: new Date() },
                        });
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
        if (tx.status !== 'pending') throw new ConflictException(`Transaction is already '${tx.status}'`);

        const updated = await this.prisma.topupTransaction.update({
            where: { referenceId },
            data: { status: 'failed' },
        });

        return { reference_id: updated.referenceId, status: updated.status };
    }

    // User submits bank transfer slip for admin review
    async submitSlip(referenceId: string, userId: bigint, slipUrl: string, bankCode?: string) {
        const tx = await this.prisma.topupTransaction.findUnique({ where: { referenceId }, include: { method: true } });
        if (!tx || tx.userId !== userId) throw new NotFoundException('Transaction not found');
        if (tx.status !== 'pending') throw new ConflictException(`Transaction is already '${tx.status}'`);

        const slipUrlAbsolute = this.toAbsoluteUrl(slipUrl);
        const updated = await this.prisma.topupTransaction.update({
            where: { referenceId },
            data: {
                slipUrl: slipUrlAbsolute,
                bankCode: bankCode ?? null,
                status: 'awaiting_review',
            },
        });

        // Trigger automatic verification via Slip2Go
        // Prisma returns Decimal for numeric fields; convert to number/string first
        const amountForVerify = typeof (tx.amount as any)?.toNumber === 'function'
            ? (tx.amount as any).toNumber()
            : Number(tx.amount);
        const verifyResult = await this.slip2go.verifySlip(slipUrlAbsolute, amountForVerify, referenceId);
        const passed = this.isSlip2GoPassed(verifyResult.data);
        this.logSlip2GoResult(referenceId, slipUrlAbsolute, verifyResult);

        if (verifyResult.ok && passed) {
            const { updatedTx, pointsEarned, newPoints, newTier } = await this.completeTopupTransaction(tx);

            return {
                reference_id: updatedTx.referenceId,
                status: updatedTx.status,
                completed_at: updatedTx.completedAt,
                slip_url: slipUrlAbsolute,
                verification: verifyResult.data,
                points_earned: pointsEarned,
                new_points: newPoints,
                new_tier: newTier,
            };
        }

        const reason = verifyResult.data?.reason || verifyResult.data?.message || verifyResult.error || 'verification failed';
        const failed = await this.prisma.topupTransaction.update({
            where: { referenceId },
            data: {
                status: 'verification_failed',
                adminNote: reason,
            },
        });

        return {
            reference_id: failed.referenceId,
            status: failed.status,
            slip_url: failed.slipUrl,
            reason,
            verification: verifyResult.data ?? null,
        };
    }

    async adminUpdateStatus(referenceId: string, status: 'completed' | 'failed', adminNote?: string) {
        const tx = await this.prisma.topupTransaction.findUnique({
            where: { referenceId },
            include: { method: true },
        });
        if (!tx) throw new NotFoundException('Transaction not found');
        if (status === 'completed') {
            if (tx.status === 'completed') throw new ConflictException(`Transaction is already '${tx.status}'`);
            if (tx.status === 'failed' || tx.status === 'expired') throw new ConflictException(`Transaction cannot be completed from status '${tx.status}'`);

            const { updatedTx, pointsEarned, newPoints, newTier } = await this.completeTopupTransaction(tx);
            const note = adminNote ?? tx.adminNote ?? 'Approved manually by admin';
            await this.prisma.topupTransaction.update({ where: { referenceId }, data: { adminNote: note } });

            return {
                reference_id: updatedTx.referenceId,
                status: updatedTx.status,
                completed_at: updatedTx.completedAt,
                points_earned: pointsEarned,
                new_points: newPoints,
                new_tier: newTier,
                adminNote: note,
            };
        }

        if (tx.status === 'completed') throw new ConflictException(`Transaction is already '${tx.status}'`);

        const failedTx = await this.prisma.topupTransaction.update({
            where: { referenceId },
            data: {
                status: 'failed',
                adminNote: adminNote ?? tx.adminNote ?? 'Rejected by admin',
            },
        });

        return {
            reference_id: failedTx.referenceId,
            status: failedTx.status,
            adminNote: failedTx.adminNote,
        };
    }

    private async completeTopupTransaction(tx: any) {
        const isTrueMoney = tx.method?.code === 'truemoney';
        const netAmount = isTrueMoney ? Math.round((Number(tx.amount) / 1.015) * 100) / 100 : Number(tx.amount);
        const pointsEarned = Math.floor(netAmount);

        const user = await this.prisma.user.findUnique({
            where: { id: tx.userId },
            select: { point_balance: true },
        });
        const newPoints = (user?.point_balance ?? 0) + pointsEarned;
        const newTier = this.calculateTier(newPoints);

        const updatedTx = await this.prisma.$transaction(async (txPrisma) => {
            if (tx.referenceId) {
                const parts = tx.referenceId.split('_');
                if (parts.length >= 3) {
                    const orderIdStr = parts[1];
                    try {
                        const orderId = BigInt(orderIdStr);
                        const order = await txPrisma.order.findUnique({ where: { id: orderId } });
                        if (order) {
                            await txPrisma.order.update({
                                where: { id: orderId },
                                data: { status: 'completed', paymentMethod: parts[0].toLowerCase(), updatedAt: new Date() },
                            });
                        }
                    } catch (err) {}
                }
            }

            const updatedTx = await txPrisma.topupTransaction.update({
                where: { referenceId: tx.referenceId },
                data: { status: 'completed', completedAt: new Date() },
            });

            const userUpdateData: any = {
                point_balance: newPoints,
                tier: newTier,
            };
            if (!tx.orderId) {
                userUpdateData.wallet_balance = { increment: netAmount };
            }

            await txPrisma.user.update({
                where: { id: tx.userId },
                data: userUpdateData,
            });

            return updatedTx;
        });

        return { updatedTx, pointsEarned, newPoints, newTier };
    }

    private toAbsoluteUrl(url: string) {
        if (!url) return url;
        if (url.startsWith('http://') || url.startsWith('https://')) return url;
        const backendUrl = process.env.BACKEND_URL?.replace(/\/$/, '') || 'http://localhost:3001';
        return `${backendUrl}${url.startsWith('/') ? '' : '/'}${url}`;
    }

    private isSlip2GoPassed(data: any) {
        if (!data) return false;
        if (typeof data.passed === 'boolean') return data.passed;
        if (typeof data.status === 'string') {
            return ['passed', 'success', 'ok', 'completed'].includes(data.status.toLowerCase());
        }
        if (typeof data.result === 'string') {
            return ['passed', 'success', 'ok', 'completed'].includes(data.result.toLowerCase());
        }
        return false;
    }

    private logSlip2GoResult(referenceId: string, slipUrl: string, result: any) {
        const status = result?.status ?? 'no-status';
        const passed = this.isSlip2GoPassed(result) ? 'passed' : 'failed';
        console.log(`Slip2Go verify for ${referenceId} => ${passed} status=${status} url=${slipUrl}`);
        if (result) {
            console.log(`Slip2Go data: ${JSON.stringify(result)}`);
        }
    }

    private calculateTier(points: number): string {
        if (points >= 1000000) return 'EMERALD';
        if (points >= 500000) return 'PLATINUM';
        if (points >= 100000) return 'BRONZE';
        return 'MEMBER';
    }

    private generateReferenceId(): string {
        const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
        return `TP-${date}-${rand}`;
    }
}
