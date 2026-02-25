import { Controller, Get, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrdersService } from './orders.service';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
    constructor(private ordersService: OrdersService) { }

    @Get()
    async findAll(@Req() req) {
        return this.ordersService.findAll(req.user.id);
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.ordersService.findById(id);
    }

    @Post()
    async create(@Req() req, @Body() createOrderDto: any) {
        return this.ordersService.create({
            ...createOrderDto,
            user: { connect: { id: req.user.id } },
        });
    }
}
