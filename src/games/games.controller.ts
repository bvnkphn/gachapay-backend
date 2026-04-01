import { Controller, Get, Param, Query } from '@nestjs/common';
import { GamesService } from './games.service';

@Controller('games')
export class GamesController {
    constructor(private gamesService: GamesService) { }

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

    // Get all games from local database
    @Get()
    async findAll() {
        return this.gamesService.findAll();
    }

    // Get game by slug from local database
    @Get(':slug')
    async findOne(@Param('slug') slug: string) {
        return this.gamesService.findBySlug(slug);
    }
}
