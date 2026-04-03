import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoriesService {
    constructor(private prisma: PrismaService) {}

    // Get all categories
    async findAll() {
        return this.prisma.gameCategory.findMany({
            where: { isActive: true },
            orderBy: { order: 'asc' },
            include: { _count: { select: { games: true } } },
        });
    }

    
    // Get category by ID
    async findById(id: bigint) {
        return this.prisma.gameCategory.findUnique({
            where: { id },
            include: { games: { where: { isActive: true } } },
        });
    }

    // Get category by slug
    async findBySlug(slug: string) {
        return this.prisma.gameCategory.findUnique({
            where: { slug },
            include: { games: { where: { isActive: true } } },
        });
    }

    // Create category
    async create(data: {
        name: string;
        slug: string;
        description?: string;
        icon?: string;
        order?: number;
    }) {
        return this.prisma.gameCategory.create({
            data,
        });
    }

    // Update category
    async update(
        id: bigint,
        data: {
            name?: string;
            description?: string;
            icon?: string;
            order?: number;
            isActive?: boolean;
        },
    ) {
        return this.prisma.gameCategory.update({
            where: { id },
            data,
        });
    }

    // Delete category
    async delete(id: bigint) {
        return this.prisma.gameCategory.delete({
            where: { id },
        });
    }

    // Seed default categories
    async seedDefaultCategories() {
        const defaultCategories = [
            {
                name: 'Action / Shooter',
                slug: 'action-shooter',
                description: 'Shooting and action games (ยิงปืน/ต่อสู้)',
                icon: 'zap',
                order: 0,
            },
            {
                name: 'RPG / Open World / MMO',
                slug: 'rpg-open-world-mmo',
                description: 'Role Playing Games (ผจญภัย/เก็บเลเวล)',
                icon: 'sword',
                order: 1,
            },
            {
                name: 'MOBA / Strategy',
                slug: 'moba-strategy',
                description: 'Multiplayer Online Battle Arena (วางแผน/ทำลายฐาน)',
                icon: 'shield',
                order: 2,
            },
            {
                name: 'Sports / Racing',
                slug: 'sports-racing',
                description: 'Sports and racing games (กีฬา/แข่งรถ)',
                icon: 'activity',
                order: 3,
            },
            {
                name: 'Social / Casual / Simulation',
                slug: 'social-casual-simulation',
                description: 'Social and casual games (จำลองชีวิต/จีบหนุ่ม/น่ารัก)',
                icon: 'users',
                order: 4,
            },
            {
                name: 'Other',
                slug: 'other',
                description: 'Other games and platforms (แนวอื่นๆ และแพลตฟอร์ม)',
                icon: 'help-circle',
                order: 5,
            },
        ];

        for (const category of defaultCategories) {
            await this.prisma.gameCategory.upsert({
                where: { slug: category.slug },
                update: {},
                create: category,
            });
        }

        return defaultCategories;
    }
}
