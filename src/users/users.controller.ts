import { Controller, Get, UseGuards, Req, NotFoundException, Delete, Body, BadRequestException, Post, Query, Param, Patch, Put } from '@nestjs/common';
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
        const { password_hash, id, ...user } = await this.usersService.findById(req.user.uuid);
        return {
            ...user,
            id: user.uuid
        };
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
    async getGachaSpins(
        @Req() req,
        @Query('limit') limitStr?: string,
        @Query('offset') offsetStr?: string,
    ) {
        const limit = limitStr ? parseInt(limitStr, 10) : 10;
        const offset = offsetStr ? parseInt(offsetStr, 10) : 0;
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

    @Get('me/addresses')
    async getAddresses(@Req() req) {
        return this.usersService.getAddresses(req.user.uuid);
    }

    @Post('me/addresses')
    async addAddress(@Req() req, @Body() body: any) {
        if (!body.recipientName || !body.phone || !body.addressLine1 || !body.district || !body.province || !body.postalCode) {
            throw new BadRequestException('ข้อมูลที่อยู่ไม่ครบถ้วน');
        }
        return this.usersService.addAddress(req.user.uuid, body);
    }

    @Put('me/addresses/:id')
    async updateAddress(@Req() req, @Param('id') id: string, @Body() body: any) {
        return this.usersService.updateAddress(req.user.uuid, id, body);
    }

    @Delete('me/addresses/:id')
    async deleteAddress(@Req() req, @Param('id') id: string) {
        return this.usersService.deleteAddress(req.user.uuid, id);
    }

    @Patch('me/addresses/:id/default')
    async setDefaultAddress(@Req() req, @Param('id') id: string) {
        return this.usersService.setDefaultAddress(req.user.uuid, id);
    }
}

