import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
    constructor(private usersService: UsersService) { }

    @Get('profile')
    @UseGuards(JwtAuthGuard)
    async getProfile(@Req() req) {
        const { password, ...user } = await this.usersService.findById(req.user.id);
        return user;
    }
}
