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
        const order = await this.ordersService.findById(id);
        if (!order) {
            throw new NotFoundException('Order not found');
        }
        return order;
    }

    @Post()
    async create(@Req() req: any, @Body() createOrderDto: CreateOrderDto) {
        return this.ordersService.create({
            gameId: createOrderDto.gameId,
            gameName: createOrderDto.gameName,
            packageId: createOrderDto.packageId,
            packageName: createOrderDto.packageName,
            packagePrice: createOrderDto.packagePrice.toString(),
            uid: createOrderDto.uid,
            paymentMethod: createOrderDto.paymentMethod,
            user: { connect: { id: req.user.id } },
        });
    }
}
