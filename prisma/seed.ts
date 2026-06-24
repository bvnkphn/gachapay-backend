import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
require('dotenv').config();

const prisma = new PrismaClient();

function daysAgo(n: number) {
    const d = new Date(); d.setDate(d.getDate() - n); return d;
}
function hoursAgo(n: number) {
    const d = new Date(); d.setHours(d.getHours() - n); return d;
}
function randomBetween(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
    console.log('🌱 Starting seed...');
    const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'Pass1234';
    const userPassword = process.env.USER_DEFAULT_PASSWORD || 'Test1234!';
    const passwordAdmin = await bcrypt.hash(adminPassword, 10);
    const passwordUser  = await bcrypt.hash(userPassword, 10);
    console.log('🔑 Using passwords from .env (or defaults if not set)');

    await prisma.paymentMethod.upsert({ where: { code: 'promptpay' }, update: {}, create: { code: 'promptpay', name: 'PromptPay (พร้อมเพย์)', icon: 'PP', color: '#1a56db', isActive: true } });
    await prisma.paymentMethod.upsert({ where: { code: 'truemoney' }, update: {}, create: { code: 'truemoney', name: 'TrueMoney Wallet',       icon: 'TW', color: '#f97316', isActive: true } });
    await prisma.paymentMethod.upsert({ where: { code: 'wallet' },    update: {}, create: { code: 'wallet',    name: 'CYBERPAY Wallet',         icon: 'CW', color: '#34d399', isActive: true } });

    const catMOBA = await prisma.gameCategory.upsert({ where: { slug: 'moba' },          update: {}, create: { name: 'MOBA',          slug: 'moba',          icon: '⚔️', isActive: true, order: 1 } });
    const catBR   = await prisma.gameCategory.upsert({ where: { slug: 'battle-royale' }, update: {}, create: { name: 'Battle Royale', slug: 'battle-royale', icon: '🎯', isActive: true, order: 2 } });
    const catRPG  = await prisma.gameCategory.upsert({ where: { slug: 'rpg' },           update: {}, create: { name: 'RPG',           slug: 'rpg',           icon: '✨', isActive: true, order: 3 } });

    const freeFire = await prisma.game.upsert({
        where: { slug: 'free-fire' }, update: { isActive: true },
        create: { name: 'Free Fire', slug: 'free-fire', categoryId: catBR.id, label: 'HOT', isActive: true,
            packages: { create: [
                { sku: 'FF-100',  name: '100 Diamonds',  price: 29,  originalPrice: 35,  cost: 20,  isActive: true },
                { sku: 'FF-310',  name: '310 Diamonds',  price: 79,  originalPrice: 90,  cost: 55,  isActive: true },
                { sku: 'FF-520',  name: '520 Diamonds',  price: 129, originalPrice: 145, cost: 90,  isActive: true },
                { sku: 'FF-1060', name: '1060 Diamonds', price: 249, originalPrice: 280, cost: 175, isActive: true },
                { sku: 'FF-2180', name: '2180 Diamonds', price: 499, originalPrice: 550, cost: 350, isActive: true },
            ]}},
        include: { packages: true },
    });
    const mobileLegends = await prisma.game.upsert({
        where: { slug: 'mobile-legends' }, update: { isActive: true },
        create: { name: 'Mobile Legends', slug: 'mobile-legends', categoryId: catMOBA.id, label: 'HOT', isActive: true,
            packages: { create: [
                { sku: 'ML-86',   name: '86 Diamonds',   price: 29,  originalPrice: 35,  cost: 20,  isActive: true },
                { sku: 'ML-172',  name: '172 Diamonds',  price: 59,  originalPrice: 65,  cost: 40,  isActive: true },
                { sku: 'ML-257',  name: '257 Diamonds',  price: 89,  originalPrice: 99,  cost: 62,  isActive: true },
                { sku: 'ML-706',  name: '706 Diamonds',  price: 219, originalPrice: 240, cost: 153, isActive: true },
                { sku: 'ML-2195', name: '2195 Diamonds', price: 649, originalPrice: 720, cost: 454, isActive: true },
            ]}},
        include: { packages: true },
    });
    const genshin = await prisma.game.upsert({
        where: { slug: 'genshin-impact' }, update: { isActive: true },
        create: { name: 'Genshin Impact', slug: 'genshin-impact', categoryId: catRPG.id, label: 'NEW', isActive: true,
            packages: { create: [
                { sku: 'GI-60',   name: '60 Genesis',   price: 59,   originalPrice: 65,   cost: 41,   isActive: true },
                { sku: 'GI-300',  name: '300 Genesis',  price: 289,  originalPrice: 320,  cost: 202,  isActive: true },
                { sku: 'GI-980',  name: '980 Genesis',  price: 939,  originalPrice: 1050, cost: 657,  isActive: true },
                { sku: 'GI-1980', name: '1980 Genesis', price: 1869, originalPrice: 2100, cost: 1308, isActive: true },
                { sku: 'GI-3280', name: '3280 Genesis', price: 3089, originalPrice: 3500, cost: 2162, isActive: true },
            ]}},
        include: { packages: true },
    });
    const pubg = await prisma.game.upsert({
        where: { slug: 'pubg-mobile' }, update: { isActive: true },
        create: { name: 'PUBG Mobile', slug: 'pubg-mobile', categoryId: catBR.id, label: 'NONE', isActive: true,
            packages: { create: [
                { sku: 'PUBG-60',   name: '60 UC',   price: 35,  originalPrice: 40,  cost: 24,  isActive: true },
                { sku: 'PUBG-325',  name: '325 UC',  price: 159, originalPrice: 180, cost: 111, isActive: true },
                { sku: 'PUBG-660',  name: '660 UC',  price: 299, originalPrice: 340, cost: 209, isActive: true },
                { sku: 'PUBG-1800', name: '1800 UC', price: 799, originalPrice: 900, cost: 559, isActive: true },
            ]}},
        include: { packages: true },
    });
    console.log('✅ Games & packages ready');

    await prisma.user.upsert({
        where: { email: process.env.EMAIL_USER },
        update: { password_hash: passwordAdmin, role: 'ADMIN' },
        create: { email: process.env.EMAIL_USER, name: 'Super Admin', password_hash: passwordAdmin, tier: 'PLATINUM', point_balance: 0, wallet_balance: 0, role: 'ADMIN', isEmailVerified: true, provider: 'local' },
    });

    const users = await Promise.all([
        prisma.user.upsert({ where: { email: 'somchai@test.com' }, update: {}, create: { email: 'somchai@test.com', name: 'สมชาย ใจดี',   password_hash: passwordUser, tier: 'GOLD',     point_balance: 15200, wallet_balance: 2500, role: 'USER', isEmailVerified: true, provider: 'local' } }),
        prisma.user.upsert({ where: { email: 'pailin@test.com'  }, update: {}, create: { email: 'pailin@test.com',  name: 'ไพลิน สวยงาม', password_hash: passwordUser, tier: 'SILVER',   point_balance: 4800,  wallet_balance: 800,  role: 'USER', isEmailVerified: true, provider: 'local' } }),
        prisma.user.upsert({ where: { email: 'nat@test.com'     }, update: {}, create: { email: 'nat@test.com',     name: 'ณัฐ เก่งมาก',  password_hash: passwordUser, tier: 'BRONZE',   point_balance: 950,   wallet_balance: 200,  role: 'USER', isEmailVerified: true, provider: 'local' } }),
        prisma.user.upsert({ where: { email: 'fah@test.com'     }, update: {}, create: { email: 'fah@test.com',     name: 'ฟ้า มีสุข',    password_hash: passwordUser, tier: 'PLATINUM', point_balance: 62000, wallet_balance: 9800, role: 'USER', isEmailVerified: true, provider: 'local' } }),
        prisma.user.upsert({ where: { email: 'ming@test.com'    }, update: {}, create: { email: 'ming@test.com',    name: 'มิ้ง นักเล่น', password_hash: passwordUser, tier: 'SILVER',   point_balance: 3200,  wallet_balance: 450,  role: 'USER', isEmailVerified: true, provider: 'local' } }),
    ]);
    console.log('✅ Users ready');

    const templates = [
        { game: freeFire, pkgIdx: 0, userIdx: 0, uid: 'FF001234', status: 'completed',  method: 'promptpay', daysBack: 0  },
        { game: freeFire, pkgIdx: 1, userIdx: 1, uid: 'FF002345', status: 'completed',  method: 'truemoney', daysBack: 0  },
        { game: freeFire, pkgIdx: 2, userIdx: 2, uid: 'FF003456', status: 'failed',     method: 'promptpay', daysBack: 0  },
        { game: freeFire, pkgIdx: 3, userIdx: 3, uid: 'FF004567', status: 'completed',  method: 'wallet',    daysBack: 1  },
        { game: freeFire, pkgIdx: 4, userIdx: 4, uid: 'FF005678', status: 'completed',  method: 'promptpay', daysBack: 1  },
        { game: freeFire, pkgIdx: 0, userIdx: 0, uid: 'FF006789', status: 'pending',    method: 'truemoney', daysBack: 1  },
        { game: freeFire, pkgIdx: 1, userIdx: 1, uid: 'FF007890', status: 'completed',  method: 'promptpay', daysBack: 2  },
        { game: freeFire, pkgIdx: 2, userIdx: 3, uid: 'FF008901', status: 'completed',  method: 'wallet',    daysBack: 2  },
        { game: freeFire, pkgIdx: 3, userIdx: 2, uid: 'FF009012', status: 'refunded',   method: 'promptpay', daysBack: 3  },
        { game: freeFire, pkgIdx: 0, userIdx: 4, uid: 'FF010123', status: 'completed',  method: 'truemoney', daysBack: 3  },
        { game: freeFire, pkgIdx: 1, userIdx: 0, uid: 'FF011234', status: 'completed',  method: 'promptpay', daysBack: 5  },
        { game: freeFire, pkgIdx: 4, userIdx: 3, uid: 'FF012345', status: 'completed',  method: 'wallet',    daysBack: 7  },
        { game: freeFire, pkgIdx: 2, userIdx: 1, uid: 'FF013456', status: 'completed',  method: 'promptpay', daysBack: 10 },
        { game: freeFire, pkgIdx: 3, userIdx: 4, uid: 'FF014567', status: 'failed',     method: 'truemoney', daysBack: 12 },
        { game: freeFire, pkgIdx: 0, userIdx: 2, uid: 'FF015678', status: 'completed',  method: 'promptpay', daysBack: 15 },
        { game: freeFire, pkgIdx: 1, userIdx: 3, uid: 'FF016789', status: 'completed',  method: 'wallet',    daysBack: 18 },
        { game: freeFire, pkgIdx: 2, userIdx: 0, uid: 'FF017890', status: 'completed',  method: 'promptpay', daysBack: 20 },
        { game: freeFire, pkgIdx: 4, userIdx: 1, uid: 'FF018901', status: 'completed',  method: 'truemoney', daysBack: 25 },
        { game: freeFire, pkgIdx: 3, userIdx: 4, uid: 'FF019012', status: 'completed',  method: 'promptpay', daysBack: 28 },
        { game: freeFire, pkgIdx: 0, userIdx: 2, uid: 'FF020123', status: 'completed',  method: 'wallet',    daysBack: 30 },
        { game: mobileLegends, pkgIdx: 0, userIdx: 1, uid: 'ML001234', status: 'completed',  method: 'promptpay', daysBack: 0  },
        { game: mobileLegends, pkgIdx: 1, userIdx: 0, uid: 'ML002345', status: 'completed',  method: 'wallet',    daysBack: 0  },
        { game: mobileLegends, pkgIdx: 2, userIdx: 3, uid: 'ML003456', status: 'processing', method: 'truemoney', daysBack: 0  },
        { game: mobileLegends, pkgIdx: 3, userIdx: 4, uid: 'ML004567', status: 'completed',  method: 'promptpay', daysBack: 1  },
        { game: mobileLegends, pkgIdx: 4, userIdx: 2, uid: 'ML005678', status: 'completed',  method: 'wallet',    daysBack: 2  },
        { game: mobileLegends, pkgIdx: 0, userIdx: 0, uid: 'ML006789', status: 'failed',     method: 'truemoney', daysBack: 3  },
        { game: mobileLegends, pkgIdx: 1, userIdx: 1, uid: 'ML007890', status: 'completed',  method: 'promptpay', daysBack: 4  },
        { game: mobileLegends, pkgIdx: 2, userIdx: 3, uid: 'ML008901', status: 'completed',  method: 'wallet',    daysBack: 7  },
        { game: mobileLegends, pkgIdx: 3, userIdx: 4, uid: 'ML009012', status: 'completed',  method: 'promptpay', daysBack: 10 },
        { game: mobileLegends, pkgIdx: 4, userIdx: 2, uid: 'ML010123', status: 'completed',  method: 'truemoney', daysBack: 14 },
        { game: mobileLegends, pkgIdx: 0, userIdx: 0, uid: 'ML011234', status: 'completed',  method: 'promptpay', daysBack: 18 },
        { game: mobileLegends, pkgIdx: 1, userIdx: 1, uid: 'ML012345', status: 'completed',  method: 'wallet',    daysBack: 22 },
        { game: mobileLegends, pkgIdx: 2, userIdx: 3, uid: 'ML013456', status: 'cancelled',  method: 'promptpay', daysBack: 26 },
        { game: mobileLegends, pkgIdx: 3, userIdx: 4, uid: 'ML014567', status: 'completed',  method: 'truemoney', daysBack: 29 },
        { game: genshin, pkgIdx: 0, userIdx: 3, uid: 'GI001234', status: 'completed', method: 'promptpay', daysBack: 0  },
        { game: genshin, pkgIdx: 1, userIdx: 4, uid: 'GI002345', status: 'completed', method: 'wallet',    daysBack: 0  },
        { game: genshin, pkgIdx: 2, userIdx: 0, uid: 'GI003456', status: 'completed', method: 'promptpay', daysBack: 1  },
        { game: genshin, pkgIdx: 3, userIdx: 1, uid: 'GI004567', status: 'failed',    method: 'truemoney', daysBack: 2  },
        { game: genshin, pkgIdx: 4, userIdx: 3, uid: 'GI005678', status: 'completed', method: 'promptpay', daysBack: 3  },
        { game: genshin, pkgIdx: 0, userIdx: 2, uid: 'GI006789', status: 'completed', method: 'wallet',    daysBack: 6  },
        { game: genshin, pkgIdx: 1, userIdx: 4, uid: 'GI007890', status: 'completed', method: 'promptpay', daysBack: 9  },
        { game: genshin, pkgIdx: 2, userIdx: 0, uid: 'GI008901', status: 'completed', method: 'truemoney', daysBack: 13 },
        { game: genshin, pkgIdx: 3, userIdx: 1, uid: 'GI009012', status: 'refunded',  method: 'promptpay', daysBack: 17 },
        { game: genshin, pkgIdx: 4, userIdx: 3, uid: 'GI010123', status: 'completed', method: 'wallet',    daysBack: 21 },
        { game: genshin, pkgIdx: 2, userIdx: 2, uid: 'GI011234', status: 'completed', method: 'promptpay', daysBack: 27 },
        { game: pubg, pkgIdx: 0, userIdx: 2, uid: 'PUBG001', status: 'completed', method: 'truemoney', daysBack: 0  },
        { game: pubg, pkgIdx: 1, userIdx: 3, uid: 'PUBG002', status: 'completed', method: 'promptpay', daysBack: 1  },
        { game: pubg, pkgIdx: 2, userIdx: 4, uid: 'PUBG003', status: 'pending',   method: 'wallet',    daysBack: 1  },
        { game: pubg, pkgIdx: 3, userIdx: 0, uid: 'PUBG004', status: 'completed', method: 'promptpay', daysBack: 2  },
        { game: pubg, pkgIdx: 0, userIdx: 1, uid: 'PUBG005', status: 'failed',    method: 'truemoney', daysBack: 4  },
        { game: pubg, pkgIdx: 1, userIdx: 2, uid: 'PUBG006', status: 'completed', method: 'promptpay', daysBack: 6  },
        { game: pubg, pkgIdx: 2, userIdx: 3, uid: 'PUBG007', status: 'completed', method: 'wallet',    daysBack: 11 },
        { game: pubg, pkgIdx: 3, userIdx: 4, uid: 'PUBG008', status: 'completed', method: 'promptpay', daysBack: 16 },
        { game: pubg, pkgIdx: 0, userIdx: 0, uid: 'PUBG009', status: 'completed', method: 'truemoney', daysBack: 23 },
        { game: pubg, pkgIdx: 1, userIdx: 1, uid: 'PUBG010', status: 'completed', method: 'promptpay', daysBack: 29 },
    ];

    let orderCount = 0;
    for (const t of templates) {
        const pkg  = t.game.packages[t.pkgIdx];
        const user = users[t.userIdx];
        const createdAt = t.daysBack === 0 ? hoursAgo(randomBetween(1, 8)) : daysAgo(t.daysBack);
        const price = pkg.price as any;
        await prisma.order.create({
            data: { userId: user.id, gameId: t.game.id, gameName: t.game.name, packageId: pkg.id, packageName: pkg.name, packagePrice: price, finalPrice: price, uid: t.uid, email: user.email, status: t.status, paymentMethod: t.method, createdAt },
        });
        orderCount++;
    }
    console.log(`✅ Orders: ${orderCount} รายการ`);
    console.log('\n🔑 Admin: ' + process.env.EMAIL_USER + ' / ' + process.env.EMAIL_PASSWORD);
}

main()
    .catch((e) => { console.error('❌', e); process.exit(1); })
    .finally(() => prisma.$disconnect());
