import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CategoriesService } from '../categories/categories.service';
import { ExternalGameService } from './external-game.service';

const GAME_INCLUDE = {
    include: {
        category: true,
        packages: { where: { isActive: true } },
        inputFields: {
            where: { isActive: true },
            include: { options: { where: { isActive: true } } },
            orderBy: { order: 'asc' as const },
        },
    },
};

@Injectable()
export class GamesService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly categoriesService: CategoriesService,
        private readonly externalGameService: ExternalGameService,
    ) {}

    // สำหรับ user ทั่วไป — เฉพาะที่ isActive: true
    async findAll() {
        return this.prisma.game.findMany({
            where: { isActive: true },
            ...GAME_INCLUDE,
        });
    }

    // สำหรับ Admin — ดึงทุกเกม ไม่กรองสถานะ
    async findAllIncludingInactive() {
        return this.prisma.game.findMany({
            orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
            ...GAME_INCLUDE,
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
    async checkGameApiStatus(slug: string) {
        try {
            const game = await this.externalGameService.fetchGameBySlug(slug);
            return { slug, online: game !== null, checkedAt: new Date() };
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

        if (dbGame) return this.transformDbGame(dbGame);

        try {
            const game = await this.externalGameService.fetchGameBySlug(slug);
            if (!game) return null;
            return {
                id: game.key,
                name: game.name,
                slug: game.key,
                image: this.getGameImageUrl(game.key),
                packages: (game.items || []).map((item: any) => ({
                    id: item.sku,
                    name: item.name,
                    price: Number.parseFloat(item.price) || 0,
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
        } catch { return null; }
    }

    private formatImageUrl(url?: string): string {
        if (!url) return '';
        if (url.startsWith('http') || url.startsWith('data:')) return url;
        const base = process.env.BACKEND_URL || 'http://localhost:3001';
        return `${base.replace(/\/$/, '')}${url}`;
    }

    private transformDbGame(game: any) {
        const rawImage = game.image || this.getGameImageUrl(game.slug);
        const now = new Date();
        const formattedPackages = (game.packages || []).map((pkg: any) => {
            const price = Number(pkg.price);
            const cost = Number(pkg.cost ?? 0);
            const originalPrice = Number(pkg.originalPrice) || price;
            const flashSalePrice = pkg.flashSalePrice ? Number(pkg.flashSalePrice) : null;
            const isFlashSaleActive =
                flashSalePrice !== null &&
                pkg.flashSaleStart !== null &&
                pkg.flashSaleEnd !== null &&
                now >= new Date(pkg.flashSaleStart) &&
                now <= new Date(pkg.flashSaleEnd);

            return {
                id: pkg.id.toString(),
                name: pkg.name,
                description: pkg.description,
                sku: pkg.sku,
                price,
                originalPrice,
                cost,
                discount: pkg.discount,
                effectivePrice: isFlashSaleActive ? flashSalePrice! : price,
                flashSale: {
                    isActive: isFlashSaleActive,
                    price: flashSalePrice,
                    start: pkg.flashSaleStart,
                    end: pkg.flashSaleEnd,
                }
            };
        });

        return {
            ...game,
            image: this.formatImageUrl(rawImage),
            packages: formattedPackages,
            fields: game.inputFields.map((field: any) => ({
                name: field.key, label: field.label, placeholder: field.placeholder || '',
                type: field.type, required: field.required, regex: field.regex, helpText: field.helpText,
                options: field.options.map((opt: any) => ({ label: opt.label, value: opt.value })),
            })),
            inputFields: undefined,
        };
    }

    async fetchGameListFromExternal(search?: string, category?: string, page: number = 1, pageSize: number = 20) {
        try {
            const allGames = await this.externalGameService.fetchGames();
            const transformedData = await this.transformGameData(allGames);
            let filteredGames = transformedData.data;
            if (search) { const s = search.toLowerCase(); filteredGames = filteredGames.filter(g => g.name.toLowerCase().includes(s)); }
            if (category && category !== 'all') filteredGames = filteredGames.filter(g => g.category === category);
            const totalItems = filteredGames.length;
            const totalPages = Math.ceil(totalItems / pageSize);
            const paginatedGames = filteredGames.slice((page - 1) * pageSize, page * pageSize);
            return { data: paginatedGames, pagination: { current_page: page, page_size: pageSize, total_pages: totalPages, total_items: totalItems } };
        } catch (error) { console.error('Error fetching games:', error); throw error; }
    }

    // ── Verified game image map (HTTP 200 confirmed) ───────────────────
    // External API (24payseller) does NOT include an image field.
    // Only games with verified Codashop CDN images are listed here.
    // Games NOT in this map will be hidden from the browse list but
    // remain accessible via direct slug URL for purchase.
    public static readonly GAME_IMAGES: Record<string, string> = {
        // ── Free Fire (all regions share the same tile) ──
        'free-fire':            'https://cdn1.codashop.com/S/content/mobile/images/product-tiles/Garena_Free_Fire_178x178.jpg',
        'free-fire-i':          'https://cdn1.codashop.com/S/content/mobile/images/product-tiles/Garena_Free_Fire_178x178.jpg',
        'free-fire-my':         'https://cdn1.codashop.com/S/content/mobile/images/product-tiles/Garena_Free_Fire_178x178.jpg',
        'free-fire-sg':         'https://cdn1.codashop.com/S/content/mobile/images/product-tiles/Garena_Free_Fire_178x178.jpg',
        'garena-free-fire-vip': 'https://cdn1.codashop.com/S/content/mobile/images/product-tiles/Garena_Free_Fire_178x178.jpg',
        'gift-free-fire':       'https://cdn1.codashop.com/S/content/mobile/images/product-tiles/Garena_Free_Fire_178x178.jpg',

        // ── Valorant (all regions) ──
        'valorant-thailand':    'https://cdn1.codashop.com/S/content/mobile/images/product-tiles/valorant_tile.jpg',
        'valorant-indonesia':   'https://cdn1.codashop.com/S/content/mobile/images/product-tiles/valorant_tile.jpg',
        'valorant-malaysia':    'https://cdn1.codashop.com/S/content/mobile/images/product-tiles/valorant_tile.jpg',
        'valorant-philipines':  'https://cdn1.codashop.com/S/content/mobile/images/product-tiles/valorant_tile.jpg',
        'valorant-singapore':   'https://cdn1.codashop.com/S/content/mobile/images/product-tiles/valorant_tile.jpg',

        // ── Action / Shooter ──
        'blood-strike':         'https://cdn1.codashop.com/S/content/mobile/images/product-tiles/blood_strike_tile.png',
        'blood-strike-flashsale': 'https://cdn1.codashop.com/S/content/mobile/images/product-tiles/blood_strike_tile.png',
        'pubg-mobile-global':   'https://cdn1.codashop.com/S/content/mobile/images/product-tiles/pubgm_tile_aug2024.jpg',
        'ballistic-hero':       'https://cdn1.codashop.com/S/content/mobile/images/product-tiles/BallisticHeroVNG_TH_icon.png',
        'one-punch-man-strongest': 'https://cdn1.codashop.com/S/content/mobile/images/product-tiles/opm_new2_tile.png',

        // ── MOBA / Strategy ──
        'mobile-legends-global':        'https://cdn1.codashop.com/S/content/mobile/images/product-tiles/MLBB-2025-tiles-178x178.jpg',
        'mobile-legends-global-v2':     'https://cdn1.codashop.com/S/content/mobile/images/product-tiles/MLBB-2025-tiles-178x178.jpg',
        'mobile-legends-global-v3':     'https://cdn1.codashop.com/S/content/mobile/images/product-tiles/MLBB-2025-tiles-178x178.jpg',
        'mobile-legends-indonesia':     'https://cdn1.codashop.com/S/content/mobile/images/product-tiles/MLBB-2025-tiles-178x178.jpg',
        'mobile-legends-malaysia':      'https://cdn1.codashop.com/S/content/mobile/images/product-tiles/MLBB-2025-tiles-178x178.jpg',
        'mobile-legends-russia':        'https://cdn1.codashop.com/S/content/mobile/images/product-tiles/MLBB-2025-tiles-178x178.jpg',
        'mobile-legends-singapore':     'https://cdn1.codashop.com/S/content/mobile/images/product-tiles/MLBB-2025-tiles-178x178.jpg',
        'mobile-legends-turkey':        'https://cdn1.codashop.com/S/content/mobile/images/product-tiles/MLBB-2025-tiles-178x178.jpg',
        'mobile-legends-united-states': 'https://cdn1.codashop.com/S/content/mobile/images/product-tiles/MLBB-2025-tiles-178x178.jpg',
        'mlbb-php-flashsale':           'https://cdn1.codashop.com/S/content/mobile/images/product-tiles/MLBB-2025-tiles-178x178.jpg',
        'rov-mobile':           'https://cdn1.codashop.com/S/content/mobile/images/product-tiles/Garena_RoV_Arena_of_Valor_178x178.jpg',

        // ── RPG / Open World / MMO ──
        'genshin-impact':       'https://cdn1.codashop.com/S/content/mobile/images/product-tiles/genshinimpact_tile.jpg',
        'genshin-impact-th':    'https://cdn1.codashop.com/S/content/mobile/images/product-tiles/genshinimpact_tile.jpg',
        'honkai-star-rail':     'https://cdn1.codashop.com/S/content/mobile/images/product-tiles/hsr_tile.jpg',
        'ragnarok-crush-s':     'https://cdn1.codashop.com/S/content/mobile/images/product-tiles/ragnarok_tile.jpg',
        'rom-classic':          'https://cdn1.codashop.com/S/content/mobile/images/product-tiles/ragnarok_tile.jpg',
        'echocalypse':          'https://cdn1.codashop.com/S/content/mobile/images/product-tiles/echocalypse_tile.jpg',
        'revelation-mobile-infinite-journey': 'https://cdn1.codashop.com/S/content/mobile/images/product-tiles/vng_revalation_tile.png',
        'kings-choice':         'https://cdn1.codashop.com/S/content/mobile/images/product-tiles/kings_choice_tile.jpg',

        // ── Sports / Racing ──
        'fc-mobile-thailand':   'https://cdn1.codashop.com/S/content/mobile/images/product-tiles/EA_FC_Oct_2025.png',
        'ace-racer':            'https://cdn1.codashop.com/S/content/mobile/images/product-tiles/tdr-new-tile.jpg',

        // ── Social / Casual ──
        'bigo-live':            'https://cdn1.codashop.com/S/content/mobile/images/product-tiles/bigo_live_tile.jpg',
        'roblox-login':         'https://cdn1.codashop.com/S/content/mobile/images/product-tiles/NEWmcgg.PNG',
        'zepeto':               'https://cdn1.codashop.com/S/content/mobile/images/product-tiles/zepeto_tile.png',
        'identityv-global':     'https://cdn1.codashop.com/S/content/mobile/images/product-tiles/Identity_V_tile.jpg',

        // ── Other ──
        'steam':                'https://cdn1.codashop.com/S/content/mobile/images/product-tiles/steam_tile.jpg',
        'discord':              'https://cdn1.codashop.com/S/content/mobile/images/product-tiles/Discord_Tile_178x178.jpg',
    };

    /**
     * Get image URL for a game by its key.
     * Returns null if no verified CDN image exists.
     */
    private getGameImageUrl(gameKey: string): string | null {
        // 1. Exact match
        if (GamesService.GAME_IMAGES[gameKey]) {
            return GamesService.GAME_IMAGES[gameKey];
        }
        // 2. Partial match — find the first key that's a substring of the gameKey
        const partialMatch = Object.keys(GamesService.GAME_IMAGES).find(k => gameKey.includes(k) || k.includes(gameKey));
        if (partialMatch) {
            return GamesService.GAME_IMAGES[partialMatch];
        }
        return null;
    }

    private async transformGameData(games: any[]) {
        const transformedGames = await Promise.all(games.map(async (game: any) => {
            const dbGame = await this.prisma.game.findUnique({
                where: { slug: game.key },
                include: {
                    category: true,
                    packages: { where: { isActive: true } }
                }
            });
            const isActive = dbGame ? dbGame.isActive : true;
            const dbPackages = dbGame ? dbGame.packages : [];
            const now = new Date();

            const transformedPackages = (game.items || []).map((item: any) => {
                const sku = item.sku || item.id || item.key;
                const dbPkg = dbPackages.find(p => p.sku === sku);

                if (dbPkg) {
                    const price = Number(dbPkg.price);
                    const originalPrice = Number(dbPkg.originalPrice) || price;
                    const flashSalePrice = dbPkg.flashSalePrice ? Number(dbPkg.flashSalePrice) : null;
                    const isFlashSaleActive =
                        flashSalePrice !== null &&
                        dbPkg.flashSaleStart !== null &&
                        dbPkg.flashSaleEnd !== null &&
                        now >= new Date(dbPkg.flashSaleStart) &&
                        now <= new Date(dbPkg.flashSaleEnd);

                    return {
                        id: dbPkg.id.toString(),
                        name: dbPkg.name,
                        description: dbPkg.description || null,
                        count: dbPkg.name,
                        price: price,
                        originalPrice: originalPrice,
                        effectivePrice: isFlashSaleActive ? flashSalePrice! : price,
                        flashSale: {
                            isActive: isFlashSaleActive,
                            price: flashSalePrice,
                            start: dbPkg.flashSaleStart,
                            end: dbPkg.flashSaleEnd,
                        }
                    };
                }

                const price = typeof item.price === 'string' ? Number.parseFloat(item.price) : (item.price || 0);
                return {
                    id: sku,
                    name: item.name,
                    description: item.description || null,
                    count: item.name,
                    price: price,
                    originalPrice: price,
                    effectivePrice: price,
                    flashSale: {
                        isActive: false,
                        price: null,
                        start: null,
                        end: null
                    }
                };
            });

            return {
                id: dbGame ? dbGame.id.toString() : (game.id || game.key || randomBytes(4).toString('hex')),
                name: dbGame ? dbGame.name : game.name,
                slug: game.key,
                image: this.formatImageUrl(dbGame?.image || game.image || this.getGameImageUrl(game.key)),
                category: dbGame?.category?.name || await this.getGameCategory(game.key),
                label: dbGame ? dbGame.label : this.determineLabel(game.label || 'NONE'),
                description: dbGame?.description || game.description || null,
                isActive,
                packages: transformedPackages,
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
            };
        }));
        return { data: transformedGames.filter(g => g && g.name && g.isActive) };
    }

    private async getGameCategory(gameKey: string): Promise<string> {
        const k = gameKey.toLowerCase();
        
        // Action / Shooter / Battle Royale / FPS
        if ([
            'call-of-duty', 'blood-strike', 'crossfire', 'delta-force', 'free-fire', 'pubg', 
            'snowbreak', 'valorant', 'ballistic', 'arenabreakout', 'arena-breakout', 'bleach', 
            'one-punch-man', 'metal-slug', 'sausage-man', 'crossfire-legends', 'bleach-soul-resonance', 
            'lord-of-nazarick', 'lordnine'
        ].some(v => k.includes(v))) {
            return 'Action / Shooter';
        }
        
        // MOBA / Strategy
        if ([
            'mobile-legends', 'rov', 'honor-of-kings', 'magic-chess', 'magicchess', 'onmyoji-arena', 
            'draconia', 'haikyu', 'dunk-city-dynasty'
        ].some(v => k.includes(v))) {
            return 'MOBA / Strategy';
        }
        
        // RPG / Open World / MMO
        if ([
            'impact', 'honkai', 'wuthering', 'zenless', 'genshin', 'afk-journey', 'ragnarok', 
            'lineage', 'jujutsu', 'echocalypse', 'mecha-break', 'aether-gazer', 'crystal-of-atlan', 
            'dragon-nest', 'dragon-raja', 'dragonica', 'dream-and-lethe', 'forsaken-world', 
            'ghost-story', 'kings-choice', 'magic-awakened', 'mu-new-dawn', 'revelation-mobile', 
            'rememento', 'silver-and-blood', 'where-winds-meet'
        ].some(v => k.includes(v))) {
            return 'RPG / Open World / MMO';
        }
        
        // Sports / Racing
        if ([
            'racer', 'racing', 'race', 'fc-mobile', 'top-eleven', 'football', 'dunk', 'speed-drifters'
        ].some(v => k.includes(v))) {
            return 'Sports / Racing';
        }
        
        // Social / Casual / Simulation
        if ([
            'bigo', 'roblox', 'zepeto', 'super-sus', 'marvel-snap', 'identity', 'hearttopia', 
            'eggy-party', 'poppo', 'yalla'
        ].some(v => k.includes(v))) {
            return 'Social / Casual / Simulation';
        }
        
        return 'Other';
    }

    async getAllCategories(): Promise<any[]> {
        // 1. Ensure the 6 official categories exist in DB
        try {
            await this.categoriesService.seedDefaultCategories();
        } catch (err) {
            console.error('Failed to seed categories automatically:', err);
        }

        // 2. Fetch all categories currently in DB
        const allDbCategories = await this.prisma.gameCategory.findMany({
            orderBy: { order: 'asc' },
        });

        // The official slugs
        const officialSlugs = [
            'action-shooter',
            'rpg-open-world-mmo',
            'moba-strategy',
            'sports-racing',
            'social-casual-simulation',
            'other'
        ];

        // Find the official category records
        const officialCats = allDbCategories.filter(c => officialSlugs.includes(c.slug));
        const officialMapBySlug = new Map(officialCats.map(c => [c.slug, c.id]));

        // Find the old categories to clean up
        const oldCats = allDbCategories.filter(c => !officialSlugs.includes(c.slug));

        if (oldCats.length > 0) {
            console.log(`Migrating ${oldCats.length} legacy categories...`);
            for (const oldCat of oldCats) {
                // Determine target official slug
                let targetSlug = 'other';
                const nameLower = oldCat.name.toLowerCase();
                if (nameLower.includes('moba')) {
                    targetSlug = 'moba-strategy';
                } else if (nameLower.includes('rpg') || nameLower.includes('mmo') || nameLower.includes('role')) {
                    targetSlug = 'rpg-open-world-mmo';
                } else if (nameLower.includes('shooter') || nameLower.includes('action') || nameLower.includes('battle royale') || nameLower.includes('fps')) {
                    targetSlug = 'action-shooter';
                } else if (nameLower.includes('sport') || nameLower.includes('race') || nameLower.includes('racing')) {
                    targetSlug = 'sports-racing';
                } else if (nameLower.includes('casual') || nameLower.includes('social') || nameLower.includes('simulation')) {
                    targetSlug = 'social-casual-simulation';
                }

                const targetId = officialMapBySlug.get(targetSlug);
                if (targetId) {
                    // Update games using the old category to use the target official category
                    await this.prisma.game.updateMany({
                        where: { categoryId: oldCat.id },
                        data: { categoryId: targetId },
                    });
                }

                // Delete the old category record
                await this.prisma.gameCategory.delete({
                    where: { id: oldCat.id },
                });
            }

            // Fetch the clean list again
            const cleanCategories = await this.prisma.gameCategory.findMany({
                where: { isActive: true },
                orderBy: { order: 'asc' },
            });
            return cleanCategories.map(c => ({
                id: c.id.toString(),
                name: c.name,
                slug: c.slug,
                description: c.description || '',
            }));
        }

        return officialCats.map(c => ({
            id: c.id.toString(),
            name: c.name,
            slug: c.slug,
            description: c.description || '',
        }));
    }


    private determineLabel(tag: string): 'NONE' | 'HOT' | 'NEW' | 'SALE' {
        const t = tag?.toUpperCase() || 'NONE';
        if (t.includes('HOT')) return 'HOT';
        if (t.includes('NEW')) return 'NEW';
        if (t.includes('SALE')) return 'SALE';
        return 'NONE';
    }

    async updateUidFormat(gameId: bigint, data: { fieldKey: string; regex: string; helpText?: string }) {
        const game = await this.prisma.game.findUnique({ where: { id: gameId } });
        if (!game) throw new Error('ไม่พบเกมที่ระบุ');
        const field = await this.prisma.gameInputField.findUnique({ where: { gameId_key: { gameId, key: data.fieldKey } } });
        if (!field) throw new Error(`ไม่พบ input field "${data.fieldKey}" ในเกมนี้`);
        try { new RegExp(data.regex); } catch { throw new Error('รูปแบบ Regex ไม่ถูกต้อง'); }
        const updated = await this.prisma.gameInputField.update({ where: { id: field.id }, data: { regex: data.regex, helpText: data.helpText ?? field.helpText } });
        return { success: true, gameId: gameId.toString(), fieldKey: data.fieldKey, regex: updated.regex, helpText: updated.helpText };
    }

    async getUidFormats(gameId: bigint) {
        const game = await this.prisma.game.findUnique({ where: { id: gameId } });
        if (!game) throw new Error('ไม่พบเกมที่ระบุ');
        const fields = await this.prisma.gameInputField.findMany({
            where: { gameId, isActive: true },
            select: { id: true, key: true, label: true, type: true, regex: true, helpText: true, required: true },
            orderBy: { order: 'asc' },
        });
        return { gameId: gameId.toString(), gameName: game.name, fields };
    }

    private generateSlug(name: string): string {
        return name.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
    }
}
