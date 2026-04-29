import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CategoriesService } from '../categories/categories.service';

@Injectable()
export class GamesService {
    constructor(
        private prisma: PrismaService,
        private categoriesService: CategoriesService,
    ) {}

    async findAll() {
        return this.prisma.game.findMany({
            where: { isActive: true },
            include: { 
                packages: true,
                inputFields: {
                    where: { isActive: true },
                    include: { options: { where: { isActive: true } } },
                    orderBy: { order: 'asc' },
                },
            },
        });
    }

    // เปิด/ปิดสถานะเกม
    async toggleGameStatus(id: bigint) {
        const game = await this.prisma.game.findUnique({ where: { id } });
        if (!game) throw new Error('Game not found');
        return this.prisma.game.update({
            where: { id },
            data: { isActive: !game.isActive },
        });
    }

    // เช็คสถานะ API ของเกม (ping external API)
    async checkGameApiStatus(slug: string) {
        try {
            const res = await fetch(`https://x.24payseller.com/products/list`, { signal: AbortSignal.timeout(5000) });
            return { slug, online: res.ok, checkedAt: new Date() };
        } catch {
            return { slug, online: false, checkedAt: new Date() };
        }
    }

    // สร้างเกมใหม่
    async createGame(data: any) {
        return this.prisma.game.create({
            data: {
                name: data.name,
                slug: data.slug ?? data.name.toLowerCase().replace(/\s+/g, '-'),
                description: data.description,
                image: data.image,
                categoryId: data.categoryId ? BigInt(data.categoryId) : null,
                label: data.label ?? 'NONE',
                isActive: data.isActive ?? true,
            },
        });
    }

    async findBySlug(slug: string) {
        // Try to find in database first
        const dbGame = await this.prisma.game.findUnique({
            where: { slug },
            include: { 
                packages: true,
                inputFields: {
                    where: { isActive: true },
                    include: { options: { where: { isActive: true } } },
                    orderBy: { order: 'asc' },
                },
            },
        });

        if (dbGame) {
            return this.transformDbGame(dbGame);
        }

        // Fallback: Fetch from external API if not in database
        try {
            const response = await fetch(
                'https://x.24payseller.com/products/list',
            );

            if (!response.ok) {
                throw new Error(
                    `Failed to fetch games: ${response.statusText}`,
                );
            }

            const rawData = await response.json();
            const transformedData = await this.transformGameData(rawData);

            // Find the game by slug in transformed data
            const game = transformedData.data.find((g: any) => g.slug === slug);

            if (game) {
                return game;
            }

            return null;
        } catch (error) {
            console.error('Error fetching game from external API:', error);
            return null;
        }
    }

    private transformDbGame(game: any) {
        return {
            ...game,
            fields: game.inputFields.map((field: any) => ({
                name: field.key,
                label: field.label,
                placeholder: field.placeholder || '',
                type: field.type,
                required: field.required,
                regex: field.regex,
                helpText: field.helpText,
                options: field.options.map((opt: any) => ({
                    label: opt.label,
                    value: opt.value,
                })),
            })),
            inputFields: undefined, // Remove the raw database field
        };
    }

    // Fetch games from external API (24payseller)
    async fetchGameListFromExternal(
        search?: string,
        category?: string,
        page: number = 1,
        pageSize: number = 20,
    ) {
        try {
            const response = await fetch(
                'https://x.24payseller.com/products/list',
            );

            if (!response.ok) {
                throw new Error(
                    `Failed to fetch games: ${response.statusText}`,
                );
            }

            const rawData = await response.json();

            // Transform the data first
            const transformedData = await this.transformGameData(rawData);

            // Filter by search (game name)
            let filteredGames = transformedData.data;
            if (search) {
                const searchLower = search.toLowerCase();
                filteredGames = filteredGames.filter((game) =>
                    game.name.toLowerCase().includes(searchLower),
                );
            }

            // Filter by category
            if (category && category !== 'all') {
                filteredGames = filteredGames.filter(
                    (game) => game.category === category,
                );
            }

            // Calculate pagination
            const totalItems = filteredGames.length;
            const totalPages = Math.ceil(totalItems / pageSize);
            const skip = (page - 1) * pageSize;
            const paginatedGames = filteredGames.slice(skip, skip + pageSize);

            return {
                data: paginatedGames,
                pagination: {
                    current_page: page,
                    page_size: pageSize,
                    total_pages: totalPages,
                    total_items: totalItems,
                },
            };
        } catch (error) {
            console.error('Error fetching games from external API:', error);
            throw error;
        }
    }

    // Transform external API response to match our format
    private async transformGameData(rawData: any) {
        // Handle different response structures
        const games = Array.isArray(rawData) ? rawData : rawData?.data || [];

        const transformedGames = await Promise.all(
            games.map(async (game: any) => ({
                id: game.id || game.key || Math.random(),
                name: game.name,
                slug: game.key,
                image: game.image || null,
                category: await this.getGameCategory(game.key),
                label: this.determineLabel(game.label || 'NONE'),
                description: game.description || null,
                packages: (game.items || []).map((item: any) => ({
                    id: item.sku || item.id || item.key,
                    name: item.name,
                    description: item.description || null,
                    count: item.name, // Use item name as count display
                    price: typeof item.price === 'string' ? parseFloat(item.price) : (item.price || 0),
                })),
                fields: (game.inputs || []).map((input: any) => ({
                    name: input.key || input.name,
                    label: input.title || input.label || input.key,
                    placeholder: input.placeholder || '',
                    type: input.type || 'text',
                    required: input.required !== false,
                    options: (input.options || []).map((opt: any) => ({
                        label: opt.label || opt.name,
                        value: opt.value || opt.key,
                    })),
                })),
            }))
        );

        return {
            data: transformedGames.filter((game) => game.name),
            pagination: rawData?.pagination || {
                current_page: 1,
                total_pages: 1,
                total_items: games.length,
            },
        };
    }

