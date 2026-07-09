import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FaqService {
  constructor(private readonly prisma: PrismaService) {}

  // ── GET /faq — public ─────────────────────────────────────────
  async findAll(category?: string) {
    return this.prisma.faqItem.findMany({
      where: {
        isActive: true,
        ...(category && category !== 'all' ? { category } : {}),
      },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true, question: true, answer: true,
        videoUrl: true, category: true, order: true, viewCount: true,
      },
    });
  }

  // ── GET /faq/admin — admin ────────────────────────────────────
  async findAllAdmin() {
    return this.prisma.faqItem.findMany({
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });
  }

  // ── POST /faq/admin ───────────────────────────────────────────
  async create(data: {
    question: string; answer: string;
    videoUrl?: string; category?: string; order?: number;
  }) {
    return this.prisma.faqItem.create({ data });
  }

  // ── PATCH /faq/admin/:id ──────────────────────────────────────
  async update(id: number, data: {
    question?: string; answer?: string;
    videoUrl?: string; category?: string;
    order?: number; isActive?: boolean;
  }) {
    const faq = await this.prisma.faqItem.findUnique({ where: { id } });
    if (!faq) throw new NotFoundException('ไม่พบ FAQ');
    return this.prisma.faqItem.update({ where: { id }, data });
  }

  // ── DELETE /faq/admin/:id ─────────────────────────────────────
  async remove(id: number) {
    const faq = await this.prisma.faqItem.findUnique({ where: { id } });
    if (!faq) throw new NotFoundException('ไม่พบ FAQ');
    return this.prisma.faqItem.delete({ where: { id } });
  }

  // ── POST /faq/:id/view — tracking ────────────────────────────
  async incrementView(id: number) {
    const faq = await this.prisma.faqItem.findUnique({ where: { id } });
    if (!faq) throw new NotFoundException('ไม่พบ FAQ');
    return this.prisma.faqItem.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
      select: { id: true, viewCount: true },
    });
  }
}
