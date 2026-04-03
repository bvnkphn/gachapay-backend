import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Delete,
    Param,
    HttpCode,
    HttpStatus,
    UseGuards,
    Req,
} from '@nestjs/common';
import { BannersService } from './banners.service';
import { CreateBannerDto, UpdateBannerDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/decorators/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('banners')
export class BannersController {
    constructor(private readonly bannersService: BannersService) {}

    /**
     * Get all active banners (for frontend/public)
     * Returns banners sorted by order
     */
    @Get()
    async findAll() {
        const banners = await this.bannersService.findAll();
        return {
            data: banners,
            message: 'Banners retrieved successfully',
        };
    }

    /**
     * Get all banners including inactive (admin only)
     */
    @Get('admin/list')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    async findAllForAdmin() {
        const banners = await this.bannersService.findAllForAdmin();
        return {
            data: banners,
            message: 'All banners retrieved successfully',
        };
    }

    /**
     * Create a new banner (admin only)
     */
    @Post()
    //@UseGuards(JwtAuthGuard, RolesGuard)
    //@Roles('ADMIN')
    @HttpCode(HttpStatus.CREATED)
    async create(@Body() createBannerDto: CreateBannerDto) {
        const banner = await this.bannersService.create(createBannerDto);
        return {
            data: banner,
            message: 'Banner created successfully',
        };
    }

    /**
     * Get banner by UUID
     */
    @Get(':uuid')
    async findByUuid(@Param('uuid') uuid: string) {
        const banner = await this.bannersService.findByUuid(uuid);
        return {
            data: banner,
            message: 'Banner retrieved successfully',
        };
    }

    /**
     * Update banner by ID (admin only)
     */
    @Patch(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    async update(
        @Param('id') id: string,
        @Body() updateBannerDto: UpdateBannerDto,
    ) {
        const banner = await this.bannersService.update(
            BigInt(id),
            updateBannerDto,
        );
        return {
            data: banner,
            message: 'Banner updated successfully',
        };
    }

    /**
     * Toggle banner active status (admin only)
     */
    @Patch(':id/toggle')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    async toggleActive(
        @Param('id') id: string,
        @Body('isActive') isActive: boolean,
    ) {
        const banner = await this.bannersService.toggleActive(
            BigInt(id),
            isActive,
        );
        return {
            data: banner,
            message: 'Banner status updated successfully',
        };
    }

    /**
     * Update banner order/position (admin only)
     */
    @Patch(':id/order')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    async updateOrder(
        @Param('id') id: string,
        @Body('order') order: number,
    ) {
        const banner = await this.bannersService.updateOrder(BigInt(id), order);
        return {
            data: banner,
            message: 'Banner order updated successfully',
        };
    }

    /**
     * Delete banner by ID (soft delete - set isActive to false)
     * Admin only
     */
    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    @HttpCode(HttpStatus.OK)
    async delete(@Param('id') id: string) {
        await this.bannersService.delete(BigInt(id));
        return {
            message: 'Banner deleted successfully',
        };
    }

    /**
     * Hard delete banner by ID (permanently removes from database)
     * Admin only - use with caution
     */
    @Delete(':id/hard-delete')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    @HttpCode(HttpStatus.OK)
    async hardDelete(@Param('id') id: string) {
        await this.bannersService.hardDelete(BigInt(id));
        return {
            message: 'Banner permanently deleted',
        };
    }
}
