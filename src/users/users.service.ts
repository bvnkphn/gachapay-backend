import { Injectable } from '@nestjs/common';
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
}
