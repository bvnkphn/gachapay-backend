import {
    Controller, Get, Post, Patch, Body, Param, Query,
    UseGuards, Req, BadRequestException, Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { ExternalGameService } from '../games/external-game.service';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
    constructor(
        private ordersService: OrdersService,
        private externalGameService: ExternalGameService,
        private prisma: PrismaService,
    ) {}

    // ─── User endpoints ──────────────────────────────────────────────────────

    @Get()
    @UseGuards(JwtAuthGuard)
    async findAll(@Req() req: any) {
        return this.ordersService.findAll(req.user.id);
    }

    @Get('me/recent')
    @UseGuards(JwtAuthGuard)
    async getRecentOrders(@Req() req: any) {
        const recent = await this.ordersService.findRecentByUser(req.user.id);
        return { recent_orders: recent };
    }

    // ─── Admin endpoints ─────────────────────────────────────────────────────

    @Get('admin/all')
    @UseGuards(JwtAuthGuard, AdminGuard)
    async findAllForAdmin(
        @Query('page')   page   = '1',
        @Query('limit')  limit  = '20',
        @Query('status') status?: string,
        @Query('search') search?: string,
        @Query('gameId') gameId?: string,
    ) {
        return this.ordersService.findAllForAdmin({
            page:  parseInt(page, 10),
            limit: parseInt(limit, 10),
            status, search, gameId,
        });
    }

    @Get('admin/revenue-by-game')
    @UseGuards(JwtAuthGuard, AdminGuard)
    async getRevenueByGame(@Query('gameId') gameId?: string) {
        return this.ordersService.getRevenueByGame(gameId);
    }

    @Get('admin/export')
    @UseGuards(JwtAuthGuard, AdminGuard)
    async exportOrders(
        @Query('status')   status?: string,
        @Query('dateFrom') dateFrom?: string,
        @Query('dateTo')   dateTo?: string,
        @Res() res?: Response,
    ) {
        const rows = await this.ordersService.adminExportOrders({ status, dateFrom, dateTo });

        const headers = ['Order ID','UID','Email','Game','Package','Price','Discount','Final','Method','Coupon','Status','Created At'];
        const csvLines = [
            headers.join(','),
            ...rows.map(r => [
                r.order_id, r.uid, r.email, `"${r.game}"`, `"${r.package}"`,
                r.price, r.discount, r.final, r.method, r.coupon, r.status, r.created_at,
            ].join(',')),
        ];
        const csv = '\ufeff' + csvLines.join('\n');

        const filename = `orders_${new Date().toISOString().slice(0, 10)}.csv`;
        res!.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res!.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res!.send(csv);
    }

    @Patch('admin/:id/status')
    @UseGuards(JwtAuthGuard, AdminGuard)
    async adminUpdateStatus(
        @Param('id') id: string,
        @Body('status') status: string,
        @Req() req: any,
    ) {
        if (!status) throw new BadRequestException('กรุณาระบุ status');
        return this.ordersService.adminUpdateStatus(BigInt(id), status, req.user.id);
    }

    @Post('admin/:id/retry')
    @UseGuards(JwtAuthGuard, AdminGuard)
    async adminRetryOrder(@Param('id') id: string, @Req() req: any) {
        return this.ordersService.adminRetryOrder(BigInt(id), req.user.id);
    }

    // ─── Shared ──────────────────────────────────────────────────────────────

    @Get('public/stats')
    async getPublicStats() {
        return this.ordersService.getPublicStats();
    }

    @Get('prepare-payment')
    @UseGuards(JwtAuthGuard)
    async preparePayment(@Req() req: any) {
        const orderId = req.query.orderId;
        const userId  = req.query.userId || req.user.id;
        if (!orderId) throw new BadRequestException('Order ID is required');
        return this.ordersService.prepareOrderForPayment(BigInt(orderId), BigInt(userId));
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard)
    async findOne(@Param('id') id: string, @Req() req: any) {
        return this.ordersService.findByIdForUser(BigInt(id), req.user.id);
    }

    @Post()
    async create(@Req() req: any, @Body() dto: CreateOrderDto) {
        const email = dto.email || req.user?.email;
        if (!email) throw new BadRequestException('Email is required for order creation');

        let gameId: bigint | null = null;
        let externalGameSlug: string | null = null;
        if (typeof dto.gameId === 'string') {
            externalGameSlug = dto.gameId;
        } else if (typeof dto.gameId === 'number' || typeof dto.gameId === 'bigint') {
            gameId = BigInt(dto.gameId);
        }

        let packageId: bigint | null = null;
        let externalPackageSku: string | null = null;
        if (typeof dto.packageId === 'string') {
            packageId = null;
        } else if (typeof dto.packageId === 'number' || typeof dto.packageId === 'bigint') {
            const packageIdBig = BigInt(dto.packageId);
            const packageExists = await this.prisma.gamePackage.findUnique({
                where: { id: packageIdBig },
                select: { id: true },
            });
            if (packageExists) {
                packageId = packageIdBig;
            } else {
                externalPackageSku = `${dto.packageName}_${dto.packageId}`.toLowerCase().replace(/\s+/g, '_');
                packageId = null;
            }
        }

        return this.ordersService.create({
            userId:           req.user?.id || null,
            gameId,
            externalGameSlug,
            gameName:         dto.gameName,
            packageId,
            externalPackageSku,
            packageName:      dto.packageName,
            packagePrice:     dto.packagePrice,
            uid:              dto.uid,
            email,
            paymentMethod:    dto.paymentMethod || undefined,
        });
    }
}
