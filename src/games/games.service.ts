import { Injectable } from '@nestjs/common';
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
        private prisma: PrismaService,
        private categoriesService: CategoriesService,
        private externalGameService: ExternalGameService,
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
                id: game.key, name: game.name, slug: game.key, image: null,
                packages: (game.items || []).map((item: any) => ({ id: item.sku, name: item.name, price: parseFloat(item.price) || 0 })),
                fields: (game.inputs || []).map((input: any) => ({
                    name: input.key, label: input.title || input.key, placeholder: input.placeholder || '',
                    type: input.type || 'text', required: true, regex: input.regex ?? null,
                    options: (input.options || []).map((opt: any) => ({ label: opt.label, value: opt.value })),
                })),
            };
        } catch { return null; }
    }

    private transformDbGame(game: any) {
        return {
            ...game,
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

    private async transformGameData(games: any[]) {
        const transformedGames = await Promise.all(games.map(async (game: any) => ({
            id: game.id || game.key || Math.random(), name: game.name, slug: game.key,
            image: game.image || null, category: await this.getGameCategory(game.key),
            label: this.determineLabel(game.label || 'NONE'), description: game.description || null,
            packages: (game.items || []).map((item: any) => ({
                id: item.sku || item.id || item.key, name: item.name, description: item.description || null, count: item.name,
                price: typeof item.price === 'string' ? parseFloat(item.price) : (item.price || 0),
            })),
            fields: (game.inputs || []).map((input: any) => ({
                name: input.key || input.name, label: input.title || input.label || input.key,
                placeholder: input.placeholder || '', type: input.type || 'text', required: input.required !== false,
                options: (input.options || []).map((opt: any) => ({ label: opt.label || opt.name, value: opt.value || opt.key })),
            })),
        })));
        return { data: transformedGames.filter(g => g.name) };
    }

    private async getGameCategory(gameKey: string): Promise<string> {
        const k = gameKey.toLowerCase();
        if (['call-of-duty','blood-strike','crossfire','delta-force','free-fire','pubg','snowbreak','valorant','ballistic','arena-breakout','bleach','one-punch-man','metal-slug'].some(v => k.includes(v))) return 'Action / Shooter';
        if (['mobile-legends','rov','honor-of-kings','magic-chess','onmyoji-arena','draconia','haikyu'].some(v => k.includes(v))) return 'MOBA / Strategy';
        if (['impact','honkai','wuthering','zenless','genshin','afk-journey','ragnarok','lineage','jujutsu','echocalypse','mecha-break'].some(v => k.includes(v))) return 'RPG / Open World / MMO';
        if (['racer','racing','race','fc-mobile','top-eleven','football','dunk'].some(v => k.includes(v))) return 'Sports / Racing';
        if (['bigo','roblox','zepeto','super-sus','marvel-snap','identity','hearttopia'].some(v => k.includes(v))) return 'Social / Casual / Simulation';
        return 'Other';
    }

    async getAllCategories(): Promise<string[]> {
        try {
            const categories = await this.categoriesService.findAll();
            return categories.map(c => c.name);
        } catch { return ['All', 'Action', 'MOBA', 'Other', 'Racing', 'RPG', 'Shooter', 'Social']; }
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
