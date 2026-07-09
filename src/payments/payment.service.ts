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
    apiEndpointSources: "https://api.omise.co/sources",
    apiEndpointCharges: "https://api.omise.co/charges",
    provider: "omise",
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
    apiEndpointSources: "https://api.omise.co/sources",
    apiEndpointCharges: "https://api.omise.co/charges",
    provider: "omise",
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

import { ApiCreditService } from '../api-credit/api-credit.service';

@Injectable()
export class PaymentService {
    constructor(
        private prisma: PrismaService,
        private apiCreditService: ApiCreditService,
    ) {}

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
                methodCode: t.method?.code,
                slipUrl: t.slipUrl,
                type: t.orderId ? "charge.complete" : "wallet.deposit",
                orderId: t.orderId ? `ORD-${t.orderId}` : "-",
                amount: Number(t.amount),
                status: t.status === "completed" ? "success" : t.status === "failed" ? "failed" : "pending",
                latency: t.status === "failed" ? "timeout" : latency,
                
                // Real data fields for SelectedTopup modal:
                reference_id: t.referenceId,
                bank_code: t.bankCode || "-",
                transactionStatus: t.status,
                userEmail: t.user?.email || "-",
                created_at: t.createdAt.toISOString(),
                completed_at: t.completedAt ? t.completedAt.toISOString() : null,
                admin_note: t.adminNote || "",
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
                        provider: m.provider || (m.apiEndpointSources?.includes('cyberpay') ? 'cyberpay' : 'omise'),
                        apiEndpointSources: m.apiEndpointSources || "https://api.omise.co/sources",
                        apiEndpointCharges: m.apiEndpointCharges || "https://api.omise.co/charges",
                    };
                }
                if (m.id === 'truemoney') {
                    return {
                        ...m,
                        name: "TrueWallet",
                        nameEn: "TrueWallet",
                        icon: "💰",
                        provider: m.provider || (m.apiEndpointSources?.includes('cyberpay') ? 'cyberpay' : 'omise'),
                        apiEndpointSources: m.apiEndpointSources || "https://api.omise.co/sources",
                        apiEndpointCharges: m.apiEndpointCharges || "https://api.omise.co/charges",
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

        // Deduct API credit from 24PaySeller provider
        try {
            const orderWithPkg = await this.prisma.order.findUnique({
                where: { id: BigInt(orderId) },
                include: { package: true },
            });
            if (orderWithPkg) {
                const cost = orderWithPkg.package?.cost 
                    ? Number(orderWithPkg.package.cost) 
                    : Number(orderWithPkg.packagePrice);
                await this.apiCreditService.deductCredit(
                    '24payseller',
                    cost,
                    `หักเครดิตสำหรับออเดอร์ #${orderId} (แพ็คเกจ: ${orderWithPkg.packageName})`,
                    BigInt(orderId)
                );
            }
        } catch (err) {
            console.error('Failed to deduct API credit on processWalletPayment:', err);
        }

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
        let qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${referenceNumber}`;
        let gatewayChargeId = null;

        // Load Connectivity settings to check if real keys are supplied
        const settings = await this.getAdminSettings();
        const config = settings.find((s: any) => s.id === (method === 'promptpay' ? 'promptpay' : method === 'truemoney' ? 'truemoney' : 'bank_transfer'));

        if (config && config.secretKey && (
            config.provider === 'beam' ||
            config.provider === 'cyberpay' ||
            config.secretKey.startsWith('skey_') ||
            config.secretKey.startsWith('sec_') ||
            config.secretKey.startsWith('sk_') ||
            config.secretKey.includes('stripe') ||
            config.publicKey?.startsWith('pk_') ||
            config.apiEndpointSources?.includes('cyberpay') ||
            config.apiEndpointSources?.includes('beam') ||
            config.secretKey.includes('cyberpay') ||
            config.publicKey?.startsWith('CPT')
        )) {
            try {
                if (config.provider === 'stripe' || config.secretKey?.startsWith('sk_') || config.secretKey?.includes('stripe') || config.publicKey?.startsWith('pk_')) {
                    // Call Stripe API
                    const params = new URLSearchParams();
                    params.append('amount', Math.round(amount * 100).toString()); // Stripe expects smallest unit (satang)
                    params.append('currency', 'thb');
                    params.append('payment_method_data[type]', 'promptpay');
                    params.append('confirm', 'true');
                    params.append('return_url', config.webhookUrl || 'https://api.gachapay.in.th/webhook/stripe');
                    params.append('metadata[reference_id]', referenceNumber);

                    const paymentRes = await fetch('https://api.stripe.com/v1/payment_intents', {
                        method: 'POST',
                        headers: {
                            'Authorization': 'Bearer ' + config.secretKey,
                            'Content-Type': 'application/x-www-form-urlencoded',
                        },
                        body: params.toString(),
                    });

                    const paymentResult = await paymentRes.json();

                    if (paymentResult.id && paymentResult.next_action?.promptpay_display_qr_code?.image_url_png) {
                        qrCodeUrl = paymentResult.next_action.promptpay_display_qr_code.image_url_png;
                        gatewayChargeId = paymentResult.id;
                    } else {
                        console.error('Stripe API error response:', paymentResult);
                    }
                } else if (config.provider === 'beam' || config.apiEndpointSources?.includes('beam')) {
                    // Call Beam Checkout API
                    const merchantId = config.publicKey;
                    const apiKey = config.secretKey;
                    const endpoint = config.apiEndpointSources || 'https://api.beamcheckout.com/api/v1/charges';

                    const authHeader = 'Basic ' + Buffer.from(merchantId + ':' + apiKey).toString('base64');
                    
                    const payload = {
                        amount: Math.round(amount * 100), // Beam expects satang
                        currency: 'THB',
                        paymentMethod: {
                            paymentMethodType: method === 'promptpay' ? 'QR_PROMPT_PAY' : 'CARD',
                            qrPromptPay: method === 'promptpay' ? {} : undefined,
                        },
                        referenceId: referenceNumber,
                        returnUrl: config.webhookUrl || 'https://api.gachapay.in.th/webhook/beam',
                        skip3dsFlow: false
                    };

                    const paymentRes = await fetch(endpoint, {
                        method: 'POST',
                        headers: {
                            'Authorization': authHeader,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(payload),
                    });

                    const paymentResult = await paymentRes.json();

                    if (paymentResult.actionRequired === 'ENCODED_IMAGE' && paymentResult.encodedImage) {
                        const imgObj = paymentResult.encodedImage;
                        if (typeof imgObj === 'string') {
                            qrCodeUrl = imgObj.startsWith('data:') ? imgObj : `data:image/png;base64,${imgObj}`;
                        } else if (imgObj.data) {
                            qrCodeUrl = imgObj.data.startsWith('data:') ? imgObj.data : `data:image/${imgObj.imageFormat?.toLowerCase() || 'png'};base64,${imgObj.data}`;
                        } else if (imgObj.qrCode) {
                            qrCodeUrl = imgObj.qrCode;
                        }
                        gatewayChargeId = paymentResult.id || 'beam_charge';
                    } else if (paymentResult.actionRequired === 'REDIRECT' && paymentResult.redirect?.url) {
                        qrCodeUrl = paymentResult.redirect.url;
                        gatewayChargeId = paymentResult.id || 'beam_charge';
                    } else {
                        console.error('Beam API error response:', paymentResult);
                    }
                } else if (config.provider === 'cyberpay' || config.apiEndpointSources?.includes('cyberpay')) {
                    // Call Cyberpay API
                    const partnerId = config.publicKey;
                    const secretKey = config.secretKey;
                    const endpoint = config.apiEndpointSources; // e.g. https://gateway.cyberpay.tech/api/third-party/payment

                    const paymentRes = await fetch(endpoint, {
                        method: 'POST',
                        headers: {
                            'PartnerId': partnerId,
                            'SecretKey': secretKey,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            payment_channel_id: 'P002', // PromptPay channel
                            ref_1: referenceNumber,
                            amount: amount,
                        }),
                    });

                    const paymentResult = await paymentRes.json();

                    if (paymentResult.status && paymentResult.data?.qr_image) {
                        qrCodeUrl = `data:image/png;base64,${paymentResult.data.qr_image}`;
                        gatewayChargeId = paymentResult.data.ref_2 || 'cyberpay_charge';
                    } else {
                        console.error('Cyberpay API error response:', paymentResult);
                    }
                } else {
                    // If it is a real Omise key, call real Omise endpoints
                    const authHeader = 'Basic ' + Buffer.from(config.secretKey + ':').toString('base64');
                    const sourcesUrl = config.apiEndpointSources || "https://api.omise.co/sources";
                    const chargesUrl = config.apiEndpointCharges || "https://api.omise.co/charges";

                    const sourceRes = await fetch(sourcesUrl, {
                        method: 'POST',
                        headers: {
                            'Authorization': authHeader,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            type: method === 'promptpay' ? 'promptpay' : 'truemoney',
                            amount: Math.round(amount * 100),
                            currency: 'THB',
                        }),
                    });
                    const source = await sourceRes.json();
                    
                    if (source.id) {
                        const chargeRes = await fetch(chargesUrl, {
                            method: 'POST',
                            headers: {
                                'Authorization': authHeader,
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                amount: Math.round(amount * 100),
                                currency: 'THB',
                                source: source.id,
                                return_uri: config.webhookUrl || 'https://api.gachapay.in.th/webhook/callback',
                            }),
                        });
                        const charge = await chargeRes.json();
                        if (charge.id) {
                            gatewayChargeId = charge.id;
                            if (charge.source?.scannable_code?.image?.download_uri) {
                                qrCodeUrl = charge.source.scannable_code.image.download_uri;
                            } else if (charge.authorize_uri) {
                                qrCodeUrl = charge.authorize_uri;
                            }
                        }
                    }
                }
            } catch (err) {
                console.error('Payment Gateway API call failed, falling back to simulator:', err);
            }
        }

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

        const isStripe = config && (config.provider === 'stripe' || config.secretKey?.startsWith('sk_') || config.secretKey?.includes('stripe') || config.publicKey?.startsWith('pk_'));
        const isBeam = config && (config.provider === 'beam' || config.apiEndpointSources?.includes('beam'));
        const isCyberpay = config && (config.provider === 'cyberpay' || config.apiEndpointSources?.includes('cyberpay'));

        await this.prisma.topupTransaction.create({
            data: {
                userId: userId ?? BigInt(1),
                orderId: BigInt(orderId),
                methodId: methodId,
                amount,
                status: 'pending',
                referenceId: referenceNumber,
                expiresAt: new Date(Date.now() + 3 * 60 * 1000),
                paymentUrl: qrCodeUrl,
                adminNote: gatewayChargeId 
                    ? (isStripe ? `Stripe PI: ${gatewayChargeId}` : (isBeam ? `Beam ID: ${gatewayChargeId}` : (isCyberpay ? `Cyberpay Ref: ${gatewayChargeId}` : `Omise Charge ID: ${gatewayChargeId}`)))
                    : 'Simulated Gateway',
            },
        });

        return {
            success: true,
            message: gatewayChargeId 
                ? (isStripe ? 'QR code generated via Stripe' : (isBeam ? 'QR code generated via Beam' : (isCyberpay ? 'QR code generated via Cyberpay' : 'QR code generated via Omise')))
                : 'QR code generated successfully',
            data: { qrCode: qrCodeUrl, referenceNumber, expiresAt: new Date(Date.now() + 3 * 60 * 1000), method },
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

                        // Deduct API credit from 24PaySeller provider
                        try {
                            const orderWithPkg = await this.prisma.order.findUnique({
                                where: { id: orderId },
                                include: { package: true },
                            });
                            if (orderWithPkg) {
                                const cost = orderWithPkg.package?.cost 
                                    ? Number(orderWithPkg.package.cost) 
                                    : Number(orderWithPkg.packagePrice);
                                await this.apiCreditService.deductCredit(
                                    '24payseller',
                                    cost,
                                    `หักเครดิตสำหรับออเดอร์ #${orderId} (แพ็คเกจ: ${orderWithPkg.packageName})`,
                                    orderId
                                );
                            }
                        } catch (err) {
                            console.error('Failed to deduct API credit on updatePaymentStatus:', err);
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

    async getVatRate() {
        const setting = await this.prisma.systemSetting.findUnique({
            where: { key: 'payment_vat_rate' },
        });
        if (!setting) {
            return { vatRate: 7.0 };
        }
        return { vatRate: parseFloat(setting.value) ?? 7.0 };
    }

    async saveVatRate(vatRate: number) {
        await this.prisma.systemSetting.upsert({
            where: { key: 'payment_vat_rate' },
            update: { value: vatRate.toString() },
            create: { key: 'payment_vat_rate', value: vatRate.toString() },
        });
        return { success: true, message: 'VAT rate saved successfully' };
    }

    async handleOmiseWebhook(chargeId: string, status: 'completed' | 'failed' | 'pending', amountInThb: number) {
        const tx = await this.prisma.topupTransaction.findFirst({
            where: {
                adminNote: `Omise Charge ID: ${chargeId}`
            }
        });
        if (!tx) {
            return { success: false, message: 'Transaction not found for charge ID' };
        }
        
        if (status === 'completed') {
            await this.updatePaymentStatus(tx.referenceId, 'completed', amountInThb, tx.userId);
        } else if (status === 'failed') {
            await this.updatePaymentStatus(tx.referenceId, 'failed', amountInThb, tx.userId);
        }
        
        return { success: true, referenceId: tx.referenceId };
    }

    async findTransactionByRef(referenceId: string) {
        return this.prisma.topupTransaction.findUnique({
            where: { referenceId }
        });
    }
}
