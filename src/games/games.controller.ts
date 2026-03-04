import { Controller, Get, Param, Query } from '@nestjs/common';
import { GamesService } from './games.service';

@Controller('games')
export class GamesController {
  constructor(private gamesService: GamesService) {}

  @Get()
  findAll(
    @Query('search')   search?: string,
    @Query('platform') platform?: string,
    @Query('category') category?: string,
  ) {
    return this.gamesService.findAll({ search, platform, category });
  }

  @Get('banners')
  getBanners() {
    return this.gamesService.getBanners();
  }

  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    return this.gamesService.findBySlug(slug);
  }
}
