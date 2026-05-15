import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CategoriesService } from '../categories/categories.service';
import { ExternalGameService } from './external-game.service';

@Injectable()
export class GamesService {
    constructor(
        private prisma: PrismaService,
        private categoriesService: CategoriesService,
        private externalGameService: ExternalGameService,
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

    // เช็คสถานะ API ของเกม
    // — ใช้ ExternalGameService ที่ cache ไว้แล้ว แทนการ fetch ใหม่ทุกครั้ง
    // — ถ้าเกมมีอยู่ใน external API = Online, ไม่มี = Offline
    async checkGameApiStatus(slug: string) {
        try {
            // ลอง fetch ผ่าน ExternalGameService (มี cache 1 ชั่วโมง)
            const game = await this.externalGameService.fetchGameBySlug(slug);
            return {
                slug,
                online: game !== null,
                checkedAt: new Date(),
            };
        } catch {
            // ถ้า fetch ไม่ได้เลย (network error, timeout) ถือว่า Offline
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

    // แก้ไขข้อมูลเกม
    async updateGame(id: bigint, data: any) {
        return this.prisma.game.update({
            where: { id },
            data: {
                name: data.name,
                description: data.description,
                image: data.image,
                categoryId: data.categoryId ? BigInt(data.categoryId) : null,
                label: data.label,
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
            const game = await this.externalGameService.fetchGameBySlug(slug);
            if (!game) return null;

            return {
                id: game.key,
                name: game.name,
                slug: game.key,
                image: null,
                packages: (game.items || []).map((item: any) => ({
                    id: item.sku,
                    name: item.name,
                    price: parseFloat(item.price) || 0,
                })),
                fields: (game.inputs || []).map((input: any) => ({
                    name: input.key,
                    label: input.title || input.key,
                    placeholder: input.placeholder || '',
                    type: input.type || 'text',
                    required: true,
                    regex: input.regex ?? null,
                    options: (input.options || []).map((opt: any) => ({
                        label: opt.label,
                        value: opt.value,
                    })),
                })),
            };
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
            inputFields: undefined,
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
            const allGames = await this.externalGameService.fetchGames();
            const transformedData = await this.transformGameData(allGames);

            let filteredGames = transformedData.data;

            if (search) {
                const searchLower = search.toLowerCase();
                filteredGames = filteredGames.filter((game) =>
                    game.name.toLowerCase().includes(searchLower),
                );
            }

            if (category && category !== 'all') {
                filteredGames = filteredGames.filter(
                    (game) => game.category === category,
                );
            }

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
    private async transformGameData(games: any[]) {
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
                    count: item.name,
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
        };
    }

    // Get category for a game by keyword matching
    private async getGameCategory(gameKey: string): Promise<string> {
        const keyLower = gameKey.toLowerCase();

        if (
            keyLower.includes('call-of-duty') || keyLower.includes('blood-strike') ||
            keyLower.includes('crossfire') || keyLower.includes('delta-force') ||
            keyLower.includes('free-fire') || keyLower.includes('pubg') ||
            keyLower.includes('snowbreak') || keyLower.includes('valorant') ||
            keyLower.includes('ballistic') || keyLower.includes('arena-breakout') ||
            keyLower.includes('breakout') || keyLower.includes('bleach') ||
            keyLower.includes('one-punch-man') || keyLower.includes('samkok') ||
            keyLower.includes('sausage') || keyLower.includes('dream-and-lethe') ||
            keyLower.includes('metal-slug')
        ) return 'Action / Shooter';

        if (
            keyLower.includes('mobile-legends') || keyLower.includes('rov') ||
            keyLower.includes('honor-of-kings') || keyLower.includes('magic-chess') ||
            keyLower.includes('onmyoji-arena') || keyLower.includes('draconia') ||
            keyLower.includes('haikyu') || keyLower.includes('revelation-mobile')
        ) return 'MOBA / Strategy';

        if (
            keyLower.includes('impact') || keyLower.includes('gazer') ||
            keyLower.includes('aether') || keyLower.includes('afk-journey') ||
            keyLower.includes('journey') || keyLower.includes('dragon') ||
            keyLower.includes('forsaken') || keyLower.includes('echo') ||
            keyLower.includes('honkai') || keyLower.includes('love-and-deepspace') ||
            keyLower.includes('punishing-gray-raven') || keyLower.includes('ragnarok') ||
            keyLower.includes('wuthering') || keyLower.includes('zenless') ||
            keyLower.includes('jujutsu') || keyLower.includes('lord-of') ||
            keyLower.includes('lineage') || keyLower.includes('mu-new-dawn') ||
            keyLower.includes('rememento') || keyLower.includes('silver-and-blood') ||
            keyLower.includes('where-winds-meet') || keyLower.includes('crystal-of-atlan') ||
            keyLower.includes('echocalypse') || keyLower.includes('mecha-break') ||
            keyLower.includes('sword-of-justice')
        ) return 'RPG / Open World / MMO';

        if (
            keyLower.includes('racer') || keyLower.includes('racing') ||
            keyLower.includes('race') || keyLower.includes('dunk') ||
            keyLower.includes('fc-mobile') || keyLower.includes('speed-drifters') ||
            keyLower.includes('top-eleven') || keyLower.includes('football')
        ) return 'Sports / Racing';

        if (
            keyLower.includes('bigo') || keyLower.includes('eggy') ||
            keyLower.includes('hearttopia') || keyLower.includes('kings-choice') ||
            keyLower.includes('marvel-snap') || keyLower.includes('paw-tales') ||
            keyLower.includes('roblox') || keyLower.includes('super-sus') ||
            keyLower.includes('zepeto') || keyLower.includes('lordnine') ||
            keyLower.includes('ghost-story') || keyLower.includes('harry-potter') ||
            keyLower.includes('magic-awakened') || keyLower.includes('identity') ||
            keyLower.includes('legend-of-ymir')
        ) return 'Social / Casual / Simulation';

        return 'Other';
    }

    // Get all categories from database
    async getAllCategories(): Promise<string[]> {
        try {
            const categories = await this.categoriesService.findAll();
            return categories.map((c) => c.name);
        } catch (error) {
            console.error('Error fetching categories:', error);
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

    // ตั้งค่า UID Format (regex pattern) ของ input field ในเกม
    async updateUidFormat(gameId: bigint, data: { fieldKey: string; regex: string; helpText?: string }) {
        const game = await this.prisma.game.findUnique({ where: { id: gameId } });
        if (!game) throw new Error('ไม่พบเกมที่ระบุ');

        const field = await this.prisma.gameInputField.findUnique({
            where: { gameId_key: { gameId, key: data.fieldKey } },
        });
        if (!field) throw new Error(`ไม่พบ input field "${data.fieldKey}" ในเกมนี้`);

        try {
            new RegExp(data.regex);
        } catch {
            throw new Error('รูปแบบ Regex ไม่ถูกต้อง');
        }

        const updated = await this.prisma.gameInputField.update({
            where: { id: field.id },
            data: {
                regex: data.regex,
                helpText: data.helpText ?? field.helpText,
            },
        });

        return {
            success: true,
            gameId: gameId.toString(),
            fieldKey: data.fieldKey,
            regex: updated.regex,
            helpText: updated.helpText,
        };
    }

    // ดู UID Format ทั้งหมดของเกม
    async getUidFormats(gameId: bigint) {
        const game = await this.prisma.game.findUnique({ where: { id: gameId } });
        if (!game) throw new Error('ไม่พบเกมที่ระบุ');

        const fields = await this.prisma.gameInputField.findMany({
            where: { gameId, isActive: true },
            select: {
                id: true,
                key: true,
                label: true,
                type: true,
                regex: true,
                helpText: true,
                required: true,
            },
            orderBy: { order: 'asc' },
        });

        return {
            gameId: gameId.toString(),
            gameName: game.name,
            fields,
        };
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
