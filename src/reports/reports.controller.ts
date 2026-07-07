import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('reports')
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  // GET /reports/summary?period=month
  @Get('summary')
  async getSummary(
    @Query('period')   period   = 'month',
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo')   dateTo?:  string,
  ) {
    return this.reportsService.getSummary(period as any, dateFrom, dateTo);
  }

  // GET /reports/financial?period=month
  @Get('financial')
  async getFinancial(
    @Query('period')   period   = 'month',
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo')   dateTo?:  string,
  ) {
    return this.reportsService.getFinancial(period as any, dateFrom, dateTo);
  }

  // GET /reports/transactions?period=month&page=1&limit=20
  @Get('transactions')
  async getTransactions(
    @Query('period')   period   = 'month',
    @Query('page')     page     = '1',
    @Query('limit')    limit    = '20',
    @Query('status')   status?:  string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo')   dateTo?:  string,
  ) {
    return this.reportsService.getTransactions({
      period: period as any,
      page:   parseInt(page, 10),
      limit:  parseInt(limit, 10),
      status, dateFrom, dateTo,
    });
  }

  // GET /reports/export?period=month&format=xlsx
  @Get('export')
  async exportReport(
    @Query('period')   period   = 'month',
    @Query('format')   format   = 'xlsx',
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo')   dateTo?:  string,
    @Res() res?: Response,
  ) {
    const buf = await this.reportsService.exportReport(period as any, format as any, dateFrom, dateTo);
    const ext  = format === 'xlsx' ? 'xlsx' : 'csv';
    const mime = format === 'xlsx'
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : 'text/csv;charset=utf-8';
    const date = new Date().toISOString().slice(0, 10);
    res!.setHeader('Content-Type', mime);
    res!.setHeader('Content-Disposition', `attachment; filename="report_${period}_${date}.${ext}"`);
    res!.send(buf);
  }
}
