import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GamesService } from './games.service';
import { ExternalGameService } from './external-game.service';

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

    // Get game by slug from local database
    @Get(':slug')
    async findOne(@Param('slug') slug: string) {
        const game = await this.gamesService.findBySlug(slug);
        return { data: game };
    }
}
