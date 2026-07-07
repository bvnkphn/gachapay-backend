import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBannerDto, UpdateBannerDto } from './dto';

@Injectable()
export class BannersService {
    constructor(private prisma: PrismaService) {}

    /**
     * Create a new banner
     */
    async create(createBannerDto: CreateBannerDto) {
        return this.prisma.banner.create({
            data: {
                image: createBannerDto.image,
                title: createBannerDto.title,
                description: createBannerDto.description,
                redirectUrl: createBannerDto.redirectUrl,
                order: createBannerDto.order ?? 0,
                isActive: createBannerDto.isActive ?? true,
            },
        });
    }

    /**
     * Get all active banners sorted by order
     */
    async findAll() {
        return this.prisma.banner.findMany({
            where: { isActive: true },
            orderBy: { order: 'asc' },
        });
    }

    /**
     * Get all banners (including inactive) sorted by order
     * Used for admin panel
     */
    async findAllForAdmin() {
        return this.prisma.banner.findMany({
            orderBy: { order: 'asc' },
        });
    }

    /**
     * Get banner by UUID
     */
    async findByUuid(uuid: string) {
        return this.prisma.banner.findUnique({
            where: { uuid },
        });
    }

    /**
     * Get banner by ID
     */
    async findById(id: bigint) {
        return this.prisma.banner.findUnique({
            where: { id },
        });
    }

    /**
     * Update banner by ID
     */
    async update(id: bigint, updateBannerDto: UpdateBannerDto) {
        return this.prisma.banner.update({
            where: { id },
            data: {
                image: updateBannerDto.image,
                title: updateBannerDto.title,
                description: updateBannerDto.description,
                redirectUrl: updateBannerDto.redirectUrl,
                order: updateBannerDto.order,
                isActive: updateBannerDto.isActive,
            },
        });
    }

    /**
     * Delete banner by ID (soft delete - set isActive to false)
     */
    async delete(id: bigint) {
        return this.prisma.banner.update({
            where: { id },
            data: { isActive: false },
        });
    }

    /**
     * Hard delete banner by ID
     */
    async hardDelete(id: bigint) {
        return this.prisma.banner.delete({
            where: { id },
        });
    }

    /**
     * Update banner order/position
     */
    async updateOrder(id: bigint, order: number) {
        return this.prisma.banner.update({
            where: { id },
            data: { order },
        });
    }

    /**
     * Toggle banner active status
     */
    async toggleActive(id: bigint, isActive: boolean) {
        return this.prisma.banner.update({
            where: { id },
            data: { isActive },
        });
    }
}
