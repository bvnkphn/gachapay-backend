import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GamesService {
    constructor(private prisma: PrismaService) { }

    async findAll() {
        return this.prisma.game.findMany({
            where: { isActive: true },
            include: { packages: true },
        });
    }

    async findBySlug(slug: string) {
        return this.prisma.game.findUnique({
            where: { slug },
            include: { packages: true },
        });
    }
}