    // Get category for a game by keyword matching - mapped to 6 allowed categories
    private async getGameCategory(gameKey: string): Promise<string> {
        const keyLower = gameKey.toLowerCase();

        // Action / Shooter
        if (
            keyLower.includes('call-of-duty') ||
            keyLower.includes('blood-strike') ||
            keyLower.includes('crossfire') ||
            keyLower.includes('delta-force') ||
            keyLower.includes('free-fire') ||
            keyLower.includes('pubg') ||
            keyLower.includes('snowbreak') ||
            keyLower.includes('valorant') ||
            keyLower.includes('ballistic') ||
            keyLower.includes('arena-breakout') ||
            keyLower.includes('breakout') ||
            keyLower.includes('bleach') ||
            keyLower.includes('one-punch-man') ||
            keyLower.includes('samkok') ||
            keyLower.includes('sausage') ||
            keyLower.includes('dream-and-lethe') ||
            keyLower.includes('metal-slug')
        )
            return 'Action / Shooter';

        // MOBA / Strategy
        if (
            keyLower.includes('mobile-legends') ||
            keyLower.includes('rov') ||
            keyLower.includes('honor-of-kings') ||
            keyLower.includes('magic-chess') ||
            keyLower.includes('onmyoji-arena') ||
            keyLower.includes('draconia') ||
            keyLower.includes('haikyu') ||
            keyLower.includes('revelation-mobile')
        )
            return 'MOBA / Strategy';

        // RPG / Open World / MMO
        if (
            keyLower.includes('impact') ||
            keyLower.includes('gazer') ||
            keyLower.includes('aether') ||
            keyLower.includes('afk-journey') ||
            keyLower.includes('journey') ||
            keyLower.includes('dragon') ||
            keyLower.includes('forsaken') ||
            keyLower.includes('echo') ||
            keyLower.includes('honkai') ||
            keyLower.includes('love-and-deepspace') ||
            keyLower.includes('punishing-gray-raven') ||
            keyLower.includes('ragnarok') ||
            keyLower.includes('wuthering') ||
            keyLower.includes('zenless') ||
            keyLower.includes('jujutsu') ||
            keyLower.includes('lord-of') ||
            keyLower.includes('lineage') ||
            keyLower.includes('mu-new-dawn') ||
            keyLower.includes('rememento') ||
            keyLower.includes('silver-and-blood') ||
            keyLower.includes('where-winds-meet') ||
            keyLower.includes('crystal-of-atlan') ||
            keyLower.includes('echocalypse') ||
            keyLower.includes('mecha-break') ||
            keyLower.includes('sword-of-justice')
        )
            return 'RPG / Open World / MMO';

        // Sports / Racing
        if (
            keyLower.includes('racer') ||
            keyLower.includes('racing') ||
            keyLower.includes('race') ||
            keyLower.includes('dunk') ||
            keyLower.includes('fc-mobile') ||
            keyLower.includes('speed-drifters') ||
            keyLower.includes('top-eleven') ||
            keyLower.includes('football')
        )
            return 'Sports / Racing';

        // Social / Casual / Simulation
        if (
            keyLower.includes('bigo') ||
            keyLower.includes('eggy') ||
            keyLower.includes('hearttopia') ||
            keyLower.includes('kings-choice') ||
            keyLower.includes('marvel-snap') ||
            keyLower.includes('paw-tales') ||
            keyLower.includes('roblox') ||
            keyLower.includes('super-sus') ||
            keyLower.includes('zepeto') ||
            keyLower.includes('lordnine') ||
            keyLower.includes('ghost-story') ||
            keyLower.includes('harry-potter') ||
            keyLower.includes('magic-awakened') ||
            keyLower.includes('identity') ||
            keyLower.includes('legend-of-ymir')
        )
            return 'Social / Casual / Simulation';

        // Other - default
        return 'Other';
    }

    // Get all categories from database
    async getAllCategories(): Promise<string[]> {
        try {
            const categories = await this.categoriesService.findAll();
            return categories.map((c) => c.name);
        } catch (error) {
            console.error('Error fetching categories:', error);
            // Return default categories on error
            return ['All', 'Action', 'MOBA', 'Other', 'Racing', 'RPG', 'Shooter', 'Social'];
        }
    }

    // Determine label from tag/label field
    private determineLabel(tag: string): 'NONE' | 'HOT' | 'NEW' | 'SALE' {
        const normalizedTag = tag?.toUpperCase() || 'NONE';
        if (normalizedTag.includes('HOT')) return 'HOT';
        if (normalizedTag.includes('NEW')) return 'NEW';
        if (normalizedTag.includes('SALE')) return 'SALE';
        return 'NONE';
    }

    // Generate slug from name
    private generateSlug(name: string): string {
        return name
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-');
    }
}
