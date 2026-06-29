import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { GameImportService } from './game-import.service';
import { ExternalGameService } from './external-game.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

interface ExternalGame {
  name: string;
  key: string;
  items: {
    name: string;
    sku: string;
    price: string;
    originalPrice: string;
  }[];
  inputs: {
    key: string;
    title: string;
    type: string;
    placeholder?: string;
    regex?: string | null;
    options?: {
      label: string;
      value: string;
    }[];
  }[];
}

@ApiTags('Game Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('games')
export class GameImportController {
  constructor(
    private gameImportService: GameImportService,
    private externalGameService: ExternalGameService,
  ) {}

  /**
   * Import all games directly from the external API provider (Admin only)
   */
  @Post('import-external')
  async importExternal() {
    const externalGames = await this.externalGameService.fetchGames();
    await this.gameImportService.importGames(externalGames);
    return {
      success: true,
      message: `Successfully imported ${externalGames.length} games from external API`,
      count: externalGames.length,
    };
  }

  /**
   * Import games from external API data (Admin only)
   */
  @Post('import')
  @ApiBody({
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          key: { type: 'string' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                sku: { type: 'string' },
                price: { type: 'string' },
                originalPrice: { type: 'string' }
              }
            }
          },
          inputs: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                key: { type: 'string' },
                title: { type: 'string' },
                type: { type: 'string' },
                placeholder: { type: 'string' },
                regex: { oneOf: [{ type: 'string' }, { type: 'null' }] },
                options: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      label: { type: 'string' },
                      value: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  })
  async importGames(@Body() externalGames: ExternalGame[]) {
    await this.gameImportService.importGames(externalGames);
    return {
      success: true,
      message: `Successfully imported ${externalGames.length} games`,
      count: externalGames.length,
    };
  }

  /**
   * Get mapping schema reference (Admin only)
   */
  @Get('mapping-schema')
  getMappingSchema() {
    return this.gameImportService.getMappingSchema();
  }
}
