import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { TopupValidationService } from './topup-validation.service';
import { TopupValidationController } from './topup-validation.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CouponsModule } from '../coupons/coupons.module';
import { GamesModule } from '../games/games.module';

@Module({
    imports: [PrismaModule, CouponsModule, GamesModule],
    controllers: [OrdersController, TopupValidationController],
    providers: [OrdersService, TopupValidationService],
    exports: [OrdersService, TopupValidationService],
})
export class OrdersModule { }
