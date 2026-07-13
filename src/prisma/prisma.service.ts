import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    async onModuleInit() {
        await this.$connect();
        console.log('✅ Database connected');
    }

    async onModuleDestroy() {
        await this.$disconnect();
    }

    async processReferralReward(buyerId: bigint) {
        try {
            const referral = await this.referral.findUnique({
                where: { referredId: buyerId },
            });

            if (referral && referral.status === 'pending') {
                // Get dynamic referral settings from SystemSetting
                const rewardSetting = await this.systemSetting.findUnique({
                    where: { key: 'referral_reward_amount' },
                });
                const minSpendSetting = await this.systemSetting.findUnique({
                    where: { key: 'referral_min_spend' },
                });

                const rewardAmount = Number(rewardSetting?.value || '10');
                const minSpend = Number(minSpendSetting?.value || '100');

                // Calculate cumulative completed topups of the referred user (buyerId)
                const topups = await this.topupTransaction.findMany({
                    where: { userId: buyerId, status: 'completed' },
                    select: { amount: true },
                });
                const totalSpent = topups.reduce((sum, tx) => sum + Number(tx.amount), 0);

                if (totalSpent >= minSpend) {
                    const completedCount = await this.referral.count({
                        where: { referrerId: referral.referrerId, status: 'completed' },
                    });

                    if (completedCount < 10) {
                        await this.user.update({
                            where: { id: referral.referrerId },
                            data: {
                                wallet_balance: { increment: rewardAmount },
                            },
                        });

                        await this.transaction.create({
                            data: {
                                userId: referral.referrerId,
                                type: 'referral',
                                amount: rewardAmount,
                                description: `โบนัสแนะนำเพื่อนสำหรับการสะสมยอดเติมเงินของเพื่อนครบ ${minSpend} บาท`,
                                status: 'completed',
                            },
                        });
                    }

                    await this.referral.update({
                        where: { referredId: buyerId },
                        data: { status: 'completed' },
                    });
                }
            }
        } catch (err) {
            console.error('Error processing referral reward:', err);
        }
    }
}
