/**
 * Seed file for coupon data
 * Run with: npx prisma db seed
 * 
 * Add this to package.json:
 * "prisma": {
 *   "seed": "ts-node prisma/seed.ts"
 * }
 */

import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

async function main() {
    const now = new Date();
    const oneMonthLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    console.log('Seeding coupons...');

    // Coupon 1: Fixed discount
    const coupon1 = await prisma.coupon.upsert({
        where: { code: 'WELCOME100' },
        update: {},
        create: {
            code: 'WELCOME100',
            description: 'Welcome bonus - 100 baht discount',
            discountType: 'FIXED',
            discountValue: new Decimal(100),
            minimumAmount: new Decimal(500),
            maximumUses: 1000,
            currentUsageCount: 0,
            usagePerUser: 1,
            startDate: now,
            expiryDate: oneMonthLater,
            applicableGameIds: [],
            applicablePackageIds: [],
            isActive: true,
        },
    });

    // Coupon 2: Percentage discount
    const coupon2 = await prisma.coupon.upsert({
        where: { code: 'SUMMER2024' },
        update: {},
        create: {
            code: 'SUMMER2024',
            description: 'Summer sale - 20% discount',
            discountType: 'PERCENTAGE',
            discountValue: new Decimal(20),
            minimumAmount: new Decimal(1000),
            maximumUses: 500,
            currentUsageCount: 0,
            usagePerUser: 2,
            startDate: now,
            expiryDate: oneMonthLater,
            applicableGameIds: [BigInt(1), BigInt(2)], // Games 1 and 2
            applicablePackageIds: [],
            isActive: true,
        },
    });

    // Coupon 3: Game specific
    const coupon3 = await prisma.coupon.upsert({
        where: { code: 'GAME123BONUS' },
        update: {},
        create: {
            code: 'GAME123BONUS',
            description: 'Bonus for Game 123',
            discountType: 'FIXED',
            discountValue: new Decimal(200),
            minimumAmount: new Decimal(2000),
            maximumUses: 0, // Unlimited
            currentUsageCount: 0,
            usagePerUser: 3,
            startDate: now,
            expiryDate: oneMonthLater,
            applicableGameIds: [BigInt(1)], // Only for game 1
            applicablePackageIds: [BigInt(1), BigInt(2)], // Specific packages
            isActive: true,
        },
    });

    // Coupon 4: VIP only (high value coupon)
    const coupon4 = await prisma.coupon.upsert({
        where: { code: 'VIP500' },
        update: {},
        create: {
            code: 'VIP500',
            description: 'VIP Member - 500 baht discount',
            discountType: 'FIXED',
            discountValue: new Decimal(500),
            minimumAmount: new Decimal(5000),
            maximumUses: 100,
            currentUsageCount: 0,
            usagePerUser: 5,
            startDate: now,
            expiryDate: oneMonthLater,
            applicableGameIds: [],
            applicablePackageIds: [],
            isActive: true,
        },
    });

    console.log({ coupon1, coupon2, coupon3, coupon4 });
    console.log('Coupons seeded successfully!');
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
