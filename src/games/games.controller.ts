import { Controller, Get, Param } from '@nestjs/common';
import { GamesService } from './games.service';

@Controller('games')
export class GamesController {
    constructor(private gamesService: GamesService) { }

    @Get()
    async findAll() {
        return this.gamesService.findAll();
    }

    @Get(':slug')
    async findOne(@Param('slug') slug: string) {
        return this.gamesService.findBySlug(slug);
    }
}
