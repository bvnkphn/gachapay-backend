import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { EmailService } from './email.service';
import { RegisterDto, LoginDto, ForgotPasswordDto, ResetPasswordDto, SendOtpDto, VerifyOtpDto } from './dto';

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
        private emailService: EmailService,
        private configService: ConfigService,
    ) { }

    async register(registerDto: RegisterDto) {
        const { email, password, name } = registerDto;

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

        // Generate token
        const token = this.generateToken(user.uuid, user.email);

        return {
            user: this.sanitizeUser(user),
            token,
        };
    }

    async login(loginDto: LoginDto) {
        const { email, password } = loginDto;

        // Find user
        const user = await this.usersService.findByEmail(email);
        if (!user || !user.password_hash) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // Generate token
        const token = this.generateToken(user.uuid, user.email);

        return {
            user: this.sanitizeUser(user),
            token,
        };
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
        const resetExpires = new Date(Date.now() + 3600000); // 1 hour

        await this.usersService.update(user.uuid, {
            resetPasswordToken: resetToken,
            resetPasswordExpires: resetExpires,
        });

        // Send email
        const resetUrl = `${this.configService.get('FRONTEND_URL')}/reset-password?token=${resetToken}`;
        await this.emailService.sendPasswordResetEmail(user.email, resetUrl);

        return { message: 'If email exists, reset link has been sent' };
    }

    async resetPassword(resetPasswordDto: ResetPasswordDto) {
        const { token, password } = resetPasswordDto;

        const user = await this.usersService.findByResetToken(token);
        if (!user || !user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
            throw new BadRequestException('Invalid or expired reset token');
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Update password and clear reset token
        await this.usersService.update(user.uuid, {
            password_hash: hashedPassword,
            resetPasswordToken: null,
            resetPasswordExpires: null,
        });

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
        const otpExpires = new Date(Date.now() + 600000); // 10 minutes

        await this.usersService.update(user.uuid, {
            otpCode: otp,
            otpExpires: otpExpires,
            otpAttempts: 0,
        });

        // Send OTP email
        await this.emailService.sendOtpEmail(user.email, otp);

        return { message: 'If email exists, OTP has been sent' };
    }

    async verifyOtp(verifyOtpDto: VerifyOtpDto) {
        const { email, otp, newPassword } = verifyOtpDto;

        const user = await this.usersService.findByEmailWithOtp(email);
        if (!user) {
            throw new BadRequestException('Invalid email or OTP');
        }

        // Check if OTP exists
        if (!user.otpCode || !user.otpExpires) {
            throw new BadRequestException('No OTP found. Please request a new one');
        }

        // Check if OTP expired
        if (user.otpExpires < new Date()) {
            throw new BadRequestException('OTP has expired. Please request a new one');
        }

        // Check attempts (max 5 attempts)
        if (user.otpAttempts >= 5) {
            throw new BadRequestException('Too many failed attempts. Please request a new OTP');
        }

        // Verify OTP
        if (user.otpCode !== otp) {
            // Increment attempts
            await this.usersService.update(user.uuid, {
                otpAttempts: user.otpAttempts + 1,
            });
            throw new BadRequestException('Invalid OTP');
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password and clear OTP
        await this.usersService.update(user.uuid, {
            password_hash: hashedPassword,
            otpCode: null,
            otpExpires: null,
            otpAttempts: 0,
        });

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

        const token = this.generateToken(user.uuid, user.email);

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

        const token = this.generateToken(user.uuid, user.email);

        return {
            user: this.sanitizeUser(user),
            token,
        };
    }

    private generateToken(userId: string, email: string): string {
        return this.jwtService.sign({ sub: userId, email });
    }

    private generateResetToken(): string {
        return Math.random().toString(36).substring(2, 15) +
            Math.random().toString(36).substring(2, 15);
    }

    private sanitizeUser(user: any) {
        const { password_hash, resetPasswordToken, resetPasswordExpires, ...sanitized } = user;
        return sanitized;
    }
}
