import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const password = await bcrypt.hash('Test1234!', 10);

    // --- Games & Packages ---
    const game1 = await prisma.game.upsert({
        where: { slug: 'free-fire' },
        update: {},
        create: {
            name: 'Free Fire',
            slug: 'free-fire',
            description: 'Battle Royale Mobile Game',
            isActive: true,
            packages: {
                create: [
                    { name: '100 Diamonds', price: 29, isActive: true },
                    { name: '310 Diamonds', price: 79, isActive: true },
                    { name: '520 Diamonds', price: 129, isActive: true },
                ],
            },
        },
        include: { packages: true },
    });

    const game2 = await prisma.game.upsert({
        where: { slug: 'mobile-legends' },
        update: {},
        create: {
            name: 'Mobile Legends',
            slug: 'mobile-legends',
            description: 'MOBA Mobile Game',
            isActive: true,
            packages: {
                create: [
                    { name: '86 Diamonds', price: 29, isActive: true },
                    { name: '172 Diamonds', price: 59, isActive: true },
                    { name: '257 Diamonds', price: 89, isActive: true },
                ],
            },
        },
        include: { packages: true },
    });

    // --- User 1: Bronze tier, low balance, few orders ---
    const user1 = await prisma.user.upsert({
        where: { email: 'bronze_user@test.com' },
        update: {},
        create: {
            email: 'bronze_user@test.com',
            name: 'Bronze Tester',
            password_hash: password,
            tier: 'BRONZE',
            point_balance: 800,
            wallet_balance: 150.00,
            role: 'USER',
            isEmailVerified: true,
            provider: 'local',
        },
    });

    // --- User 2: Gold tier, high balance, many orders ---
    const user2 = await prisma.user.upsert({
        where: { email: 'gold_user@test.com' },
        update: {},
        create: {
            email: 'gold_user@test.com',
            name: 'Gold Tester',
            password_hash: password,
            tier: 'GOLD',
            point_balance: 12500,
            wallet_balance: 3200.50,
            role: 'USER',
            isEmailVerified: true,
            provider: 'local',
        },
    });

    // --- Orders for User 1 (2 orders) ---
    await prisma.order.createMany({
        data: [
            {
                userId: user1.id,
                gameId: game1.id,
                gameName: game1.name,
                packageId: game1.packages[0].id,
                packageName: game1.packages[0].name,
                packagePrice: game1.packages[0].price,
                uid: 'FF_UID_001',
                status: 'completed',
                paymentMethod: 'promptpay',
            },
            {
                userId: user1.id,
                gameId: game2.id,
                gameName: game2.name,
                packageId: game2.packages[1].id,
                packageName: game2.packages[1].name,
                packagePrice: game2.packages[1].price,
                uid: 'ML_UID_001',
                status: 'pending',
                paymentMethod: 'truemoney',
            },
        ],
        skipDuplicates: true,
    });

    // --- Orders for User 2 (5 orders, varied status) ---
    const ordersUser2 = [
        { game: game1, pkg: game1.packages[2], uid: 'FF_UID_002', status: 'completed', method: 'promptpay' },
        { game: game2, pkg: game2.packages[2], uid: 'ML_UID_002', status: 'completed', method: 'promptpay' },
        { game: game1, pkg: game1.packages[1], uid: 'FF_UID_003', status: 'failed', method: 'truemoney' },
        { game: game2, pkg: game2.packages[0], uid: 'ML_UID_003', status: 'completed', method: 'promptpay' },
        { game: game1, pkg: game1.packages[0], uid: 'FF_UID_004', status: 'processing', method: 'truemoney' },
    ];

    for (const o of ordersUser2) {
        await prisma.order.create({
            data: {
                userId: user2.id,
                gameId: o.game.id,
                gameName: o.game.name,
                packageId: o.pkg.id,
                packageName: o.pkg.name,
                packagePrice: o.pkg.price,
                uid: o.uid,
                status: o.status,
                paymentMethod: o.method,
            },
        });
    }

    console.log('✅ Seed complete');
    console.log('👤 User 1 — bronze_user@test.com / Test1234! (BRONZE, ฿150, 800pts)');
    console.log('👤 User 2 — gold_user@test.com   / Test1234! (GOLD, ฿3200.50, 12500pts)');
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
