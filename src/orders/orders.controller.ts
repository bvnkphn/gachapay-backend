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

<<<<<<< Updated upstream
    @Get(':id')
    async findOne(@Param('id') id: string) {
        const order = await this.ordersService.findById(BigInt(id));
        if (!order) {
            throw new NotFoundException('Order not found');
        }
        return order;
    }

    @Post()
    async create(@Req() req: any, @Body() createOrderDto: CreateOrderDto) {
        const gameSlug = String(createOrderDto.gameId);
        const packageId = String(createOrderDto.packageId);

        // Fetch game from external API
        const game = await this.externalGameService.fetchGameBySlug(gameSlug);
        if (!game) {
            throw new NotFoundException(`Game "${gameSlug}" not found`);
        }

        // Find package in game
        let gamePackage = game.items.find(p => p.sku === packageId || p.name === packageId);
        if (!gamePackage) {
            throw new NotFoundException(`Package "${packageId}" not found in game "${gameSlug}"`);
        }

        // Extract uid from userInput
        const uid = createOrderDto.userInput?.uid;
        if (!uid) {
            throw new BadRequestException('User ID (uid) is required');
        }

        return this.ordersService.create({
            userId: req.user.id,
            // Don't set gameId/packageId for external games - leave them null
            gameName: game.name,
            packageName: gamePackage.name,
            packagePrice: gamePackage.price,
            uid,
            paymentMethod: createOrderDto.paymentMethod,
            // Store external API identifiers
            externalGameSlug: gameSlug,
            externalPackageSku: gamePackage.sku,
        });
    }

=======
    // GET /orders/me/recent — recent 5 orders
>>>>>>> Stashed changes
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
            paymentMethod: dto.paymentMethod,
        });
    }
}
