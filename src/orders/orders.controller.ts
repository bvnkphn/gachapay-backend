import { Controller, Get, Post, Body, Param, UseGuards, Req, NotFoundException, BadRequestException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { ExternalGameService } from '../games/external-game.service';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
    constructor(
        private ordersService: OrdersService,
        private externalGameService: ExternalGameService,
        private prisma: PrismaService,
    ) { }

    // GET /orders — list all orders for current user
    @Get()
    @UseGuards(JwtAuthGuard)
    async findAll(@Req() req: any) {
        return this.ordersService.findAll(req.user.id);
    }

    // GET /orders/admin/all — all orders for Admin Dashboard
    @Get('admin/all')
    @UseGuards(JwtAuthGuard)
    async findAllForAdmin() {
        return this.ordersService.findAllForAdmin();
    }

    // GET /orders/me/recent — recent 5 orders
    @Get('me/recent')
    @UseGuards(JwtAuthGuard)
    async getRecentOrders(@Req() req: any) {
        const recent = await this.ordersService.findRecentByUser(req.user.id);
        return { recent_orders: recent };
    }

    // POST /orders — create order (allows both authenticated and guest users)
    @Post()
    async create(@Req() req: any, @Body() dto: CreateOrderDto) {
        // Get email from DTO or from authenticated user
        const email = dto.email || req.user?.email;
        
        if (!email) {
            throw new BadRequestException('Email is required for order creation');
        }

        // Separate gameId into internal ID and external slug
        let gameId: bigint | null = null;
        let externalGameSlug: string | null = null;

        if (typeof dto.gameId === 'string') {
            // String is treated as external game slug
            externalGameSlug = dto.gameId;
        } else if (typeof dto.gameId === 'number' || typeof dto.gameId === 'bigint') {
            // Numeric ID is internal game ID
            gameId = BigInt(dto.gameId);
        }

        // Separate packageId into internal ID and external SKU
        let packageId: bigint | null = null;
        let externalPackageSku: string | null = null;

        if (typeof dto.packageId === 'string') {
            // String is treated as external package SKU
            packageId = null;
        } else if (typeof dto.packageId === 'number' || typeof dto.packageId === 'bigint') {
            // Numeric ID is internal package ID — verify it exists
            const packageIdBig = BigInt(dto.packageId);
            const packageExists = await this.prisma.gamePackage.findUnique({
                where: { id: packageIdBig },
                select: { id: true },
            });

            if (packageExists) {
                packageId = packageIdBig;
            } else {
                // Package doesn't exist in database — treat as external package
                // Use the package name + slug as a makeshift SKU
                externalPackageSku = `${dto.packageName}_${dto.packageId}`.toLowerCase().replace(/\s+/g, '_');
                packageId = null;
            }
            // externalPackageSku remains null
        }

        return this.ordersService.create({
            userId: req.user?.id || null,
            gameId,
            externalGameSlug,
            gameName: dto.gameName,
            packageId,
            externalPackageSku,
            packageName: dto.packageName,
            packagePrice: dto.packagePrice,
            uid: dto.uid,
            email,
            paymentMethod: dto.paymentMethod || undefined,
        });
    }

    // GET /orders/:id — order detail with ownership check
    @Get(':id')
    @UseGuards(JwtAuthGuard)
    async findOne(@Param('id') id: string, @Req() req: any) {
        return this.ordersService.findByIdForUser(BigInt(id), req.user.id);
    }

    // GET /orders/prepare-payment — prepare order for payment
    @Get('prepare-payment')
    @UseGuards(JwtAuthGuard)
    async preparePayment(@Req() req: any) {
        const orderId = req.query.orderId;
        const userId = req.query.userId || req.user.id;

        if (!orderId) {
            throw new BadRequestException('Order ID is required');
        }

        return this.ordersService.prepareOrderForPayment(BigInt(orderId), BigInt(userId));
    }
}
