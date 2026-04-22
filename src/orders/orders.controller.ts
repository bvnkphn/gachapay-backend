import { Controller, Get, Post, Body, Param, UseGuards, Req, NotFoundException, BadRequestException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { ExternalGameService } from '../games/external-game.service';

@ApiTags('Orders')
@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
    constructor(
        private ordersService: OrdersService,
        private externalGameService: ExternalGameService,
    ) { }

    // GET /orders — list all orders for current user
    @Get()
    async findAll(@Req() req: any) {
        return this.ordersService.findAll(req.user.id);
    }

    // GET /orders/me/recent — recent 5 orders
    @Get('me/recent')
    async getRecentOrders(@Req() req: any) {
        const recent = await this.ordersService.findRecentByUser(req.user.id);
        return { recent_orders: recent };
    }

    // GET /orders/:id — order detail with ownership check
    @Get(':id')
    async findOne(@Param('id') id: string, @Req() req: any) {
        return this.ordersService.findByIdForUser(BigInt(id), req.user.id);
    }

    // POST /orders — create order
    @Post()
    async create(@Req() req: any, @Body() dto: CreateOrderDto) {
        return this.ordersService.create({
            userId: req.user.id,
            gameId: dto.gameId as any,
            gameName: dto.gameName,
            packageId: dto.packageId as any,
            packageName: dto.packageName,
            packagePrice: dto.packagePrice,
            uid: dto.uid,
            paymentMethod: dto.paymentMethod || undefined,
        });
    }

    // GET /orders/prepare-payment — prepare order for payment
    @Get('prepare-payment')
    async preparePayment(@Req() req: any) {
        const orderId = req.query.orderId;
        const userId = req.query.userId || req.user.id;

        if (!orderId) {
            throw new BadRequestException('Order ID is required');
        }

        return this.ordersService.prepareOrderForPayment(BigInt(orderId), BigInt(userId));
    }
}
