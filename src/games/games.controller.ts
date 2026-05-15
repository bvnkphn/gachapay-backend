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
        private gamesService: GamesService,
        private externalGameService: ExternalGameService,
    ) { }

    // Get all available categories for filtering (must come before other @Get routes)
    @Get('categories')
    async getCategories() {
        const categories = await this.gamesService.getAllCategories();
        return { data: categories };
    }

    // Fetch games from external API with search, category filter, and pagination
    @Get('list')
    async fetchGameList(
        @Query('search') search?: string,
        @Query('category') category?: string,
        @Query('page') page: string = '1',
        @Query('pageSize') pageSize: string = '100',
    ) {
        return this.gamesService.fetchGameListFromExternal(
            search,
            category,
            parseInt(page, 10),
            parseInt(pageSize, 10),
        );
    }

    // Get game by slug from external API (includes packages and input fields)
    @Get('external/:slug')
    async findFromExternal(@Param('slug') slug: string): Promise<{ success: boolean; data?: any; message?: string }> {
        const game = await this.externalGameService.fetchGameBySlug(slug);
        if (!game) {
            return { success: false, message: `Game "${slug}" not found` };
        }
        return { success: true, data: game };
    }

    // Get all games from local database
    @Get()
    async findAll() {
        const games = await this.gamesService.findAll();
        return { data: games };
    }

    // GET /games/:id/uid-format — ดู UID Format ทั้งหมดของเกม (Admin only)
    @Get(':id/uid-format')
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, AdminGuard)
    async getUidFormats(@Param('id') id: string) {
        return this.gamesService.getUidFormats(BigInt(id));
    }

    // PATCH /games/:id/uid-format — ตั้งค่า UID Format (Admin only)
    @Patch(':id/uid-format')
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, AdminGuard)
    async updateUidFormat(
        @Param('id') id: string,
        @Body() body: { fieldKey: string; regex: string; helpText?: string },
    ) {
        return this.gamesService.updateUidFormat(BigInt(id), body);
    }

    // PATCH /games/:id/toggle — เปิด/ปิดเกม (Admin only)
    @Patch(':id/toggle')
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, AdminGuard)
    async toggleGame(@Param('id') id: string) {
        return this.gamesService.toggleGameStatus(BigInt(id));
    }

    // GET /games/:slug/api-status — เช็คสถานะ API ของเกม (Admin only)
    @Get(':slug/api-status')
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, AdminGuard)
    async checkApiStatus(@Param('slug') slug: string) {
        return this.gamesService.checkGameApiStatus(slug);
    }

    // POST /games/admin — สร้างเกมใหม่ (Admin only)
    @Post('admin')
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, AdminGuard)
    async createGame(@Body() body: any) {
        return this.gamesService.createGame(body);
    }

    // PATCH /games/:id — แก้ไขข้อมูลเกม (Admin only)
    @Patch(':id')
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, AdminGuard)
    async updateGame(@Param('id') id: string, @Body() body: any) {
        return this.gamesService.updateGame(BigInt(id), body);
    }

    // Get game by slug from local database (ต้องอยู่ท้ายสุด เพราะ :slug จะ match ทุก path)
    @Get(':slug')
    async findOne(@Param('slug') slug: string) {
        const game = await this.gamesService.findBySlug(slug);
        return { data: game };
    }
}
