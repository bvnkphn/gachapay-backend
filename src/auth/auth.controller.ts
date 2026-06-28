import { Controller, Post, Body, Get, UseGuards, Req, Res, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, ForgotPasswordDto, ResetPasswordDto, SendOtpDto, VerifyOtpDto, VerifyAdminOtpDto } from './dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { DevOrGoogleAuthGuard, DevOrFacebookAuthGuard } from './guards/dev-oauth.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    @Post('register')
    async register(@Body() registerDto: RegisterDto) {
        return this.authService.register(registerDto);
    }

    @Post('login')
    async login(@Body() loginDto: LoginDto, @Req() req: any) {
        const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
        const ua = req.headers['user-agent'];
        return this.authService.login(loginDto, ip, ua);
    }

    @Post('forgot-password')
    async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
        return this.authService.forgotPassword(forgotPasswordDto);
    }

    @Post('reset-password')
    async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
        return this.authService.resetPassword(resetPasswordDto);
    }

    @Post('send-otp')
    async sendOtp(@Body() sendOtpDto: SendOtpDto) {
        return this.authService.sendOtp(sendOtpDto);
    }

    @Post('verify-otp')
    async verifyOtp(@Body() verifyOtpDto: VerifyOtpDto) {
        return this.authService.verifyOtp(verifyOtpDto);
    }

    @Post('verify-admin-otp')
    async verifyAdminOtp(@Body() body: VerifyAdminOtpDto, @Req() req: any) {
        const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
        const ua = req.headers['user-agent'];
        return this.authService.verifyAdminOtp(body.userId, body.otp, ip, ua);
    }

    @Get('google')
    @UseGuards(DevOrGoogleAuthGuard)
    async googleAuth(@Req() req, @Res() res: Response) {
        if (req.user) {
            return res.redirect('/api/auth/google/callback');
        }
    }

    @Get('google/callback')
    @UseGuards(DevOrGoogleAuthGuard)
    async googleAuthCallback(@Req() req, @Res() res: Response) {
        const { user, token } = await this.authService.googleLogin(req.user);

        // Redirect to frontend with token
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
    }

    @Get('facebook')
    @UseGuards(DevOrFacebookAuthGuard)
    async facebookAuth(@Req() req, @Res() res: Response) {
        if (req.user) {
            return res.redirect('/api/auth/facebook/callback');
        }
    }

    @Get('facebook/callback')
    @UseGuards(DevOrFacebookAuthGuard)
    async facebookAuthCallback(@Req() req, @Res() res: Response) {
        const { user, token } = await this.authService.facebookLogin(req.user);

        // Redirect to frontend with token
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
    }

    @Get('me')
    @UseGuards(JwtAuthGuard)
    async getProfile(@Req() req) {
        return req.user;
    }
}
