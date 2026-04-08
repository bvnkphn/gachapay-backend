import { Controller, Get, UseGuards, Req, NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from '../users/users.service';

@Controller('wallets')
@UseGuards(JwtAuthGuard)
export class WalletsController {
    constructor(private usersService: UsersService) { }

    @Get('me/balance')
    async getBalance(@Req() req) {
        const data = await this.usersService.getWalletBalance(req.user.uuid);
        if (!data) throw new NotFoundException('User not found');
        return data;
    }
}
