import { Controller, Get, UseGuards, Req, NotFoundException, Delete, Body, BadRequestException, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
    constructor(private usersService: UsersService) { }

    @Get('profile')
    async getProfile(@Req() req) {
        const { password_hash, ...user } = await this.usersService.findById(req.user.uuid);
        return user;
    }

    @Get('me')
    async getMe(@Req() req) {
        const data = await this.usersService.getProfile(req.user.uuid);
        if (!data) throw new NotFoundException('User not found');
        return data;
    }

    @Get('me/loyalty')
    async getLoyalty(@Req() req) {
        const data = await this.usersService.getLoyalty(req.user.uuid);
        if (!data) throw new NotFoundException('User not found');
        return data;
    }

    @Get('me/referrals')
    async getReferrals(@Req() req) {
        return this.usersService.getReferrals(req.user.uuid);
    }

    @Post('me/referred-by')
    async setReferrer(@Req() req, @Body('referrerCode') referrerCode: string) {
        if (!referrerCode) throw new BadRequestException('กรุณาระบุรหัสผู้แนะนำ');
        return this.usersService.setReferrer(req.user.uuid, referrerCode);
    }

    @Get('me/gacha-spins')
    async getGachaSpins(@Req() req, @Body() body: { limit?: number; offset?: number }) {
        const limit = body?.limit ?? 10;
        const offset = body?.offset ?? 0;
        return this.usersService.getGachaSpins(req.user.uuid, limit, offset);
    }

    @Delete('me')
    async deleteMe(@Req() req, @Body() body: { confirmPhrase: string; password: string }) {
        const CONFIRM_PHRASE = 'DELETE';
        if (body.confirmPhrase !== CONFIRM_PHRASE) throw new BadRequestException('Confirmation phrase mismatch');

        const user = await this.usersService.findById(req.user.uuid);
        if (!user) throw new NotFoundException('User not found');

        // Validate password
        const bcrypt = require('bcryptjs');
        const match = await bcrypt.compare(body.password || '', user.password_hash || '');
        if (!match) throw new BadRequestException('Invalid password');

        await this.usersService.delete(req.user.uuid);
        return { success: true };
    }
}

