import { Controller, Get, Post, Patch, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { GamesService } from './games.service';
import { ExternalGameService } from './external-game.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@ApiTags('Games')
@Controller('games')
export class GamesController {
    constructor(
        private readonly gamesService: GamesService,
        private readonly externalGameService: ExternalGameService,
    ) { }

    @Get('categories')
    async getCategories() {
        const categories = await this.gamesService.getAllCategories();
        return { data: categories };
    }

    @Get('list')
    async fetchGameList(
        @Query('search') search?: string,
        @Query('category') category?: string,
        @Query('page') page: string = '1',
        @Query('pageSize') pageSize: string = '100',
    ) {
        return this.gamesService.fetchGameListFromExternal(search, category, Number.parseInt(page, 10), Number.parseInt(pageSize, 10));
    }

    // ✅ เพิ่ม return type เป็น Promise<any> เพื่อแก้ TS4053
    @Get('external/:slug')
    async findFromExternal(@Param('slug') slug: string): Promise<any> {
        const game = await this.externalGameService.fetchGameBySlug(slug);
        if (!game) return { success: false, message: `Game "${slug}" not found` };
        return { success: true, data: game };
    }

    // GET /games/admin/all — ดึงทุกเกม (รวมที่ปิดอยู่) สำหรับ Admin
    @Get('admin/all')
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, AdminGuard)
    async findAllForAdmin(): Promise<any> {
        const games = await this.gamesService.findAllIncludingInactive();
        return { data: games };
    }

    // GET /games — ดึงเฉพาะเกมที่ active (สำหรับ user ทั่วไป)
    @Get()
    async findAll(): Promise<any> {
        const games = await this.gamesService.findAll();
        return { data: games };
    }

    @Get(':id/uid-format')
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, AdminGuard)
    async getUidFormats(@Param('id') id: string): Promise<any> {
        return this.gamesService.getUidFormats(BigInt(id));
    }

    @Patch(':id/uid-format')
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, AdminGuard)
    async updateUidFormat(@Param('id') id: string, @Body() body: { fieldKey: string; regex: string; helpText?: string }): Promise<any> {
        return this.gamesService.updateUidFormat(BigInt(id), body);
    }

    @Patch(':id/toggle')
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, AdminGuard)
    async toggleGame(@Param('id') id: string): Promise<any> {
        return this.gamesService.toggleGameStatus(BigInt(id));
    }

    @Get(':slug/api-status')
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, AdminGuard)
    async checkApiStatus(@Param('slug') slug: string): Promise<any> {
        return this.gamesService.checkGameApiStatus(slug);
    }

    @Post('admin')
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, AdminGuard)
    async createGame(@Body() body: any): Promise<any> {
        return this.gamesService.createGame(body);
    }

    @Patch(':id')
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, AdminGuard)
    async updateGame(@Param('id') id: string, @Body() body: any): Promise<any> {
        return this.gamesService.updateGame(BigInt(id), body);
    }

    @Get(':slug')
    async findOne(@Param('slug') slug: string): Promise<any> {
        const game = await this.gamesService.findBySlug(slug);
        return { data: game };
    }
}
