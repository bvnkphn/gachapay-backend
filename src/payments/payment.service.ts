import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_GATEWAY_SETTINGS = [
  {
    id: "promptpay",
    name: "QR",
    nameEn: "QR",
    icon: "⚡",
    enabled: true,
    fee: 0,
    webhookUrl: "https://api.gachapay.in.th/webhook/promptpay",
    publicKey: "pkey_live_5xKZ2mN8qW3rT1uY",
    secretKey: "skey_live_••••••••••••••••",
    color: "#38bdf8",
    accent: "rgba(56,189,248,0.15)",
  },
  {
    id: "truemoney",
    name: "TrueWallet",
    nameEn: "TrueWallet",
    icon: "💰",
    enabled: true,
    fee: 1.5,
    webhookUrl: "https://api.gachapay.in.th/webhook/truemoney",
    publicKey: "TM_PUB_9kLp4vXn2mQs",
    secretKey: "TM_SEC_••••••••••••••••",
    color: "#f59e0b",
    accent: "rgba(245,158,11,0.15)",
  },
  {
    id: "bank_transfer",
    name: "BankTransfer",
    nameEn: "BankTransfer",
    icon: "🏦",
    enabled: true,
    fee: 0,
    webhookUrl: "https://api.gachapay.in.th/webhook/bank",
    publicKey: "BT_PUB_8mKq3sNj6tWn",
    secretKey: "BT_SEC_••••••••••••••••",
    color: "#a78bfa",
    accent: "rgba(167,139,250,0.15)",
  },
  {
    id: "wallet",
    name: "Coin",
    nameEn: "Coin",
    icon: "🎮",
    enabled: true,
    fee: 0,
    webhookUrl: "https://api.gachapay.in.th/webhook/wallet",
    publicKey: "CW_PUB_7rBq1tNk5sVm",
    secretKey: "CW_SEC_••••••••••••••••",
    color: "#34d399",
    accent: "rgba(52,211,153,0.15)",
  },
];

@Injectable()
export class PaymentService {
    constructor(private prisma: PrismaService) {}

    async getAdminLogs() {
        const transactions = await this.prisma.topupTransaction.findMany({
            orderBy: { createdAt: 'desc' },
            take: 50,
            include: {
                method: { select: { code: true, name: true } },
                user: { select: { email: true } },
            },
        });
        
        return transactions.map(t => {
            let latency = "120ms";
            if (t.status === 'failed') latency = "3012ms";
            else if (t.status === 'pending') latency = "95ms";
            
            // Format time nicely e.g. "08 มี.ค. 68 · 14:32:01"
            const date = new Date(t.createdAt);
            const months = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
            const thaiYear = (date.getFullYear() + 543) % 100;
            const timeStr = `${String(date.getDate()).padStart(2, '0')} ${months[date.getMonth()]} ${thaiYear} · ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;

            return {
                id: `LOG-${t.id}`,
                time: timeStr,
                method: t.method?.name || t.method?.code || "Unknown",
                type: t.orderId ? "charge.complete" : "wallet.deposit",
                orderId: t.orderId ? `ORD-${t.orderId}` : "-",
                amount: Number(t.amount),
                status: t.status === "completed" ? "success" : t.status === "failed" ? "failed" : "pending",
                latency: t.status === "failed" ? "timeout" : latency,
            };
        });
    }

    async getAdminSettings() {
        const setting = await this.prisma.systemSetting.findUnique({
            where: { key: 'payment_gateway_settings' },
        });
        if (!setting) {
            return DEFAULT_GATEWAY_SETTINGS;
        }
        try {
            const parsed = JSON.parse(setting.value);
            const migrated = parsed.map((m: any) => {
                if (m.id === 'credit' || m.id === 'bank_transfer') {
                    return {
                        id: "bank_transfer",
                        name: "BankTransfer",
                        nameEn: "BankTransfer",
                        icon: "🏦",
                        enabled: m.enabled ?? true,
                        fee: m.fee ?? 0,
                        webhookUrl: "https://api.gachapay.in.th/webhook/bank",
                        publicKey: m.publicKey || "BT_PUB_8mKq3sNj6tWn",
                        secretKey: m.secretKey || "BT_SEC_••••••••••••••••",
                        color: "#a78bfa",
                        accent: "rgba(167,139,250,0.15)",
                    };
                }
                if (m.id === 'wallet') {
                    return {
                        ...m,
                        name: "Coin",
                        nameEn: "Coin",
                        icon: "🎮",
                    };
                }
                if (m.id === 'promptpay') {
                    return {
                        ...m,
                        name: "QR",
                        nameEn: "QR",
                        icon: "⚡",
                    };
                }
                if (m.id === 'truemoney') {
                    return {
                        ...m,
                        name: "TrueWallet",
                        nameEn: "TrueWallet",
                        icon: "💰",
                    };
                }
                return m;
            });
            
            // Ensure bank_transfer exists in the array if it was missing completely
            if (!migrated.find((m: any) => m.id === 'bank_transfer')) {
                migrated.push({
                    id: "bank_transfer",
                    name: "BankTransfer",
                    nameEn: "BankTransfer",
                    icon: "🏦",
                    enabled: true,
                    fee: 0,
                    webhookUrl: "https://api.gachapay.in.th/webhook/bank",
                    publicKey: "BT_PUB_8mKq3sNj6tWn",
                    secretKey: "BT_SEC_••••••••••••••••",
                    color: "#a78bfa",
                    accent: "rgba(167,139,250,0.15)",
                });
            }
            
            return migrated;
        } catch {
            return DEFAULT_GATEWAY_SETTINGS;
        }
    }

    async saveAdminSettings(settings: any) {
        if (!Array.isArray(settings)) {
            throw new BadRequestException('Invalid settings structure');
        }
        await this.prisma.systemSetting.upsert({
            where: { key: 'payment_gateway_settings' },
            update: { value: JSON.stringify(settings) },
            create: { key: 'payment_gateway_settings', value: JSON.stringify(settings) },
        });

        // Sync with paymentMethod records in db
        for (const m of settings) {
            try {
                await this.prisma.paymentMethod.update({
                    where: { code: m.id },
                    data: { isActive: m.enabled },
                });
            } catch (err) {
                // Ignore key mismatch errors
            }
        }

        return { success: true, message: 'Settings saved successfully' };
    }

    async getActiveMethods() {
        const settings = await this.getAdminSettings();
        // Return all methods (enabled & disabled) but strip sensitive fields
        return settings.map((m: any) => ({
            id: m.id,
            name: m.name,
            nameEn: m.nameEn,
            icon: m.icon,
            enabled: m.enabled,
            fee: m.fee,
            color: m.color,
            accent: m.accent,
        }));
    }

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

    async generateQRCode(orderId: number, amount: number, method: 'promptpay' | 'truemoney' | 'bank_transfer', requesterUserId?: bigint) {
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

        // Dynamically lookup the payment method by its code from the database
        const paymentMethodRecord = await this.prisma.paymentMethod.findUnique({
            where: { code: method },
            select: { id: true },
        });
        const methodId = paymentMethodRecord ? paymentMethodRecord.id : (method === 'promptpay' ? BigInt(2) : method === 'truemoney' ? BigInt(3) : BigInt(1));

        await this.prisma.topupTransaction.create({
            data: {
                userId: userId ?? BigInt(1),
                orderId: BigInt(orderId),
                methodId: methodId,
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
