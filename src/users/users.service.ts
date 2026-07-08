import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { GamesService } from '../games/games.service';

import { randomBytes } from 'crypto';

@Injectable()
export class UsersService {
    constructor(private readonly prisma: PrismaService) { }

    async create(data: Prisma.UserCreateInput) {
        if (!data.uuid) {
            data.uuid = randomBytes(8).toString('hex').slice(0, 12);
        }
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
            select: { id: true, wallet_balance: true },
        });
        if (!user) return null;

        const bonusTransactionsSum = await this.prisma.transaction.aggregate({
            where: {
                userId: user.id,
                type: { in: ['referral', 'gacha', 'bonus'] },
                status: 'completed'
            },
            _sum: {
                amount: true
            }
        });
        const bonusAmount = Number(bonusTransactionsSum._sum.amount ?? 0);

        return {
            amount: user.wallet_balance,
            depositedAmount: Math.max(0, Number(user.wallet_balance) - bonusAmount),
            bonusAmount: bonusAmount,
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

            await txPrisma.transaction.create({
                data: {
                    userId: user.id,
                    type: 'gacha',
                    amount: amount,
                    description: 'รางวัลจากการหมุนวงล้อนำโชค (Gacha Reward)',
                    status: 'completed',
                }
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

        const completedOrdersCount = await this.prisma.order.count({
            where: { userId: user.id, status: 'completed' },
        });
        const completedTopupsCount = await this.prisma.topupTransaction.count({
            where: { userId: user.id, status: 'completed' },
        });
        const hasPurchased = (completedOrdersCount + completedTopupsCount) > 0;

        const referralReceived = await this.prisma.referral.findUnique({
            where: { referredId: user.id },
            include: {
                referrer: {
                    select: { email: true, id: true, name: true },
                },
            },
        });

        return {
            hasPurchased,
            referredBy: referralReceived ? {
                id: referralReceived.referrer.id.toString(),
                email: maskEmail(referralReceived.referrer.email),
                name: referralReceived.referrer.name,
            } : null,
            referrals: referrals.map((r) => ({
                id: r.id.toString(),
                email: maskEmail(r.referred.email),
                joinedAt: r.referred.created_at,
                status: r.status,
                reward: r.rewardAmount,
            })),
        };
    }

    async setReferrer(uuid: string, referrerCode: string) {
        const user = await this.prisma.user.findUnique({
            where: { uuid },
            select: { id: true },
        });
        if (!user) throw new NotFoundException('User not found');

        const existingReferral = await this.prisma.referral.findUnique({
            where: { referredId: user.id },
        });
        if (existingReferral) {
            throw new BadRequestException('คุณได้รับการแนะนำโดยผู้อื่นอยู่แล้ว');
        }

        const completedOrdersCount = await this.prisma.order.count({
            where: { userId: user.id, status: 'completed' },
        });
        const completedTopupsCount = await this.prisma.topupTransaction.count({
            where: { userId: user.id, status: 'completed' },
        });
        if ((completedOrdersCount + completedTopupsCount) > 0) {
            throw new BadRequestException('ไม่สามารถระบุผู้แนะนำได้หลังจากมีประวัติการทำรายการแล้ว');
        }

        const cleanedCode = referrerCode.replace(/.*\/ref\//, "").trim();
        
        let referrer: any = null;
        
        // Try looking up by UUID first (since UUID is default frontend link format)
        if (cleanedCode.length > 5 && (cleanedCode.includes('-') || isNaN(Number(cleanedCode)))) {
            referrer = await this.prisma.user.findUnique({
                where: { uuid: cleanedCode },
            });
        }
        
        // If not found by UUID, try to parse as bigint and find by ID
        if (!referrer) {
            try {
                const referrerId = BigInt(cleanedCode);
                referrer = await this.prisma.user.findUnique({
                    where: { id: referrerId },
                });
            } catch {
                // If not numeric and not valid UUID, then it is invalid
            }
        }

        if (!referrer) {
            throw new NotFoundException('ไม่พบผู้แนะนำด้วยรหัสนี้');
        }

        if (referrer.id === user.id) {
            throw new BadRequestException('ไม่สามารถแนะนำตัวเองได้');
        }

        await this.prisma.referral.create({
            data: {
                referrerId: referrer.id,
                referredId: user.id,
                status: 'pending',
            },
        });

        return { success: true };
    }

    async getAddresses(userUuid: string) {
        const user = await this.prisma.user.findUnique({
            where: { uuid: userUuid },
            select: { id: true },
        });
        if (!user) throw new NotFoundException('User not found');

        const items = await this.prisma.userAddress.findMany({
            where: { userId: user.id },
            orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
        });

        return items.map(item => ({
            ...item,
            id: item.id.toString(),
            userId: item.userId.toString(),
        }));
    }

    async addAddress(userUuid: string, data: any) {
        const user = await this.prisma.user.findUnique({
            where: { uuid: userUuid },
            select: { id: true },
        });
        if (!user) throw new NotFoundException('User not found');

        const existingCount = await this.prisma.userAddress.count({ where: { userId: user.id } });
        const shouldBeDefault = data.isDefault || existingCount === 0;

        return await this.prisma.$transaction(async (tx) => {
            if (shouldBeDefault) {
                await tx.userAddress.updateMany({
                    where: { userId: user.id },
                    data: { isDefault: false },
                });
            }

            const item = await tx.userAddress.create({
                data: {
                    userId: user.id,
                    recipientName: data.recipientName,
                    phone: data.phone,
                    addressLine1: data.addressLine1,
                    addressLine2: data.addressLine2 || null,
                    subDistrict: data.subDistrict || null,
                    district: data.district,
                    province: data.province,
                    postalCode: data.postalCode,
                    isDefault: shouldBeDefault,
                },
            });

            return {
                ...item,
                id: item.id.toString(),
                userId: item.userId.toString(),
            };
        });
    }

    async updateAddress(userUuid: string, addressIdStr: string, data: any) {
        const user = await this.prisma.user.findUnique({
            where: { uuid: userUuid },
            select: { id: true },
        });
        if (!user) throw new NotFoundException('User not found');

        const addressId = BigInt(addressIdStr);
        const address = await this.prisma.userAddress.findUnique({ where: { id: addressId } });
        if (!address || address.userId !== user.id) {
            throw new NotFoundException('Address not found');
        }

        const shouldBeDefault = data.isDefault;

        return await this.prisma.$transaction(async (tx) => {
            if (shouldBeDefault) {
                await tx.userAddress.updateMany({
                    where: { userId: user.id, id: { not: addressId } },
                    data: { isDefault: false },
                });
            }

            const item = await tx.userAddress.update({
                where: { id: addressId },
                data: {
                    recipientName: data.recipientName,
                    phone: data.phone,
                    addressLine1: data.addressLine1,
                    addressLine2: data.addressLine2 || null,
                    subDistrict: data.subDistrict || null,
                    district: data.district,
                    province: data.province,
                    postalCode: data.postalCode,
                    isDefault: shouldBeDefault,
                },
            });

            return {
                ...item,
                id: item.id.toString(),
                userId: item.userId.toString(),
            };
        });
    }

    async deleteAddress(userUuid: string, addressIdStr: string) {
        const user = await this.prisma.user.findUnique({
            where: { uuid: userUuid },
            select: { id: true },
        });
        if (!user) throw new NotFoundException('User not found');

        const addressId = BigInt(addressIdStr);
        const address = await this.prisma.userAddress.findUnique({ where: { id: addressId } });
        if (!address || address.userId !== user.id) {
            throw new NotFoundException('Address not found');
        }

        await this.prisma.userAddress.delete({ where: { id: addressId } });

        if (address.isDefault) {
            const nextAddress = await this.prisma.userAddress.findFirst({
                where: { userId: user.id },
                orderBy: { createdAt: 'desc' },
            });
            if (nextAddress) {
                await this.prisma.userAddress.update({
                    where: { id: nextAddress.id },
                    data: { isDefault: true },
                });
            }
        }

        return { success: true };
    }

    async setDefaultAddress(userUuid: string, addressIdStr: string) {
        const user = await this.prisma.user.findUnique({
            where: { uuid: userUuid },
            select: { id: true },
        });
        if (!user) throw new NotFoundException('User not found');

        const addressId = BigInt(addressIdStr);
        const address = await this.prisma.userAddress.findUnique({ where: { id: addressId } });
        if (!address || address.userId !== user.id) {
            throw new NotFoundException('Address not found');
        }

        await this.prisma.$transaction(async (tx) => {
            await tx.userAddress.updateMany({
                where: { userId: user.id },
                data: { isDefault: false },
            });
            await tx.userAddress.update({
                where: { id: addressId },
                data: { isDefault: true },
            });
        });

        return { success: true };
    }

    async getBookmarks(userUuid: string) {
        const user = await this.prisma.user.findUnique({
            where: { uuid: userUuid },
            select: { id: true },
        });
        if (!user) throw new NotFoundException('User not found');

        const bookmarks = await this.prisma.bookmark.findMany({
            where: { userId: user.id },
            include: {
                game: {
                    include: {
                        category: true,
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
        });

        return bookmarks.map((b) => {
            const gameObj = b.game as any;
            let rawImage = gameObj.image;
            if (!rawImage) {
                const slug = gameObj.slug || '';
                const images = GamesService.GAME_IMAGES || {};
                if (images[slug]) {
                    rawImage = images[slug];
                } else {
                    const partialMatch = Object.keys(images).find(k => slug.includes(k) || k.includes(slug));
                    if (partialMatch) {
                        rawImage = images[partialMatch];
                    }
                }
            }

            let formattedImage = '';
            if (rawImage) {
                if (rawImage.startsWith('http') || rawImage.startsWith('data:')) {
                    formattedImage = rawImage;
                } else {
                    const base = process.env.BACKEND_URL || 'http://localhost:3001';
                    formattedImage = `${base.replace(/\/$/, '')}${rawImage}`;
                }
            }

            return {
                ...gameObj,
                id: gameObj.id.toString(),
                categoryId: gameObj.categoryId?.toString() || null,
                category: gameObj.category?.name || null,
                image: formattedImage,
            };
        });
    }

    async toggleBookmark(userUuid: string, gameId: number) {
        const user = await this.prisma.user.findUnique({
            where: { uuid: userUuid },
            select: { id: true },
        });
        if (!user) throw new NotFoundException('User not found');

        const game = await this.prisma.game.findUnique({
            where: { id: BigInt(gameId) },
        });
        if (!game) throw new NotFoundException('Game not found');

        const existing = await this.prisma.bookmark.findUnique({
            where: {
                userId_gameId: {
                    userId: user.id,
                    gameId: game.id,
                },
            },
        });

        if (existing) {
            await this.prisma.bookmark.delete({
                where: { id: existing.id },
            });
            return { bookmarked: false, message: 'ยกเลิกปักหมุดเกมสำเร็จ' };
        } else {
            const count = await this.prisma.bookmark.count({
                where: { userId: user.id },
            });
            if (count >= 10) {
                throw new BadRequestException('คุณสามารถปักหมุดเกมได้สูงสุด 10 เกมเท่านั้น');
            }

            await this.prisma.bookmark.create({
                data: {
                    userId: user.id,
                    gameId: game.id,
                },
            });
            return { bookmarked: true, message: 'ปักหมุดเกมสำเร็จ' };
        }
    }
}
