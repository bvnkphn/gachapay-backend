import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common';
import { CategoriesService } from './categories.service';

@Controller('categories')
export class CategoriesController {
    constructor(private categoriesService: CategoriesService) {}

    // Get all categories
    @Get()
    async findAll() {
        const categories = await this.categoriesService.findAll();
        return { data: categories };
    }

    // Get category by ID
    @Get(':id')
    async findById(@Param('id') id: string) {
        const bigIntId = parseInt(id, 10);
        return this.categoriesService.findById(BigInt(bigIntId));
    }

    // Create category
    @Post()
    async create(
        @Body()
        data: {
            name: string;
            slug: string;
            description?: string;
            icon?: string;
            order?: number;
        },
    ) {
        return this.categoriesService.create(data);
    }

    // Update category
    @Patch(':id')
    async update(
        @Param('id') id: string,
        @Body()
        data: {
            name?: string;
            description?: string;
            icon?: string;
            order?: number;
            isActive?: boolean;
        },
    ) {
        const bigIntId = parseInt(id, 10);
        return this.categoriesService.update(BigInt(bigIntId), data);
    }

    // Delete category
    @Delete(':id')
    async delete(@Param('id') id: string) {
        const bigIntId = parseInt(id, 10);
        return this.categoriesService.delete(BigInt(bigIntId));
    }

    // Seed default categories
    @Post('seed/defaults')
    async seedDefaultCategories() {
        const categories = await this.categoriesService.seedDefaultCategories();
        return { message: 'Categories seeded successfully', data: categories };
    }
}
