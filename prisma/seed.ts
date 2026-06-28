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

    // Clear all existing data to start clean!
    console.log('🗑️ Clearing existing database data...');
    await prisma.ticketHistory.deleteMany();
    await prisma.ticketMessage.deleteMany();
    await prisma.supportTicket.deleteMany();
    await prisma.referral.deleteMany();
    await prisma.gachaSpin.deleteMany();
    await prisma.topupTransaction.deleteMany();
    await prisma.couponUsage.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.order.deleteMany();
    await prisma.adminLog.deleteMany();
    await prisma.passwordReset.deleteMany();
    await prisma.otpRequest.deleteMany();
    await prisma.user.deleteMany();
    await prisma.coupon.deleteMany();
    await prisma.gameInputFieldOption.deleteMany();
    await prisma.gameInputField.deleteMany();
    await prisma.gamePackage.deleteMany();
    await prisma.game.deleteMany();
    await prisma.gameCategory.deleteMany();
    await prisma.paymentMethod.deleteMany();
    await prisma.banner.deleteMany();
    await prisma.systemSetting.deleteMany();
    await prisma.faqItem.deleteMany();

    const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'Pass1234';
    const userPassword = 'User123321za.';
    const adminTestPassword = 'Admin123321za.';
    const passwordAdmin = await bcrypt.hash(adminPassword, 10);
    const passwordUser  = await bcrypt.hash(userPassword, 10);
    const passwordAdminTest = await bcrypt.hash(adminTestPassword, 10);
    console.log('🔑 Using passwords from .env (or defaults if not set)');

    await prisma.paymentMethod.upsert({ where: { code: 'promptpay' }, update: {}, create: { code: 'promptpay', name: 'PromptPay (พร้อมเพย์)', icon: 'PP', color: '#1a56db', isActive: true } });
    await prisma.paymentMethod.upsert({ where: { code: 'bank_transfer' }, update: {}, create: { code: 'bank_transfer', name: 'Bank Transfer', icon: 'B', color: '#0d9488', isActive: true } });
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

    await prisma.user.upsert({
        where: { email: 'admin@test.com' },
        update: { password_hash: passwordAdminTest, role: 'ADMIN', point_balance: 0, wallet_balance: 0 },
        create: { email: 'admin@test.com', name: 'Admin User', password_hash: passwordAdminTest, tier: 'PLATINUM', point_balance: 0, wallet_balance: 0, role: 'ADMIN', isEmailVerified: true, provider: 'local' },
    });

    await prisma.user.upsert({
        where: { email: 'user@test.com' },
        update: { password_hash: passwordUser, role: 'USER', point_balance: 0, wallet_balance: 0 },
        create: { email: 'user@test.com', name: 'General User', password_hash: passwordUser, tier: 'BRONZE', point_balance: 0, wallet_balance: 0, role: 'USER', isEmailVerified: true, provider: 'local' },
    });

    console.log('✅ Users registered cleanly');
}

main()
    .catch((e) => { console.error('❌', e); process.exit(1); })
    .finally(() => prisma.$disconnect());
