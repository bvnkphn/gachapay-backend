import { Controller, Get, Post, Patch, Body, Param, Query, Req, UseGuards, HttpCode, HttpStatus, Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard }  from '../auth/guards/jwt-auth.guard';
import { OrderStatus }   from '@prisma/client';

@Injectable()
class ApiKeyGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const key = ctx.switchToHttp().getRequest().headers['x-api-key'];
    if (key !== process.env.ADMIN_API_KEY) throw new UnauthorizedException();
    return true;
  }
}

@Controller('orders')
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  /** POST /api/orders — สร้าง order (เรียกจาก checkout page) */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() body: any, @Req() req: any) {
    return this.ordersService.createOrder(body, req.ip, req.user?.uuid);
  }

  /** POST /api/orders/:id/pay — ชำระเงิน */
  @Post(':id/pay')
  @HttpCode(HttpStatus.OK)
  pay(@Param('id') id: string, @Body() body: any) {
    return this.ordersService.payOrder(id, body.paymentProvider ?? 'mock', body.paymentDetails ?? {});
  }

  /** GET /api/orders/track/:orderNumber — ติดตาม order */
  @Get('track/:orderNumber')
  track(@Param('orderNumber') orderNumber: string) {
    return this.ordersService.trackByOrderNumber(orderNumber);
  }

  /** GET /api/orders/my — orders ของ user */
  @Get('my')
  @UseGuards(JwtAuthGuard)
  myOrders(@Req() req: any, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.ordersService.findByUser(req.user?.uuid ?? '', +(page ?? 1), +(limit ?? 10));
  }

  // ── Admin ────────────────────────────────────────────────────
  @Get()
  @UseGuards(ApiKeyGuard)
  listAll(@Query('page') page?: string, @Query('status') status?: OrderStatus) {
    return this.ordersService.listOrders(+(page ?? 1), 20, status);
  }

  @Patch(':id/status')
  @UseGuards(ApiKeyGuard)
  updateStatus(@Param('id') id: string, @Body() body: { status: OrderStatus; note?: string }) {
    return this.ordersService.updateStatus(id, body.status, body.note);
  }
}
