import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ApiCreditService } from './api-credit.service';

@Controller('api-credit')
@UseGuards(JwtAuthGuard, AdminGuard)
export class ApiCreditController {
  constructor(private readonly apiCreditService: ApiCreditService) {}

  // ── GET /api-credit/summary ─────────────────────────────────────
  @Get('summary')
  getSummary() {
    return this.apiCreditService.getSummary();
  }

  // ── GET /api-credit/providers ───────────────────────────────────
  @Get('providers')
  getProviders() {
    return this.apiCreditService.getProviders();
  }

  // ── POST /api-credit/providers ──────────────────────────────────
  @Post('providers')
  createProvider(
    @Body()
    body: {
      name: string;
      code: string;
      description?: string;
      apiBaseUrl?: string;
      balance?: number;
      alertThreshold?: number;
    },
  ) {
    return this.apiCreditService.createProvider(body);
  }

  // ── PATCH /api-credit/providers/:id ─────────────────────────────
  @Patch('providers/:id')
  updateProvider(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      name?: string;
      description?: string;
      apiBaseUrl?: string;
      alertThreshold?: number;
      enabled?: boolean;
    },
  ) {
    return this.apiCreditService.updateProvider(id, body);
  }

  // ── DELETE /api-credit/providers/:id ────────────────────────────
  @Delete('providers/:id')
  deleteProvider(@Param('id', ParseIntPipe) id: number) {
    return this.apiCreditService.deleteProvider(id);
  }

  // ── POST /api-credit/providers/:id/topup ────────────────────────
  @Post('providers/:id/topup')
  topupCredit(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { amount: number; note?: string },
  ) {
    return this.apiCreditService.topupCredit(id, body.amount, body.note);
  }

  // ── POST /api-credit/providers/:id/adjust ───────────────────────
  @Post('providers/:id/adjust')
  adjustCredit(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { newBalance: number; note?: string },
  ) {
    return this.apiCreditService.adjustCredit(id, body.newBalance, body.note);
  }

  // ── GET /api-credit/providers/:id/transactions ──────────────────
  @Get('providers/:id/transactions')
  getTransactions(
    @Param('id', ParseIntPipe) id: number,
    @Query('limit') limit?: string,
  ) {
    return this.apiCreditService.getTransactions(id, limit ? Number.parseInt(limit, 10) : 50);
  }
}
