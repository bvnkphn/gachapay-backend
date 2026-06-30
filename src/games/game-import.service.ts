import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Maps external game top-up API data to Prisma models
 * 
 * External API format:
 * {
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
 *       "title": "UID",
 *       "type": "text",
 *       "placeholder": "UID",
 *       "regex": null,
 *       "options": []
 *     }
 *   ]
 * }
 */

interface ExternalGame {
  name: string;
  key: string;
  items: ExternalPackage[];
  inputs: ExternalInputField[];
}

interface ExternalPackage {
  name: string;
  sku: string;
  price: string;
  originalPrice: string;
}

interface ExternalInputField {
  key: string;
  title: string;
  type: string;
  placeholder?: string;
  regex?: string | null;
  options?: ExternalInputOption[];
}

interface ExternalInputOption {
  label: string;
  value: string;
}

@Injectable()
export class GameImportService {
  constructor(private prisma: PrismaService) {}

  /**
   * Import external game data into database
   */
  async importGames(externalGames: ExternalGame[]): Promise<void> {
    for (const externalGame of externalGames) {
      await this.importGame(externalGame);
    }
  }

  /**
   * Import a single game with packages and input fields
   */
  async importGame(externalGame: ExternalGame): Promise<void> {
    // Upsert game
    const game = await this.prisma.game.upsert({
      where: { slug: externalGame.key },
      update: { name: externalGame.name, isActive: true },
      create: {
        name: externalGame.name,
        slug: externalGame.key,
        isActive: true,
      },
    });

    // Upsert packages
    for (const externalPackage of externalGame.items) {
      await this.prisma.gamePackage.upsert({
        where: { sku: externalPackage.sku },
        update: {
          name: externalPackage.name,
          price: parseFloat(externalPackage.price),
          originalPrice: parseFloat(externalPackage.price),
          isActive: true,
        },
        create: {
          gameId: game.id,
          sku: externalPackage.sku,
          name: externalPackage.name,
          price: parseFloat(externalPackage.price),
          originalPrice: parseFloat(externalPackage.price),
          isActive: true,
        },
      });
    }

    // Upsert input fields and options
    for (const externalInput of externalGame.inputs) {
      const inputField = await this.prisma.gameInputField.upsert({
        where: {
          gameId_key: {
            gameId: game.id,
            key: externalInput.key,
          },
        },
        update: {
          label: externalInput.title,
          placeholder: externalInput.placeholder || null,
          type: externalInput.type,
          regex: externalInput.regex || null,
          isActive: true,
        },
        create: {
          gameId: game.id,
          key: externalInput.key,
          label: externalInput.title,
          placeholder: externalInput.placeholder || null,
          type: externalInput.type,
          regex: externalInput.regex || null,
          required: true,
          isActive: true,
        },
      });

      // Upsert input field options (for select types)
      if (externalInput.options && externalInput.options.length > 0) {
        for (let i = 0; i < externalInput.options.length; i++) {
          const option = externalInput.options[i];
          await this.prisma.gameInputFieldOption.upsert({
            where: {
              fieldId_value: {
                fieldId: inputField.id,
                value: option.value,
              },
            },
            update: {
              label: option.label,
              order: i,
            },
            create: {
              fieldId: inputField.id,
              label: option.label,
              value: option.value,
              order: i,
            },
          });
        }
      }
    }
  }

  /**
   * Get mapping details for reference
   */
  getMappingSchema() {
    return {
      game: {
        "external.name": "Game.name",
        "external.key": "Game.slug",
        "default_values": {
          "isActive": true,
          "label": "NONE",
          "categoryId": null,
          "description": null,
          "image": null,
        }
      },
      gamePackage: {
        "external.name": "GamePackage.name",
        "external.sku": "GamePackage.sku (unique)",
        "external.price": "GamePackage.price",
        "external.originalPrice": "GamePackage.originalPrice",
        "default_values": {
          "isActive": true,
          "discount": 0,
          "description": null,
        }
      },
      gameInputField: {
        "external.key": "GameInputField.key",
        "external.title": "GameInputField.label",
        "external.placeholder": "GameInputField.placeholder",
        "external.type": "GameInputField.type",
        "external.regex": "GameInputField.regex",
        "default_values": {
          "isActive": true,
          "required": true,
          "order": 0,
          "helpText": null,
        }
      },
      gameInputFieldOption: {
        "external.label": "GameInputFieldOption.label",
        "external.value": "GameInputFieldOption.value",
        "default_values": {
          "isActive": true,
        }
      }
    };
  }
}
