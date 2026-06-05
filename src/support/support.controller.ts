import { Controller, Get, Post, Patch, Param, Query, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SupportService } from './support.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@ApiTags('Support')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('support/admin')
export class SupportController {
  constructor(private supportService: SupportService) {}

  // GET /support/admin/stats
  @Get('stats')
  async getStats() {
    return this.supportService.getStats();
  }

  // GET /support/admin/tickets
  // Query: page, limit, status, search, priority, dateFrom, dateTo, orderId
  @Get('tickets')
  async findAll(
    @Query('page')      page      = '1',
    @Query('limit')     limit     = '20',
    @Query('status')    status?:    string,
    @Query('search')    search?:    string,
    @Query('priority')  priority?:  string,
    @Query('dateFrom')  dateFrom?:  string,
    @Query('dateTo')    dateTo?:    string,
    @Query('orderId')   orderId?:   string,
  ) {
    return this.supportService.findAll({
      page: parseInt(page, 10), limit: parseInt(limit, 10),
      status, search, priority, dateFrom, dateTo, orderId,
    });
  }

  // GET /support/admin/tickets/:id
  @Get('tickets/:id')
  async findOne(@Param('id') id: string) {
    return this.supportService.findOne(BigInt(id));
  }

  // GET /support/admin/tickets/:id/history
  @Get('tickets/:id/history')
  async getHistory(@Param('id') id: string) {
    return this.supportService.getHistory(BigInt(id));
  }

  // PATCH /support/admin/tickets/:id/status
  @Patch('tickets/:id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @Body('note') note: string,
    @Req() req: any,
  ) {
    return this.supportService.updateStatus(BigInt(id), status, BigInt(req.user.id), note);
  }

  // PATCH /support/admin/tickets/:id/assign
  @Patch('tickets/:id/assign')
  async assign(
    @Param('id') id: string,
    @Body('assigneeId') assigneeId: string,
    @Req() req: any,
  ) {
    return this.supportService.assign(BigInt(id), BigInt(assigneeId), BigInt(req.user.id));
  }

  // POST /support/admin/tickets/:id/reply
  @Post('tickets/:id/reply')
  async reply(
    @Param('id') id: string,
    @Body('message') message: string,
    @Body('imageUrl') imageUrl: string,
    @Req() req: any,
  ) {
    return this.supportService.reply(BigInt(id), BigInt(req.user.id), message, imageUrl);
  }
}
