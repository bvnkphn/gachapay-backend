import { Injectable, HttpException, HttpStatus } from '@nestjs/common';

/**
 * Service to fetch game data from external 24payseller API
 */

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
  options?: {
    label: string;
    value: string;
  }[];
}

@Injectable()
export class ExternalGameService {
  private readonly apiUrl = 'https://x.24payseller.com/products/list';
  private cachedGames: ExternalGame[] | null = null;
  private cacheExpiry = 0;
  private readonly cacheDuration = 3600000; // 1 hour in milliseconds

  /**
   * Fetch all games from external API with caching
   */
  async fetchGames(): Promise<ExternalGame[]> {
    // Return cached data if still valid
    if (this.cachedGames && Date.now() < this.cacheExpiry) {
      return this.cachedGames;
    }

    try {
      const response = await fetch(this.apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new HttpException(
          `Failed to fetch games from external API: ${response.statusText}`,
          HttpStatus.BAD_GATEWAY
        );
      }

      const games: ExternalGame[] = await response.json();

      // Cache the results
      this.cachedGames = games;
      this.cacheExpiry = Date.now() + this.cacheDuration;

      return games;
    } catch (error) {
      throw new HttpException(
        `Failed to fetch games: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }
  }

  /**
   * Fetch a specific game by slug
   */
  async fetchGameBySlug(slug: string): Promise<ExternalGame | null> {
    const games = await this.fetchGames();
    return games.find(g => g.key === slug) || null;
  }

  /**
   * Find a package by name within a game
   */
  async findPackageInGame(gameSlug: string, packageName: string): Promise<ExternalPackage | null> {
    const game = await this.fetchGameBySlug(gameSlug);
    if (!game) return null;

    return game.items.find(item => item.name === packageName) || null;
  }

  /**
   * Find a package by SKU across all games
   */
  async findPackageBySku(sku: string): Promise<{ game: ExternalGame; package: ExternalPackage } | null> {
    const games = await this.fetchGames();

    for (const game of games) {
      const pkg = game.items.find(item => item.sku === sku);
      if (pkg) {
        return { game, package: pkg };
      }
    }

    return null;
  }

  /**
   * Get input fields for a game
   */
  async getGameInputFields(gameSlug: string): Promise<ExternalInputField[]> {
    const game = await this.fetchGameBySlug(gameSlug);
    return game?.inputs || [];
  }

  /**
   * Clear cache (useful for manual refresh)
   */
  clearCache(): void {
    this.cachedGames = null;
    this.cacheExpiry = 0;
  }
}
