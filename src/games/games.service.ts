import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GamesService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: { search?: string; platform?: string; category?: string }) {
    const { search, platform, category } = query;
    const where: any = { isActive: true };

    if (search) {
      where.OR = [
        { name:        { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { category:    { contains: search, mode: 'insensitive' } },
      ];
    }
    if (platform) where.platform = { equals: platform, mode: 'insensitive' };
    if (category) where.category = { equals: category, mode: 'insensitive' };

    const games = await this.prisma.game.findMany({
      where,
      orderBy: [{ isHot: 'desc' }, { name: 'asc' }],
      include: {
        packages: {
          where:   { isActive: true },
          orderBy: { price: 'asc' },
        },
      },
    });

    return {
      data: games.map((g) => ({
        ...g,
        minPrice: g.packages[0] ? Number(g.packages[0].price) : 0,
      })),
    };
  }

  async findBySlug(slug: string) {
    const game = await this.prisma.game.findUnique({
      where:   { slug },
      include: {
        packages: {
          where:   { isActive: true },
          orderBy: { price: 'asc' },
        },
      },
    });
    if (!game) throw new NotFoundException('Game not found');
    return { data: game };
  }

  async getBanners() {
    return this.prisma.banner.findMany({
      where:   { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }
}
