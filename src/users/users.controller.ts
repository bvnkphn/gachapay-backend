import { Controller, Get, UseGuards, Req, NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';

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
}
