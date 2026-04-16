import { Controller, Post, Body, Get } from '@nestjs/common';
import { ApiTags, ApiBody } from '@nestjs/swagger';
import { GameImportService } from './game-import.service';

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
@Controller('games')
export class GameImportController {
  constructor(private gameImportService: GameImportService) {}

  /**
   * Import games from external API data
   * 
   * Expected format:
   * [{
   *   "name": "Game Name",
   *   "key": "game-slug",
   *   "items": [
   *     {
   *       "name": "Package Name",
   *       "sku": "unique-sku",
   *       "price": "27.5",
   *       "originalPrice": "30"
   *     }
   *   ],
   *   "inputs": [
   *     {
   *       "key": "uid",
   *       "title": "User ID",
   *       "type": "text",
   *       "placeholder": "Enter UID",
   *       "regex": null,
   *       "options": []
   *     }
   *   ]
   * }]
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
   * Get mapping schema reference
   */
  @Get('mapping-schema')
  getMappingSchema() {
    return this.gameImportService.getMappingSchema();
  }
}
