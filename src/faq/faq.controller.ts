import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { FaqService } from './faq.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@ApiTags('FAQ')
@Controller('faq')
export class FaqController {
  constructor(private faqService: FaqService) {}

  // GET /faq?category=topup — public
  @Get()
  async findAll(@Query('category') category?: string) {
    return this.faqService.findAll(category);
  }

  // GET /faq/admin — admin only
  @Get('admin')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AdminGuard)
  async findAllAdmin() {
    return this.faqService.findAllAdmin();
  }

  // POST /faq/admin
  @Post('admin')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AdminGuard)
  async create(@Body() body: {
    question: string; answer: string;
    videoUrl?: string; category?: string; order?: number;
  }) {
    return this.faqService.create(body);
  }

  // PATCH /faq/admin/:id
  @Patch('admin/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AdminGuard)
  async update(
    @Param('id') id: string,
    @Body() body: {
      question?: string; answer?: string;
      videoUrl?: string; category?: string;
      order?: number; isActive?: boolean;
    },
  ) {
    return this.faqService.update(Number(id), body);
  }

  // DELETE /faq/admin/:id
  @Delete('admin/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AdminGuard)
  async remove(@Param('id') id: string) {
    return this.faqService.remove(Number(id));
  }

  // POST /faq/:id/view — tracking (public)
  @Post(':id/view')
  async incrementView(@Param('id') id: string) {
    return this.faqService.incrementView(Number(id));
  }
}
