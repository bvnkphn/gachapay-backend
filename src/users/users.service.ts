import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) { }

    async create(data: Prisma.UserCreateInput) {
        return this.prisma.user.create({ data });
    }

    async findById(uuid: string) {
        return this.prisma.user.findUnique({ where: { uuid } });
    }

    async findByEmail(email: string) {
        return this.prisma.user.findUnique({ where: { email } });
    }

    async findByProvider(provider: string, providerId: string) {
        return this.prisma.user.findFirst({
            where: { provider, providerId },
        });
    }

    async createPasswordReset(data: { user_id: bigint; token_hash: string; expires_at: Date }) {
        return this.prisma.passwordReset.create({
            data: {
                user_id: data.user_id,
                token_hash: data.token_hash,
                expires_at: data.expires_at,
            },
        });
    }

    async findValidPasswordReset(token: string) {
        const resets = await this.prisma.passwordReset.findMany({
            where: {
                used_at: null,
                expires_at: { gte: new Date() },
            },
            include: { user: true },
        });

        for (const reset of resets) {
            const isValid = await bcrypt.compare(token, reset.token_hash);
            if (isValid) return reset;
        }
        return null;
    }

    async markPasswordResetAsUsed(id: bigint) {
        return this.prisma.passwordReset.update({
            where: { id },
            data: { used_at: new Date() },
        });
    }

    async createOtpRequest(data: { user_id: bigint; otp_hash: string; expires_at: Date }) {
        return this.prisma.otpRequest.create({
            data: {
                user_id: data.user_id,
                otp_hash: data.otp_hash,
                expires_at: data.expires_at,
            },
        });
    }

    async findValidOtpRequest(userId: bigint) {
        return this.prisma.otpRequest.findFirst({
            where: {
                user_id: userId,
                expires_at: { gte: new Date() },
            },
            orderBy: { created_at: 'desc' },
        });
    }

    async incrementOtpAttempts(id: bigint) {
        return this.prisma.otpRequest.update({
            where: { id },
            data: { attempt_count: { increment: 1 } },
        });
    }

    async deleteOtpRequest(id: bigint) {
        return this.prisma.otpRequest.delete({ where: { id } });
    }

    async update(uuid: string, data: Prisma.UserUpdateInput) {
        return this.prisma.user.update({
            where: { uuid },
            data,
        });
    }

    async delete(uuid: string) {
        return this.prisma.user.delete({ where: { uuid } });
    }

    // --- Account Overview APIs ---

    async getProfile(uuid: string) {
        const user = await this.prisma.user.findUnique({
            where: { uuid },
            select: { email: true, name: true, created_at: true },
        });
        if (!user) return null;
        const display_name = user.name ?? user.email.split('@')[0];
        return {
            display_name,
            email: user.email,
            member_since: user.created_at,
        };
    }

    async getLoyalty(uuid: string) {
        const user = await this.prisma.user.findUnique({
            where: { uuid },
            select: { tier: true, point_balance: true },
        });
        if (!user) return null;

        const tierThresholds: Record<string, number> = {
            MEMBER: 0,
            BRONZE: 100000,
            PLATINUM: 500000,
            EMERALD: 1000000,
        };

        const currentTier = (user.tier ?? 'MEMBER').toUpperCase();
        const tiers = Object.keys(tierThresholds);
        const currentIndex = tiers.indexOf(currentTier);
        const nextTier = tiers[currentIndex + 1];
        const next_tier_threshold = nextTier ? tierThresholds[nextTier] : null;

        return {
            tier: user.tier ?? 'MEMBER',
            current_points: user.point_balance,
            next_tier_threshold,
        };
    }

    async getWalletBalance(uuid: string) {
        const user = await this.prisma.user.findUnique({
            where: { uuid },
            select: { wallet_balance: true },
        });
        if (!user) return null;
        return {
            amount: user.wallet_balance,
            currency: 'THB',
        };
    }

    async claimGachaReward(uuid: string, amount: number) {
        const user = await this.prisma.user.findUnique({
            where: { uuid },
            select: { id: true }
        });
        if (!user) throw new NotFoundException('User not found');

        const updated = await this.prisma.$transaction(async (txPrisma) => {
            const u = await txPrisma.user.update({
                where: { id: user.id },
                data: { wallet_balance: { increment: amount } },
            });

            return u;
        });

        return {
            success: true,
            new_balance: updated.wallet_balance,
        };
    }

    async recordGachaSpin(uuid: string, payload: { prizeAmount: number; prizeLabel?: string; won?: boolean; orderId?: bigint | null }) {
        const user = await this.prisma.user.findUnique({ where: { uuid }, select: { id: true } });
        if (!user) throw new NotFoundException('User not found');

        const created = await this.prisma.gachaSpin.create({
            data: {
                userId: BigInt(user.id),
                orderId: payload.orderId ?? null,
                prizeAmount: payload.prizeAmount ?? 0,
                prizeLabel: payload.prizeLabel ?? null,
                won: !!payload.won,
            },
        });

        return { success: true, spinId: created.id };
    }

    async getGachaSpins(uuid: string, limit = 10, offset = 0) {
        const user = await this.prisma.user.findUnique({ where: { uuid }, select: { id: true } });
        if (!user) throw new NotFoundException('User not found');

        const [total, items] = await Promise.all([
            this.prisma.gachaSpin.count({ where: { userId: BigInt(user.id) } }),
            this.prisma.gachaSpin.findMany({
                where: { userId: BigInt(user.id) },
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: offset,
            }),
        ]);

        return {
            total,
            limit,
            offset,
            items: items.map(s => ({
                id: s.id.toString(),
                prize_amount: s.prizeAmount,
                prize_label: s.prizeLabel,
                won: s.won,
                created_at: s.createdAt,
                order_id: s.orderId ? s.orderId.toString() : null,
            }))
        };
    }

    async getReferrals(uuid: string) {
        const user = await this.prisma.user.findUnique({
            where: { uuid },
            select: { id: true },
        });
        if (!user) throw new NotFoundException('User not found');

        const referrals = await this.prisma.referral.findMany({
            where: { referrerId: user.id },
            include: {
                referred: {
                    select: { email: true, created_at: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        const maskEmail = (email: string) => {
            const parts = email.split('@');
            if (parts.length !== 2) return email;
            const name = parts[0];
            const domain = parts[1];
            if (name.length <= 3) {
                return name[0] + '***@' + domain;
            }
            return name.slice(0, 3) + '***@' + domain;
        };

        return referrals.map((r) => ({
            id: r.id.toString(),
            email: maskEmail(r.referred.email),
            joinedAt: r.referred.created_at,
            status: r.status,
            reward: r.rewardAmount,
        }));
    }
}
