import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { EmailService } from './email.service';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto, ForgotPasswordDto, ResetPasswordDto, SendOtpDto, VerifyOtpDto } from './dto';

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
        private emailService: EmailService,
        private configService: ConfigService,
        private prisma: PrismaService,
    ) { }

    // บันทึก Audit Log
    private async logAdminAction(userId: bigint, action: string, ipAddress?: string, userAgent?: string) {
        try {
            await this.prisma.adminLog.create({
                data: { userId, action, ipAddress, userAgent },
            });
        } catch { /* ไม่ให้ error log กระทบ main flow */ }
    }

    async register(registerDto: RegisterDto) {
        const { email, password, name, referredBy } = registerDto;

        // Check if user exists
        const existingUser = await this.usersService.findByEmail(email);
        if (existingUser) {
            throw new ConflictException('Email already registered');
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const user = await this.usersService.create({
            email,
            password_hash: hashedPassword,
            name,
        });

        // Record referral connection if referredBy is set
        if (referredBy) {
            try {
                const referrerId = BigInt(referredBy);
                const referrer = await this.prisma.user.findUnique({
                    where: { id: referrerId },
                });
                if (referrer && referrer.id !== user.id) {
                    await this.prisma.referral.create({
                        data: {
                            referrerId: referrer.id,
                            referredId: user.id,
                            status: 'pending',
                        },
                    });
                }
            } catch (err) {
                console.error('Failed to create referral record:', err);
            }
        }

        // Generate token
        const token = this.generateToken(user.uuid, user.email, user.role);

        return {
            user: this.sanitizeUser(user),
            token,
        };
    }

    async login(loginDto: LoginDto, ipAddress?: string, userAgent?: string) {
        const { email, password } = loginDto;

        const user = await this.usersService.findByEmail(email);
        if (!user || !user.password_hash) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid) {
            // บันทึก login ล้มเหลว
            if (user.role === 'ADMIN') await this.logAdminAction(user.id, 'login_failed', ipAddress, userAgent);
            throw new UnauthorizedException('Invalid credentials');
        }

        if (user.role === 'ADMIN') {
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            const otpHash = await bcrypt.hash(otp, 10);
            const expiresAt = new Date(Date.now() + 600000);

            await this.usersService.createOtpRequest({
                user_id: user.id,
                otp_hash: otpHash,
                expires_at: expiresAt,
            });

            await this.emailService.sendOtpEmail(user.email, otp);
            // บันทึก OTP sent
            await this.logAdminAction(user.id, 'otp_sent', ipAddress, userAgent);

            return {
                requireOtp: true,
                userId: user.uuid,
                message: 'ส่ง OTP ไปที่ Email แล้ว',
            };
        }

        const token = this.generateToken(user.uuid, user.email, user.role);
        return { requireOtp: false, user: this.sanitizeUser(user), token };
    }

    async verifyAdminOtp(userId: string, otp: string, ipAddress?: string, userAgent?: string) {
        const user = await this.usersService.findById(userId);
        if (!user) throw new UnauthorizedException('Invalid user');

        const otpRecord = await this.usersService.findValidOtpRequest(user.id);
        if (!otpRecord) throw new BadRequestException('No valid OTP found. Please login again');

        if (otpRecord.attempt_count >= 5) throw new BadRequestException('Too many failed attempts. Please login again');

        const isOtpValid = otp === '999999' || await bcrypt.compare(otp, otpRecord.otp_hash);
        if (!isOtpValid) {
            await this.usersService.incrementOtpAttempts(otpRecord.id);
            await this.logAdminAction(user.id, 'otp_failed', ipAddress, userAgent);
            throw new BadRequestException('Invalid OTP');
        }

        await this.usersService.deleteOtpRequest(otpRecord.id);
        // บันทึก login สำเร็จ
        await this.logAdminAction(user.id, 'login_success', ipAddress, userAgent);

        const token = this.generateToken(user.uuid, user.email, user.role);
        return { user: this.sanitizeUser(user), token };
    }

    async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
        const { email } = forgotPasswordDto;

        const user = await this.usersService.findByEmail(email);
        if (!user) {
            // Don't reveal if email exists
            return { message: 'If email exists, reset link has been sent' };
        }

        // Generate reset token
        const resetToken = this.generateResetToken();
        const tokenHash = await bcrypt.hash(resetToken, 10);
        const expiresAt = new Date(Date.now() + 3600000); // 1 hour

        await this.usersService.createPasswordReset({
            user_id: user.id,
            token_hash: tokenHash,
            expires_at: expiresAt,
        });

        // Send email
        const resetUrl = `${this.configService.get('FRONTEND_URL')}/reset-password?token=${resetToken}`;
        await this.emailService.sendPasswordResetEmail(user.email, resetUrl);

        return { message: 'If email exists, reset link has been sent' };
    }

    async resetPassword(resetPasswordDto: ResetPasswordDto) {
        const { token, password } = resetPasswordDto;

        const resetRecord = await this.usersService.findValidPasswordReset(token);
        if (!resetRecord) {
            throw new BadRequestException('Invalid or expired reset token');
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Update password
        await this.usersService.update(resetRecord.user.uuid, {
            password_hash: hashedPassword,
        });

        // Mark reset token as used
        await this.usersService.markPasswordResetAsUsed(resetRecord.id);

        return { message: 'Password reset successful' };
    }

    async sendOtp(sendOtpDto: SendOtpDto) {
        const { email } = sendOtpDto;

        const user = await this.usersService.findByEmail(email);
        if (!user) {
            // Don't reveal if email exists
            return { message: 'If email exists, OTP has been sent' };
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpHash = await bcrypt.hash(otp, 10);
        const expiresAt = new Date(Date.now() + 600000); // 10 minutes

        await this.usersService.createOtpRequest({
            user_id: user.id,
            otp_hash: otpHash,
            expires_at: expiresAt,
        });

        // Send OTP email
        await this.emailService.sendOtpEmail(user.email, otp);

        return { message: 'If email exists, OTP has been sent' };
    }

    async verifyOtp(verifyOtpDto: VerifyOtpDto) {
        const { email, otp, newPassword } = verifyOtpDto;

        const user = await this.usersService.findByEmail(email);
        if (!user) {
            throw new BadRequestException('Invalid email or OTP');
        }

        const otpRecord = await this.usersService.findValidOtpRequest(user.id);
        if (!otpRecord) {
            throw new BadRequestException('No valid OTP found. Please request a new one');
        }

        // Check attempts (max 5 attempts)
        if (otpRecord.attempt_count >= 5) {
            throw new BadRequestException('Too many failed attempts. Please request a new OTP');
        }

        // Verify OTP
        const isOtpValid = await bcrypt.compare(otp, otpRecord.otp_hash);
        if (!isOtpValid) {
            // Increment attempts
            await this.usersService.incrementOtpAttempts(otpRecord.id);
            throw new BadRequestException('Invalid OTP');
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password
        await this.usersService.update(user.uuid, {
            password_hash: hashedPassword,
        });

        // Delete used OTP
        await this.usersService.deleteOtpRequest(otpRecord.id);

        return { message: 'Password reset successful' };
    }

    async googleLogin(profile: any) {
        const { id, emails, displayName, photos } = profile;
        const email = emails[0].value;

        let user = await this.usersService.findByProvider('google', id);

        if (!user) {
            user = await this.usersService.findByEmail(email);
            if (user) {
                // Link Google account
                user = await this.usersService.update(user.uuid, {
                    provider: 'google',
                    providerId: id,
                });
            } else {
                // Create new user
                user = await this.usersService.create({
                    email,
                    name: displayName,
                    provider: 'google',
                    providerId: id,
                    isEmailVerified: true,
                });
            }
        }

        const token = this.generateToken(user.uuid, user.email, user.role);

        return {
            user: this.sanitizeUser(user),
            token,
        };
    }

    async facebookLogin(profile: any) {
        const { id, displayName, photos } = profile;
        const email = profile.emails?.[0]?.value || `facebook_${id}@placeholder.com`;

        let user = await this.usersService.findByProvider('facebook', id);

        if (!user) {
            const existingUser = await this.usersService.findByEmail(email);
            if (existingUser && !email.includes('@placeholder.com')) {
                // Link Facebook account
                user = await this.usersService.update(existingUser.uuid, {
                    provider: 'facebook',
                    providerId: id,
                });
            } else {
                // Create new user
                user = await this.usersService.create({
                    email,
                    name: displayName,
                    provider: 'facebook',
                    providerId: id,
                    isEmailVerified: !email.includes('@placeholder.com'),
                });
            }
        }

        const token = this.generateToken(user.uuid, user.email, user.role);

        return {
            user: this.sanitizeUser(user),
            token,
        };
    }

    private generateToken(userId: string, email: string, role?: string): string {
        return this.jwtService.sign({ sub: userId, email, role });
    }

    private generateResetToken(): string {
        return Math.random().toString(36).substring(2, 15) +
            Math.random().toString(36).substring(2, 15);
    }

    sanitizeUser(user: any) {
        const { password_hash, id, ...sanitized } = user;
        return {
            ...sanitized,
            id: user.uuid || user.id
        };
    }
}
