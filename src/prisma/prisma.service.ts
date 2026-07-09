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
                const completedCount = await this.referral.count({
                    where: { referrerId: referral.referrerId, status: 'completed' },
                });

                if (completedCount < 10) {
                    await this.user.update({
                        where: { id: referral.referrerId },
                        data: {
                            wallet_balance: { increment: 10 },
                        },
                    });

                    await this.transaction.create({
                        data: {
                            userId: referral.referrerId,
                            type: 'referral',
                            amount: 10,
                            description: 'โบนัสแนะนำเพื่อนสำหรับการช้อปปิ้งครั้งแรกของเพื่อน',
                            status: 'completed',
                        },
                    });
                }

                await this.referral.update({
                    where: { referredId: buyerId },
                    data: { status: 'completed' },
                });
            }
        } catch (err) {
            console.error('Error processing referral reward:', err);
        }
    }
}
