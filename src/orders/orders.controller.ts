import { Controller, Get, Post, Body, Param, UseGuards, Req, NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
    constructor(private ordersService: OrdersService) { }

    @Get()
    async findAll(@Req() req: any) {
        return this.ordersService.findAll(req.user.id);
    }

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
        return this.ordersService.create({
            userId: req.user.id,
            gameId: createOrderDto.gameId as any,
            gameName: createOrderDto.gameName,
            packageId: createOrderDto.packageId as any,
            packageName: createOrderDto.packageName,
            packagePrice: createOrderDto.packagePrice,
            uid: createOrderDto.uid,
            paymentMethod: createOrderDto.paymentMethod,
        });
    }
}
