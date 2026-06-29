import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
require('dotenv').config();

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting database cleaning and seeding...');

    // Clear dependent tables first
    console.log('🗑️ Clearing dependent tables...');
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
    await prisma.userAddress.deleteMany();
    
    // Clear all users
    console.log('🗑️ Clearing all users...');
    await prisma.user.deleteMany();

    // Hashing passwords
    console.log('🔑 Hashing passwords...');
    const hashedAdminPassword = await bcrypt.hash('Admin123321za.', 10);
    const hashedUserPassword = await bcrypt.hash('User123321za.', 10);

    // Seed admin
    console.log('👤 Creating admin user...');
    const admin = await prisma.user.create({
        data: {
            email: 'admin@cyberpay.com',
            password_hash: hashedAdminPassword,
            role: UserRole.ADMIN,
            isEmailVerified: true,
            wallet_balance: 100000, // Pre-fund wallet for admin testing
            name: 'CyberPay Admin',
        },
    });

    // Seed normal user
    console.log('👤 Creating standard user...');
    const user = await prisma.user.create({
        data: {
            email: 'user@cyberpay.com',
            password_hash: hashedUserPassword,
            role: UserRole.USER,
            isEmailVerified: true,
            wallet_balance: 5000, // Pre-fund wallet with 5,000 for user testing
            name: 'CyberPay User',
        },
    });

    console.log('✅ Successfully seeded users!');
    console.log({
        admin: { id: admin.id.toString(), email: admin.email },
        user: { id: user.id.toString(), email: user.email },
    });
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error('❌ Error during seeding:', e);
        await prisma.$disconnect();
        process.exit(1);
    });
